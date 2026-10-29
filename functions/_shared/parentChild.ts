// 通用「父表 + 子表（嵌套数组）」CRUD 助手（C1 数据关系化 · V3.8.0）
//
// ── 为什么要有这个助手 ──────────────────────────────────────────
// C1 迁移中反复出现同一类结构：前端对象里带**嵌套数组**，关系表里必须拆成
// 「父表一行 + 子表 N 行」。已遇到的有：
//   · BOM         header.items（三层嵌套，已由 /api/bom 手写实现）
//   · 付款计划     plan.installments（B11 逐期付款 + 供应商预付款信用）
//   · 项目核算     account.costItems（成本明细展示）
// 后续销售订单/采购订单/审批流同样如此。
//
// 通用实体路由（/api/entities/:resource）的设计前提是「一个资源 = 一张平表」，
// 它的 pickSnake 只挑已登记列 —— **嵌套数组会被静默丢弃且不报错**。
// 这正是本助手存在的唯一理由：把「数组 → 子表行 → 组装回数组」这件事
// 集中在一个地方做对，而不是每个域复制一遍、每次都可能漏掉摊平。
//
// ── 关键不变量（改这个文件前必须理解）────────────────────────────
// ① **创建与更新必须共用同一个摊平写入函数**。若两边各写一份，
//    会出现「新建是对的、编辑后又少了」这类极难定位的问题（BOM 轮次的教训）。
// ② **子表写入用 DB.batch() 原子批次**：先 DELETE 再 INSERT 全部子行。
//    逐条 await 中途失败会留下「旧子行已删、新子行只插一半」的残缺状态 ——
//    表面有数据、实际少了行、没人察觉。
// ③ **更新时「不传子数组」= 子表保持原样；「传空数组」= 清空子表**。
//    两者语义必须区分；若把「不传」也当成清空，一次改状态就会删光全部子行。
// ④ **父表更新只改 body 里出现的字段**（字段级差异），不能整体覆盖 ——
//    否则一次改状态会把没传的字段全写成 NULL。
import { safeKeyword, likePattern } from './searchKeyword';
import { getUserFromRequest, json, uid } from './auth';
import { rlsCondition } from './rls';
import { validateOrReject } from './validate';
import { writeAudit } from './auditLog';
import { resolveIdemKey, findIdem, saveIdem } from './idempotency';
import { guardOperation } from './operationGuard';
import { nextDocNo } from './numbering';
import type { ModuleType } from './operationGuard';

/**
 * #10 乐观锁：这些父表的 `version` 是**业务版本字段**（TEXT，表示 BOM/工艺版本号），
 * 不是并发锁版本号。参与乐观锁比对或自增会直接破坏业务语义，故显式排除。
 * （bom_headers 走 /api/bom 手写端点、不经过本框架，一并登记以防将来误接。）
 */
const VERSION_IS_BUSINESS_FIELD = new Set(['process_routes', 'bom_headers']);

/** 单个子表（父表的一条嵌套数组 → 一张子表） */
export interface ChildSpec {
  /** 子表名 */
  childTable: string;
  /** 子表指向父表的外键列 */
  childFkCol: string;
  /** 前端对象里承载子数组的属性名（如 installments / milestones） */
  childField: string;
  /** 子表业务列 [snake, camel] */
  childCols: Array<[string, string]>;
  /** 子表排序（如 `seq ASC`） */
  childOrder: string;
  /**
   * 子表行内**自身**带嵌套的列（V3.10.0 新增，审批流域首个案例）。
   *
   * ── 为什么父表的 jsonCols 不够用 ───────────────────────────────
   * 前四个域里，嵌套只出现在「父表带子数组」这一层。审批流不同：
   * 每个**节点**（子表的一行）自己还带嵌套 ——
   *   · conditions   : ConditionGroup（单对象）
   *   · skipRule     : SkipRule（单对象）
   *   · escalation   : EscalationRule（单对象）
   *   · approverRoles / approverUserIds / fields（字符串数组）
   * 这些字段既不属于父表，又不能为它们各建一张子表
   * （`fields: ['name','unit']` 建表只会得到「每行一个字段名」的空壳）。
   * 因此给 ChildSpec 开一个与父表同款的 jsonCols。
   *
   * ── ★ 与父表 jsonCols 的语义差异（V3.11.0 起已消除）────────────
   * V3.10.0 时这里记过：「父表 jsonCols 只装字符串数组（用 toJsonText，
   * 非数组一律落成 `[]`），子表还要装对象，所以子表单独走 toJsonValue」。
   * **这个「差异」本身就是缺陷** —— 它意味着父表那套一旦遇到对象就会静默
   * 落成 `[]`。V3.11.0 采购域给父表加了 `customFields`（对象）时果然踩中：
   * 保存成功、返回 201、读回是 `[]`。
   *
   * 现已在**两端统一**：
   *   · 写侧 `toJsonValue`：原样 JSON.stringify（数组/对象都对）
   *   · 读侧 `parseJsonValue`：原样 JSON.parse（数组/对象都对）
   * 父表与子表共用同一套，「父子差异」不再存在。
   * **教训：当两处「必须不同」时，先问一句「这个不同是业务要求，还是实现偷懒」。**
   * 本处是后者 —— 父表当时只需要装数组，就顺手把「非数组」判成了错误输入，
   * 而不是「暂时用不到的类型」。
   *
   * ── 同样必须合并遍历（不重犯 V3.9.0 的错）─────────────────────
   * 父表那轮踩过「字段只进 jsonCols 没进 parentCols → 既不写库也不回读」
   * 的坑，根因是设计上要求两处手动对齐。子表这里直接给一个
   * `allChildCols(spec)` 合并函数，从结构上不可能漏。
   */
  jsonCols?: JsonArrayCol[];
}

