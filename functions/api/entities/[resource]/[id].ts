// 通用实体单条端点：GET 单条 / PUT 更新 / DELETE 删除
// 会话鉴权 + org_id 隔离 + 写审计；复用实体注册表与行列映射。
import { getUserFromRequest, json } from '../../../_shared/auth';
import { assertRlsOwnership } from '../../../_shared/rls';
import { validateOrReject } from '../../../_shared/validate';
import {
  ENTITY_RESOURCES,
  rowToCamel,
  pickSnake,
  badResource,
  presentCols,
  audit,
} from '../../../_shared/entities';
import { guardPaymentRow } from '../../../_shared/paymentGate';

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
  // V2.97.0 修复（安全审计 B6）：单条读取同样受行级策略约束（此前 [id] 路由
  //   引入了 rlsFragment 却从未使用；当前注册资源均为 all 作用域故无实际影响，
  //   但一旦新增 own/dept 资源即会越权，故统一补齐）。
  if (!assertRlsOwnership(user, row, def.table)) {
    return json({ error: '无权访问该记录' }, 403);
  }
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
  const _invalid = validateOrReject(def.table, body, { partial: true });
  if (_invalid) return _invalid;
  const { cols, vals } = pickSnake(body, def);
  if (cols.length === 0) return json({ error: '无可更新字段' }, 400);

  // V2.97.0 修复（安全审计 B6）：写操作前确认记录存在且归属允许。
  const existing = await env.DB.prepare(`SELECT * FROM ${def.table} WHERE id = ? AND org_id = ?`)
    .bind(id, user.org_id)
    .first();
  if (!existing) return json({ error: '记录不存在' }, 404);
  if (!assertRlsOwnership(user, existing, def.table)) {
    return json({ error: '无权修改该记录' }, 403);
  }

  // V3.19.0 付款闸门：与 POST 同理 —— 通用实体路由也是付款计划的一条写入路径，
  // 必须与专用端点用完全相同的判定，否则这里成为绕过通道。
  if (def.table === 'fin_payment_plans') {
    const blocked = await guardPaymentRow(env.DB, user, body, existing);
    if (blocked) return blocked;
  }

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

  // V2.97.0 修复（安全审计 B6）：删除前确认记录存在且归属允许。
  const existing = await env.DB.prepare(`SELECT * FROM ${def.table} WHERE id = ? AND org_id = ?`)
    .bind(id, user.org_id)
    .first();
  if (!existing) return json({ error: '记录不存在' }, 404);
  if (!assertRlsOwnership(user, existing, def.table)) {
    return json({ error: '无权删除该记录' }, 403);
  }

  const res = await env.DB.prepare(`DELETE FROM ${def.table} WHERE id = ? AND org_id = ?`)
    .bind(id, user.org_id)
    .run();
  if ((res.meta?.changes ?? 0) === 0) return json({ error: '记录不存在' }, 404);

  await audit(env.DB, user.org_id, user, def.table, 'delete', `删除 ${resource} ${id}`);
  return json({ ok: true });
}
