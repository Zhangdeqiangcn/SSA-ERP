// GET /api/work-orders — 分页查询工单列表（按 org_id 隔离）
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
  const offset = (page - 1) * pageSize;

  let sql = `SELECT * FROM work_orders WHERE org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    sql += ` AND (order_no LIKE ? OR product_name LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY planned_start_date DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, offset);

  const results = await db.prepare(sql).bind(...params).all();
  const count = await db.prepare(`SELECT COUNT(*) as cnt FROM work_orders WHERE org_id = ?${status ? ' AND status = ?' : ''}`).bind(
    user.org_id, ...(status ? [status] : [])
  ).first();

  return json({
    data: (results.results || []).map(r => ({
      id: r.id, org_id: r.org_id, order_no: r.order_no, status: r.status,
      product_code: r.product_code, product_name: r.product_name,
      planned_quantity: Number(r.planned_quantity), completed_quantity: Number(r.completed_quantity),
      scrap_quantity: Number(r.scrap_quantity), qualified_quantity: r.qualified_quantity ? Number(r.qualified_quantity) : 0,
      planned_start_date: r.planned_start_date, planned_end_date: r.planned_end_date,
      actual_start_date: r.actual_start_date, actual_end_date: r.actual_end_date,
      priority: r.priority, workshop: r.workshop, supervisor: r.supervisor,
      project_no: r.project_no, project_name: r.project_name, note: r.note,
      created_at: r.created_at, updated_at: r.updated_at,
    })),
    pagination: { page, pageSize, total: count?.cnt || 0 },
  });
}
