// GET /api/customers — 分页查询客户列表（按 org_id 隔离）
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { rlsFragment } from '../../_shared/rls';

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

  let sql = 'SELECT * FROM customers WHERE org_id = ?';
  const params: any[] = [user.org_id];
  const rls = rlsFragment(user, 'customers');
  if (rls.clause !== '1=1') { sql += ' AND ' + rls.clause; params.push(rls.param!); }

  if (keyword) {
    sql += ' AND (code LIKE ? OR name LIKE ? OR short_name LIKE ?)';
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (type) { sql += ' AND type = ?'; params.push(type); }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  const rows = await env.DB.prepare(sql).bind(...params).all();
  const data = (rows.results || []).map((r: any) => formatCustomer(r));

  let countSql = 'SELECT COUNT(*) as cnt FROM customers WHERE org_id = ?';
  const countParams: any[] = [user.org_id];
  if (rls.clause !== '1=1') { countSql += ' AND ' + rls.clause; countParams.push(rls.param!); }
  if (keyword) {
    countSql += ' AND (code LIKE ? OR name LIKE ? OR short_name LIKE ?)';
    const kw = `%${keyword}%`;
    countParams.push(kw, kw, kw);
  }
  if (status) { countSql += ' AND status = ?'; countParams.push(status); }
  if (type) { countSql += ' AND type = ?'; countParams.push(type); }
  const countRow = await env.DB.prepare(countSql).bind(...countParams).first();
  const total = (countRow as any)?.cnt || 0;

  return json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

// POST /api/customers — 创建客户（D1 customers，会话鉴权）
// V2.74.5 起客户主数据直连 D1 customers（与开放网关 /api/open/customers 同源），消除 app_state Blob 双源。
export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }
  if (!body.code || !body.name) return json({ error: '客户编码与名称必填' }, 400);

  const dup = await env.DB.prepare(
    'SELECT id FROM customers WHERE org_id = ? AND code = ?'
  ).bind(user.org_id, body.code).first();
  if (dup) return json({ error: '客户编码已存在' }, 409);

  const id = uid('cus');
  const now = new Date().toISOString();
  const {
    code, name, shortName, type, status,
    creditLevel, creditLimit, usedCredit, settlementTermDays,
    taxId, invoiceTitle, invoiceAddress, invoicePhone,
    bankName, bankAccount, bankAccountName,
    contactName, contactPhone, contactEmail, address,
    defaultCurrency, defaultTaxRate,
    salesOrg, reconciliationAccount, taxCode,
    remarks, customFields,
  } = body || {};

  try {
    await env.DB.prepare(`
      INSERT INTO customers (
        org_id, id, code, name, short_name, type, status,
        credit_level, credit_limit, used_credit, settlement_term_days,
        tax_id, invoice_title, invoice_address, invoice_phone,
        bank_name, bank_account, bank_account_name,
        contact_name, contact_phone, contact_email, address,
        default_currency, default_tax_rate,
        sales_org, reconciliation_account, tax_code,
        remarks, custom_fields,
        owner_id, dept_id, created_at, updated_at, created_by, updated_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      user.org_id, id, code, name, shortName ?? null, type ?? null, status ?? 'active',
      creditLevel ?? null, creditLimit ?? 0, usedCredit ?? 0, settlementTermDays ?? 30,
      taxId ?? null, invoiceTitle ?? null, invoiceAddress ?? null, invoicePhone ?? null,
      bankName ?? null, bankAccount ?? null, bankAccountName ?? null,
      contactName ?? null, contactPhone ?? null, contactEmail ?? null, address ?? null,
      defaultCurrency ?? 'CNY', defaultTaxRate ?? null,
      salesOrg ?? null, reconciliationAccount ?? null, taxCode ?? null,
      remarks ?? null, customFields ? JSON.stringify(customFields) : null,
      user.id, user.department || null, now, now, user.id, user.id
    ).run();
  } catch (e: any) {
    return json({ error: '创建失败: ' + (e?.message || String(e)) }, 500);
  }

  await audit(env.DB, user.org_id, user, 'customers', 'create', `创建客户 ${code} ${name}`);
  const created = await env.DB.prepare('SELECT * FROM customers WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
  return json(formatCustomer(created as any), 201);
}

async function audit(DB: any, org_id: string, user: any, entity: string, action: string, summary: string) {
  try {
    await DB.prepare(
      `INSERT INTO audit_logs (id, org_id, user_id, user_name, entity, action, summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(uid('al'), org_id, user.id, user.name || user.username, entity, action, summary, new Date().toISOString()).run();
  } catch { /* 审计失败不阻断主流程 */ }
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
