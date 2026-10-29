// 注册：填写公司邀请码（companyCode）
// - 分支 A：该码从未出现过 → 创建组织（org.status=pending），注册者仅记为「组织创建人」(is_owner=1)，
//           但其角色为普通 user，**不再自动成为管理员**；须经系统超级管理员审批、并在审批时
//           **指定角色**后方可登录（V3.15.5 起）。批准后该成员仅能管理本公司事务，不能跨公司。
// - 分支 B：该码属于已有且有效的组织 → 加入该组织，需该公司管理员审批（status=pending，不发会话）。
// - 拒绝：码属于已有组织但「已停用」或「已过期」，或该码在「已吊销历史表」中（被更换过的旧码），
//         一律明确拒绝并提示重新获取邀请码——避免旧码被误判为「新公司」而建出重复组织。
// 安全：role / status / is_owner 一律由服务端决定，绝不信任请求体传入的角色。
import { hashPasswordPbkdf2, makeSalt, json, uid } from '../../_shared/auth';
import { writeAudit } from '../../_shared/auditLog';

// 基本邮箱格式：xxx@yyy.zzz
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 手机号：仅允许数字与 + - 空格，且数字位 6~20 位
const PHONE_RE = /^[+\-\s\d]+$/;
// 新建公司时邀请码的默认有效期（天）
const DEFAULT_CODE_VALID_DAYS = 30;

export async function onRequestPost(context: any) {
  const { request, env } = context;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');           // 密码不做 trim，避免吞掉用户输入
  const name = String(body.name ?? '').trim() || username;
  const companyCode = String(body.companyCode ?? '').trim();
  const orgName = String(body.orgName ?? '').trim();
  const email = String(body.email ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const department = String(body.department ?? '').trim();

  if (username.length < 3) return json({ error: '用户名至少 3 个字符' }, 400);
  // V2.97.0 修复（安全审计 A5）：注册口令强度与「改密 / 激活」对齐，
  // 此前仅要求 6 位任意字符，而改密要求 8 位且含字母与数字，存在长期弱口令缺口。
  if (password.length < 8) return json({ error: '密码至少 8 位' }, 400);
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return json({ error: '密码需同时包含字母和数字' }, 400);
  }
  if (!companyCode) return json({ error: '请填写公司邀请码' }, 400);
  if (email && !EMAIL_RE.test(email)) return json({ error: '邮箱格式不正确' }, 400);
  if (phone && (!PHONE_RE.test(phone) || phone.replace(/\D/g, '').length < 6 || phone.replace(/\D/g, '').length > 20)) {
    return json({ error: '手机号格式不正确' }, 400);
  }

  // 用户名全局唯一
  const exist = await env.DB.prepare('SELECT id FROM users WHERE username = ?')
    .bind(username)
    .first();
  if (exist) return json({ error: '用户名已被占用' }, 409);

  // 组织：复用或新建（company_code 唯一）
  const org = await env.DB.prepare(
    'SELECT id, name, company_code, code_expires_at, code_disabled FROM orgs WHERE company_code = ?'
  )
    .bind(companyCode)
    .first();

  const salt = makeSalt();
  const passwordHash = await hashPasswordPbkdf2(password, salt);
  const userId = uid('user');
  const now = new Date().toISOString();

  // ── 分支 A：邀请码不属于任何组织 ───────────────────────────────
  if (!org) {
    // 该码是否是「被更换/吊销过的旧码」？若是则明确拒绝，绝不能当成新公司
    const revoked: any = await env.DB.prepare(
      'SELECT org_id FROM org_code_history WHERE code = ?'
    ).bind(companyCode).first();
    if (revoked) {
      return json({
        error: '该邀请码已失效（已被管理员更换），请联系贵公司管理员获取新的邀请码',
      }, 403);
    }

    // 确属全新邀请码 → 首个注册者建公司（但角色由超管审批时指定，不再自动成为管理员）
    const orgId = uid('org');
    const finalOrgName = orgName || companyCode;
    const codeExpiresAt = new Date(Date.now() + DEFAULT_CODE_VALID_DAYS * 86400_000).toISOString();
    await env.DB.prepare(
      `INSERT INTO orgs (id, name, company_code, status, created_by, created_at, code_expires_at, code_disabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
    )
      .bind(orgId, finalOrgName, companyCode, 'pending', userId, now, codeExpiresAt)
      .run();

    await env.DB.prepare(
      `INSERT INTO users (id, org_id, username, password_hash, salt, name, role, department, status, is_owner, email, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'user', ?, 'pending', 1, ?, ?, ?)`
    )
      .bind(
        userId, orgId, username, passwordHash, salt, name,
        department || null, email || null, phone || null, now
      )
      .run();

    await writeAudit(env.DB, {
      orgId,
      actor: { id: userId, name },
      entity: 'users',
      action: 'register',
      entityId: userId,
      summary: `注册账号 ${username}（新建组织 ${finalOrgName}，创建人，角色待超级管理员审批指定）`,
    });

    return json({
      pending: true,
      newCompany: true,
      orgName: finalOrgName,
      message: '新公司注册申请已提交，需经系统超级管理员批准并分配角色后方可登录使用',
    }, 202);
  }

  // ── 邀请码属于已有组织：先校验有效性 ─────────────────────────
  const orgRow = org as any;
  if (orgRow.code_disabled) {
    return json({ error: '该公司已暂停接受新成员加入，请联系贵公司管理员' }, 403);
  }
  if (orgRow.code_expires_at && Date.parse(orgRow.code_expires_at) <= Date.now()) {
    return json({ error: '邀请码已过期，请联系贵公司管理员获取新的邀请码' }, 403);
  }

  // ── 分支 B：有效邀请码 → 创建待审批账号，不创建会话 ─────────────
  const orgId = orgRow.id;
  await env.DB.prepare(
    `INSERT INTO users (id, org_id, username, password_hash, salt, name, role, department, status, is_owner, email, phone, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'user', ?, 'pending', 0, ?, ?, ?)`
  )
    .bind(
      userId, orgId, username, passwordHash, salt, name,
      department || null, email || null, phone || null, now
    )
    .run();

  await writeAudit(env.DB, {
    orgId,
    actor: { id: userId, name },
    entity: 'users',
    action: 'register',
    entityId: userId,
    summary: `注册账号 ${username}（加入组织 ${orgRow.name}）`,
  });

  return json({
    pending: true,
    orgName: orgRow.name,
    message: '注册申请已提交，等待该公司管理员审批后方可登录',
  }, 202);
}