export interface ParentChildConfig {
  /** 父表名 */
  parentTable: string;
  /**
   * 操作权限模块（V3.47.0 P0-1 落地 operationGuard.ts 早已声明却从未接线的守卫）。
   *
   * ── 为什么必须加到 config 上而不是各端点 ───────────────────────
   * 9 组业务端点（工艺路线/供应商报价/采购申请/付款计划/项目/审批流等）
   * 全部委托给 pcCreate/pcUpdate/pcRemove，端点文件本身不写权限逻辑。
   * 若在各端点逐个补 guardOperation，会重新回到「每个端点都可能漏」的老路
   * （operationGuard.ts:47 的注释已承诺「parentChild 增加 cfg.module 统一守卫」，
   *   却因没人回头接线而形同虚设 —— 这是本次要根治的『造好了没接线』）。
   * 把 module 放进 config、在 3 个写函数入口统一 guard，端点文件**零改动**即接入，
   * 且「新增一组父子端点忘了接守卫」在结构上不再可能发生。
   *
   * ── module 取值按 operationGuard.API_TO_MODULE 现有约定复用 ──────
   * 有写权限的角色（buyer/warehouse_keeper/finance_manager/salesperson…）
   * 在 BUILTIN_ROLE_OPS 里已有对应模块授权，不会因误配被 ?? false 兜底误拒。
   * 审批流定义属「管理端职能」，取 '*' —— 仅 super_admin/admin 可写，
   * 普通角色 fail-closed（这是刻意的：改审批流=改全公司管控逻辑，只该管理员能做）。
   */
  module: ModuleType;
  /**
   * 子表规格。
   *
   * ── 为什么是数组而不是单个（V3.9.0 扩展）────────────────────────
   * 财务域两张表各只有**一个**嵌套数组（installments / costItems），单子表够用。
   * 但销售域的 `Project` 一次带**三个**数组：`milestones[]` / `exceptions[]` /
   * `team: string[]`，`Prospect` 带两个。若沿用单子表，第二个数组会被静默丢弃 ——
   * 而「界面上项目详情能打开、里程碑列表全空」正是最难被发现的一类缺陷
   * （顶层行都在，没有任何报错）。因此把 childTable 一族提升为数组，
   * 由 replaceAllChildren / loadAllChildren 统一遍历。
   *
   * 字符串数组（team / interestProducts / linkedOrders）**不建子表**，
   * 由父表 JSON 文本列承载 —— 它们没有 id、没有属性、不参与 SQL 统计，
   * 建子表只会得到「每行一个字符串」的空壳表。
   */
  children: ChildSpec[];
  /** 父表业务列 [snake, camel] */
  parentCols: Array<[string, string]>;
  /** 以 JSON 文本列承载的字符串数组（可选；如 team / interestProducts） */
  jsonCols?: JsonArrayCol[];
  /** 审计与提示用的中文名 */
  label: string;
  /** 业务单号列（snake）与其 camel 名，用于 409 冲突提示与审计摘要 */
  noSnake: string;
  noCamel: string;
  /**
   * 服务端权威取号的单据类型（V3.93.0 新增，**可选、默认不启用**）。
   *
   * ★ 为什么做成可选开关而不是在 pcCreate 里无条件取号 ──────────
   * 本助手被多组父子端点共用（采购申请 / 供应商报价 / 付款计划 / 项目核算 /
   * 审批流等）。其中不少表**没有业务单号概念**（供应商报价用 vendorName 辨认，
   * 审批流用 module 辨认），无条件取号会给这些表凭空造一个无意义单号列。
   * 故只在配置显式声明 noDocType 的表上启用，其余表行为**零变化**。
   *
   * 启用后语义（与 /api/purchase-orders 等手写端点完全同一范式）：
   *   前端未传 body[noCamel] → 服务端 D1 原子取号（numbering_rules 自增）；
   *   前端已传 → 保持既有 dedupe 查重与 409 提示（向后兼容老客户端）。
   * 取号失败返回 503 + 可读原因，**绝不因取号打挂建单主流程**。
   */
  noDocType?: string;
}

/**
 * 父表里以「JSON 文本列」承载的字符串数组，写作 [snake 列名, camel 属性名]。
 *
 * 为什么单独出来：这些字段在 DB 里是 TEXT（存 `["张","李"]`），在接口上是数组。
 * 进出都必须显式做 JSON 编解码 —— 漏了任何一侧，会出现
 * 「库里是字符串、界面拿到字符串当数组用」或「数组被当成参数写进 TEXT 列」（存成逗号串）。
 * 用元组而非对象，是为了和 parentCols / childCols 保持同一种写法，减少阅读切换成本。
 */
export type JsonArrayCol = [string, string];

