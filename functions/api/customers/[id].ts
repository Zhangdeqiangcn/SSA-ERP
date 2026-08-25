// GET/PUT/DELETE /api/customers/:id
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const row = await env.DB.prepare(
    'SELECT * FROM customers WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!row) return json({ error: '客户不存在' }, 404);
  return json(formatCustomer(row as any));
}

export async function onRequestPut(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }

  const existing = await env.DB.prepare(
    'SELECT id, code FROM customers WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!existing) return json({ error: '客户不存在' }, 404);

  if (body.code && body.code !== (existing as any).code) {
    const dup = await env.DB.prepare(
      'SELECT id FROM customers WHERE org_id = ? AND code = ? AND id != ?'
    ).bind(user.org_id, body.code, params.id).first();
    if (dup) return json({ error: '客户编码已存在' }, 409);
  }

  const now = new Date().toISOString();
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
  `).bind(
    body.code, body.name, body.shortName, body.type, body.status,
    body.creditLevel, body.creditLimit ?? null, body.usedCredit ?? null,
    body.settlementTermDays ?? null,
    body.taxId, body.invoiceTitle, body.invoiceAddress, body.invoicePhone,
    body.bankName, body.bankAccount, body.bankAccountName,
    body.contactName, body.contactPhone, body.contactEmail, body.address,
    body.defaultCurrency, body.defaultTaxRate ?? null,
    body.salesOrg, body.reconciliationAccount, body.taxCode,
    body.remarks,
    body.customFields ? JSON.stringify(body.customFields) : null,
    now, params.id, user.org_id
  ).run();

  const updated = await env.DB.prepare('SELECT * FROM customers WHERE id = ? AND org_id = ?').bind(params.id, user.org_id).first();
  return json(formatCustomer(updated as any));
}

export async function onRequestDelete(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const result = await env.DB.prepare(
    'DELETE FROM customers WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).run();
  if (result.changes === 0) return json({ error: '客户不存在' }, 404);
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
