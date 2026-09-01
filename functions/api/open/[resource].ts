// 开放 API 网关：/api/open/:resource  — 物料/供应商/客户/采购单/销售单 读写全端点
// 鉴权：API Key（Authorization: Bearer sk_xxx 或 ?api_key=），scope 校验 read/write
// 安全：强制 org_id 归属（防跨组织写）；写操作记审计；API Key 视为组织级特权（看全部，不过角色过滤）
import { json, uid } from '../../_shared/auth';
import { requireApiKey } from '../../_shared/apiKey';

const RESOURCES: Record<string, { table: string; cols: string[] }> = {
  materials: {
    table: 'materials',
    cols: ['code', 'name', 'category_id', 'category_name', 'specification', 'model', 'unit',
      'material_type', 'make_or_buy', 'safety_stock', 'min_stock', 'max_stock', 'current_stock',
      'price', 'currency', 'standard_price', 'status', 'lifecycle_status', 'remarks'],
  },
  vendors: {
    table: 'vendors',
    cols: ['vendor_code', 'company_name', 'short_name', 'type', 'contact_name', 'contact_phone',
      'contact_email', 'address', 'status', 'credit_level', 'credit_limit', 'used_credit', 'remarks'],
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
  const resource = context.params.resource;
  const def = RESOURCES[resource];
  if (!def) return badResource();

  const url = new URL(context.request.url);
  const id = context.params.id;
  const db = context.env.DB;

  if (id) {
    const row = await db.prepare(`SELECT * FROM ${def.table} WHERE id = ? AND org_id = ?`).bind(id, auth.org_id).first();
    if (!row) return json({ error: '记录不存在' }, 404);
    return json(row);
  }

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
  const rows = await db.prepare(
    `SELECT * FROM ${def.table} WHERE org_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(auth.org_id, pageSize, (page - 1) * pageSize).all();
  const cnt = await db.prepare(`SELECT COUNT(*) as cnt FROM ${def.table} WHERE org_id = ?`).bind(auth.org_id).first();
  return json({ data: rows.results || [], total: (cnt as any)?.cnt || 0, page, pageSize });
}

export async function onRequestPost(context: any) {
  const auth = await requireApiKey(context.request, context.env.DB, 'write');
  if (auth instanceof Response) return auth;
  const resource = context.params.resource;
  const def = RESOURCES[resource];
  if (!def) return badResource();

  const body = await context.request.json().catch(() => ({}));
  const cols = def.cols.filter((c) => body[c] !== undefined);
  if (cols.length === 0) return json({ error: '无可写字段' }, 400);

  const id = uid(resource.replace(/-/g, '_').slice(0, 4));
  const now = new Date().toISOString();
  const colNames = ['id', 'org_id', ...cols];
  const placeholders = colNames.map(() => '?').join(', ');
  const values = [id, auth.org_id, ...cols.map((c) => body[c])];

  await context.env.DB.prepare(
    `INSERT INTO ${def.table} (${colNames.join(', ')}) VALUES (${placeholders})`
  ).bind(...values).run();
  await audit(context.env.DB, auth.org_id, auth.keyId, def.table, 'create', `API创建 ${resource} ${id}`);
  return json({ ok: true, id }, 201);
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

  const setClauses = cols.map((c) => `${c} = ?`).join(', ');
  const values = [...cols.map((c) => body[c]), new Date().toISOString(), id, auth.org_id];
  const res = await context.env.DB.prepare(
    `UPDATE ${def.table} SET ${setClauses}, updated_at = ? WHERE id = ? AND org_id = ?`
  ).bind(...values).run();
  if (res.changes === 0) return json({ error: '记录不存在' }, 404);
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
  if (res.changes === 0) return json({ error: '记录不存在' }, 404);
  await audit(context.env.DB, auth.org_id, auth.keyId, def.table, 'delete', `API删除 ${resource} ${id}`);
  return json({ ok: true });
}
