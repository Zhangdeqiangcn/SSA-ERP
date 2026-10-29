// POST /api/vendors/:id/blacklist — 加入黑名单
//
// P0-4（V3.113.3）：前端 addToBlacklist() 一直调用本端点，后端从未实现 → 404。
//   加入黑名单 = status='blacklisted' + 记录原因与时间（门户登录端点对 blacklisted 直接 403）。
//   原因历史追加到 blacklist_reason_history（JSON 数组），便于追溯「为什么被拉黑、之前拉黑过几次」。
import { getUserFromRequest, json } from '../../../_shared/auth';
import { guardOperation } from '../../../_shared/operationGuard';
import { audit } from '../../../_shared/auditLog';

export async function onRequestPost(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const opGuard = await guardOperation(user, 'vendor', 'update', env.DB, user.org_id);
  if (opGuard) return opGuard;

  let body: any = {};
  try { body = await request.json(); } catch { /* 空体由下方校验拦截 */ }
  const reason = String(body?.reason || '').trim().slice(0, 500);
  if (!reason) return json({ error: '请填写拉黑原因', code: 'MISSING_REASON' }, 400);

  const existing = await env.DB.prepare(
    'SELECT id, vendor_code, status, blacklist_reason_history FROM vendor_master WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!existing) return json({ error: '供应商不存在' }, 404);

  // 追加历史（不覆盖旧记录）
  let history: any[] = [];
  try { history = existing.blacklist_reason_history ? JSON.parse(existing.blacklist_reason_history) : []; } catch { history = []; }
  if (!Array.isArray(history)) history = [];
  history.push({ reason, at: new Date().toISOString(), by: user.name });

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE vendor_master SET status = 'blacklisted', blacklist_reason = ?, blacklisted_at = ?,
       blacklist_reason_history = ?, updated_at = ?, updated_by = ? WHERE id = ? AND org_id = ?`
  ).bind(reason, now, JSON.stringify(history), now, user.name, params.id, user.org_id).run();

  // 门户账号表同步（否则门户仍可登录，黑名单形同虚设）
  await env.DB.prepare('UPDATE vendors SET status = ? WHERE id = ? AND org_id = ?')
    .bind('blacklisted', params.id, user.org_id).run();
  await env.DB.prepare('UPDATE vendors SET status = ? WHERE vendor_code = ? AND org_id = ?')
    .bind('blacklisted', existing.vendor_code, user.org_id).run();

  await audit(env.DB, user.org_id, user, 'vendor_master', 'blacklist',
    `供应商 ${existing.vendor_code || params.id} 加入黑名单（原因：${reason}）`);

  return json({ ok: true, id: params.id, status: 'blacklisted', reason, history });
}
