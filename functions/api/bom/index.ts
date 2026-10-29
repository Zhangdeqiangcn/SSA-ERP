// BOM 域集合端点（C1 数据关系化样板）
// GET  /api/bom         列表（分页 / keyword / productCode / status / RLS）
// POST /api/bom         创建（表头 + 嵌套明细行一次性写入）
//
// ── 为什么单开这个端点，而不是复用通用实体路由 /api/entities/bom ──────
// 通用实体路由的设计前提是「一个资源 = 一张平表」，它只能做表头级的字段 CRUD。
// 但 BOM 的核心恰恰是**嵌套明细行**：
//   ① 创建时必须把 items 一次性落进 bom_items（前端只发一次请求）；
//   ② 读取时必须把明细组装回 header.items（前端类型 `BOMHeader.items?` 不变）；
//   ③ 写入时必须在一个事务语义里「先删旧明细、再插新明细」，否则会出现
//      「删了一半失败」导致 BOM 明细残缺 —— 这比整条失败更难排查。
// 这三点通用路由做不到，硬塞进去会把通用路由变成特例集合（正是 R1 想避免的）。
//
// ── 接口形状刻意与旧版一致 ────────────────────────────────────────
// 15 个前端消费方读的是 `bomList: BOMHeader[]` 且 `BOMHeader.items?: BOMItem[]`。
// 本端点返回的对象形状与之完全对齐（camelCase + 嵌套 items），
// 使前端改造可以只换数据来源、不动任何消费方代码。
// 即「存储形态关系化，接口形状不变」—— 这是让样板可复制的前提。
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';
import { validateOrReject, requireFields } from '../../_shared/validate';
import { writeAudit } from '../../_shared/auditLog';

/** 表头业务列：snake（库）× camel（前端） */
const HEADER_COLS: Array<[string, string]> = [
  ['bom_no', 'bomNo'],
  ['name', 'name'],
  ['source_order_no', 'sourceOrderNo'],
  ['type', 'type'],
  ['status', 'status'],
  ['product_id', 'productId'],
  ['product_code', 'productCode'],
  ['product_name', 'productName'],
  ['version', 'version'],
  ['effective_date', 'effectiveDate'],
  ['expiry_date', 'expiryDate'],
  ['total_cost', 'totalCost'],
  ['currency', 'currency'],
  ['description', 'description'],
  ['approved_by', 'approvedBy'],
  ['approved_at', 'approvedAt'],
  ['is_alternate', 'isAlternate'],
  ['usage_probability', 'usageProbability'],
  ['priority', 'priority'],
  ['co_products', 'coProducts'],
  ['by_products', 'byProducts'],
  ['cost_split_method', 'costSplitMethod'],
];

/** 明细业务列 */
const ITEM_COLS: Array<[string, string]> = [
  ['level', 'level'],
  ['sequence', 'sequence'],
  ['parent_item_id', 'parentItemId'],
  ['material_id', 'materialId'],
  ['material_code', 'materialCode'],
  ['material_name', 'materialName'],
  ['material_spec', 'materialSpec'],
  ['unit', 'unit'],
  ['quantity', 'quantity'],
  ['scrap_rate', 'scrapRate'],
  ['unit_cost', 'unitCost'],
  ['total_cost', 'totalCost'],
  ['lead_time', 'leadTime'],
  ['source', 'source'],
  ['is_critical', 'isCritical'],
  ['child_product_code', 'childProductCode'],
  ['labor_cost', 'laborCost'],
  ['process_cost', 'processCost'],
  ['actual_unit_cost', 'actualUnitCost'],
];

/** 布尔/JSON 列需要特殊转换（SQLite 无布尔类型，用 0/1；对象数组用 JSON 文本） */
const BOOL_COLS = new Set(['is_alternate', 'is_critical']);
const JSON_COLS = new Set(['co_products', 'by_products']);

