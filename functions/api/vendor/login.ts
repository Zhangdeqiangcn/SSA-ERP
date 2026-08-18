// POST /api/vendor/login — 供应商登录
import { makeToken, json } from '../../_shared/auth';

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
    const data = new TextEncoder().encode(v.salt + ':' + password);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const hash = Array.from(new Uint8Array(digest))
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');

    if (hash !== v.password_hash) {
      return json({ error: '密码错误' }, 401);
    }

    // 创建会话
    const token = makeToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    await env.DB.prepare(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(token, v.id, expiresAt).run();

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
    console.error('Login error:', e);
    return json({ error: '登录失败' }, 500);
  }
}
