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
