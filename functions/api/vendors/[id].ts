// GET/PUT/DELETE /api/vendors/:id — 供应商主数据（D1 vendor_master，会话鉴权）
// V2.74.3 起从旧 vendors 门户表改指 vendor_master，与开放网关同源。
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { assertRlsOwnership } from '../../_shared/rls';

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
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const row = await env.DB.prepare(
    'SELECT * FROM vendor_master WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!row) return json({ error: '供应商不存在' }, 404);
  if (!assertRlsOwnership(user, row, 'vendor_master')) return json({ error: '无权限查看他人供应商' }, 403);
  return json(formatVendor(row as any));
}

export async function onRequestPut(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }

  const existing = await env.DB.prepare(
    'SELECT id, vendor_code, owner_id FROM vendor_master WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!existing) return json({ error: '供应商不存在' }, 404);
  if (!assertRlsOwnership(user, existing, 'vendor_master')) return json({ error: '无权限修改他人供应商' }, 403);

  if (body.code && body.code !== (existing as any).vendor_code) {
    const dup = await env.DB.prepare(
      'SELECT id FROM vendor_master WHERE org_id = ? AND vendor_code = ? AND id != ?'
    ).bind(user.org_id, body.code, params.id).first();
    if (dup) return json({ error: '供应商编码已存在' }, 409);
  }

  const now = new Date().toISOString();
  try {
    await env.DB.prepare(`
      UPDATE vendor_master SET
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
        tax_id = COALESCE(?, tax_id),
        bank_account = COALESCE(?, bank_account),
        sales_org = COALESCE(?, sales_org),
        reconciliation_account = COALESCE(?, reconciliation_account),
        tax_code = COALESCE(?, tax_code),
        blacklist_reason = COALESCE(?, blacklist_reason),
        blacklisted_at = COALESCE(?, blacklisted_at),
        blacklist_reason_history = COALESCE(?, blacklist_reason_history),
        profile_pending = COALESCE(?, profile_pending),
        profile_pending_at = COALESCE(?, profile_pending_at),
        profile_pending_by = COALESCE(?, profile_pending_by),
        profile_reviewed_by = COALESCE(?, profile_reviewed_by),
        custom_fields = COALESCE(?, custom_fields),
        updated_at = ?,
        updated_by = ?
      WHERE id = ? AND org_id = ?
    `).bind(
      body.code ?? null, body.name ?? null, body.shortName ?? null, body.type ?? null,
      body.contact ?? null, body.phone ?? null, body.email ?? null, body.address ?? null,
      body.status ?? null, body.qualificationExpiry ?? null, body.rating ?? null,
      body.creditLevel ?? null, body.creditLimit ?? null, body.usedCredit ?? null,
      body.taxId ?? null, body.bankAccount ?? null,
      body.salesOrg ?? null, body.reconciliationAccount ?? null, body.taxCode ?? null,
      body.blacklistReason ?? null, body.blacklistedAt ?? null,
      body.blacklistReasonHistory ? JSON.stringify(body.blacklistReasonHistory) : null,
      body.profilePending ? JSON.stringify(body.profilePending) : null,
      body.profilePendingAt ?? null, body.profilePendingBy ?? null, body.profileReviewedBy ?? null,
      body.customFields ? JSON.stringify(body.customFields) : null,
      now, user.id, params.id, user.org_id
    ).run();
  } catch (e: any) {
    return json({ error: '更新失败: ' + (e?.message || String(e)) }, 500);
  }

  await audit(env.DB, user.org_id, user, 'vendor_master', 'update', `更新供应商 ${body.code || (existing as any).vendor_code}`);
  const updated = await env.DB.prepare('SELECT * FROM vendor_master WHERE id = ? AND org_id = ?').bind(params.id, user.org_id).first();
  return json(formatVendor(updated as any));
}

export async function onRequestDelete(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const target = await env.DB.prepare(
    'SELECT id, owner_id FROM vendor_master WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!target) return json({ error: '供应商不存在' }, 404);
  if (!assertRlsOwnership(user, target, 'vendor_master')) return json({ error: '无权限删除他人供应商' }, 403);
  const result = await env.DB.prepare(
    'DELETE FROM vendor_master WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).run();
  if (result.changes === 0) return json({ error: '供应商不存在' }, 404);
  await audit(env.DB, user.org_id, user, 'vendor_master', 'delete', `删除供应商 ${params.id}`);
  return json({ ok: true });
}
