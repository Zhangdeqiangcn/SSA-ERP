// ════════════════════════════════════════════════════════════════════════
// 字段级访问控制（服务端强制）— V3.21.0
// ════════════════════════════════════════════════════════════════════════
//
// 【为什么需要这个文件】
//
// 改造前，本项目存在**三套互不相通**的字段脱敏，且业务主通道「裸奔」：
//
//   ① 前端 src/stores/dataPermissionStore.ts
//      真实角色 × 9 个业务模块 × 驼峰字段名，由 <SecureField> 在界面上显示 ***。
//      → 纯展示层。字段值仍完整躺在接口响应体里，界面遮了、数据没遮。
//
//   ② 后端 functions/api/protected-data/[type].ts
//      4 个档位（admin / manager / staff / vendor）× 4 个接口 × 数据库列名。
//      → 该接口在全项目**零消费方**（唯一引用是它自己），业务页面从不走它；
//        且 manager / staff 在真实角色集里根本不存在（死档）。
//
//   ③ 后端 functions/api/open/[resource].ts
//      5 个资源 × 数据库列名（API Key 网关），有 stripHidden 真实现。
//
//   而业务真正走的通道 —— /api/vendors、/api/customers、/api/materials 等 ——
//   一律 `SELECT *` 返回全列、零脱敏。后果：
//     界面上看不到「授信额度」的库管，打开浏览器开发者工具读 /api/vendors 的
//     响应体，银行账号、税号、授信额度全是明文。**界面上的字段权限是装饰性的。**
//
// 【本模块做什么】
//
// 把策略收敛为**唯一权威一份**，并让服务端真的执行（读取侧剥离 + 写入侧拒绝）：
//
//   · 策略来源 = 前端「字段级权限」页面已持久化的配置
//     （app_state 键 ssa-erp-data-permission，按 org 隔离）。
//     管理员在界面上改了什么，服务端立刻照办 —— 不再产生「第四份硬编码」。
//   · 读不到配置（组织从未打开过该页面 / JSON 损坏）→ 回退内置默认矩阵，
//     与前端 defaultSensitiveFields 逐条一致（fail-safe：宁可多遮不可少遮）。
//     一致性由 scripts/check-field-policy.mjs 门禁机器核对，防两处走偏（坑㉛）。
//   · 未命中任何配置的角色/模块 → 视为可见 —— 与前端 isFieldVisible 语义**严格一致**。
//     刻意不引入「未登记 = 默认隐藏」：那会改变业务口径（财务主管/会计/管理员
//     本来就不在矩阵里，靠「不在表即可见」拿到金额）。此处只做「已声明策略的强制」，
//     不新增规则。★ 已知缺口：普通角色 user 也不在矩阵里，因此它看不到任何遮蔽，
//     属业务口径问题，待评估后另行处理（见 docs 建议书）。
//
// 【两层语义，都保持原样，不改口径】
//
//   A. 硬敏感基线（HARD_SENSITIVE）—— 来源 ②，原本就不可被界面配置：
//      银行账号 / 税号 / 对账账号 / 授信额度 / 黑名单等。始终生效。
//   B. 按角色策略（DEFAULT_ROLE_POLICY，可被前端配置覆盖）—— 来源 ①：
//      成本 / 单价 / 金额 等业务敏感字段。
//
//   这两层的字段集**不重叠**（①管金额成本类，②管账号税号类），合并后相互补充。
//
// 【等价性证明（① 角色词表统一，零行为变化）】
//
//   原 ② 的取值逻辑：roleKey = role === 'super_admin' ? 'admin' : role
//                     fields  = SENSITIVE_FIELDS[dataType][roleKey] || .staff
//   逐一核对真实角色命中情况：
//     · admin        → 命中 admin 档 → 不遮蔽
//     · vendor       → 命中 vendor 档
//     · 其余 12 个   → 全部落 staff 兜底档
//     · manager 档   → **无任何角色命中**，且其字段集是 staff 档的真子集
//                      （vendors/customers/sales-orders/purchase-orders 四张表逐一核对）
//   故：删除 manager 档、把 staff 兜底档展开为显式真实角色名，**行为完全等价**。
//
// 【术语】
//   驼峰字段名 = 接口响应里的键（如 creditLimit），与前端配置界面用的是同一套键。
//   数据库列名 = 表里的列（如 credit_limit），仅用于「在原始 DB 行上剥离」的场景。

