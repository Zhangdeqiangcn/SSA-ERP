// /api/planned-orders — 计划订单（B2 流程闭环）
//
// ── 这是干什么的表（一句话）────────────────────────────────────────
// MRP 算出的「建议采购 / 建议生产」不再只活在页面里，而是先落成一张
// 可查、可确认、可转换、可追溯的计划订单；它是「需求」与「执行」之间的缓冲区。
//
// ── 四个动作，对应计划员的真实工作流 ─────────────────────────────
//   GET                    看：按运算批次 / 状态 / 物料查建议
//   POST  action=persist   存：把一轮 MRP 结果整批落库（幂等，可反复提交）
//   PATCH                  确认/否决：计划员对单条建议盖章
//   GET   ?runs=1          比：看最近几轮运算各算出多少（轮次对比入口）
//
// ── 为什么 POST 用「整批 upsert」而不是「逐条 create」────────────────
// MRP 的调用场景是「算完 → 存 → 可能改参数再算 → 再存」。若逐条 INSERT，
// 第二次提交就会因唯一约束失败（或产生重复）。故本端点收整批数组，
// 用 INSERT ... ON CONFLICT DO UPDATE 让「重复提交」天然退化为「更新」——
// 这同时满足了需求里的两条硬要求：幂等 + 「重算后数量变了」要如实反映。
//
// 为什么不允许通过本端点改 status：
//   落库与确认是两件事（一个是系统的动作，一个是人的判断）。若整批 upsert 也能改
//   status，那么重算落库会把计划员已确认的 'confirmed' 悄悄刷回 'draft'——
//   计划员盖过的章被机器抹掉，是比丢数据更严重的问题（人会以为章还在）。
//   故 upsert 的 UPDATE 子句**刻意不包含 status**，状态只能经 PATCH 改。
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { writeAudit } from '../../_shared/auditLog';
import { rlsCondition } from '../../_shared/rls';

/** 允许落库的建议类型 */
const VALID_TYPES = new Set(['purchase', 'manufacture']);
/** 状态机取值（见迁移 0050 设计取舍 3） */
const VALID_STATUS = new Set(['draft', 'confirmed', 'converted', 'void']);

/** 单批最多接受多少行：防止一次请求把 D1 打爆（每行一次 upsert，D1 有请求时长上限） */
const MAX_BATCH = 500;

function num(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: any, max = 200): string {
  return String(v ?? '').slice(0, max);
}

/** 行 → 前端用的 camelCase 对象（与项目既有约定一致） */
function rowToApi(r: any) {
  if (!r) return r;
  return {
    id: r.id,
    org_id: r.org_id,
    runId: r.run_id,
    runAt: r.run_at,
    materialCode: r.material_code,
    materialName: r.material_name,
    unit: r.unit,
    type: r.type,
    grossQty: num(r.gross_qty),
    onHandQty: num(r.on_hand_qty),
    onOrderQty: num(r.on_order_qty),
    netQty: num(r.net_qty),
    plannedQty: num(r.planned_qty),
    dueDate: r.due_date,
    bucketStart: r.bucket_start,
    lowLevelCode: num(r.low_level_code),
    status: r.status,
    convertedType: r.converted_type,
    convertedId: r.converted_id,
    convertedNo: r.converted_no,
    priority: r.priority,
    reason: r.reason,
    note: r.note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
  };
}

/** 运算批次摘要（用于「比」这个动作：看最近几轮各算出多少） */
function summarizeRun(runId: string, rows: any[]) {
  const byStatus: Record<string, number> = {};
  let purchase = 0;
  let manufacture = 0;
  let totalPlanned = 0;
  let runAt: string | null = null;
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    if (r.type === 'purchase') purchase += 1;
    else if (r.type === 'manufacture') manufacture += 1;
    totalPlanned += num(r.planned_qty);
    if (!runAt && r.run_at) runAt = r.run_at;
  }
  return {
    runId,
    runAt,
    total: rows.length,
    purchase,
    manufacture,
    totalPlannedQty: Math.round(totalPlanned * 100) / 100,
    byStatus,
  };
}

