// GET /api/work-orders/picking — 分页查询工单领料（按 org_id 隔离）
// POST /api/work-orders/picking — 创建工单领料
import { getUserFromRequest, json } from '../../../_shared/auth';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const workOrderId = url.searchParams.get('workOrderId') || '';
  const materialName = (url.searchParams.get('materialName') || '').trim();

  let sql = `SELECT * FROM work_order_pickings WHERE org_id = ?`;
  const params = [user.org_id];
  if (workOrderId) {
    sql += ` AND work_order_id = ?`;
    params.push(workOrderId);
  }
  if (materialName) {
    sql += ` AND material_name LIKE ?`;
    params.push(`%${materialName}%`);
  }
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, (page - 1) * pageSize);

  const result = await db.prepare(sql).bind(...params).all();
  const data = (result.results || []).map(r => ({
    ...r,
    quantity: Number(r.quantity),
  }));

  let countSql = `SELECT COUNT(*) as cnt FROM work_order_pickings WHERE org_id = ?`;
  const countParams = [user.org_id];
  if (workOrderId) {
    countSql += ` AND work_order_id = ?`;
    countParams.push(workOrderId);
  }
  if (materialName) {
    countSql += ` AND material_name LIKE ?`;
    countParams.push(`%${materialName}%`);
  }
  const countResult = await db.prepare(countSql).bind(...countParams).first();

  return json({
    data,
    pagination: {
      page,
      pageSize,
      total: countResult?.cnt || 0,
      totalPages: Math.ceil((countResult?.cnt || 0) / pageSize),
    },
  });
}

export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const existing = await db.prepare(`SELECT id FROM work_order_pickings WHERE org_id = ? AND work_order_id = ? AND material_id = ?`).bind(user.org_id, body.workOrderId, body.materialId || null).first();
  if (existing) {
    return json({ error: '该物料已领料', id: existing.id }, 409);
  }

  const id = 'wop-' + crypto.randomUUID();
  await db.prepare(`INSERT INTO work_order_pickings (id, org_id, work_order_id, work_order_no, material_id, material_code, material_name, unit, quantity, outbound_no, issued_at, created_at, updated_at, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id, user.org_id, body.workOrderId, body.workOrderNo || null, body.materialId || null, body.materialCode || null, body.materialName || null,
    body.unit || null, Number(body.quantity) || 0, body.outboundNo || null, body.issuedAt || null, now, now, user.name, user.name
  ).run();

  const row = await db.prepare(`SELECT * FROM work_order_pickings WHERE id = ?`).bind(id).first();
  return json(row);
}
