// GET/PUT/DELETE /api/work-orders/picking/:id
import { getUserFromRequest, json } from '../../../_shared/auth';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM work_order_pickings WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '领料记录不存在' }, 404);

  return json({
    ...row,
    quantity: Number(row.quantity),
  });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT id FROM work_order_pickings WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '领料记录不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const fields = ['workOrderNo', 'materialId', 'materialCode', 'materialName', 'unit', 'quantity', 'outboundNo', 'issuedAt'];
  const setClauses = [];
  const values = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      const col = f === 'workOrderNo' ? 'work_order_no' : f === 'materialId' ? 'material_id' : f === 'materialCode' ? 'material_code' :
        f === 'materialName' ? 'material_name' : f === 'outboundNo' ? 'outbound_no' : f === 'issuedAt' ? 'issued_at' :
        f.toLowerCase();
      setClauses.push(`${col} = ?`);
      values.push(body[f]);
    }
  }
  setClauses.push('updated_at = ?', 'updated_by = ?');
  values.push(now, user.name);

  await db.prepare(`UPDATE work_order_pickings SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values, id).run();

  const updated = await db.prepare(`SELECT * FROM work_order_pickings WHERE id = ?`).bind(id).first();
  return json(updated);
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id FROM work_order_pickings WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '领料记录不存在' }, 404);

  await db.prepare(`DELETE FROM work_order_pickings WHERE id = ?`).bind(id).run();

  return json({ success: true });
}
