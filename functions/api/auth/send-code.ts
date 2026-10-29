// POST /api/auth/send-code — 向账号绑定的邮箱「分别」发送验证码
// 请求体：{ username, purpose: 'activate' | 'change_password', password }
//
// 安全说明：
//   1) 必须同时提供正确的登录密码，否则任何人都能凭用户名触发发码、骚扰超管邮箱；
//   2) 账号不存在与密码错误返回完全相同的提示，避免被用来探测账号是否存在；
//   3) 验证码先落库再发信——即使邮件通道故障，超管仍可通过兜底通道取到，不会被锁死。
//   ★ V3.14.1：super_admin 激活流程（purpose=activate, security_initialized=0）
//     密码为空是正常状态，跳过密码校验直接发码，避免激活死锁。
import { verifyPassword, json } from '../../_shared/auth';
import {
  issueVerificationCodes,
  getVerifyEmails,
  PURPOSE_TEXT,
} from '../../_shared/verification';

const ALLOWED_PURPOSES = new Set(['activate', 'change_password']);

export async function onRequestPost(context: any) {
  const { request, env } = context;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const username = String(body.username ?? '').trim();
  const purpose = String(body.purpose ?? '').trim();
  const password = String(body.password ?? '');

  if (!username) return json({ error: '请输入用户名和密码' }, 400);
  if (!ALLOWED_PURPOSES.has(purpose)) return json({ error: '不支持的验证场景' }, 400);

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first();
  const u = user as any;
  if (!u) return json({ error: '用户名或密码错误' }, 401);

  // ★ V3.14.1：super_admin 激活时密码为空，跳过密码校验
  if (u.role !== 'super_admin' || Number(u.security_initialized ?? 1) !== 0) {
    const ok = await verifyPassword(password, u.password_hash, u.salt);
    if (!ok) return json({ error: '用户名或密码错误' }, 401);
  }

  // 目前仅超级管理员需要双邮箱验证（首次激活 / 修改密码）
  if (u.role !== 'super_admin') {
    return json({ error: '该账号无需邮箱验证码' }, 400);
  }

  const status = String(u.status ?? 'active');
  if (status === 'pending' || status === 'rejected') {
    return json({ error: '账号尚未通过审批，无法进行安全验证' }, 403);
  }

  if (!getVerifyEmails(u).length) {
    return json({ error: '该账号未绑定验证邮箱，请联系系统运维添加后再试' }, 400);
  }

  const r = await issueVerificationCodes(env, u, purpose);
  if (!r.ok) return json({ error: r.error }, 400);

  return json({
    ok: true,
    purpose,
    purposeText: PURPOSE_TEXT[purpose],
    // 仅返回脱敏邮箱，绝不把明文验证码回传前端
    emails: r.sent,
    expiresInSeconds: r.expiresInSeconds,
    allFailed: !!r.allFailed,
    message: r.allFailed
      ? '邮件未能发出，可在「安全中心」用兜底通道查看验证码'
      : undefined,
  });
}
