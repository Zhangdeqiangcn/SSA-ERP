// 通用实体单条端点：GET 单条 / PUT 更新 / DELETE 删除
// 会话鉴权 + org_id 隔离 + 写审计；复用实体注册表与行列映射。
import { getUserFromRequest, json } from '../../../_shared/auth';
import { rlsFragment } from '../../../_shared/rls';
import {
  ENTITY_RESOURCES,
  rowToCamel,
  pickSnake,
  badResource,
  presentCols,
  audit,
} from '../../../_shared/entities';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const def = ENTITY_RESOURCES[context.params.resource];
  if (!def) return badResource();

  const id = context.params.id;
  const row = await env.DB.prepare(`SELECT * FROM ${def.table} WHERE id = ? AND org_id = ?`)
    .bind(id, user.org_id)
    .first();
  if (!row) return json({ error: '记录不存在' }, 404);
  return json(rowToCamel(row, def));
}

export async function onRequestPut(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const resource = context.params.resource;
  const def = ENTITY_RESOURCES[resource];
  if (!def) return badResource();

  const id = context.params.id;
  const body = await request.json().catch(() => ({}));
  const { cols, vals } = pickSnake(body, def);
  if (cols.length === 0) return json({ error: '无可更新字段' }, 400);

  const present = await presentCols(env.DB, def.table);
  const extraNames: string[] = [];
  const extraVals: any[] = [];
  if (present.has('updated_at')) {
    extraNames.push('updated_at');
    extraVals.push(new Date().toISOString());
  }
  if (present.has('updated_by')) {
    extraNames.push('updated_by');
    extraVals.push(user.id);
  }
  const setSql = [...cols.map((c) => `${c} = ?`), ...extraNames.map((n) => `${n} = ?`)].join(', ');
  const values = [...vals, ...extraVals, id, user.org_id];

  const res = await env.DB.prepare(`UPDATE ${def.table} SET ${setSql} WHERE id = ? AND org_id = ?`)
    .bind(...values)
    .run();
  if ((res.meta?.changes ?? 0) === 0) return json({ error: '记录不存在' }, 404);

  await audit(env.DB, user.org_id, user, def.table, 'update', `更新 ${resource} ${id}`);
  return json({ ok: true });
}

export async function onRequestDelete(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const resource = context.params.resource;
  const def = ENTITY_RESOURCES[resource];
  if (!def) return badResource();

  const id = context.params.id;
  const res = await env.DB.prepare(`DELETE FROM ${def.table} WHERE id = ? AND org_id = ?`)
    .bind(id, user.org_id)
    .run();
  if ((res.meta?.changes ?? 0) === 0) return json({ error: '记录不存在' }, 404);

  await audit(env.DB, user.org_id, user, def.table, 'delete', `删除 ${resource} ${id}`);
  return json({ ok: true });
}
