// 统一数据访问层（V3.68.0）
//
// 用途：把「对任意业务表读/写/改」的能力抽成可复用原语，供 /api/data 端点与
//   外部 ERP 同步引擎（erpSync.ts 拉取回写）共用。设计原则：
//
//   ① 复用现有底座，不重造：表发现/列安全来自 backupSchema（discoverTables /
//      tableColumns / assertSafeTable），鉴权来自 apiKey（网关）+ auth（会话），
//      审计来自 auditLog。与 backup.ts 同口径——仅业务表可访问，系统表（sessions /
//      api_keys / system_config …）天然被 discoverTables 排除。
//
//   ② 组织隔离是硬边界：写入时一律强制 org_id = 请求方组织，绝不接受客户端传来的
//      org_id（防越界灌数据）；明细表写入前校验其父单归属本组织。
//
//   ③ 返回数据库原始列名（snake_case）原始行——这是「数据集成接口」，外部系统按
//      库表结构对话，与 camelCase 的实体路由（/api/entities）定位不同，刻意不转换。
//
//   ④ 不套用逐行 RLS：本接口定位为「组织级集成工具」（与 backup/restore 同级），
//      仅向管理员（会话）或带 read/write 作用域的 API Key（网关）开放，每次访问写审计。
//      因此不对单条做 own/dept 行级过滤——那是通用业务端点的职责，这里刻意放宽到组织级。
//
//   ⑤ 列交集过滤：只写真实存在的列，未知列直接丢弃——防注入与脏列（沿用 restore 范式）。
import { discoverTables, tableColumns, ChildTableDef } from './backupSchema';
import { resolveApiKey, ApiKeyAuth } from './apiKey';
import { getUserFromRequest, json, uid } from './auth';
import { writeAudit } from './auditLog';
import { errorResponse } from './errors';

export interface DataRequester {
  org_id: string;
  actorId: string;
  actorName: string;
  scopes: string[]; // ['read'] | ['read','write'] | ['*']
  source: 'apikey' | 'session';
  user?: any;
}

type Discovered = { parents: string[]; children: ChildTableDef[] };

/** 解析请求方：API Key（Bearer sk_）优先；否则回退会话（需管理员）。 */
export async function resolveDataRequester(request: Request, env: any): Promise<DataRequester | Response> {
  const authz = request.headers.get('Authorization') || '';
  if (authz.startsWith('Bearer sk_')) {
    const ak = await resolveApiKey(request, env.DB);
    if (!ak.ok || !ak.auth) {
      return json({ error: ak.message || '无效或已吊销的 API Key', code: ak.reason || 'invalid' }, 401);
    }
    const a: ApiKeyAuth = ak.auth;
    return {
      org_id: a.org_id,
      actorId: 'apikey:' + a.keyId,
      actorName: 'API集成(' + a.keyId + ')',
      scopes: a.scopes,
      source: 'apikey',
    };
  }
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  if (!['super_admin', 'admin'].includes(user.role)) {
    return json({ error: '统一数据接口为组织级接口，需管理员权限' }, 403);
  }
  return {
    org_id: user.org_id,
    actorId: user.id,
    actorName: user.name || user.username || user.id,
    scopes: ['*'],
    source: 'session',
    user,
  };
}

/** 作用域校验：read 是 write 子集（程序化集成通常先读后写）。 */
export function requesterHasScope(r: DataRequester, need: 'read' | 'write'): boolean {
  if (r.scopes.includes('*')) return true;
  if (need === 'write') return r.scopes.includes('write');
  return r.scopes.includes('read') || r.scopes.includes('write');
}

interface TableInfo {
  ok: boolean;
  kind: 'parent' | 'child' | null;
  childDef?: ChildTableDef;
}

function classify(table: string, disc: Discovered): TableInfo {
  if (disc.parents.includes(table)) return { ok: true, kind: 'parent' };
  const c = disc.children.find((x) => x.table === table);
  if (c) return { ok: true, kind: 'child', childDef: c };
  return { ok: false, kind: null };
}

/** 表是否可通过数据接口访问（业务主表或明细表）。 */
export async function isDataTable(env: any, table: string): Promise<TableInfo> {
  const disc = await discoverTables(env);
  return classify(table, disc);
}

/** 组装「组织隔离 + 可选 filters」的 WHERE。明细表用父单 org 子查询。 */
function buildOrgWhere(info: TableInfo, orgId: string): { clause: string; args: any[] } {
  if (info.kind === 'child' && info.childDef) {
    const { parent, fk } = info.childDef;
    return {
      clause: `${fk} IN (SELECT id FROM ${parent} WHERE org_id = ?)`,
      args: [orgId],
    };
  }
  return { clause: 'org_id = ?', args: [orgId] };
}

