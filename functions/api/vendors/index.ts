// GET/POST /api/vendors — 供应商主数据（D1 vendor_master，会话鉴权）
// V2.74.3 起从旧 vendors 门户表改指 vendor_master，与开放网关 /api/open/vendors 同源（消除双数据源）。
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { rlsFragment } from '../../_shared/rls';

// camelCase 前端字段 → vendor_master 列
function toRow(body: any) {
  return {
    vendor_code: body.code,
    company_name: body.name,
    short_name: body.shortName ?? null,
    type: body.type ?? 'trader',
    contact_name: body.contact ?? null,
    contact_phone: body.phone ?? null,
    contact_email: body.email ?? null,
    address: body.address ?? null,
    status: body.status ?? 'pending',
    qualification_expiry: body.qualificationExpiry ?? null,
    rating: body.rating ?? null,
    credit_level: body.creditLevel ?? null,
    credit_limit: body.creditLimit ?? 0,
    used_credit: body.usedCredit ?? 0,
    tax_id: body.taxId ?? null,
    bank_account: body.bankAccount ?? null,
    sales_org: body.salesOrg ?? null,
    reconciliation_account: body.reconciliationAccount ?? null,
    tax_code: body.taxCode ?? null,
    blacklist_reason: body.blacklistReason ?? null,
    blacklisted_at: body.blacklistedAt ?? null,
    blacklist_reason_history: body.blacklistReasonHistory ? JSON.stringify(body.blacklistReasonHistory) : null,
    profile_pending: body.profilePending ? JSON.stringify(body.profilePending) : null,
    profile_pending_at: body.profilePendingAt ?? null,
    profile_pending_by: body.profilePendingBy ?? null,
    profile_reviewed_by: body.profileReviewedBy ?? null,
    custom_fields: body.customFields ? JSON.stringify(body.customFields) : null,
  };
}

function formatVendor(r: any) {
  return {
    id: r.id, org_id: r.org_id,
    code: r.vendor_code, name: r.company_name,
    shortName: r.short_name,
    type: r.type,
    contact: r.contact_name, phone: r.contact_phone, email: r.contact_email,
    address: r.address,
    status: r.status,
    qualificationExpiry: r.qualification_expiry,
    rating: r.rating,
    creditLevel: r.credit_level,
    creditLimit: r.credit_limit,
    usedCredit: r.used_credit,
    taxId: r.tax_id,
    bankAccount: r.bank_account,
    salesOrg: r.sales_org,
    reconciliationAccount: r.reconciliation_account,
    taxCode: r.tax_code,
    blacklistReason: r.blacklist_reason,
    blacklistedAt: r.blacklisted_at,
    blacklistReasonHistory: safeParse(r.blacklist_reason_history),
    profilePending: safeParse(r.profile_pending),
    profilePendingAt: r.profile_pending_at,
    profilePendingBy: r.profile_pending_by,
    profileReviewedBy: r.profile_reviewed_by,
    customFields: safeParse(r.custom_fields),
    ownerId: r.owner_id,
    deptId: r.dept_id,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function safeParse(s: string | null): any {
  if (!s) return undefined;
  try { return JSON.parse(s); } catch { return undefined; }
}

async function audit(DB: any, org_id: string, user: any, entity: string, action: string, summary: string) {
  try {
    await DB.prepare(
      `INSERT INTO audit_logs (id, org_id, user_id, user_name, entity, action, summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(uid('al'), org_id, user.id, user.name || user.username, entity, action, summary, new Date().toISOString()).run();
  } catch { /* 审计失败不阻断主流程 */ }
}

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
  const offset = (page - 1) * pageSize;

  const keyword = (url.searchParams.get('keyword') || '').trim();
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');

  let sql = 'SELECT * FROM vendor_master WHERE org_id = ?';
  const params: any[] = [user.org_id];
  const rls = rlsFragment(user, 'vendor_master');
  if (rls.clause !== '1=1') { sql += ' AND ' + rls.clause; params.push(rls.param!); }

  if (keyword) {
    sql += ' AND (vendor_code LIKE ? OR company_name LIKE ? OR contact_name LIKE ?)';
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (type) { sql += ' AND type = ?'; params.push(type); }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  const rows = await env.DB.prepare(sql).bind(...params).all();
  const data = (rows.results || []).map((r: any) => formatVendor(r));

  let countSql = 'SELECT COUNT(*) as cnt FROM vendor_master WHERE org_id = ?';
  const countParams: any[] = [user.org_id];
  if (rls.clause !== '1=1') { countSql += ' AND ' + rls.clause; countParams.push(rls.param!); }
  if (keyword) {
    countSql += ' AND (vendor_code LIKE ? OR company_name LIKE ? OR contact_name LIKE ?)';
    const kw = `%${keyword}%`;
    countParams.push(kw, kw, kw);
  }
  if (status) { countSql += ' AND status = ?'; countParams.push(status); }
  if (type) { countSql += ' AND type = ?'; countParams.push(type); }
  const countRow = await env.DB.prepare(countSql).bind(...countParams).first();
  const total = (countRow as any)?.cnt || 0;

  return json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }
  if (!body.code || !body.name) return json({ error: '供应商编码与名称必填' }, 400);

  const dup = await env.DB.prepare(
    'SELECT id FROM vendor_master WHERE org_id = ? AND vendor_code = ?'
  ).bind(user.org_id, body.code).first();
  if (dup) return json({ error: '供应商编码已存在' }, 409);

  const id = uid('ven');
  const now = new Date().toISOString();
  const row = toRow(body);
  await env.DB.prepare(`
    INSERT INTO vendor_master (
      org_id, id, vendor_code, company_name, short_name, type, contact_name, contact_phone,
      contact_email, address, status, qualification_expiry, rating, credit_level, credit_limit,
      used_credit, tax_id, bank_account, sales_org, reconciliation_account, tax_code,
      blacklist_reason, blacklisted_at, blacklist_reason_history, profile_pending,
      profile_pending_at, profile_pending_by, profile_reviewed_by, custom_fields,
      owner_id, dept_id, created_at, updated_at, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    user.org_id, id, row.vendor_code, row.company_name, row.short_name, row.type, row.contact_name,
    row.contact_phone, row.contact_email, row.address, row.status, row.qualification_expiry, row.rating,
    row.credit_level, row.credit_limit, row.used_credit, row.tax_id, row.bank_account, row.sales_org,
    row.reconciliation_account, row.tax_code, row.blacklist_reason, row.blacklisted_at,
    row.blacklist_reason_history, row.profile_pending, row.profile_pending_at, row.profile_pending_by,
    row.profile_reviewed_by, row.custom_fields, user.id, user.department || null, now, now, user.id, user.id
  ).run();

  await audit(env.DB, user.org_id, user, 'vendor_master', 'create', `创建供应商 ${body.code} ${body.name}`);
  const created = await env.DB.prepare('SELECT * FROM vendor_master WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
  return json(formatVendor(created as any), 201);
}
