// GET /api/vendors — 分页查询供应商列表（按 org_id 隔离）
import { getUserFromRequest, json } from '../../_shared/auth';

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

  let sql = 'SELECT * FROM vendors WHERE org_id = ?';
  const params: any[] = [user.org_id];

  if (keyword) {
    sql += ' AND (vendor_code LIKE ? OR company_name LIKE ? OR contact_name LIKE ?)';
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  const rows = await env.DB.prepare(sql).bind(...params).all();
  const data = (rows.results || []).map((r: any) => formatVendor(r));

  // 总数
  let countSql = 'SELECT COUNT(*) as cnt FROM vendors WHERE org_id = ?';
  const countParams: any[] = [user.org_id];
  if (keyword) {
    countSql += ' AND (vendor_code LIKE ? OR company_name LIKE ? OR contact_name LIKE ?)';
    const kw = `%${keyword}%`;
    countParams.push(kw, kw, kw);
  }
  if (status) { countSql += ' AND status = ?'; countParams.push(status); }
  if (type) { countSql += ' AND type = ?'; countParams.push(type); }
  const countRow = await env.DB.prepare(countSql).bind(...countParams).first();
  const total = (countRow as any)?.cnt || 0;

  return json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

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
    blacklistReason: r.blacklist_reason,
    blacklistedAt: r.blacklisted_at,
    blacklistReasonHistory: safeParse(r.blacklist_reason_history),
    salesOrg: r.sales_org,
    reconciliationAccount: r.reconciliation_account,
    taxCode: r.tax_code,
    bankAccount: r.bank_account,
    profilePending: safeParse(r.profile_pending),
    profilePendingAt: r.profile_pending_at,
    profilePendingBy: r.profile_pending_by,
    profileReviewedBy: r.profile_reviewed_by,
    customFields: safeParse(r.custom_fields),
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function safeParse(s: string | null): any {
  if (!s) return undefined;
  try { return JSON.parse(s); } catch { return undefined; }
}
