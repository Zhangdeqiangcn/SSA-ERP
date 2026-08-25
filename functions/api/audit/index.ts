// GET /api/audit/logs — 分页查询审计日志（按 org_id 隔离）
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = getUserFromRequest(context);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10);
  const keyword = url.searchParams.get('keyword') || '';
  const action = url.searchParams.get('action') || '';
  const entity = url.searchParams.get('entity') || '';
  const offset = (page - 1) * pageSize;

  let sql = `SELECT * FROM audit_logs WHERE org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    sql += ` AND (summary LIKE ? OR user_name LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (action) {
    sql += ` AND action = ?`;
    params.push(action);
  }
  if (entity) {
    sql += ` AND entity = ?`;
    params.push(entity);
  }
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, offset);

  const results = await db.prepare(sql).bind(...params).all();
  const count = await db.prepare(
    `SELECT COUNT(*) as cnt FROM audit_logs WHERE org_id = ?${action ? ' AND action = ?' : ''}${entity ? ' AND entity = ?' : ''}`
  ).bind(user.org_id, ...(action ? [action] : []), ...(entity ? [entity] : [])).first();

  return json({
    data: (results.results || []).map(r => ({
      id: r.id, entity: r.entity, entityId: r.entity_id, action: r.action,
      summary: r.summary, userId: r.user_id, userName: r.user_name,
      createdAt: r.created_at,
    })),
    pagination: { page, pageSize, total: count?.cnt || 0 },
  });
}
