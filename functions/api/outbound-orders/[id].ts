// GET/PUT/DELETE /api/outbound-orders/:id
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM outbound_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '出库单不存在' }, 404);

  const items = await db.prepare(`SELECT * FROM outbound_order_items WHERE outbound_order_id = ?`).bind(id).all();

  return json({
    ...row,
    items: (items.results || []).map(r => ({
      id: r.id, outbound_order_id: r.outbound_order_id, material_id: r.material_id,
      material_code: r.material_code, material_name: r.material_name, specification: r.specification,
      unit: r.unit, quantity: Number(r.quantity), batch_no: r.batch_no, location_id: r.location_id,
      location_name: r.location_name, unit_cost: r.unit_cost ? Number(r.unit_cost) : null,
      cost_amount: r.cost_amount ? Number(r.cost_amount) : null, serial_nos: r.serial_nos ? JSON.parse(r.serial_nos) : null,
      hu_id: r.hu_id,
    })),
  });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT id FROM outbound_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '出库单不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const fields = ['outboundNo', 'type', 'sourceNo', 'customerId', 'customerName', 'vendorId', 'vendorName',
    'status', 'warehouseId', 'warehouseName', 'operator', 'outboundDate', 'remarks', 'inventoryPosted',
    'cogsPosted', 'picker', 'packagingMethod', 'packageCount', 'weight', 'volume', 'shippingCompany', 'trackingNo'];

  const setClauses = [];
  const values = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      const col = f === 'outboundNo' ? 'outbound_no' : f === 'sourceNo' ? 'source_no' : f === 'customerId' ? 'customer_id' :
        f === 'customerName' ? 'customer_name' : f === 'vendorId' ? 'vendor_id' : f === 'vendorName' ? 'vendor_name' :
        f === 'warehouseId' ? 'warehouse_id' : f === 'warehouseName' ? 'warehouse_name' : f === 'outboundDate' ? 'outbound_date' :
        f === 'packagingMethod' ? 'packaging_method' : f === 'packageCount' ? 'package_count' : f === 'shippingCompany' ? 'shipping_company' :
        f === 'trackingNo' ? 'tracking_no' : f === 'inventoryPosted' ? 'inventory_posted' : f === 'cogsPosted' ? 'cogs_posted' :
        f.toLowerCase();
      setClauses.push(`${col} = ?`);
      values.push(body[f]);
    }
  }
  setClauses.push('updated_at = ?', 'updated_by = ?');
  values.push(now, user.name);

  await db.prepare(`UPDATE outbound_orders SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values, id).run();

  if (body.items && Array.isArray(body.items)) {
    await db.prepare(`DELETE FROM outbound_order_items WHERE outbound_order_id = ?`).bind(id).run();
    for (const item of body.items) {
      await db.prepare(`INSERT INTO outbound_order_items (id, outbound_order_id, material_id, material_code, material_name, specification, unit, quantity, batch_no, location_id, location_name, unit_cost, cost_amount, serial_nos, hu_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        item.id || `ooi-${id}-${Math.random().toString(36).slice(2, 6)}`,
        id, item.materialId, item.materialCode, item.materialName, item.specification, item.unit,
        item.quantity || 0, item.batchNo || null, item.locationId || null, item.locationName || null,
        item.unitCost || null, item.costAmount || null, item.serialNos ? JSON.stringify(item.serialNos) : null,
        item.huId || null
      ).run();
    }
  }

  const updated = await db.prepare(`SELECT * FROM outbound_orders WHERE id = ?`).bind(id).first();
  return json(updated);
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id FROM outbound_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '出库单不存在' }, 404);

  await db.prepare(`DELETE FROM outbound_orders WHERE id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM outbound_order_items WHERE outbound_order_id = ?`).bind(id).run();

  return json({ success: true });
}