/** 系统真实角色（权威词表，与 src/types/settings.ts 的 ROLE_DEFINITIONS 一致） */
export const REAL_ROLES = [
  'super_admin', 'admin',
  'rd_engineer', 'process_engineer', 'qa_engineer', 'qa_inspector',
  'warehouse_keeper', 'logistics', 'finance_manager', 'accountant',
  'buyer', 'prod_manager', 'prod_leader', 'vendor',
  // ★ V3.51.0 销售域角色正式纳入（此前 operationGuard 矩阵有它们、但权威词表缺，属"悬空角色"）
  'sales_manager', 'salesperson',
  'user',
] as const;

/** 特权角色：不在任何遮蔽规则内（组织内管理员与平台超管看全部） */
export const PRIVILEGED_ROLES = ['super_admin', 'admin'];

/**
 * 「其余全部角色」＝ 所有真实角色中除去特权角色。
 * 这是原 protected-data 里 `staff` 兜底档的**显式展开**。
 *
 * 注意这里刻意用派生而非硬编码列表：将来新增角色会自动纳入「需遮蔽」一侧
 * （默认从严），不需要有人记得回来加一行。
 */
const ALL_STAFF_ROLES: string[] = REAL_ROLES.filter(
  (r) => !PRIVILEGED_ROLES.includes(r)
);

/** ALL_STAFF_ROLES 去掉 vendor（原 vendor 档的字段集与 staff 档不同，需分别表达） */
const STAFF_EXCEPT_VENDOR: string[] = ALL_STAFF_ROLES.filter((r) => r !== 'vendor');

/** 模块标识（与前端「字段级权限」页面的模块键一致） */
export type FieldModule =
  | 'material' | 'vendor' | 'customer' | 'purchase' | 'sales'
  | 'warehouse' | 'quality' | 'production' | 'finance';

/** 字段权限模式：隐藏 / 只读 */
export type FieldMode = 'hidden' | 'readonly';

/**
 * 接口路径名 → 模块名。
 * 原 protected-data 用接口名（vendors / customers / sales-orders / purchase-orders）
 * 作为表键，此处统一到模块名，消除两套命名。
 */
export const DATATYPE_TO_MODULE: Record<string, FieldModule> = {
  vendors: 'vendor',
  customers: 'customer',
  'sales-orders': 'sales',
  'purchase-orders': 'purchase',
};

/**
 * 驼峰字段名 → 数据库列名（用于在原始 DB 行上剥离；空数组 = 尚未接入列级场景）。
 * 只登记「已经确认过的列名」，不做猜测 —— 猜错会静默漏遮。
 */
