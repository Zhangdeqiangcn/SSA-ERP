// GET/PUT/DELETE /api/customers/:id
import { getUserFromRequest, json } from '../../_shared/auth';
import { assertRlsOwnership } from '../../_shared/rls';
import { errorResponse } from '../../_shared/errors';
import { validateOrReject } from '../../_shared/validate';

import { audit } from '../../_shared/auditLog';
import { guardOperation } from '../../_shared/operationGuard';
// P0-2：服务端脱敏（与列表接口同口径，详情侧同样不可裸奔）
import {
  resolveFieldPolicy,
  hiddenFieldsFor,
  stripRowFields,
  findForbiddenFieldWrites,
  fieldPermissionError,
} from '../../_shared/fieldAccess';
export async function onRequestGet(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const row = await env.DB.prepare(
    'SELECT * FROM customers WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!row) return json({ error: '客户不存在' }, 404);
  // V2.97.0 修复（安全审计 B1）：单条读取同样执行行级归属校验——列表接口与
  //   修改/删除接口均已校验，唯读取遗漏，导致同公司内可读他人客户敏感信息
  //   （授信额度 / 税号 / 银行账号等）。
  if (!assertRlsOwnership(user, row, 'customers')) {
    return json({ error: '无权访问该客户' }, 403);
  }
  // P0-2：详情按角色剥离（与列表同一策略，避免「列表遮了、详情裸奔」的绕过口）
  const policy = await resolveFieldPolicy(env.DB, user.org_id);
  const hidden = hiddenFieldsFor(policy, user.role, 'customer');
  return json(stripRowFields(formatCustomer(row as any), 'customer', hidden).row);
}

export async function onRequestPut(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  
  // V3.24.0: 操作权限服务端守卫
  const _opGuard = await import('../../_shared/operationGuard').then(m => m.guardOperation(user, 'customer', 'update', context.env.DB, user.org_id));
  if (_opGuard) return _opGuard;

let body: any;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }
  const _invalid = validateOrReject('customers', body, { partial: true });
  if (_invalid) return _invalid;

  // P0-2：取整行（原为 SELECT id, code, owner_id 三列）—— 字段级门禁需要拿「库中现值」
  //   与请求体比对，判断用户是否真的要改动敏感字段（值未变则放行，避免误拦）。
  const existing = await env.DB.prepare(
    'SELECT * FROM customers WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!existing) return json({ error: '客户不存在' }, 404);
  if (!assertRlsOwnership(user, existing, 'customers')) return json({ error: '无权限修改他人客户' }, 403);

  // P0-2 写入侧字段级门禁：对当前角色不可见的敏感字段，「值确实变化」即 403，不写库
  const policy = await resolveFieldPolicy(env.DB, user.org_id);
  const hidden = hiddenFieldsFor(policy, user.role, 'customer');
  const forbidden = findForbiddenFieldWrites(body, 'customer', hidden, formatCustomer(existing as any));
  if (forbidden.length) {
    return json(fieldPermissionError(forbidden), 403);
  }

  if (body.code && body.code !== (existing as any).code) {
    const dup = await env.DB.prepare(
      'SELECT id FROM customers WHERE org_id = ? AND code = ? AND id != ?'
    ).bind(user.org_id, body.code, params.id).first();
    if (dup) return json({ error: '客户编码已存在' }, 409);
  }

  const now = new Date().toISOString();
  try {
  await env.DB.prepare(`
    UPDATE customers SET
      code = COALESCE(?, code),
      name = COALESCE(?, name),
      short_name = COALESCE(?, short_name),
      type = COALESCE(?, type),
      status = COALESCE(?, status),
      credit_level = COALESCE(?, credit_level),
      credit_limit = COALESCE(?, credit_limit),
      used_credit = COALESCE(?, used_credit),
      settlement_term_days = COALESCE(?, settlement_term_days),
      tax_id = COALESCE(?, tax_id),
      invoice_title = COALESCE(?, invoice_title),
      invoice_address = COALESCE(?, invoice_address),
      invoice_phone = COALESCE(?, invoice_phone),
      bank_name = COALESCE(?, bank_name),
      bank_account = COALESCE(?, bank_account),
      bank_account_name = COALESCE(?, bank_account_name),
      contact_name = COALESCE(?, contact_name),
      contact_phone = COALESCE(?, contact_phone),
      contact_email = COALESCE(?, contact_email),
      address = COALESCE(?, address),
      default_currency = COALESCE(?, default_currency),
      default_tax_rate = COALESCE(?, default_tax_rate),
      sales_org = COALESCE(?, sales_org),
      reconciliation_account = COALESCE(?, reconciliation_account),
      tax_code = COALESCE(?, tax_code),
      remarks = COALESCE(?, remarks),
      custom_fields = COALESCE(?, custom_fields),
      updated_at = ?
    WHERE id = ? AND org_id = ?
  `  ).bind(
    body.code ?? null, body.name ?? null, body.shortName ?? null, body.type ?? null, body.status ?? null,
    body.creditLevel ?? null, body.creditLimit ?? null, body.usedCredit ?? null,
    body.settlementTermDays ?? null,
    body.taxId ?? null, body.invoiceTitle ?? null, body.invoiceAddress ?? null, body.invoicePhone ?? null,
    body.bankName ?? null, body.bankAccount ?? null, body.bankAccountName ?? null,
    body.contactName ?? null, body.contactPhone ?? null, body.contactEmail ?? null, body.address ?? null,
    body.defaultCurrency ?? null, body.defaultTaxRate ?? null,
    body.salesOrg ?? null, body.reconciliationAccount ?? null, body.taxCode ?? null,
    body.remarks ?? null,
    body.customFields ? JSON.stringify(body.customFields) : null,
    now, params.id, user.org_id
  ).run();
  } catch (e: any) {
    return errorResponse(e, '更新');
  }

  const updated = await env.DB.prepare('SELECT * FROM customers WHERE id = ? AND org_id = ?').bind(params.id, user.org_id).first();
  if (!updated) return json({ error: '客户不存在' }, 404);
  await audit(env.DB, user.org_id, user, 'customers', 'update', `更新客户 ${params.id}`);
  // P0-2：回传同样剥离——成功响应不该比列表接口多泄露字段
  return json(stripRowFields(formatCustomer(updated as any), 'customer', hidden).row);
}

export async function onRequestDelete(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const target = await env.DB.prepare(
    'SELECT id, owner_id FROM customers WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!target) return json({ error: '客户不存在' }, 404);
  if (!assertRlsOwnership(user, target, 'customers')) return json({ error: '无权限删除他人客户' }, 403);
  const result = await env.DB.prepare(
    'DELETE FROM customers WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).run();
  if ((result.meta?.changes ?? result.changes) === 0) return json({ error: '客户不存在' }, 404);
  await audit(env.DB, user.org_id, user, 'customers', 'delete', `删除客户 ${params.id}`);
  return json({ ok: true });
}

function formatCustomer(r: any) {
  return {
    id: r.id, org_id: r.org_id,
    code: r.code, name: r.name, shortName: r.short_name,
    type: r.type, status: r.status,
    creditLevel: r.credit_level, creditLimit: r.credit_limit, usedCredit: r.used_credit,
    settlementTermDays: r.settlement_term_days,
    taxId: r.tax_id, invoiceTitle: r.invoice_title,
    invoiceAddress: r.invoice_address, invoicePhone: r.invoice_phone,
    bankName: r.bank_name, bankAccount: r.bank_account, bankAccountName: r.bank_account_name,
    contactName: r.contact_name, contactPhone: r.contact_phone, contactEmail: r.contact_email,
    address: r.address,
    defaultCurrency: r.default_currency, defaultTaxRate: r.default_tax_rate,
    salesOrg: r.sales_org, reconciliationAccount: r.reconciliation_account, taxCode: r.tax_code,
    remarks: r.remarks,
    customFields: safeParse(r.custom_fields),
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function safeParse(s: string | null): any {
  if (!s) return undefined;
  try { return JSON.parse(s); } catch { return undefined; }
}
