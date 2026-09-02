// GET/PUT/DELETE /api/serial-numbers/:id
import { getUserFromRequest, json } from '../../_shared/auth';
import { insertSerialMovement } from '../../_shared/serial';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM serial_masters WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '序列号不存在' }, 404);

  const movements = await db.prepare(`SELECT * FROM serial_movements WHERE serial_master_id = ?`).bind(id).all();

  return json({
    ...row,
    movements: movements.results || [],
  });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT id FROM serial_masters WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '序列号不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const fields = ['serialNo', 'materialId', 'materialCode', 'materialName', 'batchNo', 'warehouseId', 'huId', 'status', 'inboundDate', 'outboundDate', 'customerName', 'remarks'];
  const setClauses = [];
  const values = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      const col = f === 'serialNo' ? 'serial_no' : f === 'materialId' ? 'material_id' : f === 'materialCode' ? 'material_code' :
        f === 'materialName' ? 'material_name' : f === 'warehouseId' ? 'warehouse_id' : f === 'huId' ? 'hu_id' :
        f === 'inboundDate' ? 'inbound_date' : f === 'outboundDate' ? 'outbound_date' : f === 'customerName' ? 'customer_name' :
        f.toLowerCase();
      setClauses.push(`${col} = ?`);
      values.push(body[f]);
    }
  }
  setClauses.push('updated_at = ?', 'updated_by = ?');
  values.push(now, user.name);

  await db.prepare(`UPDATE serial_masters SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values, id).run();

  // 流转记录：状态变更 / 显式传入 movement 时落 serial_movements，保留全生命周期轨迹
  if (body.movement && typeof body.movement === 'object') {
    await insertSerialMovement(db, id, body.movement, user, now);
  }

  const updated = await db.prepare(`SELECT * FROM serial_masters WHERE id = ?`).bind(id).first();
  const movements = await db.prepare(`SELECT * FROM serial_movements WHERE serial_master_id = ?`).bind(id).all();
  return json({ ...updated, movements: movements.results || [] });
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id FROM serial_masters WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '序列号不存在' }, 404);

  await db.prepare(`DELETE FROM serial_masters WHERE id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM serial_movements WHERE serial_master_id = ?`).bind(id).run();

  return json({ success: true });
}