/**
 * 取表内真实存在的列集合。
 *
 * ★ 为什么必须动态检测（踩过才知道）：
 *   各张表的审计列并不齐 —— 0053 建的 `fin_payment_plans` 只有 created_at /
 *   updated_at / owner_id / dept_id，**没有 created_by / updated_by**；
 *   而 0054 重建的 `fin_project_accounts` 两列都有。
 *   若 INSERT 里无条件写 `created_by`，前者会直接报
 *   `no such column: created_by` → 500，而且**类型检查与打包都发现不了**
 *   （表名是变量，静态分析看不到）。后续销售订单 / 采购订单同样会有这种参差，
 *   所以这里一律以「真实表结构」为准，与通用实体路由的 presentCols 同款处理。
 */
async function presentCols(DB: any, table: string): Promise<Set<string>> {
  const r = await DB.prepare(`PRAGMA table_info(${table})`).all();
  return new Set(((r?.results || []) as any[]).map((c: any) => String(c.name)));
}

/** 按真实列存在与否拼审计列（返回列名与对应值，调用方直接展开） */
function auditCols(
  cols: Set<string>,
  which: Array<'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'created_by_name' | 'updated_by_name'>,
  now: string,
  userId: string,
  userName: string
) {
  const names: string[] = [];
  const vals: any[] = [];
  for (const w of which) {
    if (!cols.has(w)) continue;
    names.push(w);
    if (w === 'created_at' || w === 'updated_at') vals.push(now);
    else if (w === 'created_by' || w === 'updated_by') vals.push(userId);
    else vals.push(userName); // created_by_name / updated_by_name（V3.71.0 记录自带姓名快照）
  }
  return { names, vals };
}

/** 子表行 → 前端 camel 对象 */
function childToApi(spec: ChildSpec, row: any) {
  const out: any = { id: row.id };
  for (const [snake, camel] of allChildCols(spec)) {
    if (row[snake] === undefined || row[snake] === null) continue;
    // 子表 JSON 列要解回原值（对象或数组），见 ChildSpec.jsonCols 注释
    out[camel] = childJsonSet(spec).has(camel) ? parseJsonValue(row[snake]) : row[snake];
  }
  return out;
}

/**
 * 子表业务列 + 子表 JSON 列合并成一次遍历用的列表。
 *
 * 与父表 allParentCols 同款：把「要读写的列」和「要做 JSON 编解码的列」
 * 合成一个来源，消除两处手动对齐。父表那轮就是漏了这一步，
 * 导致三个字段既不写库也不回读（见 allParentCols 注释）。
 */
function allChildCols(spec: ChildSpec): Array<[string, string]> {
  return [...spec.childCols, ...(spec.jsonCols || [])];
}

/** 子表 JSON 列的 camel 名集合（每次调用按 spec 重建，避免多张子表互相污染） */
function childJsonSet(spec: ChildSpec): Set<string> {
  return new Set((spec.jsonCols || []).map(([, camel]) => camel));
}

/**
 * 父表列 + JSON 列合并成一次遍历用的列表。
 *
 * ★ 为什么要有这个函数（这是踩过一次的设计缺陷）─────────────────
 * 最初 parentCols 管「哪些列要读写」、jsonCols 管「哪些列要做 JSON 编解码」，
 * 两者分开。结果写销售域配置时只把 team / linkedOrders / interestProducts
 * 放进了 jsonCols，**忘了同时加进 parentCols** ——
 * 由于 pickCols 与 parentToApi 都只遍历 parentCols，这三个字段
 * 既不写库也不回读，接口上直接是 `undefined`。
 * 本地护栏套件一跑就抓到（PASS 100 / FAIL 5，5 条全是同一个根因）。
 *
 * 根因不在「漏写一行」，而在**设计上要求两处手动对齐**——
 * 任何需要人工保持两处一致的写法迟早会不一致。改成合并遍历后，
 * 配置里写进 jsonCols 的列自动进入读写范围，不可能再漏。
 */
function allParentCols(cfg: ParentChildConfig): Array<[string, string]> {
  return [...cfg.parentCols, ...(cfg.jsonCols || [])];
}

/** 父表行 → 前端 camel 对象（各子行组装回对应数组，这是「接口形状不变」的关键一步） */
function parentToApi(cfg: ParentChildConfig, row: any, childMap: Map<string, Map<string, any[]>>) {
  const out: any = { id: row.id };
  for (const [snake, camel] of allParentCols(cfg)) {
    if (row[snake] === undefined || row[snake] === null) continue;
    // ★ JSON 文本列要解回**原值**（数组或对象）。
    //   这里**不能**用 parseJsonArray —— 那个会把任何非数组一律落成 `[]`，
    //   而父表 jsonCols 里除了字符串数组（team / interestProducts），
    //   还有**对象**（customFields）。详见 JsonArrayCol 注释。
    if (parentJsonSet(cfg).has(camel)) {
      const parsed = parseJsonValue(row[snake]);
      // 保持「没配 → 不出现该字段」而不是「给了个 undefined」
      if (parsed !== undefined) out[camel] = parsed;
    } else {
      out[camel] = row[snake];
    }
  }
  for (const spec of cfg.children) {
    // 两层 Map：外层按子表名、内层按父 id。少解一层就会把「该表全部父行的子行」
    // 当成「本父行的子行」，表现为所有记录都显示同一批明细 —— 比空值更难发现。
    const rows = childMap.get(childTableKey(spec))?.get(String(row.id)) || [];
    out[spec.childField] = rows.map((r) => childToApi(spec, r));
  }
  return out;
}

