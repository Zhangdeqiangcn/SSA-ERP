// GET /api/warehouses — 分页查询仓库主数据（按 org_id 隔离，W4 整改：后端权威源）
// POST /api/warehouses — 创建仓库（locations 以 JSON 文本内联存储）
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { requireCoreFields } from '../../_shared/validate';
import { rlsCondition } from '../../_shared/rls';
import { audit } from '../../_shared/auditLog';
import { errorResponse } from '../../_shared/errors';
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
  const offset = (page - 1) * pageSize;
  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');

  let sql = 'SELECT * FROM warehouses WHERE org_id = ?';
  const params: any[] = [user.org_id];
  const rls = rlsCondition(user, 'warehouses');
  if (rls.clause !== '1=1') { sql += ' AND ' + rls.clause; params.push(...rls.params); }

  if (keyword) {
    sql += ' AND (code LIKE ? ESCAPE \'\\\' OR name LIKE ? ESCAPE \'\\\')';
    const kw = likePattern(keyword);
    params.push(kw, kw);
  }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (status) { sql += ' AND status = ?'; params.push(status); }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  const rows = await env.DB.prepare(sql).bind(...params).all();
  const data = (rows.results || []).map((r: any) => formatWarehouse(r));

  let countSql = 'SELECT COUNT(*) as cnt FROM warehouses WHERE org_id = ?';
  const countParams: any[] = [user.org_id];
  if (rls.clause !== '1=1') { countSql += ' AND ' + rls.clause; countParams.push(...rls.params); }
  if (keyword) {
    countSql += ' AND (code LIKE ? ESCAPE \'\\\' OR name LIKE ? ESCAPE \'\\\')';
    const kw = likePattern(keyword);
    countParams.push(kw, kw);
  }
  if (type) { countSql += ' AND type = ?'; countParams.push(type); }
  if (status) { countSql += ' AND status = ?'; countParams.push(status); }
  const countRow = await env.DB.prepare(countSql).bind(...countParams).first();
  const total = (countRow as any)?.cnt || 0;

  return json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  // 操作权限服务端守卫（模块 warehouse）
  const _opGuard = await import('../../_shared/operationGuard').then((m) =>
    m.guardOperation(user, 'warehouse', 'create', context.env.DB, user.org_id)
  );
  if (_opGuard) return _opGuard;

  let body: any;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }
  // V3.86.0 必填改走集中登记表（REQUIRED_CORE_FIELDS['warehouses']=编码+名称），单一口径
  const _req = requireCoreFields('warehouses', body);
  if (_req) return _req;

  const dup = await env.DB.prepare(
    'SELECT id FROM warehouses WHERE org_id = ? AND code = ?'
  ).bind(user.org_id, body.code).first();
  if (dup) return json({ error: '仓库编码已存在' }, 409);

  const id = uid('wh');
  const now = new Date().toISOString();
  const locations = Array.isArray(body.locations) ? body.locations : [];

  try {
    await env.DB.prepare(`
      INSERT INTO warehouses (id, org_id, code, name, type, address, manager, status, locations, created_at, updated_at, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      user.org_id,
      body.code,
      body.name,
      body.type || 'raw',
      body.address ?? null,
      body.manager ?? null,
      body.status || 'active',
      JSON.stringify(locations),
      now, now, user.id, user.id
    ).run();
  } catch (e: any) {
    return errorResponse(e, '创建仓库');
  }

  await audit(env.DB, user.org_id, user, 'warehouses', 'create', `创建仓库 ${body.code} ${body.name}`);
  const created = await env.DB.prepare('SELECT * FROM warehouses WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
  return json(formatWarehouse(created as any), 201);
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
