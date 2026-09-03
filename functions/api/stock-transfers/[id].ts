// GET/PUT/DELETE /api/stock-transfers/:id
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM stock_transfers WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '转储单不存在' }, 404);

  const items = await db.prepare(`SELECT * FROM stock_transfer_items WHERE stock_transfer_id = ?`).bind(id).all();

  return json({
    ...row,
    items: (items.results || []).map(r => ({
      id: r.id, material_id: r.material_id, material_code: r.material_code, material_name: r.material_name,
      unit: r.unit, quantity: Number(r.quantity), batch_no: r.batch_no, location_id: r.location_id,
    })),
  });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT id, transfer_no FROM stock_transfers WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '转储单不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  await db.prepare(`UPDATE stock_transfers SET transfer_no = ?, from_warehouse_id = ?, from_warehouse_name = ?, to_warehouse_id = ?, to_warehouse_name = ?, from_org_id = ?, to_org_id = ?, status = ?, transfer_date = ?, remarks = ?, updated_at = ?, updated_by = ? WHERE id = ?`).bind(
    body.transferNo || existing.transfer_no, body.fromWarehouseId || null, body.fromWarehouseName || null, body.toWarehouseId || null, body.toWarehouseName || null,
    body.fromOrgId || null, body.toOrgId || null, body.status || 'draft', body.transferDate || null, body.remarks || null, now, user.name, id
  ).run();

  if (body.items && Array.isArray(body.items)) {
    await db.prepare(`DELETE FROM stock_transfer_items WHERE stock_transfer_id = ?`).bind(id).run();
    for (const item of body.items) {
      await db.prepare(`INSERT INTO stock_transfer_items (id, stock_transfer_id, material_id, material_code, material_name, unit, quantity, batch_no, location_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        'sti-' + crypto.randomUUID(), id, item.materialId || null, item.materialCode || null, item.materialName || null,
        item.unit || null, Number(item.quantity) || 0, item.batchNo || null, item.locationId || null
      ).run();
    }
  }

  const updated = await db.prepare(`SELECT * FROM stock_transfers WHERE id = ?`).bind(id).first();
  return json(updated);
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id FROM stock_transfers WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '转储单不存在' }, 404);

  await db.prepare(`DELETE FROM stock_transfers WHERE id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM stock_transfer_items WHERE stock_transfer_id = ?`).bind(id).run();

  return json({ success: true });
}
