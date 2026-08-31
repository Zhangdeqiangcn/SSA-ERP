// GET /api/serial-numbers — 分页查询序列号主档（按 org_id 隔离）
// POST /api/serial-numbers — 创建序列号主档
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const keyword = (url.searchParams.get('keyword') || '').trim();
  const status = url.searchParams.get('status') || '';

  let sql = `SELECT * FROM serial_masters WHERE org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    sql += ` AND (serial_no LIKE ? OR material_name LIKE ?)`;
    const kw = `%${keyword}%`;
    params.push(kw, kw);
  }
  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, (page - 1) * pageSize);

  const result = await db.prepare(sql).bind(...params).all();
  const data = result.results || [];

  let countSql = `SELECT COUNT(*) as cnt FROM serial_masters WHERE org_id = ?`;
  const countParams = [user.org_id];
  if (keyword) {
    countSql += ` AND (serial_no LIKE ? OR material_name LIKE ?)`;
    const kw = `%${keyword}%`;
    countParams.push(kw, kw);
  }
  if (status) {
    countSql += ` AND status = ?`;
    countParams.push(status);
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

  const id = 'sm-' + crypto.randomUUID();
  await db.prepare(`INSERT INTO serial_masters (id, org_id, serial_no, material_id, material_code, material_name, batch_no, warehouse_id, hu_id, status, inbound_date, customer_name, remarks, created_at, updated_at, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id, user.org_id, body.serialNo, body.materialId || null, body.materialCode || null, body.materialName || null,
    body.batchNo || null, body.warehouseId || null, body.huId || null, body.status || 'in_stock',
    body.inboundDate || null, body.customerName || null, body.remarks || null, now, now, user.name, user.name
  ).run();

  const row = await db.prepare(`SELECT * FROM serial_masters WHERE id = ?`).bind(id).first();
  return json(row);
}
