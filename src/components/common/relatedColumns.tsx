// 上下游关联列工厂（V3.113.0 新增；V3.114.0 改为「按单据类型命名」）
// ─────────────────────────────────────────────────────────────────────────────
// 变更原因（V3.114.0，用户实测反馈）：
//   原来的两列固定叫「上游单号 / 下游单号」，单元格只给一串编号（ASN-DEMO-20261022、
//   IN-DEMO-20261022），看的人得自己猜这是送货单、入库单还是发票。
//   现在：明细里是什么单，列头就写什么单 ——
//     · 默认两列改名「来源单据 / 后续单据」，单元格每项前带单据类型名（如「入库单 IN-…」）
//     · 列表页可改用 buildTypedRelatedColumns()：一种单据一列，列头直接是「采购申请 / 入库单 /
//       采购发票 / 付款计划 …」，且只对数据里真实出现过的单据类型生成列（不铺一排空列）
//
// 用法（列表页，推荐）：
//   const related = useMemo(
//     () => buildTypedRelatedColumns('purchaseOrder', rowsWithDocs),
//     [rowsWithDocs]
//   );
//   const data = useMemo(() => rowsWithDocs.map(r => ({ ...r, ...related.fieldsOf(r) })), [rowsWithDocs]);
//   <DataTable columns={[...base, ...related.columns]} data={data} hiddenColumns={related.defaultHidden} />
//
// 用法（兼容旧写法）：
//   const columns = [...base, ...buildRelatedColumns()];
//   const data = withRelatedDocNos('purchaseRequest', rawRows);

import { type ColumnDef } from '@tanstack/react-table';
import RelatedDocLinks from './RelatedDocLinks';
import {
  DOC_RELATIONS,
  docTypeLabel,
  type RelatedDocRef,
} from '@/utils/relations/documentRelations';

/** 行增强后的类型（withRelatedDocNos 会给每行附加这 4 个字段） */
export interface WithRelatedRow {
  upstreamNo: string;
  upstreamDocs: RelatedDocRef[];
  downstreamNo: string;
  downstreamDocs: RelatedDocRef[];
}

/**
 * 生成「来源单据 / 后续单据」两列（列内每项带单据类型名）。
 * 返回 any 列以便各列表页按自身行类型 cast。
 */
export function buildRelatedColumns(): ColumnDef<any, unknown>[] {
  return [
    {
      id: 'upstreamNo',
      accessorKey: 'upstreamNo',
      header: '来源单据',
      meta: { searchable: true, filterType: 'text' },
      cell: ({ row }) => {
        const docs = (row.original as WithRelatedRow).upstreamDocs ?? [];
        return <RelatedDocLinks docs={docs} showType />;
      },
    },
    {
      id: 'downstreamNo',
      accessorKey: 'downstreamNo',
      header: '后续单据',
      meta: { searchable: true, filterType: 'text' },
      cell: ({ row }) => {
        const docs = (row.original as WithRelatedRow).downstreamDocs ?? [];
        return <RelatedDocLinks docs={docs} showType />;
      },
    },
  ];
}

/** 关联列 id 前缀（单据类型分列时用，避免与其他业务列 id 冲突） */
export const REL_UPSTREAM_PREFIX = 'relUp_';
export const REL_DOWNSTREAM_PREFIX = 'relDown_';

export interface TypedRelatedColumns {
  /** 每种实际出现过的单据类型一列，列头 = 单据中文名 */
  columns: ColumnDef<any, unknown>[];
  /** 把某行的 docs 摊平成 relUp_<type> / relDown_<type> 文本字段（筛选/检索靠它） */
  fieldsOf: (row: Record<string, any>) => Record<string, string>;
  /** 列 id 清单（供 hiddenColumns / 列方案使用） */
  ids: string[];
  /** 默认隐藏的列：全部保留可见（用户要看的正是"这是什么单"），仅作占位返回空数组 */
  defaultHidden: string[];
}

