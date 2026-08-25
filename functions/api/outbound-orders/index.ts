// GET /api/outbound-orders — 分页查询出库单（按 org_id 隔离）
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = getUserFromRequest(context);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const keyword = (url.searchParams.get('keyword') || '').trim();
  const customerId = url.searchParams.get('customerId') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const type = url.searchParams.get('type') || undefined;
  const sortBy = url.searchParams.get('sortBy') || 'outbound_date';
  const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'ASC' : 'DESC';

  const db = context.env.DB;
  let where = `WHERE oo.org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    where += ` AND (oo.outbound_no LIKE ? OR oo.customer_name LIKE ?)`;
    const kw = `%${keyword}%`;
    params.push(kw, kw);
  }
  if (customerId) {
    where += ` AND oo.customer_id = ?`;
    params.push(customerId);
  }
  if (status) {
    where += ` AND oo.status = ?`;
    params.push(status);
  }
  if (type) {
    where += ` AND oo.type = ?`;
    params.push(type);
  }

  const allowedSort = ['outbound_date', 'created_at'];
  const sortCol = allowedSort.includes(sortBy) ? sortBy : 'outbound_date';

  const offset = (page - 1) * pageSize;
  const totalRows = await db.prepare(`SELECT COUNT(*) as cnt FROM outbound_orders ${where}`).bind(...params).first();
  const rows = await db.prepare(`SELECT * FROM outbound_orders ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`).bind(...params, pageSize, offset).all();

  return json({
    data: (rows.results || []).map(r => ({ ...r, items: [] })),
    total: totalRows?.cnt || 0,
    page,
    pageSize,
  });
}
