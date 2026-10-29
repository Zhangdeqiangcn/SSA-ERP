// POST /api/auth/reset-password-send — 找回密码：第一步，发送重置验证码到注册邮箱
// 请求体：{ username }
//
// 安全说明：
//   1) 账号不存在时返回与「未绑定邮箱」相同的通用提示，避免被用来探测账号是否存在；
//   2) 验证码先落库再发信，即使邮件通道故障也不会把人锁死（但此时会提示联系管理员）；
//   3) 仅发送给账号注册时填写的主邮箱（user.email），不需要双邮箱。
import { json } from '../../_shared/auth';
import { issueResetCode, maskEmail } from '../../_shared/verification';

export async function onRequestPost(context: any) {
  const { request, env } = context;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const username = String(body.username ?? '').trim();
  if (!username) return json({ error: '请输入用户名' }, 400);

  const u = (await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first()) as any;

  // 账号不存在：返回通用提示，不暴露账号是否存在
  if (!u) {
    return json({
      ok: true,
      sent: false,
      message:
        '若该账号存在且已绑定邮箱，验证码将发送至您注册时填写的邮箱；如长时间未收到，请联系贵公司管理员协助重置密码。',
    });
  }

  const status = String(u.status ?? 'active');
  if (status === 'pending' || status === 'rejected') {
    return json({
      ok: true,
      sent: false,
      message: '该账号尚未通过审批，无法自助找回密码，请联系贵公司管理员。',
    });
  }

  const email = String(u.email || '').trim();
  if (!email) {
    return json({
      ok: true,
      sent: false,
      message: '该账号未绑定邮箱，无法自助找回密码，请联系贵公司管理员重置密码。',
    });
  }

  const r = await issueResetCode(env, u);
  if (!r.ok) {
    return json({ ok: true, sent: false, message: r.error });
  }

  return json({
    ok: true,
    sent: true,
    email: (r.sent && r.sent[0]?.email) || maskEmail(email),
    expiresInSeconds: r.expiresInSeconds,
  });
}
