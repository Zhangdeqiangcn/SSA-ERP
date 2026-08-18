// 注册：填写公司码（companyCode）
// - 该 code 首次出现 → 自动创建组织
// - 之后相同 code 注册 → 加入同一组织（共享同一份业务数据）
import { getUserFromRequest, hashPassword, makeSalt, makeToken, json, uid } from '../../_shared/auth';

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
  const name = (body.name || username).trim();
  const companyCode = (body.companyCode || '').trim();
  const role = (body.role && ['admin', 'manager', 'user'].includes(body.role)) ? body.role : 'user';
  const department = (body.department || '').trim();

  if (username.length < 3) return json({ error: '用户名至少 3 个字符' }, 400);
  if (password.length < 6) return json({ error: '密码至少 6 位' }, 400);
  if (!companyCode) return json({ error: '请填写公司码' }, 400);

  // 用户名唯一性
  const exist = await env.DB.prepare('SELECT id FROM users WHERE username = ?')
    .bind(username)
    .first();
  if (exist) return json({ error: '用户名已被占用' }, 409);

  // 组织：复用或新建
  let org = await env.DB.prepare('SELECT id, name FROM orgs WHERE company_code = ?')
    .bind(companyCode)
    .first();
  let orgId: string;
  if (!org) {
    orgId = uid('org');
    await env.DB.prepare(
      'INSERT INTO orgs (id, name, company_code, created_at) VALUES (?, ?, ?, ?)'
    )
      .bind(orgId, (body.orgName || companyCode).trim(), companyCode, new Date().toISOString())
      .run();
  } else {
    orgId = (org as any).id;
  }

  const salt = makeSalt();
  const passwordHash = await hashPassword(password, salt);
  const userId = uid('user');

  await env.DB.prepare(
    `INSERT INTO users (id, org_id, username, password_hash, salt, name, role, department, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(userId, orgId, username, passwordHash, salt, name, role, department, new Date().toISOString())
    .run();

  // 创建会话
  const token = makeToken();
  const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, userId, expires)
    .run();

  return json({
    token,
    user: { id: userId, org_id: orgId, username, name, role, department },
  });
}
