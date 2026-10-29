// GET/PUT/DELETE /api/vendors/:id — 供应商主数据（D1 vendor_master，会话鉴权）
// V2.74.3 起从旧 vendors 门户表改指 vendor_master，与开放网关同源。
//
// ════════════════════════════════════════════════════════════════════════
// V3.21.0 差距 19 第 ② 步试点域：字段级权限从「界面装饰」升级为「服务端强制」
// ════════════════════════════════════════════════════════════════════════
// 改前本文件：GET 用 `SELECT *` 原样返回（含 bank_account / tax_code / credit_limit 明文）；
//   PUT 是一张平铺的 `COALESCE(?, 列)` 列表，**零角色判定** —— 界面上看不到「授信额度」
//   的库管，直接发一个 PUT 把 creditLimit 传上来照样改得动。界面上的字段权限是装饰性的。
// 改后：
//   · GET  → 按当前角色剥离不可见字段；
//   · PUT  → 不可见字段「值确有变化」即 403（值未变则放行，否则编辑页回传整个对象会把
//            正常改电话的请求也拦掉 —— 见 _shared/fieldAccess 的 findForbiddenFieldWrites）；
//   · PUT 回传 → 同样剥离，成功响应不该比列表接口多泄露字段。
import { getUserFromRequest, json } from '../../_shared/auth';
import { assertRlsOwnership } from '../../_shared/rls';
import { audit } from '../../_shared/auditLog';
import { errorResponse } from '../../_shared/errors';
import { validateOrReject } from '../../_shared/validate';
import { guardOperation } from '../../_shared/operationGuard';
import {
  resolveFieldPolicy,
  hiddenFieldsFor,
  stripRowFields,
  findForbiddenFieldWrites,
  fieldPermissionError,
} from '../../_shared/fieldAccess';

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

// V3.3.0（评测 L-05）：原本地 audit() 的静默 catch 已删除，统一改用 _shared/auditLog 的
//   audit()——审计失败不再被吞掉，而是走「结构化日志 → 降级表留痕 → 永不抛出」三层降级。

export async function onRequestGet(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const row = await env.DB.prepare(
    'SELECT * FROM vendor_master WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!row) return json({ error: '供应商不存在' }, 404);
  if (!assertRlsOwnership(user, row, 'vendor_master')) return json({ error: '无权限查看他人供应商' }, 403);

  // ★ V3.21.0：详情页与列表页必须用同一套剥离规则，否则「列表看不到、点进详情就看到了」
  const policy = await resolveFieldPolicy(env.DB, user.org_id);
  const hidden = hiddenFieldsFor(policy, user.role, 'vendor');
  return json(stripRowFields(formatVendor(row as any), 'vendor', hidden).row);
}

export async function onRequestPut(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  
  // V3.24.0: 操作权限服务端守卫
  const _opGuard = await import('../../_shared/operationGuard').then(m => m.guardOperation(user, 'vendor', 'update', context.env.DB, user.org_id));
  if (_opGuard) return _opGuard;

let body: any;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }
  const _invalid = validateOrReject('vendor_master', body, { partial: true });
  if (_invalid) return _invalid;

  // ★ V3.21.0：改取整行（原为 SELECT id, vendor_code, owner_id 三列）——
  //   字段级门禁需要拿「库中现值」与请求体比对，判断用户是否真的要改动该字段。
  const existing = await env.DB.prepare(
    'SELECT * FROM vendor_master WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!existing) return json({ error: '供应商不存在' }, 404);
  if (!assertRlsOwnership(user, existing, 'vendor_master')) return json({ error: '无权限修改他人供应商' }, 403);

  // ★★ V3.21.0 写入侧字段级门禁（本版核心）：
  //   对当前角色不可见的敏感字段，只要「值确实发生变化」就拒绝并说明原因，不写库。
  //   判据是「值变了」而非「字段出现了」—— 编辑页保存时会回传完整对象（含它自己都看不到
  //   的字段原值），若出现即拒绝，库管改个联系电话都会被拦，功能直接不可用。
  const policy = await resolveFieldPolicy(env.DB, user.org_id);
  const hidden = hiddenFieldsFor(policy, user.role, 'vendor');
  const forbidden = findForbiddenFieldWrites(body, 'vendor', hidden, formatVendor(existing));
  if (forbidden.length) {
    // 403 而非 400：这是权限问题不是格式问题；前端可据此单独提示「请联系管理员」
    return json(fieldPermissionError(forbidden), 403);
  }

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
    return errorResponse(e, '更新');
  }

  await audit(env.DB, user.org_id, user, 'vendor_master', 'update', `更新供应商 ${body.code || (existing as any).vendor_code}`);
  const updated = await env.DB.prepare('SELECT * FROM vendor_master WHERE id = ? AND org_id = ?').bind(params.id, user.org_id).first();
  // ★ 回传同样剥离：成功响应不该比列表接口多泄露字段
  return json(stripRowFields(formatVendor(updated as any), 'vendor', hidden).row);
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
