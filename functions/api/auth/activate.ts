// POST /api/auth/activate — 超级管理员首次激活：凭双邮箱验证凭证设置密码并登录
// 请求体：{ username, ticket, newPassword }
//
// 前置条件：login 返回 needActivation=true（security_initialized=0），
//   或调用方已通过 send-code + verify-code 拿到 activate 用途的 ticket。
// 效果：写入新密码、标记安全初始化完成、作废该账号全部旧会话、签发新会话直接登录。
import {
  hashPasswordPbkdf2,
  makeSalt,
  makeToken,
  json,
} from '../../_shared/auth';
import { consumeTicket } from '../../_shared/verification';
import { writeAudit } from '../../_shared/auditLog';

/** 超管密码强度下限（高于普通账号，因为该账号可跨组织操作） */
const MIN_PASSWORD_LENGTH = 8;

export async function onRequestPost(context: any) {
  const { request, env } = context;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const username = String(body.username ?? '').trim();
  const ticket = String(body.ticket ?? '').trim();
  const newPassword = String(body.newPassword ?? '');

  if (!username || !ticket) return json({ error: '缺少必要参数，请重新完成邮箱验证' }, 400);
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return json({ error: `新密码至少 ${MIN_PASSWORD_LENGTH} 位` }, 400);
  }
  if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return json({ error: '新密码需同时包含字母和数字' }, 400);
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first();
  const u = user as any;
  if (!u) return json({ error: '账号不存在' }, 404);
  if (u.role !== 'super_admin') return json({ error: '该账号无需激活流程' }, 400);

  // 纵深防御：未通过审批的账号不得借「激活」流程把自己变成可登录状态。
  // 正常路径下未审批账号走不到这里（login 与 send-code/verify-code 均已拦截），
  // 此处是审批闸被绕过的第二道锁——因为下面的 UPDATE 会无条件写入 status='active'。
  const curStatus = String(u.status ?? 'active');
  if (curStatus === 'pending' || curStatus === 'rejected') {
    return json({ error: '账号尚未通过审批，无法完成安全激活' }, 403);
  }

  const valid = await consumeTicket(env, ticket, u.id, 'activate');
  if (!valid) {
    return json({ error: '邮箱验证凭证无效或已过期，请重新获取验证码' }, 400);
  }

  const salt = makeSalt();
  const passwordHash = await hashPasswordPbkdf2(newPassword, salt);

  await env.DB.prepare(
    `UPDATE users
     SET password_hash = ?, salt = ?, security_initialized = 1, status = 'active'
     WHERE id = ?`
  )
    .bind(passwordHash, salt, u.id)
    .run();

  // 激活即重置：作废该账号所有历史会话，确保旧凭证全部失效
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(u.id).run();

  const token = makeToken();
  const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, u.id, expires)
    .run();

  await writeAudit(env.DB, { orgId: u.org_id, actor: { id: u.id, name: u.name }, entity: 'users', action: 'activate', entityId: u.id, summary: `超管首次安全激活账号 ${u.username}` });

  return json({
    ok: true,
    activated: true,
    token,
    user: {
      id: u.id,
      org_id: u.org_id,
      username: u.username,
      name: u.name,
      role: u.role,
      department: u.department ?? null,
      email: u.email ?? null,
      phone: u.phone ?? null,
      isOwner: !!u.is_owner,
    },
  });
}
