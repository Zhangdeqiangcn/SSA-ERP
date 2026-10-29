// POST /api/auth/logout-all — 下线全部设备（按用户清空会话）
// V2.98.0（评测 M-09）：原先登出只删除当前这一枚令牌（logout.ts），
//   同一账号在手机/其它电脑上的会话依然有效，管理员无法把离职员工真正踢下线。
// 规则：
//   - 不传 userId → 清空本人全部会话（含当前设备，前端随后跳登录页）
//   - 传 userId   → 仅管理员/超管可用，且目标账号必须在同一组织内
import { getUserFromRequest, json } from '../../_shared/auth';
import { isRlsPrivileged } from '../../_shared/rls';
import { errorResponse } from '../../_shared/errors';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const targetId = body.userId ? String(body.userId) : user.id;

  if (targetId !== user.id) {
    if (!isRlsPrivileged(user.role)) {
      return json({ error: '只有管理员可以下线其他账号' }, 403);
    }
    // 越权护栏：管理员只能操作本组织账号，不能跨组织清会话
    const target = await env.DB.prepare('SELECT id FROM users WHERE id = ? AND org_id = ?')
      .bind(targetId, user.org_id)
      .first();
    if (!target) return json({ error: '目标账号不存在或不在本组织' }, 404);
  }

  try {
    const res = await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?')
      .bind(targetId)
      .run();
    // V3.91.0：clearAuth 清除当前设备 HttpOnly Cookie（被下线者自然随会话删除失效，此处清本机）
    return json({ ok: true, revoked: res?.meta?.changes ?? 0, clearAuth: true });
  } catch (e: any) {
    return errorResponse(e, '下线设备');
  }
}
