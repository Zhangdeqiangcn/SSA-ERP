/**
 * 凭证直写（服务端权威写入 D1 的 vouchers + voucher_items）
 * ------------------------------------------------------------------
 * 单一写入路径，被两处共用：
 *   ① /api/vouchers POST —— 手工 / 前端生成的凭证（含发票校验、付款等自动凭证）
 *   ② inventoryPosting —— 入库 / 出库自动业务凭证（采购暂估、出库成本结转）
 *
 * 之所以抽成公共函数（而非 inventoryPosting 内联写 SQL）：
 *   凭证表列集（voucher_no/date/source/total_debit/...）曾多次分叉（见迁移 0068），
 *   "两处 INSERT 各自拼列" 是经典的漂移坑（N1 硬规矩㉜㉟）。统一到这一处，
 *   列集只维护一份，手工凭证与业务凭证永远同口径。
 *
 * 借贷平衡：本函数**最后一道闸**（与 /api/vouchers 的 guardVoucherItems 双保险）。
 *   服务端算账的金额（inventoryPosting 反推的 totalCost / unitCost×qty）本应自平，
 *   但仍强制校验 Σ借 = Σ贷（容差 0.005），不平或空凭证一律拒绝写入，绝不落脏数据。
 */
import { VOUCHER_BALANCE_TOLERANCE } from './voucherGuard';

const nowIso = (): string => new Date().toISOString().replace(/\.\d{3}Z$/, '');
import { roundAmount } from './money';
// V3.61.0 P0-1：期末结账守卫（凭证侧第二道防线）。appState.ts 零 import，不构成循环依赖。
import { isPeriodClosed } from './appState';

export interface VoucherItemInput {
  summary?: string;
  accountCode?: string;
  accountName?: string;
  debit?: number;
  credit?: number;
  ledgerBook?: string;
  /**
   * V3.45.0 补齐（此前这些字段被**硬编码丢弃**，导致两个下游硬伤）：
   *   ① currency/exchangeRate —— 原写死 'CNY'/1，多币种折算完全失效；
   *   ② projectId/costCenterId —— 原写死 null，而 guardBudget 恰恰按
   *      `SUM(debit) WHERE project_id = ?` 统计项目已发生额 ⇒ 恒为 0 ⇒
   *      **超预算永不触发**（V3.29.0 声称的"预算硬拦"实为假管控）。
   * 前端 toVoucherPayload 一直在传这些值，是服务端在丢弃它们。
   */
  currency?: string;
  exchangeRate?: number;
  projectId?: string;
  costCenterId?: string;
  lineNo?: number;
}
export interface VoucherInput {
  voucherNo: string;
  voucherType?: string;
  date: string;
  period?: string;
  description?: string;
  source: string;
  sourceNo?: string;
  status?: string;
  totalDebit: number;
  totalCredit: number;
  currency?: string;
  ledgerBook?: string;
  remark?: string;
  items: VoucherItemInput[];
}

// 凭证头字段白名单（只写这些，其余列保持表默认值）。与 /api/vouchers POST 同口径。
const HEAD_FIELDS = [
  'voucherNo', 'voucherType', 'date', 'period', 'description',
  'source', 'status', 'totalDebit', 'totalCredit', 'currency', 'sourceNo', 'ledgerBook', 'remark',
];
const headColFor = (f: string): string => {
  switch (f) {
    case 'voucherNo': return 'voucher_no';
    case 'voucherType': return 'voucher_type';
    case 'date': return 'date';
    case 'period': return 'period';
    case 'description': return 'description';
    case 'source': return 'source';
    case 'status': return 'status';
    case 'totalDebit': return 'total_debit';
    case 'totalCredit': return 'total_credit';
    case 'currency': return 'currency';
    case 'sourceNo': return 'source_no';
    case 'ledgerBook': return 'ledger_book';
    case 'remark': return 'remarks';
    default: return f.toLowerCase();
  }
};

/**
 * P0-4：构建「一张凭证」的待执行语句（头 + 分录），**不立即执行**。
 *
 * 为什么单拆出来：让调用方能把「同一笔业务的多张写」收进**同一个原子批次**。
 * 折旧计提原本「先 db.batch(资产台账) 再 writeVoucher(凭证)」两步分离，凭证因
 * UNIQUE 冲突失败时资产累计折旧已被累加 → 双计提/账实不符。把两者并进一个
 * `db.batch` 后，凭证头 UNIQUE(org_id, voucher_no) 冲突会**连同资产更新一起回滚**。
 *
 * 借贷平衡校验（同 writeVoucher 最后一道闸）：Σ借 = Σ贷（容差内）才产出语句，
 * 空凭证返回空 stmts（调用方据此判「不写」）。
 *
 * @returns { id, stmts } 凭证 id 与待执行语句数组；stmts 为空表示该凭证无效不应写
 */
