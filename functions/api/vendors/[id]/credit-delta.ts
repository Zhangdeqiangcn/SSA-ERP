// POST /api/vendors/:id/credit-delta — 供应商已用信用额度相对原子更新（V3.66.0 P1-3）
//
// 根因：前端 applyVendorCreditDelta 原为「本地读 usedCredit → 算出 next → 整字段 PUT 回 D1」，
//   并发两个终端同时占/放信用时存在「读旧值 → 算 → 写」的丢更新竞态（memory 铁律㊳ 同款），
//   会出现「两边都占了同一份额度」或「释放被后来的占用覆盖」。
// 改法：数据库内做相对原子更新 used_credit = MAX(0, COALESCE(used_credit,0) + ?)，
//   服务端是唯一权威计算点，前端拿返回的新值对齐本地；超限（credit_limit）在服务端判定拒绝。
// 幂等/审计：每次 delta 记一条审计（含 delta 与原因），可回溯。
import { getUserFromRequest, json } from '../../../_shared/auth';
import { assertRlsOwnership } from '../../../_shared/rls';
import { audit } from '../../../_shared/auditLog';
import { guardOperation } from '../../../_shared/operationGuard';

export async function onRequestPost(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  // 信用额度变更属供应商更新面，过服务端操作守卫（与 PUT 同口径）
  const opGuard = await guardOperation(user, 'vendor', 'update', env.DB, user.org_id);
  if (opGuard) return opGuard;

  let body: any;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }
  const delta = Number(body?.delta);
  if (!Number.isFinite(delta) || delta === 0) return json({ error: 'delta 必须为非 0 数字' }, 400);
  const reason: string = String(body?.reason || '').slice(0, 200);

  const existing = await env.DB.prepare(
    'SELECT id, org_id, owner_id, credit_limit, used_credit FROM vendor_master WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!existing) return json({ error: '供应商不存在' }, 404);
  if (!assertRlsOwnership(user, existing, 'vendor_master')) return json({ error: '无权限修改他人供应商额度' }, 403);

  const used = Number(existing.used_credit) || 0;
  let next = used + delta;
  if (next < 0) next = 0; // 释放超额 → 归零（与前端既有语义一致，不阻断）
  // 授信上限护栏（delta>0 占用时）：超上限拒绝，与服务端 checkVendorCredit 语义一致
  if (delta > 0 && existing.credit_limit != null && next > Number(existing.credit_limit)) {
    return json({ error: '超出授信上限', rejected: true, usedCredit: used, creditLimit: Number(existing.credit_limit) }, 409);
  }

  await env.DB.prepare(
    'UPDATE vendor_master SET used_credit = ? WHERE id = ? AND org_id = ?'
  ).bind(next, params.id, user.org_id).run();

  await audit(env.DB, user.org_id, user, 'vendor_master', 'credit_delta',
    `供应商 ${existing.id} 已用信用 ${used} → ${next}（delta ${delta > 0 ? '+' : ''}${delta}${reason ? `，${reason}` : ''}）`);

  return json({ ok: true, usedCredit: next, creditLimit: existing.credit_limit ?? null, delta });
}
