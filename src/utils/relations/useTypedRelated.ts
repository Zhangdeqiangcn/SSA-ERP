// 列表页「关联单据」统一接入钩子（V3.115.0 新增）
// ─────────────────────────────────────────────────────────────────────────────
// 解决的问题：每个单据列表都要显示"这张单关联了哪些别的单 + 它们现在什么状态 + 点了能打开"。
//   若各页各写一遍，必然出现口径漂移（某页显示状态、某页不显示；某页能点、某页点不动）。
//   故封装为单一入口：给单据类型 + 原始行，一次拿到
//     · data          —— 已摊平关联检索字段的行（喂给 DataTable）
//     · columns       —— 按实际单据类型分列的关联列（列头就是单据名）
//     · hiddenColumns —— 默认隐藏清单（本版本为空：关联列默认就要可见）
//     · filterColumns —— 含关联列的完整列清单（喂给 applyColumnFilters / FilterBar）
//
// 用法（列表页三行接入）：
//   const rel = useTypedRelated('inbound', inboundOrders);
//   const allColumns = useMemo(() => [...baseColumns, ...rel.columns], [rel.columns]);
//   const filteredData = useMemo(
//     () => applyColumnFilters(rel.data, allColumns, filterData, { module: 'warehouse' }),
//     [rel.data, allColumns, filterData]
//   );
//   <DataTable data={filteredData} columns={allColumns} hiddenColumns={rel.hiddenColumns} />
//
// 注意：调用前请确保数据已用 useEnsureRelatedStores(docType) 触发关系表加载，
//       否则 DOC_SOURCES 为空 → 关联列全空（不是 bug，是数据未就绪）。

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { withRelatedDocNos, type RelatedDocRef } from './documentRelations';
import { buildTypedRelatedColumns, type TypedRelatedOptions } from '@/components/common/relatedColumns';

/** 行上附加的 4 个关联字段（withRelatedDocNos 产出） */
export interface RelatedFields {
  upstreamNo: string;
  upstreamDocs: RelatedDocRef[];
  downstreamNo: string;
  downstreamDocs: RelatedDocRef[];
}

export interface TypedRelatedResult<T> {
  /** 已摊平 relUp_<type> / relDown_<type> 检索字段的行 */
  data: Array<T & RelatedFields & Record<string, string>>;
  /** 关联列（每类单据一列，列头 = 单据中文名） */
  columns: ColumnDef<any, unknown>[];
  /** 建议默认隐藏的列（当前为空，关联列默认可见） */
  hiddenColumns: string[];
  /** 关联列 id 清单 */
  relatedColumnIds: string[];
}

/**
 * @param docType 本列表的单据类型（DOC_RELATIONS / DOC_SOURCES 的 key）
 * @param rows    原始行数组（未增强）
 * @param opts    渲染选项（V3.116.0：门户侧用 onDocClick 接管点击，弹门户内只读速览）
 */
export function useTypedRelated<T extends Record<string, any>>(
  docType: string,
  rows: T[],
  opts?: TypedRelatedOptions
): TypedRelatedResult<T> {
  // onDocClick 必须是稳定引用（调用方用 useCallback 包裹），否则每次渲染都会重建列定义，
  // 表格列被判定为"结构变化"→ 丢失列宽/排序状态，体感是表格自己闪一下。
  const onDocClick = opts?.onDocClick;
  const alwaysIncludeTypes = opts?.alwaysIncludeTypes;
  const portalDocTypes = opts?.portalDocTypes;
  // 数组入参归一化为稳定 key，避免调用方每次渲染传字面量数组导致列定义反复重建
  const alwaysKey = (alwaysIncludeTypes ?? []).join(',');
  const portalKey = (portalDocTypes ?? []).join(',');
  return useMemo(() => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const enhanced = withRelatedDocNos(docType, safeRows);
    const rel = buildTypedRelatedColumns(docType, enhanced, {
      onDocClick,
      alwaysIncludeTypes: alwaysKey ? alwaysKey.split(',') : undefined,
      portalDocTypes: portalKey ? portalKey.split(',') : undefined,
    });
    const data = enhanced.map((r) => ({ ...r, ...rel.fieldsOf(r) })) as Array<
      T & RelatedFields & Record<string, string>
    >;
    return {
      data,
      columns: rel.columns,
      hiddenColumns: rel.defaultHidden,
      relatedColumnIds: rel.ids,
    };
  }, [docType, rows, onDocClick, alwaysKey, portalKey]);
}

export default useTypedRelated;
