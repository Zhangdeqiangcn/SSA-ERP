// POST /api/auth/change-password — 修改密码
//
// 两种鉴权方式（二选一）：
//   1) ticket 路径（超级管理员专用）：凭双邮箱验证拿到的一次性凭证改密，
//      用于「安全中心」在不输入当前密码的情况下改密（原流程，保持兼容）。
//   2) currentPassword 路径（全角色可用）：已登录用户凭「当前密码 + 新密码」直接改密，
//      对应个人中心「修改密码」——这是最自然、最安全的自服务改密方式。
//
// 改密成功后作废该账号除当前会话外的全部会话（他处登录的设备需重新登录）。
import {
  getUserFromRequest,
  hashPasswordPbkdf2,
  makeSalt,
  verifyPassword,
  json,
} from '../../_shared/auth';
import { consumeTicket } from '../../_shared/verification';
import { writeAudit } from '../../_shared/auditLog';

const MIN_PASSWORD_LENGTH = 8;

export async function onRequestPost(context: any) {
  const { request, env } = context;

  const me = await getUserFromRequest(request, env.DB);
  if (!me) return json({ error: '未登录' }, 401);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const ticket = String(body.ticket ?? '').trim();
  const currentPassword = String(body.currentPassword ?? '');
  const newPassword = String(body.newPassword ?? '');

  if (!ticket && !currentPassword) {
    return json({ error: '缺少身份验证信息，请先完成身份验证' }, 400);
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return json({ error: `新密码至少 ${MIN_PASSWORD_LENGTH} 位` }, 400);
  }
  if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return json({ error: '新密码需同时包含字母和数字' }, 400);
  }

  // 取账号最新记录（含 password_hash / salt）
  const user = (await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(me.id).first()) as any;
  if (!user) return json({ error: '账号不存在' }, 404);

  // 方式 1：双邮箱凭证（超级管理员「安全中心」）
  if (ticket) {
    const valid = await consumeTicket(env, ticket, user.id, 'change_password');
    if (!valid) {
      return json({ error: '邮箱验证凭证无效或已过期，请重新获取验证码' }, 400);
    }
  } else {
    // 方式 2：当前密码校验（全角色自服务改密）
    const ok = await verifyPassword(currentPassword, user.password_hash, user.salt);
    if (!ok) return json({ error: '当前密码不正确' }, 400);
  }

  const salt = makeSalt();
  const passwordHash = await hashPasswordPbkdf2(newPassword, salt);
  await env.DB.prepare(
    `UPDATE users SET password_hash = ?, salt = ?, security_initialized = 1 WHERE id = ?`
  )
    .bind(passwordHash, salt, user.id)
    .run();

  // 保留当前会话，注销其他设备的登录态
  const auth = request.headers.get('Authorization') || '';
  const currentToken = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?')
    .bind(user.id, currentToken)
    .run();

  await writeAudit(env.DB, { orgId: user.org_id, actor: { id: user.id, name: user.name }, entity: 'users', action: 'change_password', entityId: user.id, summary: `修改密码 ${user.username}` });

  return json({ ok: true, changedAt: new Date().toISOString() });
}
