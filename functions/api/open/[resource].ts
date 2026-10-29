// 开放 API 网关（集合）：/api/open/:resource  — 列表 GET + 创建 POST
// 单条记录的 GET/PUT/DELETE 在 [resource]/[id].ts（Pages Functions 路由要求）
// 鉴权：API Key（Authorization: Bearer sk_xxx 或 ?api_key=），scope 校验 read/write
// 安全：强制 org_id 归属（防跨组织写）；写操作补审计列 + 记审计；API Key 视为组织级特权（看全部，不过角色过滤）
import { json, uid } from '../../_shared/auth';
import { writeAudit } from '../../_shared/auditLog';
import { requireApiKey } from '../../_shared/apiKey';
import { validateOrReject } from '../../_shared/validate';

const RESOURCES: Record<string, { table: string; cols: string[]; hidden: string[] }> = {
  materials: {
    table: 'materials',
    cols: ['code', 'name', 'category_id', 'category_name', 'specification', 'model', 'unit',
      'material_type', 'make_or_buy', 'safety_stock', 'min_stock', 'max_stock', 'current_stock',
      'price', 'currency', 'standard_price', 'status', 'lifecycle_status', 'remarks'],
    hidden: ['price', 'standard_price'],
  },
  vendors: {
    table: 'vendor_master',
    cols: ['vendor_code', 'company_name', 'short_name', 'type', 'contact_name', 'contact_phone',
      'contact_email', 'address', 'status', 'credit_level', 'credit_limit', 'used_credit',
      'tax_id', 'bank_account', 'sales_org', 'reconciliation_account', 'tax_code', 'rating',
      'blacklist_reason', 'blacklisted_at', 'qualification_expiry', 'remarks'],
    // 授信额度/已用授信/税号/银行账号/对账账号/税码均为敏感字段，只读密钥拉全量时剔除
    hidden: ['credit_limit', 'used_credit', 'tax_id', 'bank_account', 'reconciliation_account', 'tax_code'],
  },
  customers: {
    table: 'customers',
    cols: ['code', 'name', 'short_name', 'type', 'status', 'credit_level', 'credit_limit',
      'used_credit', 'tax_id', 'invoice_title', 'contact_name', 'contact_phone', 'address',
      'default_currency', 'remarks'],
    hidden: ['credit_limit', 'used_credit', 'tax_id'],
  },
  'purchase-orders': {
    table: 'purchase_orders',
    cols: ['order_no', 'vendor_id', 'vendor_name', 'contact', 'phone', 'status', 'order_date',
      'expected_delivery_date', 'total_amount', 'currency', 'grand_total', 'remarks'],
    // 订单金额/币种/税额是组织主动开放的对账数据，剔除会让集成接口失去意义，故不收敛
    hidden: [],
  },
  'sales-orders': {
    table: 'sales_orders',
    cols: ['order_no', 'type', 'status', 'customer_id', 'customer_name', 'customer_code',
      'contact_name', 'contact_phone', 'total_amount', 'tax_rate', 'tax_amount', 'grand_total', 'remarks'],
    // 订单金额/币种/税额是组织主动开放的对账数据，剔除会让集成接口失去意义，故不收敛
    hidden: [],
  },
};

function badResource() {
  return json({ error: '不支持的资源，可选: ' + Object.keys(RESOURCES).join(', ') }, 404);
}

// 剔除对外暴露的敏感列。SELECT * 拿到的行先过这道收敛再返回。
// 说明：被剔除的字段会以 _hiddenFields 元数据形式告知调用方，避免集成方误判为「字段不存在」。
function stripHidden(row: any, hidden: string[]): any {
  if (!row || !hidden.length) return row;
  const out: any = {};
  const removed: string[] = [];
  for (const k of Object.keys(row)) {
    if (hidden.includes(k)) { removed.push(k); continue; }
    out[k] = row[k];
  }
  if (removed.length) out._hiddenFields = removed;
  return out;
}

// 探测表实际存在的审计列（各关系表 NOT NULL 审计列不一致：materials/customers 含 created_at/updated_at/created_by/updated_by，
// vendors 仅 created_at，purchase_orders/sales_orders 含 created_at/updated_at）。网关写操作必须补齐这些列，否则触发 NOT NULL 约束 500。
async function presentCols(DB: any, table: string): Promise<Set<string>> {
  const info = await DB.prepare(`PRAGMA table_info(${table})`).all();
  return new Set((info.results || []).map((r: any) => r.name));
}

// V3.3.0（评测 L-05）：审计写入改走统一入口，失败不再静默丢弃。
//   开放网关的审计主体是「接口密钥」而非登录用户，故用 apikey:<id> 作为执行者标识。
async function audit(DB: any, org_id: string, keyId: string, entity: string, action: string, summary: string) {
  return writeAudit(DB, {
    orgId: org_id,
    actor: { id: keyId, name: 'apikey:' + keyId },
    entity,
    action,
    summary,
  });
}

export async function onRequestGet(context: any) {
  const auth = await requireApiKey(context.request, context.env.DB, 'read');
  if (auth instanceof Response) return auth;
  const resource = context.params.resource;
  const def = RESOURCES[resource];
  if (!def) return badResource();

  const url = new URL(context.request.url);
  const db = context.env.DB;

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
  const rows = await db.prepare(
    `SELECT * FROM ${def.table} WHERE org_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(auth.org_id, pageSize, (page - 1) * pageSize).all();
  const cnt = await db.prepare(`SELECT COUNT(*) as cnt FROM ${def.table} WHERE org_id = ?`).bind(auth.org_id).first();
  const hidden = def.hidden || [];
  const data = (rows.results || []).map((r: any) => stripHidden(r, hidden));
  return json({ data, total: (cnt as any)?.cnt || 0, page, pageSize });
}

export async function onRequestPost(context: any) {
  const auth = await requireApiKey(context.request, context.env.DB, 'write');
  if (auth instanceof Response) return auth;
  const resource = context.params.resource;
  const def = RESOURCES[resource];
  if (!def) return badResource();

  const body = await context.request.json().catch(() => ({}));
  const _invalid = validateOrReject(def.table, body);
  if (_invalid) return _invalid;
  const cols = def.cols.filter((c) => body[c] !== undefined);
  if (cols.length === 0) return json({ error: '无可写字段' }, 400);

  const id = uid(resource.replace(/-/g, '_').slice(0, 4));
  const now = new Date().toISOString();
  const actor = 'apikey:' + auth.keyId;
  const present = await presentCols(context.env.DB, def.table);
  const auditNames: string[] = [];
  const auditVals: any[] = [];
  if (present.has('created_at')) { auditNames.push('created_at'); auditVals.push(now); }
  if (present.has('updated_at')) { auditNames.push('updated_at'); auditVals.push(now); }
  if (present.has('created_by')) { auditNames.push('created_by'); auditVals.push(actor); }
  if (present.has('updated_by')) { auditNames.push('updated_by'); auditVals.push(actor); }

  const colNames = ['id', 'org_id', ...cols, ...auditNames];
  const placeholders = colNames.map(() => '?').join(', ');
  const values = [id, auth.org_id, ...cols.map((c) => body[c]), ...auditVals];

  await context.env.DB.prepare(
    `INSERT INTO ${def.table} (${colNames.join(', ')}) VALUES (${placeholders})`
  ).bind(...values).run();
  await audit(context.env.DB, auth.org_id, auth.keyId, def.table, 'create', `API创建 ${resource} ${id}`);
  return json({ ok: true, id }, 201);
}
