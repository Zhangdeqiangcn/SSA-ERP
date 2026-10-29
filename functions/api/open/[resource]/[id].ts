// 开放 API 网关：/api/open/:resource/:id — 单条记录的 GET/PUT/DELETE
// 独立路由文件：Pages Functions 将 /api/open/:resource/:id 路由到此文件（[resource].ts 仅匹配 /api/open/:resource 集合）
// 鉴权：API Key + scope 校验；写操作补审计列 + 记审计日志；强制 org_id 归属
import { json } from '../../../_shared/auth';
import { writeAudit } from '../../../_shared/auditLog';
import { requireApiKey } from '../../../_shared/apiKey';
import { validateOrReject } from '../../../_shared/validate';

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
  const def = RESOURCES[context.params.resource];
  if (!def) return badResource();
  const id = context.params.id;
  const row = await context.env.DB.prepare(`SELECT * FROM ${def.table} WHERE id = ? AND org_id = ?`).bind(id, auth.org_id).first();
  if (!row) return json({ error: '记录不存在' }, 404);
  return json(stripHidden(row, def.hidden || []));
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
  const _invalid = validateOrReject(def.table, body, { partial: true });
  if (_invalid) return _invalid;
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
