// POST /api/serial-numbers/consume — FIFO 核销序列号
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  const materialId = body.materialId;
  const qty = parseInt(body.qty, 10);
  const newStatus = body.newStatus || 'shipped';
  const date = body.date || new Date().toISOString().replace(/\.\d{3}Z$/, '');
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  if (!materialId || !qty || qty <= 0) {
    return json({ error: 'materialId 与 qty 必填且 qty 为正整数' }, 400);
  }

  const avail = await db.prepare(`SELECT * FROM serial_masters WHERE org_id = ? AND material_id = ? AND status = 'in_stock' ORDER BY inbound_date ASC, serial_no ASC LIMIT ?`).bind(user.org_id, materialId, qty).all();
  const rows = avail.results || [];
  if (rows.length < qty) {
    return json({ error: '在库序列号不足', available: rows.length, required: qty }, 409);
  }

  const consumed: string[] = [];
  for (const r of rows) {
    await db.prepare(`UPDATE serial_masters SET status = ?, outbound_date = ?, updated_at = ?, updated_by = ? WHERE id = ?`).bind(newStatus, date, now, user.name, r.id).run();
    await db.prepare(`INSERT INTO serial_movements (id, serial_master_id, type, doc_no, date, status, note) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(
      'smv-' + crypto.randomUUID(), r.id, body.type || null, body.docNo || null, date, newStatus, null
    ).run();
    consumed.push(r.serial_no);
  }

  return json({ consumed });
}