/** 收集一批行里出现过的单据类型（保序：按首次出现顺序） */
function collectTypes(rows: Array<Record<string, any>>, key: 'upstreamDocs' | 'downstreamDocs'): string[] {
  const seen: string[] = [];
  for (const r of rows) {
    const docs = (r?.[key] ?? []) as RelatedDocRef[];
    for (const d of docs) {
      if (d?.type && !seen.includes(d.type)) seen.push(d.type);
    }
  }
  return seen;
}

/**
 * 按「实际出现的单据类型」生成关联列（V3.114.0）。
 *
 * 与 buildRelatedColumns 的区别：
 *   - 一种下游单据一列（入库单 / 采购发票 / 付款计划 各占一列），列头就是单据名；
 *   - 只对数据里真出现过的类型建列，不会铺一排永远空白的列；
 *   - 同时产出 fieldsOf() 把每类单号写成行字段，使筛选条与列检索都能按类型精确查。
 *
 * @param docType 本单据类型（用于读关系登记，决定上游/下游的默认类型集合；当前实现以数据为准，
 *                参数保留以便后续按关系表补"暂时无数据"的类型）
 * @param rows    已用 withRelatedDocNos 增强过的行（必须含 upstreamDocs / downstreamDocs）
 */
export function buildTypedRelatedColumns(
  docType: string,
  rows: Array<Record<string, any>>
): TypedRelatedColumns {
  // 关系表已登记但数据里暂无的类型，仅在「上游」保留一列（上游通常只有一种，空着也比没有强，
  // 让用户知道这张单本该来源于什么）；下游一律按实际数据生成，避免一排空列。
  const rel = DOC_RELATIONS[docType];
  const declaredUpstream = new Set<string>();
  if (rel?.upstream?.target) declaredUpstream.add(rel.upstream.target);
  if (rel?.upstreamResolver && docType === 'purchaseOrder') declaredUpstream.add('purchaseRequest');

  const upTypes = collectTypes(rows, 'upstreamDocs');
  for (const t of declaredUpstream) if (!upTypes.includes(t)) upTypes.push(t);
  const downTypes = collectTypes(rows, 'downstreamDocs');

  const columns: ColumnDef<any, unknown>[] = [];
  const ids: string[] = [];

  const makeColumn = (
    type: string,
    dir: 'upstreamDocs' | 'downstreamDocs',
    idPrefix: string
  ): ColumnDef<any, unknown> => {
    const id = `${idPrefix}${type}`;
    return {
      id,
      accessorKey: id,
      header: docTypeLabel(type),
      meta: { searchable: true, filterType: 'text' },
      cell: ({ row }) => {
        const docs = ((row.original as Record<string, any>)[dir] ?? []) as RelatedDocRef[];
        const mine = docs.filter((d) => d.type === type);
        if (mine.length === 0) return <span style={{ color: '#CBD5E1' }}>-</span>;
        // 列头已表明单据类型，单元格只给单号（保留可点击跳转）
        return <RelatedDocLinks docs={mine} />;
      },
    } as ColumnDef<any, unknown>;
  };

  for (const t of upTypes) {
    const col = makeColumn(t, 'upstreamDocs', REL_UPSTREAM_PREFIX);
    columns.push(col);
    ids.push(String(col.id));
  }
  for (const t of downTypes) {
    const col = makeColumn(t, 'downstreamDocs', REL_DOWNSTREAM_PREFIX);
    columns.push(col);
    ids.push(String(col.id));
  }

  const fieldsOf = (row: Record<string, any>): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const t of upTypes) {
      out[`${REL_UPSTREAM_PREFIX}${t}`] = ((row.upstreamDocs ?? []) as RelatedDocRef[])
        .filter((d) => d.type === t)
        .map((d) => d.no)
        .join(',');
    }
    for (const t of downTypes) {
      out[`${REL_DOWNSTREAM_PREFIX}${t}`] = ((row.downstreamDocs ?? []) as RelatedDocRef[])
        .filter((d) => d.type === t)
        .map((d) => d.no)
        .join(',');
    }
    return out;
  };

  return { columns, fieldsOf, ids, defaultHidden: [] };
}
