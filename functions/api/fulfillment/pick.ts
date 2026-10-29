// 仓储执行层 · 拣货确认（POST /api/fulfillment/pick）：强校验拣货数量不超应拣
import { getUserFromRequest, json } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';
import { audit } from '../../_shared/auditLog';
import { errorResponse } from '../../_shared/errors';
import { guardOperation } from '../../_shared/operationGuard';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const _g = await guardOperation(user, 'fulfillment', 'update', env.DB, user.org_id);
  if (_g) return _g;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }
  const { taskId, pickedQty, status } = body;
  if (!taskId) return json({ error: 'taskId 必填' }, 400);

  const rls = rlsCondition(user, 'pick_tasks');
  let where = 'id = ? AND org_id = ?';
  const params: any[] = [taskId, user.org_id];
  if (rls.clause !== '1=1') {
    where += ' AND ' + rls.clause;
    params.push(...rls.params);
  }
  const task = await env.DB.prepare(`SELECT * FROM pick_tasks WHERE ${where}`).bind(...params).first();
  if (!task) return json({ error: '拣货任务不存在' }, 404);

  const newPicked = Number(pickedQty ?? task.picked_qty);
  if (!Number.isFinite(newPicked) || newPicked < 0) {
    return json({ error: '拣货数量非法' }, 400);
  }
  // 强校验：绝不允许超拣（错拣漏拣流入下一环节）
  if (newPicked > task.required_qty) {
    return json({ error: `拣货数量 ${newPicked} 超过应拣 ${task.required_qty}` }, 400);
  }
  const newStatus = status || (newPicked >= task.required_qty ? 'done' : 'picking');

  try {
    await env.DB
      .prepare('UPDATE pick_tasks SET picked_qty = ?, status = ?, updated_at = ? WHERE id = ? AND org_id = ?')
      .bind(newPicked, newStatus, new Date().toISOString(), taskId, user.org_id)
      .run();
  } catch (e: any) {
    return errorResponse(e, '确认拣货');
  }

  await audit(env.DB, user.org_id, user, 'fulfillment', 'update', `拣货确认 ${taskId}：${newPicked}/${task.required_qty}`);
  return json({ id: taskId, pickedQty: newPicked, status: newStatus });
}
