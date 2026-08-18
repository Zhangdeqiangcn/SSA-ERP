// 当前登录用户（用于刷新页面后恢复会话）
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  return json({ user });
}
