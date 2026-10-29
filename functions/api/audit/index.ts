// GET /api/audit — 分页查询审计日志（按 org_id 隔离 + 按角色收敛可见范围）
// V2.98.0（评测 M-10）：原实现只要登录就能读全组织审计轨迹，普通成员可借此
//   窥探他人操作记录。现改为：管理员/超管看全组织；其余角色只能看自己的记录。
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json } from '../../_shared/auth';
import { isRlsPrivileged } from '../../_shared/rls';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const canSeeAll = isRlsPrivileged(user.role);
  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10);
  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const action = url.searchParams.get('action') || '';
  const entity = url.searchParams.get('entity') || '';
  const offset = (page - 1) * pageSize;

  // V2.98.0（评测 M-01 同款）：列表与总数共用同一套过滤条件，
  //   原实现的 COUNT 既漏了关键字也漏了角色收敛，页数会虚高。
  const where: string[] = ['org_id = ?'];
  const wparams: any[] = [user.org_id];
  // 非管理员：只返回本人产生的记录（自己的操作轨迹本就知情，不构成泄露）
  if (!canSeeAll) {
    where.push('user_id = ?');
    wparams.push(user.id);
  }
  if (keyword) {
    where.push(`(summary LIKE ? ESCAPE '\\' OR user_name LIKE ? ESCAPE '\\')`);
    wparams.push(likePattern(keyword), likePattern(keyword));
  }
  if (action) {
    where.push(`action = ?`);
    wparams.push(action);
  }
  if (entity) {
    where.push(`entity = ?`);
    wparams.push(entity);
  }
  const whereSql = where.join(' AND ');

  const results = await db.prepare(
    `SELECT * FROM audit_logs WHERE ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(...wparams, pageSize, offset).all();
  const count = await db.prepare(
    `SELECT COUNT(*) as cnt FROM audit_logs WHERE ${whereSql}`
  ).bind(...wparams).first();

  return json({
    scope: canSeeAll ? 'org' : 'self',
    data: (results.results || []).map(r => ({
      id: r.id, entity: r.entity, entityId: r.entity_id, action: r.action,
      summary: r.summary, userId: r.user_id, userName: r.user_name,
      createdAt: r.created_at,
      version: Number(r.version ?? 1),  // V3.83.0：跨端精确回滚（实体维度版本链）
      diff: r.diff ? JSON.parse(r.diff) : null,
    })),
    pagination: { page, pageSize, total: count?.cnt || 0 },
  });
}