export const MODULE_FIELD_COLUMNS: Record<FieldModule, Record<string, string[]>> = {
  vendor: {
    creditLimit: ['credit_limit'],
    usedCredit: ['used_credit'],
    bankAccount: ['bank_account'],
    taxId: ['tax_id'],
    taxCode: ['tax_code'],
    reconciliationAccount: ['reconciliation_account'],
    creditLevel: ['credit_level'],
    rating: ['rating'],
    blacklistReason: ['blacklist_reason'],
    blacklistedAt: ['blacklisted_at'],
  },
  customer: {
    creditLimit: ['credit_limit'],
    usedCredit: ['used_credit'],
    bankAccount: ['bank_account'],
    taxId: ['tax_id'],
    taxCode: ['tax_code'],
    reconciliationAccount: ['reconciliation_account'],
    creditLevel: ['credit_level'],
  },
  sales: {
    customerTaxId: ['customer_tax_id'],
    customerBankAccount: ['customer_bank_account'],
    unitPrice: ['unit_price'],
    orderAmount: ['total_amount', 'grand_total'],
    // ★ P0-2：硬基线（HARD_SENSITIVE）里销售/采购的金额字段名是 totalAmount，
    //   而上面只有 orderAmount 映射到 total_amount/grand_total。销售/采购列表接口
    //   按 `...row` 原样输出 snake 列（total_amount / grand_total），若 totalAmount
    //   没有列映射，blockedKeysFor 只会删掉不存在的驼峰键 totalAmount，
    //   真正的金额列 total_amount/grand_total 依然明文泄露。补齐这一行，
    //   让硬基线的 totalAmount 也能落到真实 snake 列上。
    totalAmount: ['total_amount', 'grand_total'],
    customerName: ['customer_name'],
  },
  purchase: {
    vendorTaxCode: ['vendor_tax_code'],
    vendorBankAccount: ['vendor_bank_account'],
    unitPrice: ['unit_price'],
    orderAmount: ['total_amount', 'grand_total'],
    totalAmount: ['total_amount', 'grand_total'], // P0-2：同 sales，硬基线 totalAmount 需落到 snake 列
  },
  // 物料（V3.21.0 试点域之二）：列名取自 functions/api/materials/[id].ts 的 formatMaterial，
  //   即接口逐字确认过的映射，非猜测。
  material: {
    standardPrice: ['standard_price'],
    movingAvgPrice: ['moving_avg_price'],
    // 前端「仓储」模块声明的库存价值，实际也落在 materials 表上
    stockValue: ['stock_value'],
  },
  // 以下模块尚未接入服务端强制（属后续批次），列名留待接入时补齐。
  // 不预先猜测：猜错会「以为遮了其实没遮」，比不写更危险。
  warehouse: { stockValue: ['stock_value'] },
  quality: { inspectionCost: [] },
  production: { cost: [] },
  finance: { voucherAmount: [] },
};

/** 一条字段规则：module 的 field 对 hiddenFrom 里的角色隐藏或只读 */
export interface FieldRule {
  module: FieldModule;
  field: string;
  /** 受影响的角色列表 */
  hiddenFrom: string[];
  /** 权限模式：'hidden'（隐藏）或 'readonly'（只读） */
  mode: FieldMode;
}

/** 权限模式常量 */
export const FIELD_MODE_HIDDEN: FieldMode = 'hidden';
export const FIELD_MODE_READONLY: FieldMode = 'readonly';

/**
 * A. 硬敏感基线 —— 来源：原 functions/api/protected-data/[type].ts。
 *
 * 这些字段（银行账号/税号/对账账号/授信/黑名单）原本就**不可由界面配置**，
 * 因此本层同样不接受前端配置覆盖 —— 否则一个误操作就能把银行账号放开，
 * 而界面上的「字段级权限」页面压根看不见这几个字段（它的可选项里没有它们）。
 *
 * 逐条由原档位表展开而来：
 *   vendors         staff 档 → 银行/税/对账/授信/已用授信/黑名单原因
 *                   vendor 档 → 信用等级/授信/已用授信/评级/黑名单原因/拉黑时间
 *                   manager 档 ⊂ staff 档（死档，已删除）
 *   customers       staff 档 + vendor 档（同构）
 *   sales-orders    staff 档 → 客户税号/客户银行账号/订单总额
 *   purchase-orders staff 档 → 供应商税码/供应商银行账号/订单总额
 */
