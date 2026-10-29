// GET /api/vendors/pending-approvals — 待审核供应商列表
//
// P0-4（V3.113.3）：前端 src/services/vendor.ts 的 getPendingApprovals() 一直调用本端点，
//   但后端从未实现 → 界面调用必然 404，供应商审核模块整体不可用。
//   本端点同时返回**门户账号表**（vendors）里的自助注册申请 —— 那是「注册后无法登录」的根因所在。
import { getUserFromRequest, json } from '../../_shared/auth';
import { guardOperation } from '../../_shared/operationGuard';
import { formatVendorRow, normalizeVendorStatus } from '../../_shared/vendorApproval';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const opGuard = await guardOperation(user, 'vendor', 'read', env.DB, user.org_id);
  if (opGuard) return opGuard;

  const db = env.DB;

  // ① 主数据表：待审核（registered / pending）
  const masterRows = await db.prepare(
    `SELECT * FROM vendor_master WHERE org_id = ? AND status IN ('registered','pending') ORDER BY created_at ASC`
  ).bind(user.org_id).all();

  // ② 门户账号表：自助注册后写死 pending 的申请（两表 id 不一致，按 vendor_code 并入）
  const accountRows = await db.prepare(
    `SELECT * FROM vendors WHERE org_id = ? AND status IN ('registered','pending') ORDER BY created_at ASC`
  ).bind(user.org_id).all();

  const masterCodes = new Set((masterRows.results || []).map((r: any) => r.vendor_code));
  const merged: any[] = [...(masterRows.results || [])];

  for (const a of (accountRows.results || [])) {
    // 同一 vendor_code 已在主数据表 → 不重复展示（以主数据行为准）
    if (masterCodes.has(a.vendor_code)) continue;
    merged.push({
      ...a,
      id: a.id,
      vendor_code: a.vendor_code,
      company_name: a.company_name,
      status: normalizeVendorStatus(a.status),
      contact_name: a.contact_name,
      contact_phone: a.contact_phone,
      contact_email: a.contact_email,
      address: a.address,
      created_at: a.created_at,
      updated_at: a.created_at,
      // 标记来源，便于界面区分「主数据待审」与「门户自助注册待审」
      __source: 'vendor_portal_register',
    });
  }

  const data = merged.map((r: any) => ({
    ...formatVendorRow(r),
    // 门户注册行缺主数据列，给出安全默认值，避免界面 undefined
    type: r.type || 'trader',
    creditLimit: r.credit_limit ?? 0,
    usedCredit: r.used_credit ?? 0,
    __source: r.__source || 'vendor_master',
  }));

  return json(data);
}
