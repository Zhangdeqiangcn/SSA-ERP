// GET /api/vouchers — 分页查询凭证列表（按 org_id 隔离）
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const keyword = url.searchParams.get('keyword') || '';
  const status = url.searchParams.get('status') || '';
  const source = url.searchParams.get('source') || '';
  const offset = (page - 1) * pageSize;

  let sql = `SELECT * FROM vouchers WHERE org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    sql += ` AND (voucher_no LIKE ? OR description LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  if (source) {
    sql += ` AND source = ?`;
    params.push(source);
  }
  sql += ` ORDER BY date DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, offset);

  const results = await db.prepare(sql).bind(...params).all();
  const count = await db.prepare(`SELECT COUNT(*) as cnt FROM vouchers WHERE org_id = ?${status ? ' AND status = ?' : ''}${source ? ' AND source = ?' : ''}`).bind(
    user.org_id,
    ...(status ? [status] : []),
    ...(source ? [source] : [])
  ).first();

  return json({
    data: (results.results || []).map(r => ({
      id: r.id, org_id: r.org_id, voucher_no: r.voucher_no, date: r.date,
      description: r.description, source: r.source, status: r.status,
      total_debit: Number(r.total_debit), total_credit: Number(r.total_credit),
      created_by: r.created_by, remarks: r.remarks, created_at: r.created_at, updated_at: r.updated_at,
    })),
    pagination: { page, pageSize, total: count?.cnt || 0 },
  });
}
