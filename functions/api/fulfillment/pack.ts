// 仓储执行层 · 打包（POST /api/fulfillment/pack）：配货 + 打包记录
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';
import { audit } from '../../_shared/auditLog';
import { errorResponse } from '../../_shared/errors';
import { guardOperation } from '../../_shared/operationGuard';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const _g = await guardOperation(user, 'fulfillment', 'create', env.DB, user.org_id);
  if (_g) return _g;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }
  const { waveId, orderHubId, packNo, weight } = body;
  if (!waveId || !orderHubId || !packNo) {
    return json({ error: '波次 / 订单 / 包号 必填' }, 400);
  }

  const id = uid('pkc');
  const now = new Date().toISOString();
  const rls = rlsCondition(user, 'pack_records');
  try {
    await env.DB
      .prepare(
        `INSERT INTO pack_records (id, org_id, wave_id, order_hub_id, pack_no, weight, status, created_at, created_by, created_by_name)
         VALUES (?,?,?,?,?,?,?,?,?,?)`
      )
      .bind(id, user.org_id, waveId, orderHubId, packNo, weight ?? null, 'packed', now, user.id, user.name ?? user.username)
      .run();
  } catch (e: any) {
    return errorResponse(e, '打包记录');
  }

  await audit(env.DB, user.org_id, user, 'fulfillment', 'create', `打包 ${packNo}（订单 ${orderHubId}）`);
  return json({ id, packNo }, 201);
}
