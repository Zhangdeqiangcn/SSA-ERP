// POST /api/vendor/register — 供应商注册
import { hashPasswordPbkdf2, makeSalt, json, uid } from '../../_shared/auth';

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
    const passwordHash = await hashPasswordPbkdf2(password, salt);
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
