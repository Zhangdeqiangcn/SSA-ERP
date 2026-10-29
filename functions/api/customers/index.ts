// GET /api/customers — 分页查询客户列表（按 org_id 隔离）
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';
import { audit } from '../../_shared/auditLog';
import { errorResponse } from '../../_shared/errors';
import { validateOrReject } from '../../_shared/validate';
import { guardOperation } from '../../_shared/operationGuard';
// P0-2：服务端脱敏（与 /api/vendors 同一套口径）——让「界面上看不到」变成「数据里也拿不到」
import {
  resolveFieldPolicy,
  hiddenFieldsFor,
  stripRowsFields,
} from '../../_shared/fieldAccess';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
  const offset = (page - 1) * pageSize;

  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');

  let sql = 'SELECT * FROM customers WHERE org_id = ?';
  const params: any[] = [user.org_id];
  const rls = rlsCondition(user, 'customers');
  if (rls.clause !== '1=1') { sql += ' AND ' + rls.clause; params.push(...rls.params); }

  if (keyword) {
    sql += ' AND (code LIKE ? ESCAPE \'\\\' OR name LIKE ? ESCAPE \'\\\' OR short_name LIKE ? ESCAPE \'\\\')';
    const kw = likePattern(keyword);
    params.push(kw, kw, kw);
  }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (type) { sql += ' AND type = ?'; params.push(type); }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  const rows = await env.DB.prepare(sql).bind(...params).all();
  // P0-2：读取侧剥离 —— 无权角色拿不到 creditLimit / bankAccount / taxId / reconciliationAccount 等敏感字段
  const policy = await resolveFieldPolicy(env.DB, user.org_id);
  const hidden = hiddenFieldsFor(policy, user.role, 'customer');
  const data = stripRowsFields(
    (rows.results || []).map((r: any) => formatCustomer(r)),
    'customer',
    hidden
  ).rows;

  let countSql = 'SELECT COUNT(*) as cnt FROM customers WHERE org_id = ?';
  const countParams: any[] = [user.org_id];
  if (rls.clause !== '1=1') { countSql += ' AND ' + rls.clause; countParams.push(...rls.params); }
  if (keyword) {
    countSql += ' AND (code LIKE ? ESCAPE \'\\\' OR name LIKE ? ESCAPE \'\\\' OR short_name LIKE ? ESCAPE \'\\\')';
    const kw = likePattern(keyword);
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
  
  // V3.24.0: 操作权限服务端守卫
  const _opGuard = await import('../../_shared/operationGuard').then(m => m.guardOperation(user, 'customer', 'create', context.env.DB, user.org_id));
  if (_opGuard) return _opGuard;

let body: any;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }
  const _invalid = validateOrReject('customers', body);
  if (_invalid) return _invalid;
  if (!body.code || !body.name) return json({ error: '客户编码与名称必填' }, 400);

  // P0-2：创建时「不可见字段一律不落库」（与 /api/vendors 同口径：静默剔除，不打断业务）。
  //   库管在表单里根本看不到授信/银行账号，若拦成 403 就变成「新建客户永远失败」。
  const policy = await resolveFieldPolicy(env.DB, user.org_id);
  const hidden = hiddenFieldsFor(policy, user.role, 'customer');
  const droppedFields: string[] = [];
  for (const f of hidden) {
    if (f in body) { delete body[f]; droppedFields.push(f); }
  }

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
    return errorResponse(e, '创建');
  }

  // 审计留痕：被剔除的字段要看得见（否则「为什么我填的授信额度没保存」无从解释）
  const dropNote = droppedFields.length ? `（已忽略无权字段：${droppedFields.join('、')}）` : '';
  await audit(env.DB, user.org_id, user, 'customers', 'create', `创建客户 ${code} ${name}${dropNote}`);
  const created = await env.DB.prepare('SELECT * FROM customers WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
  // 回传同样按角色剥离：创建成功的响应不该比列表接口多泄露字段
  return json(
    stripRowsFields([formatCustomer(created as any)], 'customer', hidden).rows[0],
    201
  );
}

// V3.3.0（评测 L-05）：原本地 audit() 的静默 catch 已删除，统一改用 _shared/auditLog 的
//   audit()——审计失败不再被吞掉，而是走「结构化日志 → 降级表留痕 → 永不抛出」三层降级。
//   （该函数签名与本文件原有调用点完全一致，故调用处无需改动。）

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
