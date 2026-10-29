// GET/PUT/DELETE /api/warehouses/:id（W4 整改：仓库主数据后端权威源）
import { getUserFromRequest, json } from '../../_shared/auth';
import { errorResponse } from '../../_shared/errors';
import { audit } from '../../_shared/auditLog';

export async function onRequestGet(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const row = await env.DB.prepare(
    'SELECT * FROM warehouses WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!row) return json({ error: '仓库不存在' }, 404);
  return json(formatWarehouse(row as any), 200);
}

export async function onRequestPut(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const _opGuard = await import('../../_shared/operationGuard').then((m) =>
    m.guardOperation(user, 'warehouse', 'update', context.env.DB, user.org_id)
  );
  if (_opGuard) return _opGuard;

  let body: any;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }

  const existing = await env.DB.prepare(
    'SELECT * FROM warehouses WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!existing) return json({ error: '仓库不存在' }, 404);

  // code 唯一性（排除自身）
  if (body.code && body.code !== (existing as any).code) {
    const dup = await env.DB.prepare(
      'SELECT id FROM warehouses WHERE org_id = ? AND code = ? AND id != ?'
    ).bind(user.org_id, body.code, params.id).first();
    if (dup) return json({ error: '仓库编码已存在' }, 409);
  }

  const now = new Date().toISOString();
  // 子表 locations 内联：未传则保留原值（keep 语义），传了就用新值
  const locationsJson = body.locations !== undefined
    ? JSON.stringify(Array.isArray(body.locations) ? body.locations : [])
    : (existing as any).locations;

  try {
    await env.DB.prepare(`
      UPDATE warehouses SET
        code = COALESCE(?, code),
        name = COALESCE(?, name),
        type = COALESCE(?, type),
        address = COALESCE(?, address),
        manager = COALESCE(?, manager),
        status = COALESCE(?, status),
        locations = ?,
        updated_at = ?,
        updated_by = ?
      WHERE id = ? AND org_id = ?
    `).bind(
      body.code ?? null,
      body.name ?? null,
      body.type ?? null,
      body.address ?? null,
      body.manager ?? null,
      body.status ?? null,
      locationsJson,
      now,
      user.id,
      params.id,
      user.org_id
    ).run();
  } catch (e: any) {
    return errorResponse(e, '更新仓库');
  }

  const updated = await env.DB.prepare(
    'SELECT * FROM warehouses WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  await audit(env.DB, user.org_id, user, 'warehouses', 'update', `更新仓库 ${(existing as any)?.code || params.id}`);
  return json(formatWarehouse(updated as any), 200);
}

export async function onRequestDelete(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const _opGuard = await import('../../_shared/operationGuard').then((m) =>
    m.guardOperation(user, 'warehouse', 'delete', context.env.DB, user.org_id)
  );
  if (_opGuard) return _opGuard;

  const existing = await env.DB.prepare(
    'SELECT * FROM warehouses WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!existing) return json({ error: '仓库不存在' }, 404);

  const result = await env.DB.prepare(
    'DELETE FROM warehouses WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).run();

  if ((result.meta?.changes ?? result.changes) === 0) return json({ error: '仓库不存在' }, 404);
  await audit(env.DB, user.org_id, user, 'warehouses', 'delete', `删除仓库 ${(existing as any).code || params.id}`);
  return json({ ok: true });
}

function formatWarehouse(r: any) {
  let locations: any[] = [];
  try { locations = r.locations ? JSON.parse(r.locations) : []; } catch { locations = []; }
  return {
    id: r.id,
    orgId: r.org_id,
    code: r.code,
    name: r.name,
    type: r.type,
    address: r.address,
    manager: r.manager,
    status: r.status,
    locations: Array.isArray(locations) ? locations : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
  };
}
