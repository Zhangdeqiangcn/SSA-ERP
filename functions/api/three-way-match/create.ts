// POST /api/three-way-match — 创建三单匹配记录
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));

  const {
    poId, poNo, inboundId, inboundNo, invoiceId, invoiceNo,
    poQuantity, inboundQuantity, poUnitPrice, invoiceUnitPrice,
    poAmount, inboundAmount, invoiceAmount, remarks
  } = body;

  if (!poId || !poNo) return json({ error: '缺少采购订单信息' }, 400);

  // 计算差异
  const qtyVariance = Math.abs(inboundQuantity - poQuantity);
  const priceVariance = invoiceUnitPrice ? Math.abs(invoiceUnitPrice - poUnitPrice) : 0;
  const amountVariance = Math.abs(invoiceAmount - poAmount);

  // 判断是否匹配（允许 1% 误差）
  const qtyMatch = qtyVariance <= poQuantity * 0.01;
  const priceMatch = !invoiceUnitPrice || priceVariance <= poUnitPrice * 0.01;
  const amountMatch = amountVariance <= poAmount * 0.01;
  const matchStatus = (qtyMatch && priceMatch && amountMatch) ? 'matched' : 'discrepancy';

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  const id = body.id || `twm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  await db.prepare(`INSERT INTO three_way_match (
    id, org_id, po_id, po_no, inbound_id, inbound_no, invoice_id, invoice_no,
    match_status, po_quantity, inbound_quantity, qty_variance, qty_match,
    po_unit_price, invoice_unit_price, price_variance, price_match,
    po_amount, inbound_amount, invoice_amount, amount_variance, amount_match,
    matched_by, matched_at, discrepancy, remarks, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id, user.org_id, poId, poNo, inboundId || null, inboundNo || null, invoiceId || null, invoiceNo || null,
    matchStatus, poQuantity, inboundQuantity, qtyVariance, qtyMatch ? 1 : 0,
    poUnitPrice, invoiceUnitPrice || null, priceVariance, priceMatch ? 1 : 0,
    poAmount, inboundAmount || 0, invoiceAmount, amountVariance, amountMatch ? 1 : 0,
    user.name, matchStatus === 'matched' ? now : null,
    matchStatus === 'discrepancy' ? '数量/单价/金额存在差异' : null, remarks || null,
    now, now
  ).run();

  return json({ success: true, id });
}
