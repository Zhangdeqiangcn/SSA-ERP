// 登录：用户名 + 密码 → 返回会话 token
// V2.96.0 增补：超级管理员未完成安全初始化（security_initialized=0）时，
//   不签发会话，改为返回 needActivation，引导前端完成「双邮箱验证 + 设置密码」。
//
// ── V3.5.0 B6：本文件**刻意不写 audit_logs 表**（这是明确的取舍，不是遗漏）────────
// 理由：认证类端点（login / logout / logout-all / register / activate /
//   change-password / send-code / verify-code / security-mailbox，以及
//   vendor/login、vendor/register）的每一次调用**本身就是一次身份动作的证据**：
//     · 登录失败与锁定走 `_shared/loginGuard`（recordLoginFail / checkLoginLock），
//       在 login_locks 表里留有次数与时间；这是排查暴力破解真正要看的表。
//     · 会话签发/失效在 sessions 表（或以 token 有效期表达），可直接查询。
//     · 验证码的申请与核销在 verification 相关表，且 V2.97.0 已改为原子批量核销。
//   若再往 audit_logs 写一条，会得到「同一事实的两份记录」，两份还可能不一致
//   （比如审计写入走了降级通道时），反而降低证据可信度。
// 另一层原因：登录是最高频的写动作，把它记进审计表会让审计表迅速膨胀，
//   真正要查的业务变更事件被淹没 —— 这与 B6 的整体目标（让审计可信有用）相悖。
// 因此 B6 的覆盖率口径**以业务写端点为分母**：认证端点不计入分子也不计入分母。
import { verifyPassword, makeToken, json, toClientUser } from '../../_shared/auth';
import { getVerifyEmails, maskEmail } from '../../_shared/verification';
import { clientIp, checkLoginLock, recordLoginFail, clearLoginFail } from '../../_shared/loginGuard';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const username = (body.username || '').trim();
  const password = (body.password || '').toString();
  if (!username) return json({ error: '请输入用户名' }, 400);

  // V3.14.2：super_admin 未设置密码（security_initialized=0）时，
  //   必须在密码校验前就返回 needActivation——否则空密码会被 !password 拦在 400。
  let u: any = undefined;
  try {
    u = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
      .bind(username)
      .first();
  } catch {
    return json({ error: '用户名或密码错误' }, 401);
  }
  if (u && u.role === 'super_admin' && Number(u.security_initialized ?? 1) === 0) {
    const emails = getVerifyEmails(u);
    return json({
      needActivation: true,
      username: u.username,
      name: u.name,
      emails: emails.map((e) => ({
        email: maskEmail(e),
        label: e === String(u.email || '').trim() ? '主邮箱' : '备用邮箱',
      })),
    });
  }

  if (!password) return json({ error: '请输入用户名和密码' }, 400);

  // V2.99.0（评测 H-05）：登录失败限流——先查锁定状态，再走口令校验。
  const ip = clientIp(request);
  const locked = await checkLoginLock(env.DB, username, ip);
  if (locked) return locked;

  // ★ 用户已在上面查询过（u），这里直接复用，避免重复查库
  const user = u;
  if (!user) {
    await recordLoginFail(env.DB, username, ip);
    return json({ error: '用户名或密码错误' }, 401);
  }

  const ok = await verifyPassword(password, user.password_hash, user.salt);
  if (!ok) {
    await recordLoginFail(env.DB, username, ip);
    return json({ error: '用户名或密码错误' }, 401);
  }
  // 口令正确：清除失败计数（未批/驳回属业务状态，不计入爆破计数）
  await clearLoginFail(env.DB, username, ip);

  // 审批状态拦截
  const status = String(user.status ?? 'active');
  if (status === 'pending') {
    return json({ error: '账号正在等待管理员审批，请审批通过后再登录' }, 403);
  }
  if (status === 'rejected') {
    return json({ error: '账号审批未通过，请联系贵公司管理员' }, 403);
  }

  // 组织准入闸门（V3.2.0 · 评测 L-03 整改）
  // 取舍：super_admin 豁免（平台级运维角色，需在公司异常时仍能进入系统处置）。
  if (user.role !== 'super_admin' && user.org_id) {
    let org: any = undefined;
    try {
      org = await env.DB.prepare(
        "SELECT id, name, IFNULL(status, 'active') AS status FROM orgs WHERE id = ?"
      )
        .bind(user.org_id)
        .first();
    } catch {
      org = undefined;
    }
    if (org === null) {
      return json({ error: '您所属的公司不存在或已被移除，请联系平台管理员', code: 'ORG_MISSING' }, 403);
    }
    if (org) {
      const orgStatus = String(org.status ?? 'active').trim();
      if (orgStatus === 'pending') {
        return json({ error: '您所属公司尚未通过平台审批，请等待审批完成后再登录', code: 'ORG_PENDING' }, 403);
      }
      if (orgStatus !== 'active') {
        return json({ error: '您所属公司已被停用，请联系平台管理员', code: 'ORG_SUSPENDED' }, 403);
      }
    }
  }

  // V2.98.0（评测 M-09）：登录时顺带清扫已过期会话。原先会话表只增不减，
  //   长期运行会单调增长；登录是低频动作，在这里做一次全局清扫代价可忽略。
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?')
    .bind(new Date().toISOString())
    .run()
    .catch(() => {
      /* 清理失败不影响本次登录 */
    });

  const token = makeToken();
  const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, user.id, expires)
    .run();

  return json({
    token,
    // V3.15.0：返回完整资料字段（部门 / 主邮箱 / 备用邮箱 / 手机号）。
    //   此前只回 5 个字段，个人中心因此把部门显示为"未设置"、邮箱显示为"未绑定"。
    user: toClientUser(user),
  });
}
