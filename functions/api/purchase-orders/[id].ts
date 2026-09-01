// GET/PUT/DELETE /api/purchase-orders/:id
import { getUserFromRequest, json } from '../../_shared/auth';
import { assertRlsOwnership } from '../../_shared/rls';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM purchase_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '订单不存在' }, 404);

  // 查询行明细
  const items = await db.prepare(`SELECT * FROM purchase_order_items WHERE purchase_order_id = ?`).bind(id).all();

  return json({
    ...row,
    items: (items.results || []).map(r => ({
      id: r.id, purchase_order_id: r.purchase_order_id, material_id: r.material_id,
      material_code: r.material_code, material_name: r.material_name, specification: r.specification,
      unit: r.unit, ordered_quantity: Number(r.ordered_quantity), delivered_quantity: Number(r.delivered_quantity),
      unit_price: Number(r.unit_price), amount: Number(r.amount), tax_rate: r.tax_rate ? Number(r.tax_rate) : null,
      tax_amount: r.tax_amount ? Number(r.tax_amount) : null, price_with_tax: r.price_with_tax ? Number(r.price_with_tax) : null,
      amount_with_tax: r.amount_with_tax ? Number(r.amount_with_tax) : null, remarks: r.remarks,
    })),
  });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  // 校验存在且属当前 org
  const existing = await db.prepare(`SELECT id, owner_id FROM purchase_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '订单不存在' }, 404);
  if (!assertRlsOwnership(user, existing, 'purchase_orders')) return json({ error: '无权限修改他人订单' }, 403);

  const body = await context.request.json().catch(() => ({}));

  // code 唯一性检查（若更新 order_no）
  if (body.orderNo) {
    const dup = await db.prepare(`SELECT id FROM purchase_orders WHERE org_id = ? AND order_no = ? AND id != ?`).bind(user.org_id, body.orderNo, id).first();
    if (dup) return json({ error: '订单编号已存在' }, 409);
  }

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  const fields = ['orderNo', 'vendorId', 'vendorName', 'contact', 'phone', 'status', 'purchaseType', 'orderDate',
    'expectedDeliveryDate', 'actualDeliveryDate', 'totalAmount', 'currency', 'exchangeRate', 'taxIncluded',
    'totalTaxAmount', 'grandTotal', 'paymentTerms', 'tradeTerms', 'deliveryAddress', 'remarks',
    'projectNo', 'projectName', 'deliveredQuantity', 'creditOccupied', 'creditAmount', 'creditReleasedAmount',
    'confirmedBy', 'confirmedAt', 'confirmedNote', 'orderMode'];

  const setClauses = [];
  const values = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      const col = f === 'orderNo' ? 'order_no' : f === 'vendorId' ? 'vendor_id' : f === 'vendorName' ? 'vendor_name' :
        f === 'purchaseType' ? 'purchase_type' : f === 'orderDate' ? 'order_date' : f === 'expectedDeliveryDate' ? 'expected_delivery_date' :
        f === 'actualDeliveryDate' ? 'actual_delivery_date' : f === 'totalAmount' ? 'total_amount' : f === 'currency' ? 'currency' :
        f === 'exchangeRate' ? 'exchange_rate' : f === 'taxIncluded' ? 'tax_included' : f === 'totalTaxAmount' ? 'total_tax_amount' :
        f === 'grandTotal' ? 'grand_total' : f === 'paymentTerms' ? 'payment_terms' : f === 'tradeTerms' ? 'trade_terms' :
        f === 'deliveryAddress' ? 'delivery_address' : f === 'projectNo' ? 'project_no' : f === 'projectName' ? 'project_name' :
        f === 'deliveredQuantity' ? 'delivered_quantity' : f === 'creditOccupied' ? 'credit_occupied' : f === 'creditAmount' ? 'credit_amount' :
        f === 'creditReleasedAmount' ? 'credit_released_amount' : f === 'confirmedBy' ? 'confirmed_by' : f === 'confirmedAt' ? 'confirmed_at' :
        f === 'confirmedNote' ? 'confirmed_note' : f === 'orderMode' ? 'order_mode' : f.toLowerCase();
      setClauses.push(`${col} = ?`);
      values.push(body[f]);
    }
  }
  setClauses.push('updated_at = ?', 'updated_by = ?');
  values.push(now, user.name);

  await db.prepare(`UPDATE purchase_orders SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values, id).run();

  // 同步更新行明细（若提供）
  if (body.items && Array.isArray(body.items)) {
    await db.prepare(`DELETE FROM purchase_order_items WHERE purchase_order_id = ?`).bind(id).run();
    for (const item of body.items) {
      await db.prepare(`INSERT INTO purchase_order_items (id, purchase_order_id, material_id, material_code, material_name, specification, unit, ordered_quantity, delivered_quantity, unit_price, amount, tax_rate, tax_amount, price_with_tax, amount_with_tax, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        item.id || `poi-${id}-${Math.random().toString(36).slice(2, 6)}`,
        id, item.materialId, item.materialCode, item.materialName, item.specification, item.unit,
        item.orderedQuantity || 0, item.deliveredQuantity || 0, item.unitPrice || 0, item.amount || 0,
        item.taxRate || null, item.taxAmount || null, item.priceWithTax || null, item.amountWithTax || null, item.remarks || null
      ).run();
    }
  }

  const updated = await db.prepare(`SELECT * FROM purchase_orders WHERE id = ?`).bind(id).first();
  return json(updated);
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id, owner_id FROM purchase_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '订单不存在' }, 404);
  if (!assertRlsOwnership(user, row, 'purchase_orders')) return json({ error: '无权限删除他人订单' }, 403);

  await db.prepare(`DELETE FROM purchase_orders WHERE id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM purchase_order_items WHERE purchase_order_id = ?`).bind(id).run();

  return json({ success: true });
}
