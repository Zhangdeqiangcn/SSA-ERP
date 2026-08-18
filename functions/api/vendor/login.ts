// POST /api/vendor/login — 供应商登录
import { makeToken, json } from '../../_shared/auth';

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(salt + ':' + password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

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

  try {
    // 先从 vendors 表查
    const vendor = await env.DB.prepare(
      'SELECT * FROM vendors WHERE vendor_code = ?'
    ).bind(vendorCode).first();

    if (!vendor) {
      return json({ error: '供应商代码不存在' }, 401);
    }

    const v = vendor as any;
    if (v.status !== 'active') {
      return json({ error: '账号未激活，请联系管理员' }, 403);
    }

    // 验证密码
    const computedHash = await hashPassword(password, v.salt);
    if (computedHash !== v.password_hash) {
      return json({ error: '密码错误' }, 401);
    }

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
    return json({ error: '登录失败: ' + (e?.message || 'unknown') }, 500);
  }
}
