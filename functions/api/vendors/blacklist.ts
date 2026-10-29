// GET /api/vendors/blacklist — 黑名单供应商列表
//
// P0-4（V3.113.3）：前端 getBlacklistedVendors() 一直调用本端点，后端从未实现 → 404。
import { getUserFromRequest, json } from '../../_shared/auth';
import { guardOperation } from '../../_shared/operationGuard';
import { formatVendorRow } from '../../_shared/vendorApproval';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const opGuard = await guardOperation(user, 'vendor', 'read', env.DB, user.org_id);
  if (opGuard) return opGuard;

  const rows = await env.DB.prepare(
    `SELECT * FROM vendor_master WHERE org_id = ? AND status = 'blacklisted' ORDER BY blacklisted_at DESC, updated_at DESC`
  ).bind(user.org_id).all();

  return json((rows.results || []).map((r: any) => formatVendorRow(r)));
}