/** 一张子表在其 map 里的键（多子表时必须区分表，不能只用 parentId） */
function childTableKey(spec: ChildSpec) {
  return spec.childTable;
}

/**
 * **父表**的 JSON 文本列集合（从 config 即时派生，纯函数，不依赖任何可变全局）。
 *
 * ★ 为什么必须是纯函数（DB-001 修复）：
 *   旧实现用 module 级可变全局 `let jsonCols`，每次请求入口 `collectJsonCols(cfg)`
 *   重写它。Cloudflare Workers 同进程并发请求共享该全局，请求 A 的 JSON 列集会被
 *   请求 B 覆盖，导致 A 的数组/对象字段被当成普通列裸绑定给 D1 → D1_TYPE_ERROR 500
 *   （即「并发创建项目/采购/意向客户报 500」的真因）。
 *   改成「每个请求只从自己的 cfg 派生一份 Set」，彻底消除并发污染。
 *
 * ★ 只管父表。子表的 JSON 列由 childJsonSet(spec) 按需计算 ——
 *   两者刻意不共用同一个 Set：父子表的列名可能重名（如都有 `conditions`），
 *   混在一起会让「父表的字段被当子表 JSON 处理」或反之，且这种错很难看出来。
 */
function parentJsonSet(cfg: ParentChildConfig): Set<string> {
  return new Set((cfg.jsonCols || []).map(([, camel]) => camel));
}

/**
 * 读回**任意** JSON 文本列（数组 / 对象 / 标量皆可）—— **父表与子表共用**。
 *
 * ★ V3.11.0 之前这里分成两个函数：父表用 `parseJsonArray`（非数组一律落成
 * `[]`）、子表用本函数。那个分叉本身就是缺陷 —— 父表 jsonCols 一旦出现
 * 对象（采购域的 customFields），读回就必然是 `[]`，且不报错。
 * 现在父表也走本函数，`parseJsonArray` 已删除。
 *
 * 取不到时返回 undefined（而非 `[]`），让上层能区分
 * 「这一行本来就没这个值」与「值是个空数组 / 空对象」。
 */
function parseJsonValue(v: any): any {
  if (v === null || v === undefined) return undefined;
  if (typeof v !== 'string') return v;
  if (!v.trim()) return undefined;
  try {
    return JSON.parse(v);
  } catch {
    return undefined;
  }
}

/**
 * 任意值 → JSON 文本，**父表与子表共用**。
 *
 * ★ 为什么不是「数组 → JSON、非数组 → `[]`」（这是踩过一次的设计缺陷）──
 * 最初这里叫 `toJsonText`，写死「不是数组就落成 `[]`」，理由是「父表 jsonCols
 * 只装字符串数组」。这个前提在采购域被打破了：`PurchaseRequest.customFields`
 * 是 **Record<string, unknown>（对象）**，不是数组。
 * 后果与审批流子表的 conditions 完全同构、但方向相反 ——
 * 那份 `{costCenter:'CC-PROD-01', budgetYear:'2026'}` 会被静默写成 `[]`：
 * **保存成功、返回 201、界面无异常，重进页面自定义字段全空。**
 *
 * 正确做法是「原样序列化」：数组还是数组、对象还是对象。
 * 「非数组一律落成 `[]`」这条规则本身就不该存在 ——
 * 它把「类型不符合预期」这个**应该被看见**的情况，静默转换成了「一个合法的空数组」。
 * 读回侧同理（见 parseJsonValue），两端都不再擅自改写类型。
 *
 * 唯一的例外是 `undefined` / 函数等无法序列化的值，此时落成 `null`
 * （而不是 `[]`）—— `null` 表示「没有值」，语义上比「一个空数组」诚实得多。
 */
function toJsonValue(v: any): string {
  try {
    const s = JSON.stringify(v ?? null);
    return s === undefined ? 'null' : s;
  } catch {
    return 'null';
  }
}

/** 按 cols 取值并按是否 JSON 列决定序列化方式（父表 / 子表共用同一套判断） */
function pickCols(cols: Array<[string, string]>, obj: any, jsonSet: Set<string>) {
  const names: string[] = [];
  const vals: any[] = [];
  for (const [snake, camel] of cols) {
    if (obj[camel] !== undefined) {
      const raw = obj[camel];
      names.push(snake);
      // JSON 文本列：数组/对象 → 字符串（漏了这步会把数组写进 TEXT，存成 `a,b` 逗号串）
      vals.push(raw === null ? null : jsonSet.has(camel) ? toJsonValue(raw) : raw);
    }
  }
  return { names, vals };
}

/** 子表行取值：JSON 列走 toJsonValue（不强制数组，见其注释） */
function pickChildCols(spec: ChildSpec, obj: any) {
  const jset = childJsonSet(spec);
  const names: string[] = [];
  const vals: any[] = [];
  for (const [snake, camel] of allChildCols(spec)) {
    if (obj[camel] === undefined) continue;
    const raw = obj[camel];
    names.push(snake);
    vals.push(raw === null ? null : jset.has(camel) ? toJsonValue(raw) : raw);
  }
  return { names, vals };
}

/**
 * 取本页全部父行的子行（**每张子表一条 IN 查询**，避免 N+1 拖垮边缘函数）。
 * 返回 Map<子表名, Map<父id, 子行[]>>。
 */
