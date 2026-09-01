// /api/open/keys/:id — 吊销指定 API Key（session 管理员鉴权）
// 独立路由文件：Pages Functions 将 /api/open/keys/:id 路由到此文件，原 keys.ts 仅匹配 /api/open/keys（集合）。
import { getUserFromRequest, json } from '../../../_shared/auth';

function isAdmin(user: any): boolean {
  return ['admin', 'owner', 'boss'].includes(user.role);
}

export async function onRequestDelete(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  if (!isAdmin(user)) return json({ error: '需管理员权限' }, 403);

  const id = context.params.id;
  if (!id) return json({ error: '缺少 id' }, 400);
  const res = await context.env.DB.prepare(
    'UPDATE api_keys SET revoked = 1, revoked_at = ? WHERE id = ? AND org_id = ?'
  ).bind(new Date().toISOString(), id, user.org_id).run();
  if (res.changes === 0) return json({ error: 'Key 不存在' }, 404);
  return json({ ok: true });
}