export const HARD_SENSITIVE: FieldRule[] = [
  // ── 供应商 ──
  { module: 'vendor', field: 'bankAccount', hiddenFrom: STAFF_EXCEPT_VENDOR, mode: FIELD_MODE_HIDDEN },
  { module: 'vendor', field: 'taxCode', hiddenFrom: STAFF_EXCEPT_VENDOR, mode: FIELD_MODE_HIDDEN },
  { module: 'vendor', field: 'reconciliationAccount', hiddenFrom: STAFF_EXCEPT_VENDOR, mode: FIELD_MODE_HIDDEN },
  { module: 'vendor', field: 'creditLimit', hiddenFrom: ALL_STAFF_ROLES, mode: FIELD_MODE_HIDDEN },
  { module: 'vendor', field: 'usedCredit', hiddenFrom: ALL_STAFF_ROLES, mode: FIELD_MODE_HIDDEN },
  { module: 'vendor', field: 'blacklistReason', hiddenFrom: ALL_STAFF_ROLES, mode: FIELD_MODE_HIDDEN },
  // vendor 档专属：供应商看自己时连信用等级/评级/拉黑时间也遮
  { module: 'vendor', field: 'creditLevel', hiddenFrom: ['vendor'], mode: FIELD_MODE_HIDDEN },
  { module: 'vendor', field: 'rating', hiddenFrom: ['vendor'], mode: FIELD_MODE_HIDDEN },
  { module: 'vendor', field: 'blacklistedAt', hiddenFrom: ['vendor'], mode: FIELD_MODE_HIDDEN },

  // ── 客户 ──
  { module: 'customer', field: 'bankAccount', hiddenFrom: ALL_STAFF_ROLES, mode: FIELD_MODE_HIDDEN },
  { module: 'customer', field: 'taxCode', hiddenFrom: ALL_STAFF_ROLES, mode: FIELD_MODE_HIDDEN },
  { module: 'customer', field: 'reconciliationAccount', hiddenFrom: ALL_STAFF_ROLES, mode: FIELD_MODE_HIDDEN },
  { module: 'customer', field: 'creditLimit', hiddenFrom: ALL_STAFF_ROLES, mode: FIELD_MODE_HIDDEN },
  { module: 'customer', field: 'usedCredit', hiddenFrom: ALL_STAFF_ROLES, mode: FIELD_MODE_HIDDEN },
  { module: 'customer', field: 'creditLevel', hiddenFrom: ['vendor'], mode: FIELD_MODE_HIDDEN },

  // ── 销售订单 ──
  { module: 'sales', field: 'customerTaxId', hiddenFrom: ALL_STAFF_ROLES, mode: FIELD_MODE_HIDDEN },
  { module: 'sales', field: 'customerBankAccount', hiddenFrom: ALL_STAFF_ROLES, mode: FIELD_MODE_HIDDEN },
  { module: 'sales', field: 'totalAmount', hiddenFrom: ALL_STAFF_ROLES, mode: FIELD_MODE_HIDDEN },

  // ── 采购订单 ──
  { module: 'purchase', field: 'vendorTaxCode', hiddenFrom: ALL_STAFF_ROLES, mode: FIELD_MODE_HIDDEN },
  { module: 'purchase', field: 'vendorBankAccount', hiddenFrom: ALL_STAFF_ROLES, mode: FIELD_MODE_HIDDEN },
  { module: 'purchase', field: 'totalAmount', hiddenFrom: ALL_STAFF_ROLES, mode: FIELD_MODE_HIDDEN },
];

/**
 * B. 内置默认「按角色」矩阵 —— **逐条照抄** src/stores/dataPermissionStore.ts 的
 *    defaultSensitiveFields（60 行）。这是 app_state 读不到配置时的兜底，
 *    正常情况下以管理员在界面上的配置为准。
 *
 * ★ 与前端的一致性由 scripts/check-field-policy.mjs 门禁机器核对，
 *   任何一处改动而另一处未跟上都会让门禁 FAIL（防「同口径两处实现走偏」，坑㉛）。
 */
export const DEFAULT_ROLE_POLICY: FieldRule[] = (() => {
  const out: FieldRule[] = [];
  const add = (module: FieldModule, field: string, roles: string[]) => {
    for (const r of roles) out.push({ module, field, hiddenFrom: [r], mode: FIELD_MODE_HIDDEN });
  };

  // 物料：标准价 / 移动平均价
  add('material', 'standardPrice', ['warehouse_keeper', 'qa_inspector', 'prod_leader', 'logistics', 'vendor']);
  add('material', 'movingAvgPrice', ['warehouse_keeper', 'qa_inspector', 'prod_leader', 'logistics', 'vendor']);

  // 供应商：授信额度
  add('vendor', 'creditLimit', ['warehouse_keeper', 'qa_inspector', 'prod_leader', 'logistics']);

  // 客户：授信额度
  add('customer', 'creditLimit', ['buyer', 'warehouse_keeper', 'qa_inspector', 'prod_leader', 'logistics']);

  // 采购：单价 / 订单金额
  add('purchase', 'unitPrice', ['warehouse_keeper', 'qa_inspector', 'prod_leader', 'logistics']);
  add('purchase', 'orderAmount', ['warehouse_keeper', 'qa_inspector', 'prod_leader', 'logistics']);

  // 销售：单价 / 金额 / 客户名
  add('sales', 'unitPrice', ['buyer', 'warehouse_keeper', 'qa_inspector', 'prod_leader', 'logistics']);
  add('sales', 'orderAmount', ['buyer', 'warehouse_keeper', 'qa_inspector', 'prod_leader', 'logistics']);
  add('sales', 'customerName', ['buyer', 'warehouse_keeper', 'qa_inspector', 'prod_leader', 'logistics']);

  // 仓储：库存价值
  add('warehouse', 'stockValue', ['qa_inspector', 'buyer', 'prod_leader', 'logistics', 'vendor']);

  // 质量：检验费用
  add('quality', 'inspectionCost', ['warehouse_keeper', 'buyer', 'prod_leader', 'logistics', 'vendor']);

  // 生产：生产成本
  add('production', 'cost', ['qa_inspector', 'buyer', 'warehouse_keeper', 'logistics', 'vendor']);

  // 财务：凭证金额（财务主管/会计/管理员不在表内 → 可见）
  add('finance', 'voucherAmount', [
    'rd_engineer', 'process_engineer', 'qa_engineer', 'qa_inspector',
    'warehouse_keeper', 'logistics', 'buyer', 'prod_manager', 'prod_leader', 'vendor',
  ]);

  return out;
})();

