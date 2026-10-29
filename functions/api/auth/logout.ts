// 登出：作废当前会话 token
import { json } from '../../_shared/auth';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization');
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    if (token) {
      await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    }
  }
  // V3.91.0：clearAuth 触发 auth.json() 清除 HttpOnly 会话 Cookie（前端 JS 无法清除 HttpOnly）
  return json({ ok: true, clearAuth: true });
}
