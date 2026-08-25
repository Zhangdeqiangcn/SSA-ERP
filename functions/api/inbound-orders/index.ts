// GET /api/inbound-orders — 分页查询入库单（按 org_id 隔离）
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = getUserFromRequest(context);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const keyword = (url.searchParams.get('keyword') || '').trim();
  const vendorId = url.searchParams.get('vendorId') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const type = url.searchParams.get('type') || undefined;
  const sortBy = url.searchParams.get('sortBy') || 'inbound_date';
  const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'ASC' : 'DESC';

  const db = context.env.DB;
  let where = `WHERE io.org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    where += ` AND (io.inbound_no LIKE ? OR io.vendor_name LIKE ?)`;
    const kw = `%${keyword}%`;
    params.push(kw, kw);
  }
  if (vendorId) {
    where += ` AND io.vendor_id = ?`;
    params.push(vendorId);
  }
  if (status) {
    where += ` AND io.status = ?`;
    params.push(status);
  }
  if (type) {
    where += ` AND io.type = ?`;
    params.push(type);
  }

  const allowedSort = ['inbound_date', 'total_cost', 'created_at'];
  const sortCol = allowedSort.includes(sortBy) ? sortBy : 'inbound_date';

  const offset = (page - 1) * pageSize;
  const totalRows = await db.prepare(`SELECT COUNT(*) as cnt FROM inbound_orders ${where}`).bind(...params).first();
  const rows = await db.prepare(`SELECT * FROM inbound_orders ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`).bind(...params, pageSize, offset).all();

  return json({
    data: (rows.results || []).map(r => ({ ...r, items: [] })),
    total: totalRows?.cnt || 0,
    page,
    pageSize,
  });
}