async function loadChildren(
  DB: any,
  cfg: ParentChildConfig,
  parentIds: string[]
): Promise<Map<string, Map<string, any[]>>> {
  const out = new Map<string, Map<string, any[]>>();
  if (parentIds.length === 0) return out;
  const ph = parentIds.map(() => '?').join(',');
  for (const spec of cfg.children) {
    const res = await DB.prepare(
      `SELECT * FROM ${spec.childTable} WHERE ${spec.childFkCol} IN (${ph}) ORDER BY ${spec.childOrder}`
    )
      .bind(...parentIds)
      .all();
    const map = new Map<string, any[]>();
    for (const r of res.results || []) {
      const key = String((r as any)[spec.childFkCol]);
      const list = map.get(key) || [];
      list.push(r);
      map.set(key, list);
    }
    out.set(childTableKey(spec), map);
  }
  return out;
}

/**
 * 构建「整体替换**一张**子表」的语句数组（先删后插，**不立即执行**）。
 *
 * 返回语句数组，由调用方统一并入父表语句做**单一原子批次**提交（DB-002 修复）：
 * 父表 INSERT/UPDATE 与子表 DELETE+INSERT 要么全成、要么全回滚，绝不留下
 * 「父行已建、子行只插一半」或「旧子行已删、新子行没插」的残缺状态。
 */
async function replaceChildrenStmts(DB: any, spec: ChildSpec, parentId: string, arr: any[], orgId: string): Promise<any[]> {
  const stmts: any[] = [
    DB.prepare(`DELETE FROM ${spec.childTable} WHERE ${spec.childFkCol} = ?`).bind(parentId),
  ];
  // ★ V3.56.0 G3：子表若带组织隔离列 org_id（如 fin_invoice_items，迁移 0083 定义
  //   `org_id TEXT NOT NULL`），写入时必须与父行同一组织；否则三单匹配按 `org_id = ?`
  //   取明细会读不到，且 NOT NULL 直接 500。其余子表（付款计划/项目核算等）按
  //   「从属父表、不重复存 org_id」约定本就没有该列，按真实列存在与否条件注入，零行为变化。
  const childCols = await presentCols(DB, spec.childTable);
  const hasOrg = childCols.has('org_id');
  const orgPrefix = hasOrg ? ', org_id' : '';
  const orgBind = hasOrg ? ', ?' : '';
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    // 子表用 pickChildCols：其 JSON 列可能是对象（conditions / skipRule / escalation）
    const { names, vals } = pickChildCols(spec, item);
    const childId = item.id ? String(item.id) : uid('ci');
    stmts.push(
      DB.prepare(
        `INSERT INTO ${spec.childTable} (id, ${spec.childFkCol}${orgPrefix}${names.length ? ', ' + names.join(',') : ''}) VALUES (?, ?${orgBind}${names
          .map(() => ', ?')
          .join('')})`
      ).bind(childId, parentId, ...(hasOrg ? [orgId] : []), ...vals)
    );
  }
  return stmts;
}

/**
 * 构建「替换**所有**被显式传入的子表」的语句数组（**不立即执行**）。
 *
 * ★ 语义不变量（与单子表时代完全一致，只是现在逐张判断）：
 *   某子数组**不传** → 该子表保持原样（不产生任何语句，原数据完好保留）；
 *   传 `[]` → 清空该子表（产生 DELETE 语句，删除全部原行）。
 *   多子表下这条更重要：项目详情页可能只改里程碑，若把「没传 exceptions」
 *   当成清空，一次改里程碑就会把全部异常记录删掉。
 *
 * **绝不**把「不传」当清空 —— 不传的子数组不会被 push 进 stmts。
 *
 * @returns stmts 待执行语句数组（每张被传入的子表产生 DELETE + 若干 INSERT）
 *          parts  中文摘要（每张被传入的子表一行，如 `milestones 3 行`）
 */
async function replaceAllChildrenStmts(
  DB: any,
  cfg: ParentChildConfig,
  parentId: string,
  body: any,
  orgId: string
): Promise<{ stmts: any[]; parts: string[] }> {
  const stmts: any[] = [];
  const parts: string[] = [];
  for (const spec of cfg.children) {
    if (!Array.isArray(body[spec.childField])) continue;
    stmts.push(...(await replaceChildrenStmts(DB, spec, parentId, body[spec.childField], orgId)));
    parts.push(`${spec.childField} ${(body[spec.childField] as any[]).length} 行`);
  }
  return { stmts, parts };
}