// ── GET：查建议 / 查运算批次 ────────────────────────────────────────
export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);

  // 动作一：轮次对比（?runs=1）——先给「有哪些批运算、各算出多少」
  if (url.searchParams.get('runs') === '1') {
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 1), 50);
    const rls = rlsCondition(user, 'planned_orders');
    const res = await db
      .prepare(
        `SELECT * FROM planned_orders WHERE org_id = ? AND ${rls.clause}
          ORDER BY run_id DESC, low_level_code ASC, net_qty DESC`,
      )
      .bind(user.org_id, ...rls.params)
      .all();

    const all = res.results || [];
    const grouped = new Map<string, any[]>();
    for (const r of all) {
      if (!grouped.has(r.run_id)) grouped.set(r.run_id, []);
      grouped.get(r.run_id)!.push(r);
    }
    const runs = [...grouped.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0)) // run_id 内含时间戳，倒序即最新在前
      .slice(0, limit)
      .map(([runId, rows]) => summarizeRun(runId, rows));

    return json({ data: runs });
  }

  // 动作二：查建议明细
  const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(url.searchParams.get('pageSize') || '50', 10) || 50, 1), 200);
  const offset = (page - 1) * pageSize;

  const where: string[] = ['org_id = ?'];
  const params: any[] = [user.org_id];

  const runId = url.searchParams.get('runId') || '';
  if (runId === 'latest') {
    // 便利入口：不传具体批次号时默认看最新一批（计划员 90% 的场景）
    const latest: any = await db
      .prepare(`SELECT run_id FROM planned_orders WHERE org_id = ? ORDER BY run_id DESC LIMIT 1`)
      .bind(user.org_id)
      .first();
    if (!latest?.run_id) return json({ data: [], pagination: { page, pageSize, total: 0 }, latestRunId: null });
    where.push('run_id = ?');
    params.push(latest.run_id);
  } else if (runId) {
    where.push('run_id = ?');
    params.push(runId);
  }

  const status = url.searchParams.get('status') || '';
  if (status && VALID_STATUS.has(status)) {
    where.push('status = ?');
    params.push(status);
  }
  const type = url.searchParams.get('type') || '';
  if (type && VALID_TYPES.has(type)) {
    where.push('type = ?');
    params.push(type);
  }
  const keyword = safeKeyword(url.searchParams.get('keyword'));
  if (keyword) {
    where.push('(material_code LIKE ? ESCAPE \'\\\' OR material_name LIKE ? ESCAPE \'\\\')');
    params.push(likePattern(keyword), likePattern(keyword));
  }

  const rls = rlsCondition(user, 'planned_orders');
  const whereSql = where.join(' AND ') + ` AND ${rls.clause}`;
  const bound = [...params, ...rls.params];

  const results = await db
    .prepare(
      `SELECT * FROM planned_orders WHERE ${whereSql}
        ORDER BY low_level_code ASC, net_qty DESC LIMIT ? OFFSET ?`,
    )
    .bind(...bound, pageSize, offset)
    .all();
  const count: any = await db
    .prepare(`SELECT COUNT(*) AS cnt FROM planned_orders WHERE ${whereSql}`)
    .bind(...bound)
    .first();

  return json({
    data: (results.results || []).map(rowToApi),
    pagination: { page, pageSize, total: count?.cnt || 0 },
  });
}

// ── POST：整批落库（幂等）────────────────────────────────────────────
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({} as any));

  const action = str(body.action || 'persist', 32);
  if (action !== 'persist') {
    return json({ error: `不支持的动作：${action}（本端点只接受 action=persist）` }, 400);
  }

  const rows: any[] = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) return json({ error: 'rows 不能为空' }, 400);
  if (rows.length > MAX_BATCH) {
    return json(
      { error: `单批最多 ${MAX_BATCH} 行，本次 ${rows.length} 行。请分批提交。` },
      413,
    );
  }

  // run_id 必须由调用方给出：它是「同一批」的锚点，服务端另起一个会让幂等失效
  // （每次请求新 run_id → 每次都当成新批次 → 唯一约束永远不冲突 → 重复行满库）。
  const runId = str(body.runId, 80);
  if (!runId) return json({ error: 'runId 必填（同一轮 MRP 运算须使用同一 runId，否则幂等失效）' }, 400);
  const runAt = str(body.runAt || new Date().toISOString(), 40);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  let inserted = 0;
  let updated = 0;
  const skipped: string[] = [];

  const stmt = db.prepare(
    `INSERT INTO planned_orders (
       id, org_id, run_id, run_at,
       material_code, material_name, unit, type,
       gross_qty, on_hand_qty, on_order_qty, net_qty, planned_qty,
       due_date, bucket_start, low_level_code,
       status, priority, reason, note,
       created_at, updated_at, created_by, updated_by, owner_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(org_id, run_id, material_code, type) DO UPDATE SET
       material_name  = excluded.material_name,
       unit           = excluded.unit,
       gross_qty      = excluded.gross_qty,
       on_hand_qty    = excluded.on_hand_qty,
       on_order_qty   = excluded.on_order_qty,
       net_qty        = excluded.net_qty,
       planned_qty    = excluded.planned_qty,
       due_date       = excluded.due_date,
       bucket_start   = excluded.bucket_start,
       low_level_code = excluded.low_level_code,
       priority       = excluded.priority,
       reason         = excluded.reason,
       note           = excluded.note,
       updated_at     = excluded.updated_at,
       updated_by     = excluded.updated_by
       -- ⚠️ 刻意不更新 status：状态是人的判断，不能被机器重算抹掉（见文件头说明）
       -- ⚠️ 刻意不更新 run_at：同一 runId 的批次时间以首次落库为准`,
  );

  for (const raw of rows) {
    const materialCode = str(raw.materialCode, 64);
    const type = str(raw.type, 32);
    if (!materialCode || !VALID_TYPES.has(type)) {
      skipped.push(`${materialCode || '(无编码)'}/${type || '(无类型)'}`);
      continue;
    }

    // 幂等判定：先查这一行在不在。查到了 → 本次是「更新」（重算覆盖数量），
    // 查不到 → 本次是「新增」。这只是为了给用户一个如实的计数回报，
    // 真正的幂等保证仍由 ON CONFLICT 唯一约束承担（并发下也成立）。
    const exist: any = await db
      .prepare(
        `SELECT id FROM planned_orders
          WHERE org_id = ? AND run_id = ? AND material_code = ? AND type = ?`,
      )
      .bind(user.org_id, runId, materialCode, type)
      .first();

    await stmt
      .bind(
        uid('po'),
        user.org_id,
        runId,
        runAt,
        materialCode,
        str(raw.materialName, 200),
        str(raw.unit, 16),
        type,
        num(raw.grossQty),
        num(raw.onHandQty),
        num(raw.onOrderQty),
        num(raw.netQty),
        num(raw.plannedQty),
        str(raw.dueDate, 20) || null,
        str(raw.bucketStart, 20) || null,
        Math.max(0, Math.round(num(raw.lowLevelCode))),
        str(raw.priority, 16) || 'normal',
        str(raw.reason, 500) || null,
        str(raw.note, 500) || null,
        now,
        now,
        user.id,
        user.name || user.username,
        user.id,
      )
      .run();

    if (exist) updated += 1;
    else inserted += 1;
  }

  // 审计：写清「批次 + 新增/更新各多少 + 被跳过的行」，而不是只写「落库成功」。
  // 跳过的行尤其重要——它是「有一批建议没进系统」的唯一线索。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name || user.username },
    entity: 'planned_orders',
    entityId: runId,
    action: 'persist',
    summary:
      `MRP 计划订单落库（运算批次 ${runId}）：新增 ${inserted} 条、更新 ${updated} 条` +
      (skipped.length ? `、跳过 ${skipped.length} 条（无效数据：${skipped.slice(0, 5).join('、')}${skipped.length > 5 ? ' 等' : ''}）` : '') +
      '【已确认/已转换的建议不会被本次落库改动状态】',
  });

  return json({
    success: true,
    runId,
    inserted,
    updated,
    skipped: skipped.length,
    skippedSample: skipped.slice(0, 10),
    total: inserted + updated,
  });
}

