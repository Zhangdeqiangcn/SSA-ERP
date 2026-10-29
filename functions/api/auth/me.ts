// 当前登录用户（用于刷新页面后恢复会话 / 应用启动时刷新资料）
// V3.15.0：返回规范化客户端用户对象（toClientUser），字段与登录接口保持一致
//   （含 department / email / altEmail / phone），供个人中心展示与编辑资料后刷新使用。
import { getUserFromRequest, json, toClientUser } from '../../_shared/auth';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  return json({ user: toClientUser(user) });
}
