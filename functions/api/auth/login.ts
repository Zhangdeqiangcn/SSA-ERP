// 登录：用户名 + 密码 → 返回会话 token
import { verifyPassword, makeToken, json } from '../../_shared/auth';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const username = (body.username || '').trim();
  const password = (body.password || '').toString();
  if (!username || !password) return json({ error: '请输入用户名和密码' }, 400);

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first();
  if (!user) return json({ error: '用户名或密码错误' }, 401);

  const u = user as any;
  const ok = await verifyPassword(password, u.password_hash, u.salt);
  if (!ok) return json({ error: '用户名或密码错误' }, 401);

  const token = makeToken();
  const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, u.id, expires)
    .run();

  return json({
    token,
    user: { id: u.id, org_id: u.org_id, username: u.username, name: u.name, role: u.role, department: u.department },
  });
}
