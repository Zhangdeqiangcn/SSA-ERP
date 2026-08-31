// GET/PUT/DELETE /api/sales-orders/:id
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM sales_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '订单不存在' }, 404);

  const items = await db.prepare(`SELECT * FROM sales_order_items WHERE sales_order_id = ?`).bind(id).all();

  return json({
    ...row,
    items: (items.results || []).map(r => ({
      id: r.id, sales_order_id: r.sales_order_id, material_id: r.material_id,
      material_code: r.material_code, material_name: r.material_name, specification: r.specification,
      unit: r.unit, quantity: Number(r.quantity), unit_price: Number(r.unit_price),
      amount: Number(r.amount), delivery_date: r.delivery_date, remarks: r.remarks,
      delivered_quantity: r.delivered_quantity ? Number(r.delivered_quantity) : 0,
    })),
  });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT id FROM sales_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '订单不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const fields = ['orderNo', 'type', 'status', 'customerId', 'customerName', 'customerCode', 'contactName', 'contactPhone',
    'projectId', 'projectNo', 'projectName', 'totalAmount', 'taxRate', 'taxAmount', 'grandTotal',
    'orderDate', 'expectedDeliveryDate', 'actualDeliveryDate', 'paymentTerms', 'deliveryAddress', 'salesPerson',
    'tradeTerms', 'shipToAddress', 'remarks', 'deliveredQuantity', 'receivedAmount', 'arDueDate',
    'creditOccupied', 'creditAmount', 'shippingMode', 'directShipVendorId', 'directShipVendorName',
    'thirdPartyCompanyName', 'contractId', 'contractNo'];

  const setClauses = [];
  const values = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      const col = f === 'orderNo' ? 'order_no' : f === 'customerId' ? 'customer_id' : f === 'customerName' ? 'customer_name' :
        f === 'customerCode' ? 'customer_code' : f === 'contactName' ? 'contact_name' : f === 'contactPhone' ? 'contact_phone' :
        f === 'projectId' ? 'project_id' : f === 'projectNo' ? 'project_no' : f === 'projectName' ? 'project_name' :
        f === 'totalAmount' ? 'total_amount' : f === 'taxRate' ? 'tax_rate' : f === 'taxAmount' ? 'tax_amount' :
        f === 'grandTotal' ? 'grand_total' : f === 'orderDate' ? 'order_date' : f === 'expectedDeliveryDate' ? 'expected_delivery_date' :
        f === 'actualDeliveryDate' ? 'actual_delivery_date' : f === 'paymentTerms' ? 'payment_terms' : f === 'deliveryAddress' ? 'delivery_address' :
        f === 'salesPerson' ? 'sales_person' : f === 'tradeTerms' ? 'trade_terms' : f === 'shipToAddress' ? 'ship_to_address' :
        f === 'deliveredQuantity' ? 'delivered_quantity' : f === 'receivedAmount' ? 'received_amount' : f === 'arDueDate' ? 'ar_due_date' :
        f === 'creditOccupied' ? 'credit_occupied' : f === 'creditAmount' ? 'credit_amount' : f === 'shippingMode' ? 'shipping_mode' :
        f === 'directShipVendorId' ? 'direct_ship_vendor_id' : f === 'directShipVendorName' ? 'direct_ship_vendor_name' :
        f === 'thirdPartyCompanyName' ? 'third_party_company_name' : f === 'contractId' ? 'contract_id' : f === 'contractNo' ? 'contract_no' :
        f.toLowerCase();
      setClauses.push(`${col} = ?`);
      values.push(body[f]);
    }
  }
  setClauses.push('updated_at = ?', 'updated_by = ?');
  values.push(now, user.name);

  await db.prepare(`UPDATE sales_orders SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values, id).run();

  // 同步更新行明细
  if (body.items && Array.isArray(body.items)) {
    await db.prepare(`DELETE FROM sales_order_items WHERE sales_order_id = ?`).bind(id).run();
    for (const item of body.items) {
      await db.prepare(`INSERT INTO sales_order_items (id, sales_order_id, material_id, material_code, material_name, specification, unit, quantity, unit_price, amount, delivery_date, remarks, delivered_quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        item.id || `soi-${id}-${Math.random().toString(36).slice(2, 6)}`,
        id, item.materialId, item.materialCode, item.materialName, item.specification, item.unit,
        item.quantity || 0, item.unitPrice || 0, item.amount || 0, item.deliveryDate || null, item.remarks || null, item.deliveredQuantity || 0
      ).run();
    }
  }

  const updated = await db.prepare(`SELECT * FROM sales_orders WHERE id = ?`).bind(id).first();
  return json(updated);
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id FROM sales_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '订单不存在' }, 404);

  await db.prepare(`DELETE FROM sales_orders WHERE id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM sales_order_items WHERE sales_order_id = ?`).bind(id).run();

  return json({ success: true });
}
