// 单据上下游关联 · 纯逻辑模块（V3.113.0 新增）
// 本文件不 import 任何 store，便于单元测试直接复用、不被 30 个 store 的副作用拖垮。
// 真实数据（每种单据的 store / 上下游关系 / 路由）由 relations.ts 在运行时填充进这里的空表。
//
// 关键设计（零侵入现有筛选/筛选用具）：
//   下游单号数据库没存，是"反向查谁以本单为来源"算出来的。withRelatedDocNos 给每一行预计算
//   upstreamNo/upstreamDocs/downstreamNo/downstreamDocs 四个字段，使它们"真实存在于数据行上"，
//   从而 DataTable.hiddenColumns 能隐藏、meta.searchable 能进筛选条、applyColumnFilters 能筛。

import { DOC_SOURCES } from './docSources';
export { DOC_SOURCES };

/** 单条关联引用（用于详情页/列表单元格渲染可点击链接） */
export interface RelatedDocRef {
  /** 目标单据类型（对应 DOC_RELATIONS / DOC_ROUTES / DOC_SOURCES 的 key） */
  type: string;
  /** 目标单据编号 */
  no: string;
}

/** 某单据类型的上下游关系登记 */
export interface DocRelation {
  /** 本单据的编号字段名（默认 'no'） */
  numberField?: string;
  /** 上游：本单据上记录"来源单号"的字段名 + 该字段指向的目标单据类型（简单单值场景） */
  upstream?: { field: string; target: string };
  /** 上游：动态解析（部分单据指向谁取决于自身 type / 用 id 而非编号）。返回数组以支持多来源 */
  upstreamResolver?: (row: any) => RelatedDocRef[];
  /** 下游：由本单据生成的下级单据（反向：目标单据的 linkField 等于本单某字段）。
   *  matchField 指定"用本单哪个字段去比"（默认 numberField 即编号）；
   *  当子单的关联字段存的是本单 id（如 sourceRequestIds）时，须显式 matchField:'id'。 */
  downstream?: Array<{ target: string; linkField: string; matchField?: string }>;
}

/** 各单据类型 → 上下游关系登记表（由 relations.ts 运行时填充） */
export const DOC_RELATIONS: Record<string, DocRelation> = {};

/** 各单据类型 → 详情页路由（由 relations.ts 运行时填充） */
export const DOC_ROUTES: Record<string, (id: string) => string> = {};

// ─────────────────────────────────────────────────────────────
// 关系源数据版本签名（V3.113.1）
// 背景：store 未水合时先用前端 mock 初始值算关联，水合完成后若不重算，
//       详情页会残留"基于 mock 的失效单号"，点击 resolveRoute 解析不到 → 死链。
// 方案：给每个关系源的数据数组分配稳定版本号（数组引用被替换 → 版本号变化），
//       签名变化即代表关联数据已更新，驱动详情页重算上下游。
// 纯逻辑实现（不依赖 React / store），便于单测。
// ─────────────────────────────────────────────────────────────

/** 数据数组引用 → 稳定版本号（同一引用恒定同号，被替换后换号） */
const sourceVersionMap = new WeakMap<object, number>();
let sourceVersionSeq = 0;

function versionOf(value: unknown): number {
  if (value == null || typeof value !== 'object') return 0;
  const hit = sourceVersionMap.get(value as object);
  if (hit != null) return hit;
  const next = ++sourceVersionSeq;
  sourceVersionMap.set(value as object, next);
  return next;
}

/**
 * 取一组关系源类型的数据版本签名。
 * @param types 需要纳入的类型（一般为本单类型 + 其上下游目标类型）
 * @returns 字符串签名；签名变化 ⇔ 关联源数据被替换（水合/刷新）
 */
export function getSourcesSignature(types: string[]): string {
  let sig = '';
  for (const t of types) {
    const src = DOC_SOURCES[t];
    if (!src) continue;
    let docs: unknown;
    try {
      docs = src.getDocs();
    } catch {
      docs = null;
    }
    sig += `${t}:${versionOf(docs)};`;
  }
  return sig;
}

/** 把「单据编号」解析成「详情页路由」；找不到则返回 '#' */
export function resolveRoute(type: string, no: string): string {
  const src = DOC_SOURCES[type];
  const id = src
    ? (src.getDocs().find((d) => String(d[src.numberField]) === String(no)) as Record<string, any> | undefined)?.id
    : undefined;
  const route = DOC_ROUTES[type];
  if (route && id != null) return route(String(id));
  return '#';
}

// ─────────────────────────────────────────────────────────────
// 弱语义来源单号 → 目标单据类型推断（V3.113.2）
// 背景：财务域部分字段（如资金流水的 relatedDoc）是"自由文本单号"，
//       前缀混用（INV-/PO-/SI-/FR-），无法从字段名直接得知目标类型。
//       本函数按前缀推断候选类型，并且**必须能在该类型的真实数据里查到该单号**，
//       否则返回空数组 —— 宁可不给链接，也不给点不动的死链。
// ─────────────────────────────────────────────────────────────

