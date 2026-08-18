// 供应商门户注册/登录 API
// 供应商可通过供应商代码 + 密码登录，查看自己公司的订单/质量/财务数据
import { hashPassword, makeSalt, makeToken, json, uid } from '../../_shared/auth';

// POST /api/vendor/register — 供应商注册
export async function onRequestPost(context: any) {
  const { request, env } = context;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const vendorCode = (body.vendorCode || '').trim().toUpperCase();
  const companyName = (body.companyName || '').trim();
  const contactName = (body.contactName || '').trim();
  const contactPhone = (body.contactPhone || '').trim();
  const contactEmail = (body.contactEmail || '').trim();
  const password = (body.password || '').toString();

  if (!vendorCode || !companyName || !contactName || !password) {
    return json({ error: '请填写完整信息' }, 400);
  }
  if (password.length < 6) {
    return json({ error: '密码至少6位' }, 400);
  }

  try {
    // 查找组织（供应商代码前3位匹配公司码）
    const org = await env.DB.prepare(
      'SELECT id FROM orgs WHERE company_code LIKE ? LIMIT 1'
    ).bind(vendorCode.slice(0, 3) + '%').first();

    if (!org) {
      return json({ error: '未找到对应组织，请联系企业管理员邀请加入' }, 404);
    }

    // 检查是否已注册
    const existing = await env.DB.prepare(
      'SELECT id FROM vendors WHERE vendor_code = ?'
    ).bind(vendorCode).first();
    if (existing) {
      return json({ error: '该供应商代码已被注册' }, 409);
    }

    const salt = makeSalt();
    const passwordHash = await hashPassword(password, salt);
    const vendorId = uid('vendor');
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO vendors (id, org_id, vendor_code, company_name, contact_name, contact_phone, contact_email, password_hash, salt, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      vendorId, (org as any).id, vendorCode, companyName, contactName,
      contactPhone || null, contactEmail || null, passwordHash, salt, 'vendor', 'pending', now
    ).run();

    return json({ message: '注册成功，等待管理员审核' });
  } catch (e: any) {
    console.error('Register error:', e);
    return json({ error: '注册失败: ' + e.message }, 500);
  }
}

// POST /api/vendor/login — 供应商登录
export async function onRequestPost(context: any, method: string) {
  if (method !== 'POST') return json({ error: 'Method not allowed' }, 405);

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
    const valid = await (async () => {
      const data = new TextEncoder().encode(v.salt + ':' + password);
      const digest = await crypto.subtle.digest('SHA-256', data);
      const hash = Array.from(new Uint8Array(digest))
        .map((b: number) => b.toString(16).padStart(2, '0'))
        .join('');
      return hash === v.password_hash;
    })();

    if (!valid) {
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