function parseFilter(raw: string | null, colSet: Set<string>): Record<string, any> {
  const out: Record<string, any> = {};
  if (!raw) return out;
  let obj: any = null;
  try {
    obj = JSON.parse(raw);
  } catch {
    return out;
  }
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const k of Object.keys(obj)) {
      if (colSet.has(k) && k !== 'org_id') out[k] = obj[k];
    }
  }
  return out;
}

function audit(env: any, r: DataRequester, table: string, action: string, summary: string) {
  return writeAudit(env.DB, {
    orgId: r.org_id,
    actor: { id: r.actorId, name: r.actorName },
    entity: 'data_api:' + table,
    action,
    summary,
  });
}

// ───────────────────────────── 列表（GET 集合） ─────────────────────────────
export async function daList(env: any, r: DataRequester, table: string, url: URL) {
  const info = await isDataTable(env, table);
  if (!info.ok) return json({ error: '该表不支持通过数据接口访问（系统表或不存在）' }, 400);

  const cols = await tableColumns(env, table);
  const colSet = new Set(cols);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50', 10)));
  const offset = (page - 1) * pageSize;

  const orgW = buildOrgWhere(info, r.org_id);
  const whereParts = [orgW.clause];
  const args: any[] = [...orgW.args];

  const filter = parseFilter(url.searchParams.get('filter'), colSet);
  for (const k of Object.keys(filter)) {
    whereParts.push(`${k} = ?`);
    args.push(filter[k]);
  }

  const sort = url.searchParams.get('sort');
  const order = (url.searchParams.get('order') || 'desc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const orderBy = sort && colSet.has(sort) ? `ORDER BY ${sort} ${order}` : 'ORDER BY created_at DESC';

  const where = whereParts.join(' AND ');
  const rows = await env.DB.prepare(
    `SELECT * FROM ${table} WHERE ${where} ${orderBy} LIMIT ? OFFSET ?`
  ).bind(...args, pageSize, offset).all();
  const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS c FROM ${table} WHERE ${where}`).bind(...args).first();
  const total = (totalRow as any)?.c || 0;

  await audit(env, r, table, 'list', `查询 ${table}（第${page}页，命中${total}行）`);
  return json({
    data: rows.results || [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ───────────────────────────── 单条（GET /:id） ─────────────────────────────
export async function daGet(env: any, r: DataRequester, table: string, id: string) {
  const info = await isDataTable(env, table);
  if (!info.ok) return json({ error: '该表不支持通过数据接口访问（系统表或不存在）' }, 400);

  const orgW = buildOrgWhere(info, r.org_id);
  const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ? AND ${orgW.clause}`)
    .bind(id, ...orgW.args).first();
  if (!row) return json({ error: '记录不存在' }, 404);
  return json(row);
}

// ─────────────── 列交集挑选（剔除 org_id/id，写入时强制） ───────────────
async function pickWriteCols(env: any, table: string, body: any, opts: { allowId?: boolean }) {
  const cols = await tableColumns(env, table);
  const colSet = new Set(cols);
  const real: string[] = [];
  const vals: any[] = [];
  for (const k of Object.keys(body || {})) {
    if (k === 'org_id') continue; // 永远强制，不接受客户端
    if (k === 'id' && !opts.allowId) continue;
    if (!colSet.has(k)) continue; // 未知列丢弃
    const v = body[k];
    real.push(k);
    vals.push(v !== null && typeof v === 'object' ? JSON.stringify(v) : v === undefined ? null : v);
  }
  return { real, vals };
}

/** 明细表：校验其 fk 指向的父单确实属于本组织。 */
async function childParentBelongs(env: any, info: TableInfo, orgId: string, fkVal: any): Promise<boolean> {
  if (info.kind !== 'child' || !info.childDef) return false;
  const { parent, fk } = info.childDef;
  const row = await env.DB.prepare(`SELECT id FROM ${parent} WHERE id = ? AND org_id = ?`)
    .bind(fkVal, orgId).first();
  return !!row;
}