/** 自由文本单号前缀 → 候选目标单据类型（按优先级排列） */
const PREFIX_TARGETS: Array<{ prefix: string; types: string[] }> = [
  { prefix: 'INV', types: ['finInvoice', 'salesInvoice'] },
  { prefix: 'SI', types: ['salesInvoice'] },
  { prefix: 'FP', types: ['salesInvoice'] },
  { prefix: 'PO', types: ['purchaseOrder'] },
  { prefix: 'PI', types: ['finInvoice'] },
  { prefix: 'AR', types: ['receivable'] },
  { prefix: 'AP', types: ['payable'] },
  { prefix: 'SO', types: ['salesOrder'] },
  { prefix: 'IN', types: ['inbound'] },
  { prefix: 'OUT', types: ['outbound'] },
];

/**
 * 推断自由文本单号指向的目标单据类型，并校验该单号在目标源里真实存在。
 * @returns 命中且能解析出路由的引用；无命中返回空数组（避免死链）
 */
export function inferRelatedRefByNo(no: string | null | undefined): RelatedDocRef[] {
  const raw = String(no ?? '').trim();
  if (!raw) return [];
  const upper = raw.toUpperCase();
  for (const rule of PREFIX_TARGETS) {
    if (!upper.startsWith(rule.prefix)) continue;
    for (const type of rule.types) {
      const src = DOC_SOURCES[type];
      if (!src) continue;
      const hit = src.getDocs().find((d) => String(d[src.numberField]) === raw);
      if (!hit) continue;
      // 必须能解析出真实路由，否则是死链 → 跳过
      if (resolveRoute(type, raw) === '#') continue;
      return [{ type, no: raw }];
    }
  }
  return [];
}

/**
 * 存在性校验过滤器：只保留「目标单号在目标类型的数据源里真实存在、且能解析出路由」的引用。
 *
 * 背景（V3.113.2 实测）：财务域的来源单号并非都指向同一套编号体系 ——
 *   - 应付/应收存的是业务发票号（PI-* / SI-*），与发票表（INV-*）不同源；
 *   - 凭证从扁平分录派生时 sourceNo 存的是**凭证号自身**（V-PP-* / V-*）。
 * 若按映射表"盲指"，点开必然是死链。故统一用本函数兜底：
 * 解析不出真实目标的引用一律丢弃 —— 宁可少给一个链接，也不给点不动的假链接。
 */
export function pickExistingRefs(candidates: RelatedDocRef[]): RelatedDocRef[] {
  const out: RelatedDocRef[] = [];
  for (const c of candidates) {
    if (!c || !c.type || !c.no) continue;
    const src = DOC_SOURCES[c.type];
    if (!src) continue;
    const hit = src.getDocs().find((d) => String(d[src.numberField]) === String(c.no));
    if (!hit) continue;
    if (resolveRoute(c.type, String(c.no)) === '#') continue;
    out.push(c);
  }
  return out;
}

/**
 * 给数据行批量预计算上下游关联单号。
 * 返回原行 + 4 个增强字段：upstreamNo / upstreamDocs / downstreamNo / downstreamDocs。
 */
export function withRelatedDocNos<T extends Record<string, any>>(
  docType: string,
  rows: T[]
): Array<
  T & {
    upstreamNo: string;
    upstreamDocs: RelatedDocRef[];
    downstreamNo: string;
    downstreamDocs: RelatedDocRef[];
  }
> {
  const rel = DOC_RELATIONS[docType];
  const numberField = rel?.numberField ?? 'no';
  const downTargets = rel?.downstream ?? [];

  return rows.map((row) => {
    // 上游
    let upstreamDocs: RelatedDocRef[] = [];
    if (rel?.upstreamResolver) {
      try {
        upstreamDocs = rel.upstreamResolver(row) ?? [];
      } catch {
        upstreamDocs = [];
      }
    } else if (rel?.upstream) {
      const v = row[rel.upstream.field];
      if (v != null && v !== '') upstreamDocs = [{ type: rel.upstream.target, no: String(v) }];
    }

    // 下游（反向查：目标单据的 linkField 等于本单的某字段；linkField 可能是数组）
    const downstreamDocs: RelatedDocRef[] = [];
    for (const d of downTargets) {
      const src = DOC_SOURCES[d.target];
      if (!src) continue;
      const childDocs = src.getDocs();
      if (!Array.isArray(childDocs)) continue;
      const myRef = row[d.matchField ?? numberField];
      if (myRef == null) continue;
      for (const c of childDocs) {
        const linkVal = c[d.linkField];
        if (linkVal == null) continue;
        const matches = Array.isArray(linkVal)
          ? linkVal.map(String).includes(String(myRef))
          : String(linkVal) === String(myRef);
        if (matches) downstreamDocs.push({ type: d.target, no: String(c[src.numberField]) });
      }
    }

    return {
      ...row,
      upstreamNo: upstreamDocs.map((x) => x.no).join(','),
      upstreamDocs,
      downstreamNo: downstreamDocs.map((x) => x.no).join(','),
      downstreamDocs,
    };
  });
}
