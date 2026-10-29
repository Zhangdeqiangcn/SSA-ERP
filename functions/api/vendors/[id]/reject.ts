// POST /api/vendors/:id/reject — 审核拒绝供应商
//
// P0-4（V3.113.3）：前端 rejectVendor() 一直调用本端点，后端从未实现 → 404。
//   拒绝后 status='rejected'（门户登录端点只放行 approved，故 rejected 自动无法登录）。
import { getUserFromRequest, json } from '../../../_shared/auth';
import { guardOperation } from '../../../_shared/operationGuard';
import { syncVendorStatus, formatVendorRow } from '../../../_shared/vendorApproval';

export async function onRequestPost(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const opGuard = await guardOperation(user, 'vendor', 'update', env.DB, user.org_id);
  if (opGuard) return opGuard;

  let body: any = {};
  try { body = await request.json(); } catch { /* 空体由下方校验拦截 */ }
  const reason = String(body?.reason || '').trim().slice(0, 500);
  if (!reason) return json({ error: '请填写拒绝原因', code: 'MISSING_REASON' }, 400);

  const res = await syncVendorStatus(
    env.DB, user.org_id, params.id, 'rejected',
    { id: user.id, name: user.name },
    `拒绝原因：${reason}`
  );
  if (!res.ok) return json({ error: '供应商不存在' }, 404);

  const row = await env.DB.prepare('SELECT * FROM vendor_master WHERE id = ? AND org_id = ?')
    .bind(res.id, user.org_id).first();

  return json({
    ...(row ? formatVendorRow(row) : { id: res.id, code: res.code, status: 'rejected' }),
    status: 'rejected',
    reason,
    syncedTables: res.syncedTables,
  });
}
