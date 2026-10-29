// GET /api/finance/inventory-reconciliation — 存货价值与总账对账（P2-2 · V3.60.0）
// ───────────────────────────────────────────────────────────────
// 审计发现：此前没有任何"存货价值 ↔ 总账"的对账手段，库存模块与财务总账
// 一旦因"只动账不记账 / 只记账不动账"的断点而分叉，无从发现（见审计报告 P2-2）。
//
// 本端点提供只读对账视图：
//   ① materials.stock_value 汇总 = 库存模块权威存货价值（移动均价滚动）
//   ② 总账存货科目余额 = 1403 原材料 + 1405 库存商品 的借贷净额
//      （来自所有业务凭证：收货/领料/完工/销售出库/盘点/调拨/报废…）
//   gap = ① − ②；|gap| ≤ 容差即认为对账一致。
//
// 不改任何数据，仅读取。权限沿用登录用户 org_id 隔离。
import { getUserFromRequest, json } from '../../../_shared/auth';
import { roundAmount } from '../../../_shared/money';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  const db = env.DB;
  const orgId = user.org_id;

  const num = (v: any): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // ① 库存模块存货价值（物料主数据移动均价滚动汇总）
  const matRow = await db
    .prepare(`SELECT COALESCE(SUM(stock_value), 0) AS v FROM materials WHERE org_id = ?`)
    .bind(orgId)
    .first();
  const materialStockValue = roundAmount(num(matRow?.v));

  // ② 总账存货科目余额（1403 + 1405 借贷净额）
  //★ V3.61.0 W-B2：只统计**已过账**凭证（status='posted'）。
  //   此前不过滤 v.status，草稿凭证（status='draft'）也会计入总账侧 → 对账把
  //   「未过账的账」当成真实余额，口径不严、gap 失真。对标收入/费用类报表口径：
  //   只有 posted 凭证才算账。
  const ledgerRows = await db
    .prepare(
      `SELECT vi.account_code AS code, COALESCE(SUM(vi.debit), 0) AS d, COALESCE(SUM(vi.credit), 0) AS c
         FROM voucher_items vi JOIN vouchers v ON vi.voucher_id = v.id
         WHERE v.org_id = ? AND vi.account_code IN ('1403', '1405')
           AND COALESCE(v.status, 'posted') = 'posted'
         GROUP BY vi.account_code`
    )
    .bind(orgId)
    .all();
  const byCode: Record<string, { debit: number; credit: number; net: number }> = {};
  for (const r of (ledgerRows.results || []) as any[]) {
    const d = num(r.d);
    const c = num(r.c);
    byCode[String(r.code)] = { debit: d, credit: c, net: roundAmount(d - c) };
  }
  const raw1403 = byCode['1403'] || { debit: 0, credit: 0, net: 0 };
  const raw1405 = byCode['1405'] || { debit: 0, credit: 0, net: 0 };
  const inventoryLedgerTotal = roundAmount(raw1403.net + raw1405.net);

  const gap = roundAmount(materialStockValue - inventoryLedgerTotal);
  const tolerance = 0.01;
  const reconciled = Math.abs(gap) <= tolerance;

  return json({
    materialStockValue,
    inventoryLedger: {
      '1403': raw1403,
      '1405': raw1405,
      total: inventoryLedgerTotal,
    },
    gap,
    reconciled,
    generatedAt: new Date().toISOString(),
  });
}