/** 已解析的字段策略：单次请求内解析一次，传给各剥离/拦截函数复用（避免重复查库） */
export interface FieldPolicy {
  /** 规则全集（硬敏感基线 + 按角色策略） */
  rules: FieldRule[];
}

/** 组织级配置在 app_state 中的键（＝前端 dataPermissionStore 的 persist name） */
const POLICY_STATE_KEY = 'ssa-erp-data-permission';

/**
 * 解析当前组织的字段策略。
 *
 * 失败策略（fail-safe，与 isPeriodClosed 的 fail-open 刻意相反）：
 *   读不到键 / JSON 损坏 / 结构不符 → 回退 DEFAULT_ROLE_POLICY。
 *   理由：这里少遮一个字段就等于把银行账号明文发给无权用户；而多遮的后果
 *   只是界面显示 ***（且硬敏感基线本来就不在配置范围内）。
 *
 * @param db    D1 绑定
 * @param orgId 当前用户所属组织
 */
export async function resolveFieldPolicy(db: any, orgId: string): Promise<FieldPolicy> {
  let roleRules: FieldRule[] = DEFAULT_ROLE_POLICY;

  try {
    const row: any = await db
      .prepare('SELECT value FROM app_state WHERE org_id = ? AND key = ?')
      .bind(orgId, POLICY_STATE_KEY)
      .first();
    const raw = row?.value;
    if (raw) {
      // zustand persist 的落盘格式：{ state: { sensitiveFields: [...] }, version: n }
      const parsed = JSON.parse(String(raw));
      const list = parsed?.state?.sensitiveFields;
      if (Array.isArray(list)) {
        const converted: FieldRule[] = [];
        for (const cfg of list) {
          const module = cfg?.module as FieldModule;
          const role = cfg?.role as string;
          const fields = cfg?.fields;
          // 只接受真实角色 + 已知模块，其余静默跳过（脏数据不应让请求失败）
          if (!module || !role || !Array.isArray(fields)) continue;
          if (!REAL_ROLES.includes(role as any)) continue;
          if (!(module in MODULE_FIELD_COLUMNS)) continue;
          for (const f of fields) {
            if (typeof f !== 'string') continue;
            converted.push({ module, field: f, hiddenFrom: [role], mode: cfg?.mode || FIELD_MODE_HIDDEN });
          }
        }
        roleRules = converted;
      }
    }
  } catch {
    roleRules = DEFAULT_ROLE_POLICY;
  }

  return { rules: [...HARD_SENSITIVE, ...roleRules] };
}

/** 构造一个只用内置默认的策略（不查库）。供内部/测试与「已知无需读配置」的场景使用。 */
export function defaultFieldPolicy(): FieldPolicy {
  return { rules: [...HARD_SENSITIVE, ...DEFAULT_ROLE_POLICY] };
}

/**
 * 取「指定角色在指定模块下不可见」的驼峰字段名集合。
 * 特权角色直接返回空集（不看任何规则）。
 */