// ── PATCH：确认 / 否决（人的判断，与机器的落库分离）─────────────────
export async function onRequestPatch(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({} as any));

  const id = str(body.id, 64);
  if (!id) return json({ error: 'id 必填' }, 400);

  const target: any = await db
    .prepare(`SELECT * FROM planned_orders WHERE id = ? AND org_id = ?`)
    .bind(id, user.org_id)
    .first();
  if (!target) return json({ error: '计划订单不存在' }, 404);

  const fromStatus = target.status;
  const toStatus = body.status !== undefined ? str(body.status, 32) : fromStatus;
  if (!VALID_STATUS.has(toStatus)) {
    return json({ error: `状态取值非法：${toStatus}` }, 400);
  }

  // 状态机守卫：只允许「前进」，不允许从终态回退。
  // 理由：'converted' 意味着下游已据此下了采购申请/工单，把它改回 draft
  // 会让计划订单与真实单据脱钩（追溯链断裂）；要撤销只能新建一条，不能改历史。
  if (fromStatus === 'converted' && toStatus !== 'converted') {
    return json({ error: '该建议已转为正式单据，不可回退状态（如需变更请走下游单据的撤销流程）' }, 409);
  }

  const note = body.note !== undefined ? str(body.note, 500) : target.note;
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  await db
    .prepare(
      `UPDATE planned_orders SET status = ?, note = ?, updated_at = ?, updated_by = ? WHERE id = ? AND org_id = ?`,
    )
    .bind(toStatus, note, now, user.name || user.username, id, user.org_id)
    .run();

  const actionLabel =
    toStatus === 'confirmed' ? '确认' : toStatus === 'void' ? '否决' : toStatus === 'converted' ? '转为正式单据' : '更新';

  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name || user.username },
    entity: 'planned_orders',
    entityId: id,
    action: toStatus === 'void' ? 'reject' : toStatus === 'confirmed' ? 'confirm' : 'update',
    summary:
      `${actionLabel}计划订单：${target.material_code} ${target.material_name || ''}` +
      `（建议 ${target.type === 'purchase' ? '采购' : '生产'} ${target.planned_qty} ${target.unit || ''}，需求日 ${target.due_date || '-'}）` +
      (fromStatus !== toStatus ? `；状态：${fromStatus} → ${toStatus}` : '；状态未变') +
      (note && note !== target.note ? `；备注：${note}` : ''),
  });

  const updatedRow = await db.prepare(`SELECT * FROM planned_orders WHERE id = ?`).bind(id).first();
  return json(rowToApi(updatedRow));
}