// ───────────────────────────── 新增（POST 集合） ─────────────────────────────
export async function daInsert(env: any, r: DataRequester, table: string, body: any) {
  const info = await isDataTable(env, table);
  if (!info.ok) return json({ error: '该表不支持通过数据接口访问（系统表或不存在）' }, 400);

  // 明细表：fk 必须存在且属于本组织
  if (info.kind === 'child' && info.childDef) {
    const fkVal = body?.[info.childDef.fk];
    if (!fkVal) return json({ error: `缺父单外键 ${info.childDef.fk}` }, 400);
    if (!(await childParentBelongs(env, info, r.org_id, fkVal))) {
      return json({ error: '父单不属于本组织，拒绝写入' }, 403);
    }
  }

  const now = new Date().toISOString();
  const id = body?.id ? String(body.id) : uid(table.replace(/[^a-z0-9]/gi, '').slice(0, 6) || 'dt');
  const present = await tableColumns(env, table);
  const pset = new Set(present);
  const auditNames: string[] = [];
  const auditVals: any[] = [];
  if (pset.has('created_at')) { auditNames.push('created_at'); auditVals.push(now); }
  if (pset.has('updated_at')) { auditNames.push('updated_at'); auditVals.push(now); }
  if (pset.has('created_by')) { auditNames.push('created_by'); auditVals.push(r.actorId); }
  if (pset.has('updated_by')) { auditNames.push('updated_by'); auditVals.push(r.actorId); }
  // V3.71.0：记录自带「操作人 姓名/标识」快照（列存在才写，不 500）
  if (pset.has('created_by_name')) { auditNames.push('created_by_name'); auditVals.push(r.actorName); }
  if (pset.has('updated_by_name')) { auditNames.push('updated_by_name'); auditVals.push(r.actorName); }

  const { real, vals } = await pickWriteCols(env, table, body, { allowId: false });
  // 明细表（child）无 org_id 列，靠外键从属父单——绝不写入 org_id，否则 no such column
  const isChild = info.kind === 'child';
  const colNames = ['id', ...(isChild ? [] : ['org_id']), ...real, ...auditNames];
  const placeholders = colNames.map(() => '?').join(',');
  const values = [id, ...(isChild ? [] : [r.org_id]), ...vals, ...auditVals];

  try {
    await env.DB.prepare(`INSERT INTO ${table} (${colNames.join(',')}) VALUES (${placeholders})`)
      .bind(...values).run();
  } catch (e: any) {
    return errorResponse(e, '新增');
  }

  await audit(env, r, table, 'create', `新增 ${table} ${id}`);
  const created = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first();
  return json(created, 201);
}

// ───────────────────────────── 更新（PUT /:id） ─────────────────────────────
export async function daUpdate(env: any, r: DataRequester, table: string, id: string, body: any) {
  const info = await isDataTable(env, table);
  if (!info.ok) return json({ error: '该表不支持通过数据接口访问（系统表或不存在）' }, 400);

  const orgW = buildOrgWhere(info, r.org_id);
  const existing = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ? AND ${orgW.clause}`)
    .bind(id, ...orgW.args).first();
  if (!existing) return json({ error: '记录不存在' }, 404);

  if (info.kind === 'child' && info.childDef) {
    // 若客户端改了 fk，需重新校验归属
    const fkVal = body?.[info.childDef.fk] ?? (existing as any)[info.childDef.fk];
    if (!(await childParentBelongs(env, info, r.org_id, fkVal))) {
      return json({ error: '父单不属于本组织，拒绝写入' }, 403);
    }
  }

  const { real, vals } = await pickWriteCols(env, table, body, { allowId: false });
  if (real.length === 0) return json({ error: '无可更新字段' }, 400);

  const present = await tableColumns(env, table);
  const extraNames: string[] = [];
  const extraVals: any[] = [];
  if (present.includes('updated_at')) { extraNames.push('updated_at'); extraVals.push(new Date().toISOString()); }
  if (present.includes('updated_by')) { extraNames.push('updated_by'); extraVals.push(r.actorId); }

  const setSql = [...real.map((c) => `${c} = ?`), ...extraNames.map((n) => `${n} = ?`)].join(', ');
  const values = [...vals, ...extraVals, id];

  const res = await env.DB.prepare(`UPDATE ${table} SET ${setSql} WHERE id = ?`).bind(...values).run();
  if ((res.meta?.changes ?? 0) === 0) return json({ error: '记录不存在' }, 404);

  await audit(env, r, table, 'update', `更新 ${table} ${id}`);
  return json({ ok: true });
}

// ───────────────────────────── 删除（DELETE /:id） ─────────────────────────────
export async function daDelete(env: any, r: DataRequester, table: string, id: string) {
  const info = await isDataTable(env, table);
  if (!info.ok) return json({ error: '该表不支持通过数据接口访问（系统表或不存在）' }, 400);

  const orgW = buildOrgWhere(info, r.org_id);
  const existing = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ? AND ${orgW.clause}`)
    .bind(id, ...orgW.args).first();
  if (!existing) return json({ error: '记录不存在' }, 404);

  const res = await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
  if ((res.meta?.changes ?? 0) === 0) return json({ error: '记录不存在' }, 404);

  await audit(env, r, table, 'delete', `删除 ${table} ${id}`);
  return json({ ok: true });
}