/** 库行 → 前端 camelCase 对象（含布尔/JSON 还原） */
function headerToApi(row: any, items?: any[]) {
  const out: any = { id: row.id };
  for (const [snake, camel] of HEADER_COLS) {
    if (row[snake] !== undefined && row[snake] !== null) out[camel] = row[snake];
  }
  if (BOOL_COLS.has('is_alternate')) out.isAlternate = !!row.is_alternate;
  for (const c of JSON_COLS) {
    const camel = HEADER_COLS.find(([s]) => s === c)?.[1];
    if (camel && typeof out[camel] === 'string') {
      try { out[camel] = JSON.parse(out[camel]); } catch { /* 脏数据不阻断读取，保留原文 */ }
    }
  }
  // ★ 明细组装回嵌套数组（读侧的 nestItems，见其说明）
  if (items) out.items = nestItems(items);
  return out;
}

/**
 * 把「平铺的行」还原成 `children` 嵌套树 —— 写侧 flattenItems 的逆运算。
 *
 * ── 为什么必须做（此前是 C1 报表域唯一没做的一步）─────────────────
 * 写侧已正确展平并把父行 id 落进 `parent_item_id`，但读侧只做 `items.map(itemToApi)`
 * 得到的是**平数组**。前端 `BOMItem` 类型带 `children?: BOMItem[]`，实际数据是三层嵌套
 * （bom-003.items → 柜门组件 → 门框 → 铰链），于是：
 *   · 工单领料时把「柜门组件」这个**子装配**当实物料领走，它下面的门框/铰链一分不领
 *   · 成本卷积把子装配当原材料估成本，物料需求少算整棵子树
 * 第 91 行原注释「明细组装回嵌套数组」是**误导性注释** —— map 不构成嵌套。
 *
 * ── 三个必须处理的边界（脏数据不该让整棵树消失）────────────────────
 * ① 孤儿行：`parent_item_id` 指向已被删除的行 → 提到**顶层**而不是丢弃
 *    （丢弃 = 静默数据损失，比排版难看严重得多）
 * ② 循环引用：A→B→A（脏数据或并发编辑造成）→ 用访问集截断，防止无限递归爆栈
 * ③ 重复 id：后写入的行挂到同一个父下（不做去重，保留全部行以免丢料）
 *
 * 排序：SQL 已按 `level ASC, sequence ASC` 返回，此处保持入参顺序（稳定），
 * 不再二次排序 —— 避免与界面展示顺序不一致（对标 B1 的低层码依赖此顺序）。
 */
function nestItems(rows: any[]): any[] {
  // ★ 兼容两种来源：DB 行是 snake_case（parent_item_id），
  //   而写侧 flattenItems 的产物 / 前端内存态对象是 camelCase（parentItemId）。
  //   只认一种会让「展平 → 还原」在内存往返场景直接失效（单测已抓到这一点）。
  const pidOf = (r: any): any => (r?.parent_item_id !== undefined ? r.parent_item_id : r?.parentItemId);
  const byId = new Map<string, any>();
  const parentOf = new Map<string, string | null>();
  for (const r of rows || []) {
    const api = itemToApi(r);
    api.children = [];
    if (api.id) byId.set(String(api.id), api);
  }
  for (const r of rows || []) {
    const id = String((r as any).id ?? '');
    const pid = pidOf(r);
    parentOf.set(id, pid != null && String(pid) !== '' ? String(pid) : null);
  }
  /** pid 的父链上是否出现了 id（即会把 id 挂到自己的子孙下 → 环） */
  const wouldCycle = (id: string, pid: string): boolean => {
    const seen = new Set<string>([id]);
    let cur: string | null = pid;
    while (cur) {
      if (seen.has(cur)) return true;
      seen.add(cur);
      cur = parentOf.get(cur) ?? null;
    }
    return false;
  };

  const roots: any[] = [];
  for (const r of rows || []) {
    const id = String((r as any).id ?? '');
    const mapped = byId.get(id);
    if (!mapped) continue;
    const pid = pidOf(r);
    const parent = pid != null && String(pid) !== '' ? byId.get(String(pid)) : undefined;
    // 父不存在（孤儿）或有环 → 提到顶层，绝不丢弃行
    if (parent && parent !== mapped && !wouldCycle(id, String(pid))) parent.children.push(mapped);
    else roots.push(mapped);
  }
  return roots;
}

function itemToApi(row: any) {
  const out: any = { id: row.id, bomId: row.bom_id };
  for (const [snake, camel] of ITEM_COLS) {
    if (row[snake] !== undefined && row[snake] !== null) out[camel] = row[snake];
  }
  out.isCritical = !!row.is_critical;
  return out;
}

