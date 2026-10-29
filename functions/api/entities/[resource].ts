// 通用实体集合端点：GET 列表(分页/keyword/RLS) + POST 创建
// 会话鉴权（Bearer token），与 /api/materials 同款；按 org_id 隔离 + 写审计。
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';
import { errorResponse } from '../../_shared/errors';
import { validateOrReject } from '../../_shared/validate';
import {
  ENTITY_RESOURCES,
  rowToCamel,
  pickSnake,
  badResource,
  presentCols,
  audit,
} from '../../_shared/entities';
import { guardPaymentRow } from '../../_shared/paymentGate';

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
  const keyword = safeKeyword(url.searchParams.get('keyword'));

  // V2.98.0（评测 M-01）：把「组织隔离 + 行级策略 + 关键字」三件套抽成一次构建，
  //   列表查询与总数统计共用同一套条件。修复前 COUNT 只带 org_id，
  //   关键字命中 1 条却声明 total=6，导致页数虚高、末页空白；
  //   同时消除「统计侧漏掉行级过滤」的潜在越权面。
  const buildWhere = () => {
    const where: string[] = ['org_id = ?'];
    const args: any[] = [user.org_id];
    const rls = rlsCondition(user, def.table);
    if (rls.clause !== '1=1') {
      where.push(rls.clause);
      args.push(...rls.params);
    }
    if (keyword && def.columns.length) {
      const kw = likePattern(keyword);
      where.push('(' + def.columns.map((c) => `${c.snake} LIKE ? ESCAPE '\\'`).join(' OR ') + ')');
      def.columns.forEach(() => args.push(kw));
    }
    return { clause: where.join(' AND '), args };
  };

  const { clause: whereClause, args: whereArgs } = buildWhere();

  const rows = await env.DB.prepare(
    `SELECT * FROM ${def.table} WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...whereArgs, pageSize, offset)
    .all();
  const data = (rows.results || []).map((r: any) => rowToCamel(r, def));

  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM ${def.table} WHERE ${whereClause}`
  )
    .bind(...whereArgs)
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
  const _invalid = validateOrReject(def.table, body);
  if (_invalid) return _invalid;

  // V3.19.0 付款闸门：付款计划除了走专用端点，还能从本通用实体路由写入。
  // 若只拦专用端点，这里就是一条现成的绕过通道（直接调接口即可）。
  // 判定逻辑抽在 _shared/paymentGate.ts，与专用端点共用同一份实现。
  if (def.table === 'fin_payment_plans') {
    const blocked = await guardPaymentRow(env.DB, user, body, null);
    if (blocked) return blocked;
  }

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
  // V3.71.0：记录自带「创建人/修改人 姓名」快照（列存在才写，老库/无列表自动跳过，不 500）
  const byName = user.name || user.username || user.id;
  if (present.has('created_by_name')) {
    auditNames.push('created_by_name');
    auditVals.push(byName);
  }
  if (present.has('updated_by_name')) {
    auditNames.push('updated_by_name');
    auditVals.push(byName);
  }

  const colNames = ['id', 'org_id', ...cols, ...auditNames];
  const placeholders = colNames.map(() => '?').join(',');
  const values = [id, user.org_id, ...vals, ...auditVals];

  try {
    await env.DB.prepare(`INSERT INTO ${def.table} (${colNames.join(',')}) VALUES (${placeholders})`)
      .bind(...values)
      .run();
  } catch (e: any) {
    return errorResponse(e, '创建');
  }

  await audit(env.DB, user.org_id, user, def.table, 'create', `创建 ${resource} ${id}`);
  const created = await env.DB.prepare(`SELECT * FROM ${def.table} WHERE id = ? AND org_id = ?`)
    .bind(id, user.org_id)
    .first();
  return json(rowToCamel(created, def), 201);
}
