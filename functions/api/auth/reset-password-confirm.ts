// POST /api/auth/reset-password-confirm — 找回密码：第二步，校验验证码并重置密码
// 请求体：{ username, code, newPassword }
//
// 安全说明：
//   1) 验证码错误 5 次即失效，防止暴力枚举 6 位验证码；
//   2) 验证通过后立即更新密码哈希（PBKDF2-HMAC-SHA-256）；
//   3) 重置成功后注销该账号的全部会话，防止账号被他人持有后继续登录。
import { verifyPassword, hashPasswordPbkdf2, makeSalt, json } from '../../_shared/auth';
import { verifyResetCode } from '../../_shared/verification';
import { writeAudit } from '../../_shared/auditLog';

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
  const code = String(body.code ?? '').trim();
  const newPassword = String(body.newPassword ?? '');

  if (!username) return json({ error: '请输入用户名' }, 400);
  if (!code) return json({ error: '请输入验证码' }, 400);
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return json({ error: `新密码至少 ${MIN_PASSWORD_LENGTH} 位` }, 400);
  }
  if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return json({ error: '新密码需同时包含字母和数字' }, 400);
  }

  const u = (await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first()) as any;
  if (!u) return json({ error: '账号不存在或验证码无效' }, 400);

  const ok = await verifyResetCode(env, u, code);
  if (!ok.ok) return json({ error: ok.error }, 400);

  const salt = makeSalt();
  const passwordHash = await hashPasswordPbkdf2(newPassword, salt);
  await env.DB.prepare(
    `UPDATE users SET password_hash = ?, salt = ?, security_initialized = 1 WHERE id = ?`
  )
    .bind(passwordHash, salt, u.id)
    .run();

  // 重置后注销该账号全部会话（包括可能的非法登录）
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(u.id).run();

  await writeAudit(env.DB, { orgId: u.org_id, actor: { id: u.id, name: u.name }, entity: 'users', action: 'reset_password', entityId: u.id, summary: `通过邮箱验证重置密码 ${u.username}` });

  return json({ ok: true, changedAt: new Date().toISOString() });
}
