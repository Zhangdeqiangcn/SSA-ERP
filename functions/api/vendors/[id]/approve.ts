// POST /api/vendors/:id/approve — 审核通过供应商
//
// P0-4（V3.113.3）：前端 approveVendor() 一直调用本端点，后端从未实现 → 404。
//   审核通过 = 把 status 置为 'approved'，并**同步两张供应商表**：
//     · vendor_master —— 主数据（界面列表/详情读它）
//     · vendors       —— 门户账号（门户登录读它，只放行 approved）
//   只改一张就会出现「界面显示已批准、供应商仍登不进去」的口径分裂。
import { getUserFromRequest, json } from '../../../_shared/auth';
import { guardOperation } from '../../../_shared/operationGuard';
import { syncVendorStatus, formatVendorRow } from '../../../_shared/vendorApproval';

export async function onRequestPost(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  // 审核 = 供应商更新面（与 PUT 同口径的权限守卫）
  const opGuard = await guardOperation(user, 'vendor', 'update', env.DB, user.org_id);
  if (opGuard) return opGuard;

  let body: any = {};
  try { body = await request.json(); } catch { /* 允许空体（审批意见可选） */ }
  const comments = String(body?.comments || '').slice(0, 500);

  const res = await syncVendorStatus(
    env.DB, user.org_id, params.id, 'approved',
    { id: user.id, name: user.name },
    comments ? `审批意见：${comments}` : '审核通过'
  );

  if (!res.ok) return json({ error: '供应商不存在' }, 404);

  const row = await env.DB.prepare('SELECT * FROM vendor_master WHERE id = ? AND org_id = ?')
    .bind(res.id, user.org_id).first();

  return json({
    ...(row ? formatVendorRow(row) : { id: res.id, code: res.code, status: 'approved' }),
    status: 'approved',
    comments,
    syncedTables: res.syncedTables,
  });
}