// ─────────────────────────── GET 列表 ───────────────────────────
export async function pcList(cfg: ParentChildConfig, context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50', 10)));
  const offset = (page - 1) * pageSize;
  const keyword = safeKeyword(url.searchParams.get('keyword'));

  const where: string[] = ['org_id = ?'];
  const args: any[] = [user.org_id];
  const rls = rlsCondition(user, cfg.parentTable);
  if (rls.clause !== '1=1') {
    where.push(rls.clause);
    args.push(...rls.params);
  }
  if (keyword && cfg.parentCols.length) {
    const kw = likePattern(keyword);
    // keyword 只搜普通业务列：JSON 文本列里存的是 `["张","李"]`，
    // 对其做 LIKE 会匹配到括号引号本身（搜「张」能中、搜「张,李」也能中），
    // 语义混乱且无价值，因此刻意不纳入搜索范围。
    where.push('(' + cfg.parentCols.map(([s]) => `${s} LIKE ? ESCAPE '\\'`).join(' OR ') + ')');
    cfg.parentCols.forEach(() => args.push(kw));
  }
  const clause = where.join(' AND ');

  const rows = await env.DB.prepare(
    `SELECT * FROM ${cfg.parentTable} WHERE ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...args, pageSize, offset)
    .all();
  const parents = rows.results || [];

  const childMap = await loadChildren(
    env.DB,
    cfg,
    parents.map((p: any) => p.id)
  );

  const data = parents.map((p: any) => parentToApi(cfg, p, childMap));
  const cnt: any = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM ${cfg.parentTable} WHERE ${clause}`)
    .bind(...args)
    .first();
  const total = cnt?.cnt || 0;

  return json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

// ─────────────────────────── POST 创建 ───────────────────────────
export async function pcCreate(cfg: ParentChildConfig, context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  // P0-1 越权写根治：登录 ≠ 有写权。无 module 授权（默认 ?? false）直接 403，
  // 与 9 个平表写端点的 guardOperation 完全同一口径，绕开界面直调接口也拦得住。
  const forbidden = await guardOperation(user, cfg.module, 'create', env.DB, user.org_id);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => ({}));
  const invalid = validateOrReject(cfg.parentTable, body);
  if (invalid) return invalid;

  // #10 幂等键：客户端可带 `Idempotency-Key` 请求头（或 body.idempotencyKey）。
  // 命中登记 = 本次是重复提交（双击保存 / 网络重试），直接回传上一次结果，不再建单。
  // ★ 不带键时完全不启用，老客户端行为零变化；幂等键表尚未部署迁移时查表失败也放行（fail-open）。
  const idemKey = resolveIdemKey(request, body);
  if (idemKey) {
    const hit = await findIdem(env.DB, user.org_id, idemKey);
    if (hit) {
      const prev = await env.DB.prepare(`SELECT * FROM ${cfg.parentTable} WHERE id = ? AND org_id = ?`)
        .bind(hit.resultId, user.org_id)
        .first()
        .catch(() => null);
      if (prev) {
        const prevChildren = await loadChildren(env.DB, cfg, [hit.resultId]);
        return json({ ...(parentToApi(cfg, prev, prevChildren) as any), idempotentReplay: true }, 200);
      }
    }
  }

  // V3.93.0：声明了 noDocType 的父表，前端未传单号时由服务端 D1 权威取号
  // （numbering_rules 内原子自增，多终端不再漂移撞号）；已传则保持既有查重。
  if (cfg.noDocType && !body[cfg.noCamel]) {
    const no = await nextDocNo(env.DB, user.org_id, cfg.noDocType);
    if (!no) {
      return json(
        {
          error: `无法生成${cfg.label}编号（编号规则不可用），请刷新后重试或手工填写编号`,
          code: 'NO_NUMBERING',
        },
        503,
      );
    }
    body[cfg.noCamel] = no;
  }

  const id = body.id ? String(body.id) : uid('pc');
  const now = new Date().toISOString();
  const { names, vals } = pickCols(allParentCols(cfg), body, parentJsonSet(cfg));

  // 空载荷守卫（V3.15.10）：请求体里没有任一可识别的业务字段时，下面拼出的 INSERT
  // 会变成 `(id, org_id, , created_at, ...)` 双逗号畸形语句 → D1 报 near "," 语法错，
  // 端点因此 500 并把数据库原始错误回显给前端。这里提前拦成 400，既避免脏数据也避免信息泄露。
  if (!names.length) {
    return json(
      { error: `请填写${cfg.label}内容后再提交（未识别到任何有效字段）`, code: 'EMPTY_PAYLOAD' },
      400,
    );
  }

  const _cols = await presentCols(env.DB, cfg.parentTable);
  const _userName = user.name || user.username || user.id;
  const audit = auditCols(
    _cols,
    ['created_at', 'updated_at', 'created_by', 'updated_by', 'created_by_name', 'updated_by_name'],
    now,
    user.id,
    _userName,
  );

  // V3.58.0 修复 S-16：父表若有 owner_id 列（sales_prospects / shipments / projects 等登记为
  // RLS 'own' 的表），建单必须写入 user.id，否则 owner_id 全 NULL → 行级权限
  // 「只看本人」失效、方向 fail-open（销售员可改/删他人单据）。
  // 与 auditCols 同一思路：先探测列是否存在再写，避免给没有该列的表强写而 500。
  const hasOwnerId = _cols.has('owner_id');

  // 父表 INSERT 语句（先构建，不立即执行 —— 与子表语句合并成单一原子批次）
  const parentStmt = env.DB.prepare(
    `INSERT INTO ${cfg.parentTable} (id, org_id, ${names.join(',')}${
      hasOwnerId ? ', owner_id' : ''
    }${
      audit.names.length ? ', ' + audit.names.join(',') : ''
    }) VALUES (?, ?${names.length ? ', ' + names.map(() => '?').join(',') : ''}${
      hasOwnerId ? ', ?' : ''
    }${
      audit.vals.length ? ', ' + audit.vals.map(() => '?').join(',') : ''
    })`
  ).bind(id, user.org_id, ...vals, ...(hasOwnerId ? [user.id] : []), ...audit.vals);

  // 子表语句（先构建，不立即执行）：DELETE + INSERT 各被传入的子数组
  const { stmts: childStmts, parts: childParts } = await replaceAllChildrenStmts(env.DB, cfg, id, body, user.org_id);
  const childInfo = childParts.length ? childParts.join('、') : '未改动';

  try {
    // 单一原子批次：父表 INSERT 与子表写入要么全成、要么全回滚（DB-002 修复）
    // UNIQUE 冲突（父表单号或子表唯一键）是业务错误，给可读中文原因而非 500
    await env.DB.batch([parentStmt, ...childStmts]);
  } catch (e: any) {
    if (String(e?.message || '').includes('UNIQUE')) {
      return json({ error: `创建失败：${cfg.label}编号 ${body[cfg.noCamel] || ''} 在本组织已存在，请换一个编号或改为修改原有记录` }, 409);
    }
    // 数据库原始错误（含 SQL 片段、表名、列名）只进平台日志，不回显给前端——
    // 此前 9 个端点会把 `D1_ERROR: near "," syntax error` 原样返回，等于把库结构泄露出去。
    console.error(`[pcCreate] 创建${cfg.label}失败：`, e?.message || e);
    return json({ error: `创建${cfg.label}失败，请稍后重试或联系管理员`, code: 'INTERNAL' }, 500);
  }

  await writeAudit(env.DB, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: cfg.parentTable,
    entityId: id,
    action: 'create',
    summary: `创建${cfg.label} ${body[cfg.noCamel] || id}（明细 ${childInfo}）`,
  });

  // #10 幂等键登记：建单成功后把 (org_id, 键) → 结果 id 记下来，供后续重复提交命中回放。
  if (idemKey) await saveIdem(env.DB, user.org_id, idemKey, cfg.parentTable, id);

  const created = await env.DB.prepare(`SELECT * FROM ${cfg.parentTable} WHERE id = ? AND org_id = ?`)
    .bind(id, user.org_id)
    .first();
  const childMap = await loadChildren(env.DB, cfg, [id]);
  return json(parentToApi(cfg, created, childMap), 201);
}

