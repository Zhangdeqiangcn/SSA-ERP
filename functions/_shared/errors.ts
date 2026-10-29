// 统一错误出口（V2.98.0 · 独立评测 M-02 / L-01）
// 目的：把「用户输入/数据问题」与「系统故障」分成两类返回，且任何情况下都
//   不再把数据库原始报错（表结构、列名、约束定义）回显给调用方。
//   —— 约束类错误 → 400 + 中文友好提示（用户能自己改对）
//   —— 其余       → 500 + 错误编号（原文只进服务端日志，供排障）
import { json } from './auth';

export interface ClassifiedError {
  status: number;
  code: string;
  message: string;
  errorId: string;
}

// 约束/数据类错误识别：D1 的报错形如
//   "D1_ERROR: UNIQUE constraint failed: vendor_master.vendor_code: SQLITE_CONSTRAINT"
const RULES: Array<{ test: RegExp; code: string; message: string }> = [
  {
    test: /UNIQUE\s+constraint\s+failed/i,
    code: 'DATA_UNIQUE',
    message: '该编号或名称已存在，请勿重复提交',
  },
  {
    test: /CHECK\s+constraint\s+failed/i,
    code: 'DATA_CHECK',
    message: '提交的数据不符合业务规则（请检查状态、类型等取值是否合法）',
  },
  {
    test: /NOT\s+NULL\s+constraint\s+failed/i,
    code: 'DATA_REQUIRED',
    message: '必填字段不能为空，请补全后重试',
  },
  {
    test: /FOREIGN\s+KEY\s+constraint\s+failed/i,
    code: 'DATA_REFERENCE',
    message: '关联的数据不存在（可能引用的客户/供应商/物料已被删除）',
  },
  {
    test: /datatype\s+mismatch|could\s+not\s+convert|cannot\s+store/i,
    code: 'DATA_TYPE',
    message: '字段类型不正确（金额请填数字、日期请填合法日期）',
  },
  {
    // ★ 措辞修正（V3.47.0）：原提示「提交的数据包含系统无法识别的字段，请刷新页面
    //   后重试」会把用户引向错误方向 —— 实际是**服务端数据库缺列**（迁移没执行），
    //   用户刷新一万次也没用，还会以为是自己的字段填错了。
    //   实测经过：带 orderItemId 的入库报此错，真因是迁移 0083 已 apply 过、
    //   追加的 ALTER 永不执行，生产库缺 inbound_order_items.order_item_id。
    //   现在措辞直接指向"数据库结构未升级"，并保留排障编号供开发定位。
    test: /no\s+such\s+column|no\s+such\s+table|duplicate\s+column\s+name|has\s+no\s+column/i,
    code: 'SCHEMA_MISMATCH',
    message: '数据库结构未升级（缺少必要的数据表或字段），请联系管理员执行数据库迁移后重试。刷新页面无效。',
  },
];

/** 生成一次性的排障编号（时间戳 + 随机段），用于把用户反馈与服务端日志对上 */
export function newErrorId(): string {
  return (
    'ERR-' +
    Date.now().toString(36).toUpperCase() +
    '-' +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}

/** 判定并翻译异常；不泄漏任何数据库原文 */
export function classifyError(e: any, action = '操作'): ClassifiedError {
  const raw = String(e?.message || e || '');
  const errId = newErrorId();

  for (const rule of RULES) {
    if (rule.test.test(raw)) {
      // 用户输入/数据问题：400。原文进日志，正文只给可执行提示。
      console.error(`[${errId}] ${action}失败（数据类 ${rule.code}）: ${raw}`);
      return { status: 400, code: rule.code, message: rule.message, errorId: errId };
    }
  }

  // 系统故障：500。不回显原文，仅给编号，便于用户报障时定位日志。
  console.error(`[${errId}] ${action}失败（系统故障）: ${raw}`);
  return {
    status: 500,
    code: 'INTERNAL',
    message: `${action}失败，请稍后重试；若持续出现请联系管理员并提供错误编号 ${errId}`,
    errorId: errId,
  };
}

/** 在 catch 中直接返回：区分 400/500 且不回显数据库原文 */
export function errorResponse(e: any, action = '操作'): Response {
  const c = classifyError(e, action);
  return json({ error: c.message, code: c.code, errorId: c.errorId }, c.status);
}

/**
 * 需要把异常文字放进「业务结果体」而非 HTTP 错误体的场景（如批量子项结果）。
 * 规则：命中数据库内部特征 → 替换为脱敏文案；否则保留原文（网络超时等对用户有用）。
 */
export function sanitizeMessage(e: any, fallback = '处理失败'): string {
  const raw = String(e?.message || e || '');
  if (!raw) return fallback;
  for (const rule of RULES) {
    if (rule.test.test(raw)) return rule.message;
  }
  if (/D1_ERROR|SQLITE_|sqlite|prepare\(|bind\(/i.test(raw)) return fallback;
  return raw;
}