// ───────────────────────────── 批量（POST /bulk） ─────────────────────────────
// body: { rows: [...], mode: 'upsert' | 'delete' }
//   upsert —— 按 id 幂等覆盖（INSERT OR REPLACE），缺 id 跳过；
//   delete —— 按 id 列表删除。
// 强制 org_id；明细表逐行校验父单归属；失败聚合进 errors，不整批中断。
export async function daBulk(env: any, r: DataRequester, table: string, body: any) {
  const info = await isDataTable(env, table);
  if (!info.ok) return json({ error: '该表不支持通过数据接口访问（系统表或不存在）' }, 400);

  const mode = body?.mode === 'delete' ? 'delete' : 'upsert';
  const rows: any[] = Array.isArray(body?.rows) ? body.rows : [];
  if (!rows.length) return json({ error: 'rows 为空' }, 400);

  const present = await tableColumns(env, table);
  const pset = new Set(present);
  const now = new Date().toISOString();

  const report = { inserted: 0, updated: 0, deleted: 0, skipped: 0, errors: [] as any[] };
  const stmts: any[] = [];

  for (const row of rows) {
    if (!row || typeof row !== 'object') { report.skipped++; continue; }
    const id = row.id ? String(row.id) : null;
    if (!id) { report.skipped++; continue; }

    try {
      if (mode === 'delete') {
        const orgW = buildOrgWhere(info, r.org_id);
        stmts.push(
          env.DB.prepare(`DELETE FROM ${table} WHERE id = ? AND ${orgW.clause}`).bind(id, ...orgW.args)
        );
        report.deleted++;
        continue;
      }

      // upsert
      if (info.kind === 'child' && info.childDef) {
        const fkVal = row[info.childDef.fk];
        if (!fkVal || !(await childParentBelongs(env, info, r.org_id, fkVal))) {
          report.skipped++;
          report.errors.push({ id, message: '父单不属于本组织' });
          continue;
        }
      }

      const auditNames: string[] = [];
      const auditVals: any[] = [];
      if (pset.has('created_at')) { auditNames.push('created_at'); auditVals.push(now); }
      if (pset.has('updated_at')) { auditNames.push('updated_at'); auditVals.push(now); }
      if (pset.has('created_by')) { auditNames.push('created_by'); auditVals.push(r.actorId); }
      if (pset.has('updated_by')) { auditNames.push('updated_by'); auditVals.push(r.actorId); }
      // V3.71.0：记录自带「操作人 姓名/标识」快照（列存在才写，不 500）
      if (pset.has('created_by_name')) { auditNames.push('created_by_name'); auditVals.push(r.actorName); }
      if (pset.has('updated_by_name')) { auditNames.push('updated_by_name'); auditVals.push(r.actorName); }

      // 复用 pickWriteCols 但允许 id（这里 id 已单独处理，把 id 从 body 去掉避免重复）
      const { real, vals } = await pickWriteCols(env, table, { ...row, id: undefined }, { allowId: false });
      // 明细表（child）无 org_id 列，跳过
      const isChild = info.kind === 'child';
      const writeCols = ['id', ...(isChild ? [] : ['org_id']), ...real, ...auditNames];
      const wvals = [id, ...(isChild ? [] : [r.org_id]), ...vals, ...auditVals];
      const ph = writeCols.map(() => '?').join(',');
      stmts.push(
        env.DB.prepare(`INSERT OR REPLACE INTO ${table} (${writeCols.join(',')}) VALUES (${ph})`).bind(...wvals)
      );
      report.inserted++;
    } catch (e: any) {
      report.skipped++;
      report.errors.push({ id, message: String(e?.message || e) });
    }

    if (stmts.length >= 50) {
      try { await env.DB.batch(stmts); } catch (e: any) {
        report.errors.push({ batch: true, message: String(e?.message || e) });
      }
      stmts.length = 0;
    }
  }
  if (stmts.length) {
    try { await env.DB.batch(stmts); } catch (e: any) {
      report.errors.push({ batch: true, message: String(e?.message || e) });
    }
  }

  await audit(env, r, table, 'bulk', `批量${mode} ${table}：写${report.inserted + report.deleted} 跳过${report.skipped}`);
  return json({
    ok: true,
    mode,
    ...report,
    message: `批量${mode}完成：写 ${report.inserted + report.deleted} 行，跳过 ${report.skipped} 行${
      report.errors.length ? `，错误 ${report.errors.length} 条` : ''
    }`,
  });
}
