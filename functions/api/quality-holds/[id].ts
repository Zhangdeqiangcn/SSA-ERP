// GET/PUT/DELETE /api/quality-holds/:id
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM quality_holds WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '质检扣留不存在' }, 404);

  return json(row);
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT id FROM quality_holds WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '质检扣留不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  await db.prepare(`UPDATE quality_holds SET material_id = ?, material_code = ?, material_name = ?, warehouse_id = ?, warehouse_name = ?, batch_no = ?, quantity = ?, status = ?, source_inbound_no = ?, hold_date = ?, release_date = ?, inspector = ?, reason = ?, updated_at = ?, updated_by = ? WHERE id = ?`).bind(
    body.materialId || null, body.materialCode || null, body.materialName || null, body.warehouseId || null, body.warehouseName || null,
    body.batchNo || null, Number(body.quantity) || 0, body.status || 'pending', body.sourceInboundNo || null, body.holdDate || null,
    body.releaseDate || null, body.inspector || null, body.reason || null, now, user.name, id
  ).run();

  const updated = await db.prepare(`SELECT * FROM quality_holds WHERE id = ?`).bind(id).first();
  return json(updated);
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id FROM quality_holds WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '质检扣留不存在' }, 404);

  await db.prepare(`DELETE FROM quality_holds WHERE id = ?`).bind(id).run();

  return json({ success: true });
}
