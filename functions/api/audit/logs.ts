// POST /api/audit/logs — 写入审计日志
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));

  const { entity, entityId, action, summary } = body;
  if (!action || !entity) return json({ error: '缺少 action 或 entity' }, 400);

  const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO audit_logs (id, org_id, user_id, user_name, action, entity, entity_id, summary, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, user.org_id, user.userId, user.name, action, entity, entityId || null, summary || '', now).run();

  // 只保留最近 10000 条
  await db.prepare(
    `DELETE FROM audit_logs WHERE rowid NOT IN (SELECT rowid FROM audit_logs WHERE org_id = ? ORDER BY created_at DESC LIMIT 10000)`
  ).bind(user.org_id).run();

  return json({ success: true, id });
}