/** 前端 camel 值 → 可绑定值（布尔转 0/1、对象转 JSON 文本） */
function toBind(snake: string, v: any): any {
  if (v === undefined || v === null) return null;
  if (BOOL_COLS.has(snake)) return v ? 1 : 0;
  if (JSON_COLS.has(snake)) return typeof v === 'string' ? v : JSON.stringify(v);
  return v;
}

/** 取表头列（仅取请求里出现过的字段，避免把未传字段写成 NULL） */
function pickHeader(body: any) {
  const cols: string[] = [];
  const vals: any[] = [];
  for (const [snake, camel] of HEADER_COLS) {
    if (body[camel] !== undefined) {
      cols.push(snake);
      vals.push(toBind(snake, body[camel]));
    }
  }
  return { cols, vals };
}

function pickItem(item: any) {
  const cols: string[] = [];
  const vals: any[] = [];
  for (const [snake, camel] of ITEM_COLS) {
    if (item[camel] !== undefined) {
      cols.push(snake);
      vals.push(toBind(snake, item[camel]));
    }
  }
  return { cols, vals };
}

/**
 * 把前端传来的嵌套明细树**摊平成行**。
 *
 * ── 为什么必须做这一步（这是 C1 最容易出错的点）──────────────────────
 * 前端 `BOMItem` 类型带 `children?: BOMItem[]`，实际数据是**三层嵌套**的：
 *   bom-003.items → 柜门组件(level 1) → 门框(level 2) → 铰链(level 3)
 * 而关系表里每一行都是平的、靠 `level` 与 `parent_item_id` 表达层级。
 *
 * 若直接把 `body.items` 当平数组写入，**嵌套的 children 会被整块丢掉** ——
 * 界面上看不出异常（顶层 5 行都写进去了），但 BOM 展开时会少掉整棵子树，
 * MRP 随之少算料。这是典型的「静默数据损失」，比报错危险得多。
 *
 * 因此这里做深度优先展平，并把父行的 id 写进子行的 `parent_item_id`。
 * 同时用「层级深度」覆盖 item.level —— 前端可能给 level 填了不一致的值
 * （如 children 里的 level 写错），以实际嵌套深度为准才不会出现「子件层级比父件浅」。
 */
function flattenItems(items: any[], parentId: string | null = null, depth = 1): any[] {
  const out: any[] = [];
  for (const item of items || []) {
    if (!item || typeof item !== 'object') continue;
    const { children, ...rest } = item;
    out.push({ ...rest, level: depth, parentItemId: parentId ?? rest.parentItemId ?? null });
    if (Array.isArray(children) && children.length > 0) {
      // 子行认这一行的 id 为父；若这一行没有 id，前端回填时会由后端生成，
      // 那种情况下父子关系只能靠 level + sequence 表达（降级但不错位）
      out.push(...flattenItems(children, rest.id ? String(rest.id) : null, depth + 1));
    }
  }
  return out;
}

