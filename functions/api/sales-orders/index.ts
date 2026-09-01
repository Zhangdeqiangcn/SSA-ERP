// GET /api/sales-orders — 分页查询销售订单（按 org_id 隔离）
import { getUserFromRequest, json } from '../../_shared/auth';
import { rlsFragment } from '../../_shared/rls';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
  const keyword = url.searchParams.get('keyword') || '';
  const status = url.searchParams.get('status') || '';
  const customerId = url.searchParams.get('customerId') || '';

  let sql = `SELECT * FROM sales_orders WHERE org_id = ?`;
  const params = [user.org_id];
  const rls = rlsFragment(user, 'sales_orders');
  if (rls.clause !== '1=1') { sql += ' AND ' + rls.clause; params.push(rls.param!); }

  if (keyword) {
    sql += ` AND (order_no LIKE ? OR customer_name LIKE ? OR sales_person LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  if (customerId) {
    sql += ` AND customer_id = ?`;
    params.push(customerId);
  }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, (page - 1) * pageSize);

  const result = await db.prepare(sql).bind(...params).all();
  const orders = (result.results || []).map(row => ({
    ...row,
    total_amount: Number(row.total_amount),
    tax_rate: row.tax_rate ? Number(row.tax_rate) : null,
    tax_amount: Number(row.tax_amount),
    grand_total: Number(row.grand_total),
    delivered_quantity: row.delivered_quantity ? Number(row.delivered_quantity) : 0,
    received_amount: row.received_amount ? Number(row.received_amount) : 0,
    credit_amount: row.credit_amount ? Number(row.credit_amount) : 0,
  }));

  // 查询总数
  let countSql = `SELECT COUNT(*) as cnt FROM sales_orders WHERE org_id = ?`;
  const countParams = [user.org_id];
  if (rls.clause !== '1=1') { countSql += ' AND ' + rls.clause; countParams.push(rls.param!); }
  if (keyword) {
    countSql += ` AND (order_no LIKE ? OR customer_name LIKE ? OR sales_person LIKE ?)`;
    countParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    countSql += ` AND status = ?`;
    countParams.push(status);
  }
  if (customerId) {
    countSql += ` AND customer_id = ?`;
    countParams.push(customerId);
  }
  const countResult = await db.prepare(countSql).bind(...countParams).first();

  return json({
    data: orders,
    pagination: {
      page,
      pageSize,
      total: countResult?.cnt || 0,
      totalPages: Math.ceil((countResult?.cnt || 0) / pageSize),
    },
  });
}
