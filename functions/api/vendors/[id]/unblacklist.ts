// POST /api/vendors/:id/unblacklist — 移出黑名单
//
// P0-4（V3.113.3）：前端 removeFromBlacklist() 一直调用本端点，后端从未实现 → 404。
//   移出后恢复为 'approved'（不是 pending —— 已经合作过的供应商拉黑又解黑，
//   若回到 pending 就等于又让其重新排队审批，业务上不合理）。
//   拉黑原因历史**保留**（合规要求：曾被拉黑的事实不可消失）。
import { getUserFromRequest, json } from '../../../_shared/auth';
import { guardOperation } from '../../../_shared/operationGuard';
import { audit } from '../../../_shared/auditLog';

export async function onRequestPost(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const opGuard = await guardOperation(user, 'vendor', 'update', env.DB, user.org_id);
  if (opGuard) return opGuard;

  const existing = await env.DB.prepare(
    'SELECT id, vendor_code, status FROM vendor_master WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!existing) return json({ error: '供应商不存在' }, 404);
  if (existing.status !== 'blacklisted') {
    return json({ error: '该供应商不在黑名单中', code: 'NOT_BLACKLISTED' }, 409);
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE vendor_master SET status = 'approved', blacklisted_at = NULL, updated_at = ?, updated_by = ? WHERE id = ? AND org_id = ?`
  ).bind(now, user.name, params.id, user.org_id).run();

  // 门户账号表同步
  await env.DB.prepare('UPDATE vendors SET status = ? WHERE id = ? AND org_id = ?')
    .bind('approved', params.id, user.org_id).run();
  await env.DB.prepare('UPDATE vendors SET status = ? WHERE vendor_code = ? AND org_id = ?')
    .bind('approved', existing.vendor_code, user.org_id).run();

  await audit(env.DB, user.org_id, user, 'vendor_master', 'unblacklist',
    `供应商 ${existing.vendor_code || params.id} 移出黑名单（恢复 approved，拉黑原因历史保留）`);

  return json({ ok: true, id: params.id, status: 'approved' });
}