/** 组织校验：表头必须属于当前组织（明细靠 bom_id 关联，不能跨组织读写） */
async function findHeader(DB: any, id: string, orgId: string) {
  return DB.prepare(`SELECT * FROM bom_headers WHERE id = ? AND org_id = ?`).bind(id, orgId).first();
}

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50', 10)));
  const offset = (page - 1) * pageSize;
  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const productCode = (url.searchParams.get('productCode') || '').trim();
  const status = (url.searchParams.get('status') || '').trim();

  // 组织隔离 + 行级策略 + 关键字 三件套共用（与通用实体路由同款，
  // 避免 V2.98.0 修过的「COUNT 侧漏掉行级过滤」缺陷再次出现）
  const buildWhere = () => {
    const where: string[] = ['org_id = ?'];
    const args: any[] = [user.org_id];
    const rls = rlsCondition(user, 'bom_headers');
    if (rls.clause !== '1=1') {
      where.push(rls.clause);
      args.push(...rls.params);
    }
    if (productCode) {
      where.push('product_code = ?');
      args.push(productCode);
    }
    if (status) {
      where.push('status = ?');
      args.push(status);
    }
    if (keyword) {
      const kw = likePattern(keyword);
      where.push('(bom_no LIKE ? ESCAPE \'\\\' OR name LIKE ? ESCAPE \'\\\' OR product_code LIKE ? ESCAPE \'\\\' OR product_name LIKE ? ESCAPE \'\\\')');
      args.push(kw, kw, kw, kw);
    }
    return { clause: where.join(' AND '), args };
  };

  const { clause: whereClause, args: whereArgs } = buildWhere();

  const rows = await env.DB.prepare(
    `SELECT * FROM bom_headers WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...whereArgs, pageSize, offset)
    .all();
  const headers = rows.results || [];

  // 一次性取回本页全部明细（避免 N+1 查询：50 张 BOM 发 50 条 SQL 会拖垮边缘函数）
  let itemsByBom = new Map<string, any[]>();
  if (headers.length > 0) {
    const ids = headers.map((h: any) => h.id);
    const placeholders = ids.map(() => '?').join(',');
    const items = await env.DB.prepare(
      `SELECT * FROM bom_items WHERE bom_id IN (${placeholders}) ORDER BY ${
        // SQLite 支持 ORDER BY CASE，保证明细按「层级 → 序号」返回，
        // 与界面展示顺序、BOM 展开顺序三者一致（B1 的 LLC 依赖此顺序稳定）
        'level ASC, sequence ASC'
      }`
    )
      .bind(...ids)
      .all();
    for (const it of items.results || []) {
      const list = itemsByBom.get((it as any).bom_id) || [];
      list.push(it);
      itemsByBom.set((it as any).bom_id, list);
    }
  }

  const data = headers.map((h: any) => headerToApi(h, itemsByBom.get(h.id) || []));

  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM bom_headers WHERE ${whereClause}`
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

  const body = await request.json().catch(() => ({}));
  const _invalid = validateOrReject('bom_headers', body);
  if (_invalid) return _invalid;

  // 必填守卫（V3.16.1 · 缺陷 #11）：空请求会生成全空 BOM 头，这里拦在写入前
  const _req = requireFields(body, ['name'], { name: 'BOM 名称' });
  if (_req) return _req;

  const id = body.id ? String(body.id) : uid('bom');
  const now = new Date().toISOString();
  const { cols, vals } = pickHeader(body);

  // bom_no 是业务单号，必填；缺失时用 id 兜底而不是留 NULL，
  // 否则 UNIQUE(org_id, bom_no) 在 SQLite 下允许多个 NULL，会出现「无编号的重复 BOM」
  const colsWithDefaults = [...cols];
  const valsWithDefaults = [...vals];
  if (!cols.includes('bom_no')) {
    colsWithDefaults.push('bom_no');
    valsWithDefaults.push(`BOM-${id.slice(-8).toUpperCase()}`);
  }

  const allCols = ['id', 'org_id', ...colsWithDefaults, 'created_at', 'updated_at', 'created_by', 'updated_by'];
  const allVals = [id, user.org_id, ...valsWithDefaults, now, now, user.id, user.id];

  // 表头 INSERT 语句（先构建，不立即执行 —— 与明细行合并成单一原子批次）
  const headerStmt = env.DB.prepare(
    `INSERT INTO bom_headers (${allCols.join(',')}) VALUES (${allCols.map(() => '?').join(',')})`
  ).bind(...allVals);

  const items = Array.isArray(body.items) ? body.items : [];
  const { stmts: itemStmts, ok, failed } = buildItemStmts(env.DB, id, items, now);

  try {
    // 单一原子批次：表头 INSERT 与明细「先删后插」要么全成、要么全回滚（DB-002 修复）
    // 中途失败不再留下「表头已建、明细残缺」的半截 BOM
    await env.DB.batch([headerStmt, ...itemStmts]);
  } catch (e: any) {
    // 唯一约束冲突（同组织内 bom_no 重复）是**业务错误**，应给可读中文提示而非 500
    if (String(e?.message || '').includes('UNIQUE')) {
      return json({ error: `创建失败：BOM 编号 ${body.bomNo || ''} 在本组织已存在，请换一个编号或改为修改原 BOM` }, 409);
    }
    return json({ error: `创建 BOM 失败：${e?.message || '未知错误'}` }, 500);
  }

  await writeAudit(env.DB, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'bom_headers',
    entityId: id,
    action: 'create',
    summary:
      `创建 BOM ${body.bomNo || id}（${body.productName || body.productCode || '未填产品'} / ${body.version || '未填版本'}）` +
      `（类型：${body.type || 'EBOM'}；状态：${body.status || 'draft'}）` +
      `（明细行：${ok} 行${failed > 0 ? `，失败 ${failed} 行` : ''}）`,
  });

  const created = await findHeader(env.DB, id, user.org_id);
  const rows = await env.DB.prepare(`SELECT * FROM bom_items WHERE bom_id = ? ORDER BY level ASC, sequence ASC`)
    .bind(id)
    .all();

  return json(headerToApi(created, rows.results || []), 201);
}

