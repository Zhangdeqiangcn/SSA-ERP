// GET /api/quality-holds — 分页查询质检扣留（按 org_id 隔离）
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const keyword = (url.searchParams.get('keyword') || '').trim();
  const status = url.searchParams.get('status') || undefined;

  const db = context.env.DB;
  let where = `WHERE qh.org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    where += ` AND (qh.material_code LIKE ? OR qh.material_name LIKE ? OR qh.warehouse_name LIKE ? OR qh.batch_no LIKE ?)`;
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw);
  }
  if (status) {
    where += ` AND qh.status = ?`;
    params.push(status);
  }

  const offset = (page - 1) * pageSize;
  const totalRows = await db.prepare(`SELECT COUNT(*) as cnt FROM quality_holds qh ${where}`).bind(...params).first();
  const rows = await db.prepare(`SELECT * FROM quality_holds qh ${where} ORDER BY qh.hold_date DESC, qh.created_at DESC LIMIT ? OFFSET ?`).bind(...params, pageSize, offset).all();

  return json({
    data: rows.results || [],
    total: totalRows?.cnt || 0,
    page,
    pageSize,
  });
}

// POST /api/quality-holds — 创建质检扣留
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const id = 'qh-' + crypto.randomUUID();
  await db.prepare(`INSERT INTO quality_holds (id, org_id, material_id, material_code, material_name, warehouse_id, warehouse_name, batch_no, quantity, status, source_inbound_no, hold_date, release_date, inspector, reason, created_at, updated_at, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id, user.org_id, body.materialId || null, body.materialCode || null, body.materialName || null, body.warehouseId || null, body.warehouseName || null,
    body.batchNo || null, Number(body.quantity) || 0, body.status || 'pending', body.sourceInboundNo || null, body.holdDate || null, body.releaseDate || null,
    body.inspector || null, body.reason || null, now, now, user.name, user.name
  ).run();

  const row = await db.prepare(`SELECT * FROM quality_holds WHERE id = ?`).bind(id).first();
  return json(row);
}