export function hiddenFieldsFor(
  policy: FieldPolicy,
  role: string,
  module: string
): Set<string> {
  const out = new Set<string>();
  if (!role || PRIVILEGED_ROLES.includes(role)) return out;
  for (const r of policy.rules) {
    if (r.module !== module) continue;
    if (r.hiddenFrom.includes(role) && r.mode === FIELD_MODE_HIDDEN) out.add(r.field);
  }
  return out;
}

/**
 * 取「指定角色在指定模块下只读」的驼峰字段名集合。
 * 特权角色直接返回空集（不看任何规则）。
 */
export function readonlyFieldsFor(
  policy: FieldPolicy,
  role: string,
  module: string
): Set<string> {
  const out = new Set<string>();
  if (!role || PRIVILEGED_ROLES.includes(role)) return out;
  for (const r of policy.rules) {
    if (r.module !== module) continue;
    if (r.hiddenFrom.includes(role) && r.mode === FIELD_MODE_READONLY) out.add(r.field);
  }
  return out;
}

/**
 * 把「驼峰字段名集合」展开为「需要在行对象上删除的键集合」。
 * 同时收录数据库列名 —— 有的调用点拿到的是未经 format 的原始 DB 行。
 */
export function blockedKeysFor(module: FieldModule, hidden: Set<string>): Set<string> {
  const cols = MODULE_FIELD_COLUMNS[module] ?? {};
  const out = new Set<string>();
  for (const f of hidden) {
    out.add(f);
    for (const c of cols[f] ?? []) out.add(c);
  }
  return out;
}

/** 剥离结果：剥离后的行 + 被剥离的字段名（驼峰），供调用方以元数据形式告知前端 */
export interface StripResult<T = any> {
  row: T;
  removed: string[];
}

/**
 * 读取侧剥离：从行对象中删除当前角色不可见的字段。
 *
 * 与 open 网关既有的 stripHidden 约定保持一致 —— 被剥离的字段名以
 * _hiddenFields 元数据形式给出，避免前端把「字段不存在」与「无权查看」混为一谈。
 *
 * @param row     行对象（驼峰格式化的，或原始 DB 行，两者都能匹配）
 * @param module  模块
 * @param hidden  由 hiddenFieldsFor 得到的隐藏字段集
 */
export function stripRowFields<T extends Record<string, any>>(
  row: T,
  module: FieldModule,
  hidden: Set<string>
): StripResult<T> {
  if (!row || hidden.size === 0) return { row, removed: [] };
  const blocked = blockedKeysFor(module, hidden);
  const out: Record<string, any> = {};
  const removed: string[] = [];
  for (const k of Object.keys(row)) {
    if (blocked.has(k)) {
      removed.push(k);
      continue;
    }
    out[k] = (row as any)[k];
  }
  if (removed.length) out._hiddenFields = removed;
  return { row: out as T, removed };
}

/** 批量剥离（列表接口） */
export function stripRowsFields<T extends Record<string, any>>(
  rows: T[],
  module: FieldModule,
  hidden: Set<string>
): { rows: T[]; removed: string[] } {
  if (!Array.isArray(rows) || hidden.size === 0) return { rows, removed: [] };
  const removedSet = new Set<string>();
  const out = rows.map((r) => {
    const res = stripRowFields(r, module, hidden);
    res.removed.forEach((x) => removedSet.add(x));
    return res.row;
  });
  return { rows: out, removed: [...removedSet] };
}

/**
 * 写入侧拒写：找出请求体里「当前角色不可见、且**值确实发生变化**」的字段。
 *
 * ★ 为什么要比对现值：前端编辑页保存时通常回传完整对象（含它自己都看不到的字段
 *   原值）。若「出现即拒绝」，库管改个联系电话都会被拦 —— 功能直接不可用。
 *   故判据是「值变了」，而不是「字段出现了」。
 *
 * 比较规则：
 *   · 两边都为空（null / undefined / ''）→ 视为未变
 *   · 数字按数值比较（'500' 与 500 视为相同，避免类型差异造成误拦）
 *   · 其余按严格相等
 *
 * @param body     请求体（驼峰）
 * @param module   模块
 * @param hidden   隐藏字段集
 * @param existing 库中现值（驼峰格式化后的对象）；缺省时按「出现即视为改动」
 * @returns        被拒绝的字段（驼峰名）；空数组表示放行
 */
