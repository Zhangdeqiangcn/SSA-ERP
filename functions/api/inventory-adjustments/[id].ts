// GET/PUT/DELETE /api/inventory-adjustments/:id
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM inventory_adjustments WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '调整单不存在' }, 404);

  const items = await db.prepare(`SELECT * FROM inventory_adjustment_items WHERE inventory_adjustment_id = ?`).bind(id).all();

  return json({
    ...row,
    items: (items.results || []).map(r => ({
      id: r.id, material_id: r.material_id, material_code: r.material_code, material_name: r.material_name,
      unit: r.unit, location_id: r.location_id, book_qty: Number(r.book_qty), actual_qty: Number(r.actual_qty),
      delta_qty: Number(r.delta_qty), reason: r.reason,
    })),
  });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT id, adjustment_no FROM inventory_adjustments WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '调整单不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  await db.prepare(`UPDATE inventory_adjustments SET adjustment_no = ?, warehouse_id = ?, warehouse_name = ?, status = ?, reason = ?, date = ?, total_delta_qty = ?, voucher_no = ?, updated_at = ?, updated_by = ? WHERE id = ?`).bind(
    body.adjustmentNo || existing.adjustment_no, body.warehouseId || null, body.warehouseName || null, body.status || 'draft', body.reason || null, body.date || null,
    Number(body.totalDeltaQty) || 0, body.voucherNo || null, now, user.name, id
  ).run();

  if (body.items && Array.isArray(body.items)) {
    await db.prepare(`DELETE FROM inventory_adjustment_items WHERE inventory_adjustment_id = ?`).bind(id).run();
    for (const item of body.items) {
      await db.prepare(`INSERT INTO inventory_adjustment_items (id, inventory_adjustment_id, material_id, material_code, material_name, unit, location_id, book_qty, actual_qty, delta_qty, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        'adji-' + crypto.randomUUID(), id, item.materialId || null, item.materialCode || null, item.materialName || null, item.unit || null,
        item.locationId || null, Number(item.bookQty) || 0, Number(item.actualQty) || 0, Number(item.deltaQty) || 0, item.reason || null
      ).run();
    }
  }

  const updated = await db.prepare(`SELECT * FROM inventory_adjustments WHERE id = ?`).bind(id).first();
  return json(updated);
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id FROM inventory_adjustments WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '调整单不存在' }, 404);

  await db.prepare(`DELETE FROM inventory_adjustments WHERE id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM inventory_adjustment_items WHERE inventory_adjustment_id = ?`).bind(id).run();

  return json({ success: true });
}
