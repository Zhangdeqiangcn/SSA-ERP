// POST /api/auth/verify-code — 校验双邮箱验证码
// 请求体：{ username, purpose, password, codes: string[] }
//
// 校验规则：codes 中的每一枚验证码都必须与最新批次的验证码「一一对应」，
//   不看顺序、但一枚都不能少、也不能重复。全部正确后签发一次性凭证 ticket。
// 失败保护：同一批次累计错误 5 次即整批作废，需重新发送。
import { verifyPassword, json } from '../../_shared/auth';
import { verifyCodes, TICKET_TTL_MS } from '../../_shared/verification';

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
  const codes: string[] = Array.isArray(body.codes)
    ? body.codes.map((c: any) => String(c ?? '').trim()).filter(Boolean)
    : [];

  if (!username || !password) return json({ error: '请输入用户名和密码' }, 400);
  if (!ALLOWED_PURPOSES.has(purpose)) return json({ error: '不支持的验证场景' }, 400);
  if (!codes.length) return json({ error: '请输入收到的验证码' }, 400);

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first();
  const u = user as any;
  if (!u) return json({ error: '用户名或密码错误' }, 401);

  const ok = await verifyPassword(password, u.password_hash, u.salt);
  if (!ok) return json({ error: '用户名或密码错误' }, 401);

  if (u.role !== 'super_admin') {
    return json({ error: '该账号无需邮箱验证码' }, 400);
  }

  // 与 send-code 保持一致：未通过审批的账号不允许走安全验证流程，
  // 否则审批闸可被「申请验证码 → 校验 → 激活」这条链路绕过。
  const status = String(u.status ?? 'active');
  if (status === 'pending' || status === 'rejected') {
    return json({ error: '账号尚未通过审批，无法进行安全验证' }, 403);
  }

  const r = await verifyCodes(env, u, purpose, codes);
  if (!r.ok) return json({ error: r.error }, 400);

  return json({
    ok: true,
    ticket: r.ticket,
    expiresInSeconds: Math.round(TICKET_TTL_MS / 1000),
  });
}
