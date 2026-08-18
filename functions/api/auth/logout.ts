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
  return json({ ok: true });
}