export function buildVoucherStmts(
  db: any,
  orgId: string,
  user: any,
  payload: VoucherInput,
  idOverride?: string
): { id: string | null; stmts: any[] } {
  const td = roundAmount(payload.totalDebit);
  const tc = roundAmount(payload.totalCredit);
  if (td <= 0 && tc <= 0) return { id: null, stmts: [] }; // 空凭证无意义
  if (Math.abs(td - tc) >= VOUCHER_BALANCE_TOLERANCE) return { id: null, stmts: [] }; // 借贷不平

  const id = idOverride || 'v-' + crypto.randomUUID();
  const now = nowIso();

  const cols = ['org_id', 'id'];
  const vals: any[] = [orgId, id];
  for (const f of HEAD_FIELDS) {
    const v = (payload as any)[f];
    if (v === undefined || v === null || v === '') continue;
    cols.push(headColFor(f));
    vals.push(f === 'status' ? (v || 'draft') : v);
  }
  cols.push('created_at', 'updated_at', 'created_by', 'updated_by');
  vals.push(now, now, user.id, user.name);

  const headStmt = db
    .prepare(`INSERT INTO vouchers (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
    .bind(...vals);

  const itemStmts: any[] = [];
  (payload.items || []).forEach((it, i) => {
    itemStmts.push(
      db
        .prepare(
          `INSERT INTO voucher_items (id, voucher_id, line_no, summary, account_code, account_name, debit, credit, currency, exchange_rate, cost_center_id, project_id, ledger_book) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          'vi-' + crypto.randomUUID(), id,
          // 行号用调用方给的 lineNo（业务可读的行序），缺省才回退循环下标 +1（人看的 1-based）
          it.lineNo != null ? Number(it.lineNo) : i + 1,
          it.summary || null, it.accountCode || null, it.accountName || null,
          roundAmount(it.debit || 0), roundAmount(it.credit || 0),
          // 币种/汇率：行级优先、其次凭证头、最后兜底人民币
          it.currency || payload.currency || 'CNY',
          Number(it.exchangeRate) > 0 ? Number(it.exchangeRate) : 1,
          it.costCenterId || null,
          it.projectId || null,
          it.ledgerBook || payload.ledgerBook || '0000'
        )
    );
  });

  return { id, stmts: [headStmt, ...itemStmts] };
}

/**
 * 直写一张凭证（头 + 分录，原子批次）。
 * @returns 成功返回凭证 id；借贷不平 / 空凭证 / 缺少必填返回 null（调用方应视为"不写"）
 */
export async function writeVoucher(
  db: any,
  orgId: string,
  user: any,
  payload: VoucherInput,
  idOverride?: string
): Promise<string | null> {
  // ★ V3.61.0 P0-1 · 期末结账守卫（凭证侧第二道防线）
  //   库存侧已在 inventoryPosting 的 postInbound/postOutbound 入口拦；此处再拦一次，
  //   覆盖**非库存来源**的自动凭证（发票/付款/开票/折旧/结转等），一处覆盖全部记账路径。
  //   口径：结账期一律不写（draft 也不写——已关账月份不该再产生任何新凭证）。
  //   返回 null 而非抛错：调用方既有范式是「null = 不写」（幂等查重/金额非法也走这里），
  //   抛错会打破「后置非阻断记账」契约并把正常业务打成 500。
  const vPeriod = String(payload.period || String(payload.date || '').slice(0, 7) || '').slice(0, 7);
  if (vPeriod && await isPeriodClosed(db, orgId, vPeriod)) {
    console.error(`[writeVoucher] 会计期间 ${vPeriod} 已结账，拒绝生成凭证（source=${payload.source || '-'} sourceNo=${payload.sourceNo || '-'}）`);
    return null;
  }
  const { id, stmts } = buildVoucherStmts(db, orgId, user, payload, idOverride);
  if (stmts.length === 0) return null;
  await db.batch(stmts);
  return id;
}
