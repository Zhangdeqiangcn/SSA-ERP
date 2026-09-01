// 开放 API 网关：/api/open/:resource/:id — 单条记录的 GET/PUT/DELETE
// 独立路由文件：Pages Functions 将 /api/open/:resource/:id 路由到此文件（[resource].ts 仅匹配 /api/open/:resource 集合）
// 鉴权：API Key + scope 校验；写操作补审计列 + 记审计日志；强制 org_id 归属
import { json, uid } from '../../../_shared/auth';
import { requireApiKey } from '../../../_shared/apiKey';

const RESOURCES: Record<string, { table: string; cols: string[] }> = {
  materials: {
    table: 'materials',
    cols: ['code', 'name', 'category_id', 'category_name', 'specification', 'model', 'unit',
      'material_type', 'make_or_buy', 'safety_stock', 'min_stock', 'max_stock', 'current_stock',
      'price', 'currency', 'standard_price', 'status', 'lifecycle_status', 'remarks'],
  },
  vendors: {
    table: 'vendor_master',
    cols: ['vendor_code', 'company_name', 'short_name', 'type', 'contact_name', 'contact_phone',
      'contact_email', 'address', 'status', 'credit_level', 'credit_limit', 'used_credit',
      'tax_id', 'bank_account', 'sales_org', 'reconciliation_account', 'tax_code', 'rating',
      'blacklist_reason', 'blacklisted_at', 'qualification_expiry', 'remarks'],
  },
  customers: {
    table: 'customers',
    cols: ['code', 'name', 'short_name', 'type', 'status', 'credit_level', 'credit_limit',
      'used_credit', 'tax_id', 'invoice_title', 'contact_name', 'contact_phone', 'address',
      'default_currency', 'remarks'],
  },
  'purchase-orders': {
    table: 'purchase_orders',
    cols: ['order_no', 'vendor_id', 'vendor_name', 'contact', 'phone', 'status', 'order_date',
      'expected_delivery_date', 'total_amount', 'currency', 'grand_total', 'remarks'],
  },
  'sales-orders': {
    table: 'sales_orders',
    cols: ['order_no', 'type', 'status', 'customer_id', 'customer_name', 'customer_code',
      'contact_name', 'contact_phone', 'total_amount', 'tax_rate', 'tax_amount', 'grand_total', 'remarks'],
  },
};

function badResource() {
  return json({ error: '不支持的资源，可选: ' + Object.keys(RESOURCES).join(', ') }, 404);
}

async function presentCols(DB: any, table: string): Promise<Set<string>> {
  const info = await DB.prepare(`PRAGMA table_info(${table})`).all();
  return new Set((info.results || []).map((r: any) => r.name));
}

async function audit(DB: any, org_id: string, keyId: string, entity: string, action: string, summary: string) {
  try {
    await DB.prepare(
      `INSERT INTO audit_logs (id, org_id, entity, action, summary, user_id, user_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(uid('aud'), org_id, entity, action, summary, keyId, 'apikey:' + keyId, new Date().toISOString()).run();
  } catch { /* 审计失败不影响主流程 */ }
}

export async function onRequestGet(context: any) {
  const auth = await requireApiKey(context.request, context.env.DB, 'read');
  if (auth instanceof Response) return auth;
  const def = RESOURCES[context.params.resource];
  if (!def) return badResource();
  const id = context.params.id;
  const row = await context.env.DB.prepare(`SELECT * FROM ${def.table} WHERE id = ? AND org_id = ?`).bind(id, auth.org_id).first();
  if (!row) return json({ error: '记录不存在' }, 404);
  return json(row);
}

export async function onRequestPut(context: any) {
  const auth = await requireApiKey(context.request, context.env.DB, 'write');
  if (auth instanceof Response) return auth;
  const resource = context.params.resource;
  const def = RESOURCES[resource];
  if (!def) return badResource();
  const id = context.params.id;
  if (!id) return json({ error: '缺少 id' }, 400);

  const body = await context.request.json().catch(() => ({}));
  const cols = def.cols.filter((c) => body[c] !== undefined);
  if (cols.length === 0) return json({ error: '无可更新字段' }, 400);

  const present = await presentCols(context.env.DB, def.table);
  const extraNames: string[] = [];
  const extraVals: any[] = [];
  if (present.has('updated_at')) { extraNames.push('updated_at'); extraVals.push(new Date().toISOString()); }
  if (present.has('updated_by')) { extraNames.push('updated_by'); extraVals.push('apikey:' + auth.keyId); }
  const setSql = [cols.map((c) => `${c} = ?`).join(', '), ...extraNames.map((n) => `${n} = ?`)].filter(Boolean).join(', ');
  const values = [...cols.map((c) => body[c]), ...extraVals, id, auth.org_id];
  const res = await context.env.DB.prepare(
    `UPDATE ${def.table} SET ${setSql} WHERE id = ? AND org_id = ?`
  ).bind(...values).run();
  if ((res.meta?.changes ?? 0) === 0) return json({ error: '记录不存在' }, 404);
  await audit(context.env.DB, auth.org_id, auth.keyId, def.table, 'update', `API更新 ${resource} ${id}`);
  return json({ ok: true });
}

export async function onRequestDelete(context: any) {
  const auth = await requireApiKey(context.request, context.env.DB, 'write');
  if (auth instanceof Response) return auth;
  const resource = context.params.resource;
  const def = RESOURCES[resource];
  if (!def) return badResource();
  const id = context.params.id;
  if (!id) return json({ error: '缺少 id' }, 400);

  const res = await context.env.DB.prepare(
    `DELETE FROM ${def.table} WHERE id = ? AND org_id = ?`
  ).bind(id, auth.org_id).run();
  if ((res.meta?.changes ?? 0) === 0) return json({ error: '记录不存在' }, 404);
  await audit(context.env.DB, auth.org_id, auth.keyId, def.table, 'delete', `API删除 ${resource} ${id}`);
  return json({ ok: true });
}
