// GET/PUT/DELETE /api/vendors/:id
import { getUserFromRequest, json } from '../../_shared/auth';
import { assertRlsOwnership } from '../../_shared/rls';

export async function onRequestGet(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const row = await env.DB.prepare(
    'SELECT * FROM vendors WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!row) return json({ error: '供应商不存在' }, 404);
  return json(formatVendor(row as any));
}

export async function onRequestPut(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }

  const existing = await env.DB.prepare(
    'SELECT id, vendor_code, owner_id FROM vendors WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!existing) return json({ error: '供应商不存在' }, 404);
  if (!assertRlsOwnership(user, existing, 'vendors')) return json({ error: '无权限修改他人供应商' }, 403);

  if (body.code && body.code !== (existing as any).vendor_code) {
    const dup = await env.DB.prepare(
      'SELECT id FROM vendors WHERE org_id = ? AND vendor_code = ? AND id != ?'
    ).bind(user.org_id, body.code, params.id).first();
    if (dup) return json({ error: '供应商编码已存在' }, 409);
  }

  const now = new Date().toISOString();
  await env.DB.prepare(`
    UPDATE vendors SET
      vendor_code = COALESCE(?, vendor_code),
      company_name = COALESCE(?, company_name),
      short_name = COALESCE(?, short_name),
      type = COALESCE(?, type),
      contact_name = COALESCE(?, contact_name),
      contact_phone = COALESCE(?, contact_phone),
      contact_email = COALESCE(?, contact_email),
      address = COALESCE(?, address),
      status = COALESCE(?, status),
      qualification_expiry = COALESCE(?, qualification_expiry),
      rating = COALESCE(?, rating),
      credit_level = COALESCE(?, credit_level),
      credit_limit = COALESCE(?, credit_limit),
      used_credit = COALESCE(?, used_credit),
      blacklist_reason = COALESCE(?, blacklist_reason),
      blacklisted_at = COALESCE(?, blacklisted_at),
      blacklist_reason_history = COALESCE(?, blacklist_reason_history),
      sales_org = COALESCE(?, sales_org),
      reconciliation_account = COALESCE(?, reconciliation_account),
      tax_code = COALESCE(?, tax_code),
      bank_account = COALESCE(?, bank_account),
      profile_pending = COALESCE(?, profile_pending),
      profile_pending_at = COALESCE(?, profile_pending_at),
      profile_pending_by = COALESCE(?, profile_pending_by),
      profile_reviewed_by = COALESCE(?, profile_reviewed_by),
      custom_fields = COALESCE(?, custom_fields),
      updated_at = ?
    WHERE id = ? AND org_id = ?
  `).bind(
    body.code, body.name, body.shortName, body.type,
    body.contact, body.phone, body.email, body.address,
    body.status, body.qualificationExpiry, body.rating,
    body.creditLevel, body.creditLimit ?? null, body.usedCredit ?? null,
    body.blacklistReason, body.blacklistedAt,
    body.blacklistReasonHistory ? JSON.stringify(body.blacklistReasonHistory) : null,
    body.salesOrg, body.reconciliationAccount, body.taxCode,
    body.bankAccount,
    body.profilePending ? JSON.stringify(body.profilePending) : null,
    body.profilePendingAt, body.profilePendingBy, body.profileReviewedBy,
    body.customFields ? JSON.stringify(body.customFields) : null,
    now, params.id, user.org_id
  ).run();

  const updated = await env.DB.prepare('SELECT * FROM vendors WHERE id = ? AND org_id = ?').bind(params.id, user.org_id).first();
  return json(formatVendor(updated as any));
}

export async function onRequestDelete(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const target = await env.DB.prepare(
    'SELECT id, owner_id FROM vendors WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!target) return json({ error: '供应商不存在' }, 404);
  if (!assertRlsOwnership(user, target, 'vendors')) return json({ error: '无权限删除他人供应商' }, 403);
  const result = await env.DB.prepare(
    'DELETE FROM vendors WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).run();
  if (result.changes === 0) return json({ error: '供应商不存在' }, 404);
  return json({ ok: true });
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
    blacklistReason: r.blacklist_reason,
    blacklistedAt: r.blacklisted_at,
    blacklistReasonHistory: safeParse(r.blacklist_reason_history),
    salesOrg: r.sales_org,
    reconciliationAccount: r.reconciliation_account,
    taxCode: r.tax_code,
    bankAccount: r.bank_account,
    profilePending: safeParse(r.profile_pending),
    profilePendingAt: r.profile_pending_at,
    profilePendingBy: r.profile_pending_by,
    profileReviewedBy: r.profile_reviewed_by,
    customFields: safeParse(r.custom_fields),
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function safeParse(s: string | null): any {
  if (!s) return undefined;
  try { return JSON.parse(s); } catch { return undefined; }
}