// ─────────────────────────── GET 单条 ───────────────────────────
export async function pcGet(cfg: ParentChildConfig, context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const id = context.params.id;
  const row = await context.env.DB.prepare(`SELECT * FROM ${cfg.parentTable} WHERE id = ? AND org_id = ?`)
    .bind(id, user.org_id)
    .first();
  if (!row) return json({ error: `${cfg.label}不存在` }, 404);

  const childMap = await loadChildren(context.env.DB, cfg, [id]);
  return json(parentToApi(cfg, row, childMap));
}

// ─────────────────────────── PUT 更新 ───────────────────────────
export async function pcUpdate(cfg: ParentChildConfig, context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  // P0-1 越权写根治：改单（含改状态/改子表明细）同样需要 update 权限
  const forbidden = await guardOperation(user, cfg.module, 'update', context.env.DB, user.org_id);
  if (forbidden) return forbidden;

  const DB = context.env.DB;
  const id = context.params.id;
  const existing: any = await DB.prepare(`SELECT * FROM ${cfg.parentTable} WHERE id = ? AND org_id = ?`)
    .bind(id, user.org_id)
    .first();
  if (!existing) return json({ error: `${cfg.label}不存在` }, 404);

  const body = await context.request.json().catch(() => ({}));
  // ★ V3.87.0 扩面配套：局部更新走 partial 语义（传了才验、没传放行），
  //   与 V3.86.0 手写 PUT 端点同款处理。否则登记 approval_flows 等配置表后，
  //   只传单字段的审批流更新会被必填埋成 400（链式回归）。
  const invalid = validateOrReject(cfg.parentTable, body, { partial: true });
  if (invalid) return invalid;

  const now = new Date().toISOString();
  const { names, vals } = pickCols(allParentCols(cfg), body, parentJsonSet(cfg));

  // #10 乐观锁：父子框架统一做并发保护（与单表单据端点同一套语义）。
  //   「携带 version 才比对」——被他人改过即 409；不传 version 保持旧行为（老客户端兼容）。
  //   ★ 版本条件放在提交前**预检**而非 batch 内：existing 已整行读出（含 version），
  //     且子表写入必须与父表更新同批原子提交（见文件头不变量②），
  //     故保留 batch 原样、只在提交前判断版本，避免为加锁而破坏原子性。
  const lockable = !VERSION_IS_BUSINESS_FIELD.has(cfg.parentTable);
  if (lockable) {
    const incoming = (body as any)?.version;
    if (incoming !== undefined && incoming !== null && Number.isFinite(Number(incoming))) {
      const cur = Number((existing as any).version ?? 1);
      if (Number(incoming) !== cur) {
        return json(
          {
            error: `该${cfg.label}已被其他人修改，请刷新后重新编辑`,
            code: 'VERSION_CONFLICT',
            currentVersion: cur,
            yourVersion: Number(incoming),
          },
          409
        );
      }
    }
    // body 里的 version 不参与「字段级更新」（由框架自增维护），剔除以免写成客户端传的旧值
    const vi = names.indexOf('version');
    if (vi >= 0) { names.splice(vi, 1); vals.splice(vi, 1); }
  }

  // 待统一提交的语句（父表 UPDATE + 子表 DELETE/INSERT），先收集、最后一次性 batch
  const stmts: any[] = [];

  // 只更新传了的字段；一个都没传就跳过 UPDATE（避免「只改时间戳」的空更新）
  if (names.length > 0) {
    // 审计列同样按真实列存在与否追加（fin_payment_plans 无 updated_by，见 auditCols 注释）
    // V3.71.0：修改人姓名快照在 update 时一并刷新（updated_by_name = 当前操作人）
    const _uName = user.name || user.username || user.id;
    const audit = auditCols(
      await presentCols(DB, cfg.parentTable),
      ['updated_at', 'updated_by', 'updated_by_name'],
      now,
      user.id,
      _uName,
    );
    const setClauses = [
      ...names.map((n) => `${n} = ?`),
      ...audit.names.map((n) => `${n} = ?`),
    ];
    // #10 乐观锁：父表更新时版本号自增，供下一次并发比对（业务版本字段表除外）
    if (lockable) setClauses.push('version = version + 1');
    stmts.push(
      DB.prepare(
        `UPDATE ${cfg.parentTable} SET ${setClauses.join(', ')} WHERE id = ? AND org_id = ?`
      ).bind(...vals, ...audit.vals, id, user.org_id)
    );
  }

  // 子表语句（不立即执行）：传入的子数组产生 DELETE + INSERT，不传则跳过（保持原样）
  const { stmts: childStmts, parts: childParts } = await replaceAllChildrenStmts(DB, cfg, id, body, user.org_id);

  // 既无父表字段改动、也无子数组传入 → 跳过 batch（无操作），避免空批次
  if (stmts.length > 0 || childStmts.length > 0) {
    try {
      // 单一原子批次：父表 UPDATE 与子表写入要么全成、要么全回滚（DB-002 修复）
      await DB.batch([...stmts, ...childStmts]);
    } catch (e: any) {
      if (String(e?.message || '').includes('UNIQUE')) {
        return json({ error: `更新失败：${cfg.label}编号 ${body[cfg.noCamel] || ''} 在本组织已存在` }, 409);
      }
      return json({ error: `更新${cfg.label}失败：${e?.message || '未知错误'}` }, 500);
    }
  }

  const childInfo = childParts.length ? childParts.join('、') : '未改动';

  await writeAudit(DB, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: cfg.parentTable,
    entityId: id,
    action: 'update',
    summary:
      `更新${cfg.label} ${existing[cfg.noSnake] || id}` +
      `（改动字段：${names.length > 0 ? names.join('、') : '无'}）` +
      `（明细：${childInfo}）`,
  });

  const updated = await DB.prepare(`SELECT * FROM ${cfg.parentTable} WHERE id = ? AND org_id = ?`)
    .bind(id, user.org_id)
    .first();
  const childMap = await loadChildren(DB, cfg, [id]);
  return json(parentToApi(cfg, updated, childMap));
}