export function findForbiddenFieldWrites(
  body: Record<string, any>,
  module: FieldModule,
  hidden: Set<string>,
  existing?: Record<string, any> | null
): string[] {
  if (!body || hidden.size === 0) return [];
  const out: string[] = [];
  for (const field of hidden) {
    if (!(field in body)) continue;
    const next = body[field];
    if (next === undefined) continue; // JSON 里不会有 undefined；防御性跳过
    const prev = existing ? existing[field] : undefined;
    if (isUnchanged(prev, next)) continue;
    out.push(field);
  }
  return out;
}

/**
 * 写入侧拒写：找出请求体里「当前角色只读、且**值确实发生变化**」的字段。
 *
 * 只读模式：字段可见，但用户无权修改（财务主管可以修改凭证金额，普通用户只能看）。
 * 与 hidden 模式的区别：hidden 模式连看都不能看；readonly 模式可以看，但不能改。
 *
 * 判据同样是「值确实变化」，避免回传原值被误拦。
 *
 * @param body     请求体（驼峰）
 * @param module   模块
 * @param readonly Set 只读字段集（由 readonlyFieldsFor 得到）
 * @param existing 库中现值（驼峰格式化后的对象）；缺省时按「出现即视为改动」
 * @returns        被拒绝的字段（驼峰名）；空数组表示放行
 */
export function findReadOnlyFieldWrites(
  body: Record<string, any>,
  module: FieldModule,
  readonly: Set<string>,
  existing?: Record<string, any> | null
): string[] {
  if (!body || readonly.size === 0) return [];
  const out: string[] = [];
  for (const field of readonly) {
    if (!(field in body)) continue;
    const next = body[field];
    if (next === undefined) continue;
    const prev = existing ? existing[field] : undefined;
    if (isUnchanged(prev, next)) continue;
    out.push(field);
  }
  return out;
}

/** 判定「新值相对旧值是否未变化」（空值等价、数字宽容比较） */
function isUnchanged(prev: any, next: any): boolean {
  const pEmpty = prev === null || prev === undefined || prev === '';
  const nEmpty = next === null || next === undefined || next === '';
  if (pEmpty && nEmpty) return true;
  if (pEmpty !== nEmpty) return false;
  const pn = typeof prev === 'number' ? prev : Number(prev);
  const nn = typeof next === 'number' ? next : Number(next);
  if (Number.isFinite(pn) && Number.isFinite(nn)) return pn === nn;
  return prev === next;
}

/** 字段的中文名（用于拒写时的可读提示） */
export const FIELD_LABELS: Record<string, string> = {
  creditLimit: '授信额度',
  usedCredit: '已用授信',
  bankAccount: '银行账号',
  taxId: '税号',
  taxCode: '税码',
  reconciliationAccount: '对账账号',
  creditLevel: '信用等级',
  rating: '评级',
  blacklistReason: '黑名单原因',
  blacklistedAt: '拉黑时间',
  standardPrice: '标准价',
  movingAvgPrice: '移动平均价',
  unitPrice: '单价',
  orderAmount: '订单金额',
  customerName: '客户名称',
  customerTaxId: '客户税号',
  customerBankAccount: '客户银行账号',
  vendorTaxCode: '供应商税码',
  vendorBankAccount: '供应商银行账号',
  totalAmount: '订单总额',
  stockValue: '库存价值',
  inspectionCost: '检验费用',
  cost: '生产成本',
  voucherAmount: '凭证金额',
};

/** 把字段名列表转成中文可读串，用于 403 文案 */
export function describeFields(fields: string[]): string {
  return fields.map((f) => FIELD_LABELS[f] || f).join('、');
}

/**
 * 构造「无权限修改敏感字段」的 403 响应体。
 * 与项目既有错误约定保持一致：带 code + 中文原因，前端可直接展示。
 */
export function fieldPermissionError(fields: string[]): {
  error: string;
  code: string;
  fields: string[];
} {
  return {
    error: `无权修改${describeFields(fields)}（该字段对当前角色不可见）`,
    code: 'FIELD_FORBIDDEN',
    fields,
  };
}
