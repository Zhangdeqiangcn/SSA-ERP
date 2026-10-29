// 仓储执行层 · 波次更新（PUT /api/fulfillment/:id）：状态流转 / 备注
import { getUserFromRequest, json } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';
import { audit } from '../../_shared/auditLog';
import { errorResponse } from '../../_shared/errors';
import { guardOperation } from '../../_shared/operationGuard';

export async function onRequestPut(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const _g = await guardOperation(user, 'fulfillment', 'update', env.DB, user.org_id);
  if (_g) return _g;

  const id = context.params.id;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const rls = rlsCondition(user, 'waves');
  let where = 'id = ? AND org_id = ?';
  const params: any[] = [id, user.org_id];
  if (rls.clause !== '1=1') {
    where += ' AND ' + rls.clause;
    params.push(...rls.params);
  }
  const existing = await env.DB.prepare(`SELECT * FROM waves WHERE ${where}`).bind(...params).first();
  if (!existing) return json({ error: '波次不存在' }, 404);

  const sets: string[] = [];
  const binds: any[] = [];
  if (body.status) {
    sets.push('status = ?');
    binds.push(body.status);
  }
  if (body.remark !== undefined) {
    sets.push('remark = ?');
    binds.push(body.remark);
  }
  if (sets.length === 0) return json({ error: '无可更新字段' }, 400);
  sets.push('updated_at = ?');
  binds.push(new Date().toISOString());

  try {
    await env.DB.prepare(`UPDATE waves SET ${sets.join(', ')} WHERE ${where}`).bind(...binds, ...params).run();
  } catch (e: any) {
    return errorResponse(e, '更新波次');
  }

  await audit(
    env.DB,
    user.org_id,
    user,
    'fulfillment',
    'update',
    `更新波次 ${existing.wave_no} → ${body.status ?? existing.status}`
  );
  const updated = await env.DB.prepare(`SELECT * FROM waves WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  return json({ id: updated.id, waveNo: updated.wave_no, status: updated.status, remark: updated.remark });
}