// ─────────────────────────── DELETE 删除 ───────────────────────────
export async function pcRemove(cfg: ParentChildConfig, context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  // P0-1 越权写根治：删除是最高危操作（连带子表删光），必须有 delete 权限
  const forbidden = await guardOperation(user, cfg.module, 'delete', context.env.DB, user.org_id);
  if (forbidden) return forbidden;

  const DB = context.env.DB;
  const id = context.params.id;
  const existing: any = await DB.prepare(`SELECT * FROM ${cfg.parentTable} WHERE id = ? AND org_id = ?`)
    .bind(id, user.org_id)
    .first();
  if (!existing) return json({ error: `${cfg.label}不存在` }, 404);

  // 删除前先数子行：「删掉一个带 8 个里程碑、3 条异常的项目」与「删掉空项目」
  // 后果完全不同，只记单号不足以事后追责。多子表逐张数。
  const detailParts: string[] = [];
  let firstChildCount: number | undefined;
  for (const spec of cfg.children) {
    const cnt: any = await DB.prepare(
      `SELECT COUNT(*) as c FROM ${spec.childTable} WHERE ${spec.childFkCol} = ?`
    )
      .bind(id)
      .first();
    const n = cnt?.c || 0;
    if (firstChildCount === undefined) firstChildCount = n;
    detailParts.push(`${spec.childField} ${n} 行`);
  }
  const childSummary = detailParts.join('、') || '无子表';

  // 显式删子表：迁移虽声明 ON DELETE CASCADE，但运行时连接的 foreign_keys 未必开启，
  // 不显式删会留下孤儿子行污染统计（与 BOM 端点同款处理）
  const stmts: any[] = [
    DB.prepare(`DELETE FROM ${cfg.parentTable} WHERE id = ? AND org_id = ?`).bind(id, user.org_id),
  ];
  for (const spec of cfg.children) {
    stmts.push(DB.prepare(`DELETE FROM ${spec.childTable} WHERE ${spec.childFkCol} = ?`).bind(id));
  }
  await DB.batch(stmts);

  await writeAudit(DB, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: cfg.parentTable,
    entityId: id,
    action: 'delete',
    summary: `删除${cfg.label} ${existing[cfg.noSnake] || id}（连带删除 ${childSummary}）`,
  });

  return json({
    success: true,
    // ★ 兼容字段（单子表时代的契约）：老套件与老前端读的是 deletedChildren（数字）。
    //   多子表后「几行」不再是一个数字，故新增 deletedDetail（中文摘要，可读）。
    //   两个字段同时返回：删掉旧的会让 19-finance-domain 直接变红，而它守的
    //   「删除必须报告连带行数」这条不变量本身仍然有效，不该被改套件绕过。
    deletedChildren: cfg.children.length === 1 ? firstChildCount : undefined,
    deletedDetail: childSummary,
  });
}
