// GET /api/purchase-orders — 分页查询采购订单（按 org_id 隔离）
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { rlsFragment } from '../../_shared/rls';
import { audit } from '../../_shared/entities';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const keyword = (url.searchParams.get('keyword') || '').trim();
  const vendorId = url.searchParams.get('vendorId') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const sortBy = url.searchParams.get('sortBy') || 'order_date';
  const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'ASC' : 'DESC';

  const db = context.env.DB;
  let where = `WHERE po.org_id = ?`;
  const params = [user.org_id];
  const rls = rlsFragment(user, 'purchase_orders');
  if (rls.clause !== '1=1') { where += ' AND ' + rls.clause.replace(/owner_id/g, 'po.owner_id'); params.push(rls.param!); }

  if (keyword) {
    where += ` AND (po.order_no LIKE ? OR po.vendor_name LIKE ? OR po.contact LIKE ?)`;
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (vendorId) {
    where += ` AND po.vendor_id = ?`;
    params.push(vendorId);
  }
  if (status) {
    where += ` AND po.status = ?`;
    params.push(status);
  }

  const allowedSort = ['order_date', 'expected_delivery_date', 'total_amount', 'created_at'];
  const sortCol = allowedSort.includes(sortBy) ? sortBy : 'order_date';
  const order = `${sortCol} ${sortOrder}`;

  const offset = (page - 1) * pageSize;
  const totalRows = await db.prepare(`SELECT COUNT(*) as cnt FROM purchase_orders po ${where}`).bind(...params).first();
  const rows = await db.prepare(`SELECT * FROM purchase_orders po ${where} ORDER BY ${order} LIMIT ? OFFSET ?`).bind(...params, pageSize, offset).all();

  // 行明细随列表一并返回（snake 原样，前端用 snakeToCamel 统一映射），保证前端 purchaseStore 取到完整订单
  const data = [];
  for (const r of (rows.results || [])) {
    const items = await db.prepare(`SELECT * FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY rowid`).bind(r.id).all();
    data.push({ ...r, items: (items.results || []).map((it: any) => ({ ...it })) });
  }

  return json({
    data,
    total: totalRows?.cnt || 0,
    page,
    pageSize,
  });
}

// POST /api/purchase-orders — 创建采购订单（W1 根治双通道：直写真实 D1 purchase_orders）
// 会话鉴权 + org 隔离 + 单号唯一 + 行明细 + B10 version/history 落库 + 审计
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  if (!body.orderNo || !body.vendorId) return json({ error: '订单编号与供应商必填' }, 400);
  // 防御：order_date 为 NOT NULL 且无默认，前端必传；若缺失给安全默认值，避免 500
  if (!body.orderDate) body.orderDate = new Date().toISOString().slice(0, 10);

  const dup = await db.prepare(`SELECT id FROM purchase_orders WHERE org_id = ? AND order_no = ?`).bind(user.org_id, body.orderNo).first();
  if (dup) return json({ error: '订单编号已存在' }, 409);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  const id = uid('po');

  const fields = ['orderNo', 'vendorId', 'vendorName', 'contact', 'phone', 'status', 'purchaseType', 'orderDate',
    'expectedDeliveryDate', 'actualDeliveryDate', 'totalAmount', 'currency', 'exchangeRate', 'taxIncluded',
    'totalTaxAmount', 'grandTotal', 'paymentTerms', 'tradeTerms', 'deliveryAddress', 'remarks',
    'projectNo', 'projectName', 'deliveredQuantity', 'creditOccupied', 'creditAmount', 'creditReleasedAmount',
    'confirmedBy', 'confirmedAt', 'confirmedNote', 'orderMode'];
  const colFor = (f) => f === 'orderNo' ? 'order_no' : f === 'vendorId' ? 'vendor_id' : f === 'vendorName' ? 'vendor_name' :
    f === 'purchaseType' ? 'purchase_type' : f === 'orderDate' ? 'order_date' : f === 'expectedDeliveryDate' ? 'expected_delivery_date' :
    f === 'actualDeliveryDate' ? 'actual_delivery_date' : f === 'totalAmount' ? 'total_amount' : f === 'currency' ? 'currency' :
    f === 'exchangeRate' ? 'exchange_rate' : f === 'taxIncluded' ? 'tax_included' : f === 'totalTaxAmount' ? 'total_tax_amount' :
    f === 'grandTotal' ? 'grand_total' : f === 'paymentTerms' ? 'payment_terms' : f === 'tradeTerms' ? 'trade_terms' :
    f === 'deliveryAddress' ? 'delivery_address' : f === 'projectNo' ? 'project_no' : f === 'projectName' ? 'project_name' :
    f === 'deliveredQuantity' ? 'delivered_quantity' : f === 'creditOccupied' ? 'credit_occupied' : f === 'creditAmount' ? 'credit_amount' :
    f === 'creditReleasedAmount' ? 'credit_released_amount' : f === 'confirmedBy' ? 'confirmed_by' : f === 'confirmedAt' ? 'confirmed_at' :
    f === 'confirmedNote' ? 'confirmed_note' : f === 'orderMode' ? 'order_mode' : f.toLowerCase();

  const cols = ['org_id', 'id'];
  const vals = [user.org_id, id];
  for (const f of fields) {
    if (body[f] !== undefined) { cols.push(colFor(f)); vals.push(body[f]); }
  }
  cols.push('version', 'history', 'created_at', 'updated_at', 'created_by', 'updated_by');
  vals.push(body.version ?? 1, body.history ? JSON.stringify(body.history) : '[]', now, now, user.id, user.name);

  await db.prepare(`INSERT INTO purchase_orders (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...vals).run();

  if (Array.isArray(body.items)) {
    for (const item of body.items) {
      await db.prepare(`INSERT INTO purchase_order_items (id, purchase_order_id, material_id, material_code, material_name, specification, unit, ordered_quantity, delivered_quantity, unit_price, amount, tax_rate, tax_amount, price_with_tax, amount_with_tax, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        item.id || `poi-${id}-${Math.random().toString(36).slice(2, 6)}`,
        id, item.materialId, item.materialCode, item.materialName, item.specification, item.unit,
        item.orderedQuantity || 0, item.deliveredQuantity || 0, item.unitPrice || 0, item.amount || 0,
        item.taxRate || null, item.taxAmount || null, item.priceWithTax || null, item.amountWithTax || null, item.remarks || null
      ).run();
    }
  }

  await audit(db, user.org_id, user, 'purchase_orders', 'create', `创建采购订单 ${body.orderNo}`);
  const created = await db.prepare(`SELECT * FROM purchase_orders WHERE id = ?`).bind(id).first();
  return json({ ...created, items: body.items || [] }, 201);
}
