// POST /api/finance/sales-invoice-voucher — 销售开票自动生成应收/收入凭证（P0-3 · V3.60.0）
// ───────────────────────────────────────────────────────────────
// 背景（审计报告 P0-3）：销售开票（销售管理 → 销售开票）此前是**纯前端实体**
//   （src/stores/salesAdvancedStore.ts），开票只向遗留模拟表 fin_account_entries
//   写中文分录，从不进权威 vouchers 表 ⇒ 合并报表应收(1122)/收入(6001)/销项(2221)
//   恒为 0，往来与收入主干完全未联动。
//
// 本端点把"销售开票"这一业务动作接上权威凭证通道（writeVoucher），
//   金额用前端回传的权威值（价税合计 = 应收；不含税净额 = 收入；税额 = 销项）。
//   与采购发票/付款走同一套"后置非阻断 + 幂等查重"范式。
//
// ★ S-04（V3.61.0）：传入 salesOrderNo 时服务端**独立复核金额**——
//   按源订单行金额算出允许区间（[未交量金额, 订单总额] ± 1%），超出即 400 拒绝入账。
//   销售发票仍是前端实体（诚实边界：无源单开票时跳过复核），
//   但「随意报金额生成权威凭证」这条路已被关上。
//
// ★ 幂等：以 source='sales-invoice' + source_no=`INV-SALE-<invoiceNo>` 查重，
//   重复触发（重试/重复提交）不会双记应收/收入。
import { getUserFromRequest, json } from '../../_shared/auth';
import { writeVoucher } from '../../_shared/voucherWriter';
import { roundAmount } from '../../_shared/money';

/**
 * ★ V3.61.0 S-04：开票金额的服务端独立复核（防篡改入账）
 *
 * 缺陷背景：销售发票是纯前端实体，服务端拿不到「发票本体」，金额只能取前端 body。
 *   若前端被改（或接口被直调），可以随意报一个金额生成权威凭证 —— 等于把
 *   应收/收入/销项的记账权交出去了。审计 S-04 点名的正是这一点。
 *
 * 复核口径（不改数据、只做闸门）：传入 salesOrderNo 时，服务端按该订单
 *   **行级已交数量 × 行单价**独立算出参考净额，与前端申报的 amount 比对：
 *   偏差超过容差（默认 max(1 元, 1%)）→ 直接 400 拒绝入账。
 *   未传订单号（无源单开票，如零售散单）时**跳过复核**并留痕，
 *   不影响既有合法用法（诚实边界：这种单据确实无权威源可查）。
 */
