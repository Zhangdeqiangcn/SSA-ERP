// 通用实体集合端点：GET 列表(分页/keyword/RLS) + POST 创建
// 会话鉴权（Bearer token），与 /api/materials 同款；按 org_id 隔离 + 写审计。
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { rlsFragment } from '../../_shared/rls';
import {
  ENTITY_RESOURCES,
  rowToCamel,
  pickSnake,
  badResource,
  presentCols,
  audit,
} from '../../_shared/entities';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const resource = context.params.resource;
  const def = ENTITY_RESOURCES[resource];
  if (!def) return badResource();

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
  const offset = (page - 1) * pageSize;
  const keyword = (url.searchParams.get('keyword') || '').trim();

  let sql = `SELECT * FROM ${def.table} WHERE org_id = ?`;
  const params: any[] = [user.org_id];
  const rls = rlsFragment(user, def.table);
  if (rls.clause !== '1=1') {
    sql += ' AND ' + rls.clause;
    params.push(rls.param!);
  }
  if (keyword && def.columns.length) {
    const kw = `%${keyword}%`;
    const like = def.columns.map((c) => `${c.snake} LIKE ?`).join(' OR ');
    sql += ` AND (${like})`;
    def.columns.forEach(() => params.push(kw));
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  const rows = await env.DB.prepare(sql).bind(...params).all();
  const data = (rows.results || []).map((r: any) => rowToCamel(r, def));

  const countRow = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM ${def.table} WHERE org_id = ?`)
    .bind(user.org_id)
    .first();
  const total = (countRow as any)?.cnt || 0;

  return json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const resource = context.params.resource;
  const def = ENTITY_RESOURCES[resource];
  if (!def) return badResource();

  const body = await request.json().catch(() => ({}));
  const { cols, vals } = pickSnake(body, def);
  const id = body.id ? String(body.id) : uid(resource.replace(/[^a-z0-9]/gi, '').slice(0, 6) || 'ent');
  const now = new Date().toISOString();

  const present = await presentCols(env.DB, def.table);
  const auditNames: string[] = [];
  const auditVals: any[] = [];
  if (present.has('created_at')) {
    auditNames.push('created_at');
    auditVals.push(now);
  }
  if (present.has('updated_at')) {
    auditNames.push('updated_at');
    auditVals.push(now);
  }
  if (present.has('created_by')) {
    auditNames.push('created_by');
    auditVals.push(user.id);
  }
  if (present.has('updated_by')) {
    auditNames.push('updated_by');
    auditVals.push(user.id);
  }

  const colNames = ['id', 'org_id', ...cols, ...auditNames];
  const placeholders = colNames.map(() => '?').join(',');
  const values = [id, user.org_id, ...vals, ...auditVals];

  try {
    await env.DB.prepare(`INSERT INTO ${def.table} (${colNames.join(',')}) VALUES (${placeholders})`)
      .bind(...values)
      .run();
  } catch (e: any) {
    return json({ error: '创建失败: ' + (e?.message || String(e)) }, 500);
  }

  await audit(env.DB, user.org_id, user, def.table, 'create', `创建 ${resource} ${id}`);
  const created = await env.DB.prepare(`SELECT * FROM ${def.table} WHERE id = ? AND org_id = ?`)
    .bind(id, user.org_id)
    .first();
  return json(rowToCamel(created, def), 201);
}
