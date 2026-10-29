// POST /api/vendor/login — 供应商登录
import { makeToken, verifyPassword, json } from '../../_shared/auth';
import { errorResponse } from '../../_shared/errors';
import { clientIp, checkLoginLock, recordLoginFail, clearLoginFail } from '../../_shared/loginGuard';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const vendorCode = (body.vendorCode || '').trim().toUpperCase();
  const password = (body.password || '').toString();

  if (!vendorCode || !password) {
    return json({ error: '请输入供应商代码和密码' }, 400);
  }

  // V2.99.0（评测 H-05）：供应商门户同样接入登录失败限流，
  //   主体前缀加 vendor: 以与内部账号区分，避免与内部用户名相撞。
  const ip = clientIp(request);
  const lockSubject = 'vendor:' + vendorCode;
  const locked = await checkLoginLock(env.DB, lockSubject, ip);
  if (locked) return locked;

  try {
    // 先从 vendors 表查
    const vendor = await env.DB.prepare(
      'SELECT * FROM vendors WHERE vendor_code = ?'
    ).bind(vendorCode).first();

    if (!vendor) {
      await recordLoginFail(env.DB, lockSubject, ip);
      return json({ error: '供应商代码不存在' }, 401);
    }

    const v = vendor as any;
    // VendorStatus 枚举为 registered/pending/approved/rejected/blacklisted，无 'active'；
    // 仅「已批准(approved)」的供应商方可登录门户。黑名单直接拒绝。
    // V2.97.0 修复（安全审计 A4）：原先额外放行 registered，与 register 接口落地的
    //   pending 语义不一致（registered 亦属「未经审批」）——现统一只认 approved。
    //
    // ★ V3.113.3 P0-4：实测生产 vendors 表存在**存量 status='active'** 的行
    //   （早期版本写入的旧口径，共 2 条）。若只认 'approved'，改代码后这两家供应商会
    //   突然登不进去（存量功能回归）。故 'active' 一并放行，并**当场归一**为 'approved'
    //   （一次性自愈，幂等、可回滚；不改动任何业务数据，只修正状态口径）。
    if (v.status === 'blacklisted') {
      return json({ error: '账号已被禁用，请联系管理员' }, 403);
    }
    const LOGIN_ALLOWED = ['approved', 'active'];
    if (!LOGIN_ALLOWED.includes(String(v.status))) {
      return json({ error: '账号未激活，请联系管理员审批' }, 403);
    }
    if (v.status === 'active') {
      // 自愈：把历史 'active' 归一为 'approved'，避免下次仍走兼容分支
      await env.DB.prepare('UPDATE vendors SET status = ? WHERE id = ?')
        .bind('approved', v.id).run().catch(() => { /* 归一失败不阻断登录 */ });
    }

    // 验证密码
    const ok = await verifyPassword(password, v.password_hash, v.salt);
    if (!ok) {
      await recordLoginFail(env.DB, lockSubject, ip);
      return json({ error: '密码错误' }, 401);
    }
    await clearLoginFail(env.DB, lockSubject, ip);

    // 确保 users 表有对应记录（供 sessions FK 使用）
    const existingUser = await env.DB.prepare(
      'SELECT id FROM users WHERE username = ?'
    ).bind(vendorCode).first();

    let userId = existingUser ? (existingUser as any).id : null;
    if (!userId) {
      userId = 'vendor_' + v.id;
      await env.DB.prepare(`
        INSERT INTO users (id, org_id, username, password_hash, salt, name, role, department, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'vendor', '供应商', ?)
      `).bind(userId, v.org_id, vendorCode, v.password_hash, v.salt, v.contact_name, v.created_at).run();
    }

    // 创建会话
    const token = makeToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    await env.DB.prepare(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(token, userId, expiresAt).run();

    return json({
      token,
      user: {
        id: v.id,
        vendorCode: v.vendor_code,
        companyName: v.company_name,
        contactName: v.contact_name,
        role: v.role || 'vendor',
      },
    });
  } catch (e: any) {
    console.error('Login error:', e?.message || e);
    return errorResponse(e, '登录');
  }
}
