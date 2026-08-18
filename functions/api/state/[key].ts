// 业务状态同步：GET 拉取 / PUT 保存 / DELETE 清除
// 作用域：自动按当前用户所属组织（org_id）共享，同一组织所有人看同一份
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const key = params.key;
  const row = await env.DB.prepare(
    'SELECT value FROM app_state WHERE org_id = ? AND key = ?'
  )
    .bind(user.org_id, key)
    .first();

  if (!row) return json({ value: null }, 404);
  return json({ value: (row as any).value });
}

export async function onRequestPut(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const key = params.key;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }
  const value = typeof body.value === 'string' ? body.value : JSON.stringify(body.value);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO app_state (org_id, key, value, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(org_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  )
    .bind(user.org_id, key, value, now)
    .run();

  return json({ ok: true, updated_at: now });
}

export async function onRequestDelete(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const key = params.key;
  await env.DB.prepare('DELETE FROM app_state WHERE org_id = ? AND key = ?')
    .bind(user.org_id, key)
    .run();
  return json({ ok: true });
}