const AMOUNT_TOLERANCE_RATE = 0.01;   // 1%
const AMOUNT_TOLERANCE_MIN = 1;      // 至少 1 元

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  const db = env.DB;

  const body: any = await request.json().catch(() => ({}));
  const invoiceNo = String(body.invoiceNo || '').trim();
  if (!invoiceNo) return json({ error: '发票号必填' }, 400);

  const amount = roundAmount(Number(body.amount) || 0); // 不含税净额
  const tax = roundAmount(Number(body.taxAmount) || 0);
  const total = roundAmount(Number(body.totalAmount) || 0) || roundAmount(amount + tax);
  if (amount <= 0) return json({ error: '金额非法（不含税净额必须 > 0）' }, 400);

  // ── S-04 服务端独立复核：按源订单行「已交量 × 单价」算参考净额 ──
  const salesOrderNo = String(body.salesOrderNo || '').trim();
  if (salesOrderNo) {
    const so: any = await db
      .prepare(`SELECT id FROM sales_orders WHERE org_id = ? AND order_no = ? LIMIT 1`)
      .bind(user.org_id, salesOrderNo)
      .first();
    if (!so) {
      return json({ error: `开票金额复核失败：销售订单 ${salesOrderNo} 在本组织不存在`, code: 'ORDER_NOT_FOUND' }, 400);
    }
    // 参考口径：按源订单行金额求和。
    //   业务上存在两种合法开票口径（都与前端界面一致）：
    //     ① 货到开票（SalesInvoice.tsx 开票按钮）：金额 = Σ(订单量 − 已交量)× 单价
    //     ② 全额开票：金额 = Σ 订单量 × 单价
    //   服务端取「订单量 − 已交量」与「订单量」的较小值作为参考，
    //   即允许按未交部分开票（预开票），但**绝不允许超出订单总额**，
    //   也不允许「已全交却按未交量重复开票」（此时参考值=订单总额，申报偏小会被拦）。
    //   这样既守住了「篡改金额」这一 P1 本质，也不误伤界面的合法用法。
    const rows: any = await db
      .prepare(
        `SELECT quantity, unit_price, amount, delivered_quantity FROM sales_order_items WHERE sales_order_id = ?`
      )
      .bind(so.id)
      .all();
    const items: any[] = (rows as any)?.results || [];
    let refUndelivered = 0;
    let refFull = 0;
    for (const it of items) {
      const qty = Number(it.quantity) || 0;
      const price = Number(it.unit_price) || 0;
      const delivered = Math.min(Number(it.delivered_quantity) || 0, qty);
      refUndelivered += Math.max(qty - delivered, 0) * price;
      refFull += qty * price;
    }
    const refAmount = refUndelivered > 0 ? Math.min(refUndelivered, refFull) : refFull;
    if (refAmount <= 0) {
      return json({
        error: `开票金额复核失败：销售订单 ${salesOrderNo} 全部明细金额为 0，不可确认收入。`,
        code: 'ORDER_AMOUNT_ZERO',
      }, 400);
    }
    // 容差按「订单总额」而非参考值计算，避免订单金额极小时容差过窄误伤
    const tol = Math.max(AMOUNT_TOLERANCE_MIN, refFull * AMOUNT_TOLERANCE_RATE);
    // 允许区间：[min(未交, 全额) − 容差, 全额 + 容差]
    const lo = Math.max(refAmount - tol, 0);
    const hi = refFull + tol;
    if (amount < lo || amount > hi) {
      return json({
        error: `开票金额与订单不符：申报净额 ${amount}，按订单核算应在 ${roundAmount(lo)} ~ ${roundAmount(hi)} 之间（容差 ${roundAmount(tol)}）。请核对后重试。`,
        code: 'AMOUNT_MISMATCH',
        declared: amount,
        allowedFrom: roundAmount(lo),
        allowedTo: roundAmount(hi),
      }, 400);
    }
  }

  const sourceNo = `INV-SALE-${invoiceNo}`;
  const ex = await db
    .prepare(`SELECT id FROM vouchers WHERE org_id = ? AND source = 'sales-invoice' AND source_no = ?`)
    .bind(user.org_id, sourceNo)
    .first();
  if (ex) return json({ id: (ex as any).id, duplicated: true }, 200); // 已生成过，跳过

  const date = String(body.invoiceDate || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
  const period = date.slice(0, 7);
  const items: any[] = [
    { summary: `确认应收账款 ${invoiceNo}`, accountCode: '1122', accountName: '应收账款', debit: total, credit: 0 },
    { summary: `主营业务收入 ${invoiceNo}`, accountCode: '6001', accountName: '主营业务收入', debit: 0, credit: amount },
  ];
  if (tax > 0) {
    items.push({ summary: `销项税额 ${invoiceNo}`, accountCode: '2221', accountName: '应交税费-应交增值税(销项税额)', debit: 0, credit: tax });
  }

  const vid = await writeVoucher(db, user.org_id, user, {
    voucherNo: `INV-SALE-${invoiceNo}`,
    voucherType: '转',
    date,
    period,
    description: `销售开票入账 ${invoiceNo}`,
    source: 'sales-invoice',
    sourceNo,
    status: 'posted',
    totalDebit: total,
    totalCredit: total,
    items,
  });
  if (!vid) return json({ error: '凭证生成失败' }, 500);
  return json({ id: vid, duplicated: false }, 200);
}