/**
 * 构建「整体替换 BOM 明细」的语句数组（先删后插，**不立即执行**）。
 *
 * ── 为什么是「先删后插」而不是「逐行 upsert」─────────────────────────
 * BOM 明细的顺序（level + sequence）本身就是数据的一部分：把第 3 行删掉、
 * 后面的行要整体前移。用 upsert 会留下一串「空洞序号」，让 level/sequence
 * 的唯一约束变成难以推理的碎片。整体替换语义更简单，也不会算错。
 *
 * ── 为什么返回语句数组而不是自行执行 ──────────────────────────────
 * 让调用方把「表头 INSERT」与「明细先删后插」合并进**同一原子批次**（DB-002 修复）：
 * 中途失败不再留下「旧明细已删、新明细只插一半」的残缺 BOM。
 *
 * @returns stmts 待执行语句数组（一条 DELETE + 各明细 INSERT）
 *          ok    成功构造的明细行数（用于审计摘要）
 *          failed 构造阶段抛错的明细行数（用于审计摘要）
 *          total 摊平后的明细总行数（用于 batch 失败时的失败计数基线）
 */
function buildItemStmts(DB: any, bomId: string, rawItems: any[], now: string): { stmts: any[]; ok: number; failed: number; total: number } {
  const stmts: any[] = [];
  stmts.push(DB.prepare(`DELETE FROM bom_items WHERE bom_id = ?`).bind(bomId));

  // ★ 先摊平嵌套树（见 flattenItems 的说明：不摊平会静默丢掉整棵子树）
  const items = flattenItems(rawItems);

  let ok = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const { cols, vals } = pickItem(item);
      const itemId = item.id ? String(item.id) : uid('bi');
      // level/sequence 是唯一键成员，缺省时给安全默认值，避免 NULL 破坏唯一约束语义
      const c2 = [...cols];
      const v2 = [...vals];
      if (!c2.includes('level')) { c2.push('level'); v2.push(1); }
      if (!c2.includes('sequence')) { c2.push('sequence'); v2.push(0); }
      const allCols = ['id', 'bom_id', ...c2, 'created_at', 'updated_at'];
      const allVals = [itemId, bomId, ...v2, now, now];
      stmts.push(
        DB.prepare(`INSERT INTO bom_items (${allCols.join(',')}) VALUES (${allCols.map(() => '?').join(',')})`).bind(
          ...allVals
        )
      );
      ok++;
    } catch {
      failed++;
    }
  }
  return { stmts, ok, failed, total: items.length };
}

/**
 * 写入明细行（整体替换语义）—— `buildItemStmts` 的执行包装。
 *
 * 保留原 `export` 签名，供任何直接调用方仍按旧语义「先删后插、原子 batch」执行。
 * 新建流程走 `onRequestPost` 里的合并批次版本（表头 + 明细一次性提交）。
 */
async function writeItems(DB: any, bomId: string, rawItems: any[], now: string) {
  const { stmts, ok, failed, total } = buildItemStmts(DB, bomId, rawItems, now);
  try {
    await DB.batch(stmts);
  } catch (e: any) {
    // 批次整体失败：删与插一起回滚（D1 batch 语义），明细保持原样
    return { ok: 0, failed: total + 1, error: String(e?.message || e) };
  }
  return { ok, failed };
}

export { headerToApi, itemToApi, pickHeader, pickItem, findHeader, writeItems, flattenItems, nestItems, HEADER_COLS, ITEM_COLS };
