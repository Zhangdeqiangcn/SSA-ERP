// GET/PUT/DELETE /api/inbound-orders/:id
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM inbound_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '入库单不存在' }, 404);

  const items = await db.prepare(`SELECT * FROM inbound_order_items WHERE inbound_order_id = ?`).bind(id).all();

  return json({
    ...row,
    items: (items.results || []).map(r => ({
      id: r.id, inbound_order_id: r.inbound_order_id, material_id: r.material_id,
      material_code: r.material_code, material_name: r.material_name, specification: r.specification,
      unit: r.unit, expected_quantity: Number(r.expected_quantity), actual_quantity: Number(r.actual_quantity),
      batch_no: r.batch_no, location_id: r.location_id, location_name: r.location_name,
      quality_status: r.quality_status, unit_price: r.unit_price ? Number(r.unit_price) : null,
      amount: r.amount ? Number(r.amount) : null, serial_nos: r.serial_nos ? JSON.parse(r.serial_nos) : null,
      hu_id: r.hu_id, production_date: r.production_date, expiry_date: r.expiry_date,
    })),
  });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT id FROM inbound_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '入库单不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const fields = ['inboundNo', 'type', 'sourceNo', 'vendorId', 'vendorName', 'status', 'warehouseId',
    'warehouseName', 'operator', 'inboundDate', 'totalCost', 'subcontractMaterialCost', 'asnShipmentNo',
    'remarks', 'inventoryPosted', 'costPosted'];

  const setClauses = [];
  const values = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      const col = f === 'inboundNo' ? 'inbound_no' : f === 'sourceNo' ? 'source_no' : f === 'vendorId' ? 'vendor_id' :
        f === 'vendorName' ? 'vendor_name' : f === 'warehouseId' ? 'warehouse_id' : f === 'warehouseName' ? 'warehouse_name' :
        f === 'inboundDate' ? 'inbound_date' : f === 'totalCost' ? 'total_cost' : f === 'subcontractMaterialCost' ? 'subcontract_material_cost' :
        f === 'asnShipmentNo' ? 'asn_shipment_no' : f === 'inventoryPosted' ? 'inventory_posted' : f === 'costPosted' ? 'cost_posted' :
        f.toLowerCase();
      setClauses.push(`${col} = ?`);
      values.push(body[f]);
    }
  }
  setClauses.push('updated_at = ?', 'updated_by = ?');
  values.push(now, user.name);

  await db.prepare(`UPDATE inbound_orders SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values, id).run();

  if (body.items && Array.isArray(body.items)) {
    await db.prepare(`DELETE FROM inbound_order_items WHERE inbound_order_id = ?`).bind(id).run();
    for (const item of body.items) {
      await db.prepare(`INSERT INTO inbound_order_items (id, inbound_order_id, material_id, material_code, material_name, specification, unit, expected_quantity, actual_quantity, batch_no, location_id, location_name, quality_status, unit_price, amount, serial_nos, hu_id, production_date, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        item.id || `ini-${id}-${Math.random().toString(36).slice(2, 6)}`,
        id, item.materialId, item.materialCode, item.materialName, item.specification, item.unit,
        item.expectedQuantity || 0, item.actualQuantity || 0, item.batchNo || null, item.locationId || null,
        item.locationName || null, item.qualityStatus || 'qualified', item.unitPrice || null, item.amount || null,
        item.serialNos ? JSON.stringify(item.serialNos) : null, item.huId || null, item.productionDate || null,
        item.expiryDate || null
      ).run();
    }
  }

  const updated = await db.prepare(`SELECT * FROM inbound_orders WHERE id = ?`).bind(id).first();
  return json(updated);
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id FROM inbound_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '入库单不存在' }, 404);

  await db.prepare(`DELETE FROM inbound_orders WHERE id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM inbound_order_items WHERE inbound_order_id = ?`).bind(id).run();

  return json({ success: true });
}
