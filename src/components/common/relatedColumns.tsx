// 上下游关联列工厂（V3.113.0 新增）
// 一行代码给任意单据列表加上「上游单号」「下游单号」两列：
//   - 默认 meta.searchable=true → 自动进入 FilterBar 检索条（隐藏也能筛，满足"筛选必须能查到"）
//   - 单元格渲染为可点击链接（RelatedDocLinks），跳转到对应单据详情
//   - 默认不显示：列表页给 DataTable 传 hiddenColumns={['upstreamNo','downstreamNo']} 即可隐藏（用户可在列设置里释放）
//
// 用法（列表页）：
//   const columns = useMemo(() => [
//     ...baseColumns,
//     ...(buildRelatedColumns() as ColumnDef<RowType, unknown>[]),
//   ], [baseColumns]);
//   const data = useMemo(() => withRelatedDocNos('purchaseRequest', rawRows), [rawRows]);
//   <DataTable columns={columns} data={data} hiddenColumns={['upstreamNo','downstreamNo']} ... />

import { type ColumnDef } from '@tanstack/react-table';
import RelatedDocLinks from './RelatedDocLinks';
import type { RelatedDocRef } from '@/utils/relations/documentRelations';

/** 行增强后的类型（withRelatedDocNos 会给每行附加这 4 个字段） */
export interface WithRelatedRow {
  upstreamNo: string;
  upstreamDocs: RelatedDocRef[];
  downstreamNo: string;
  downstreamDocs: RelatedDocRef[];
}

/**
 * 生成「上游单号 / 下游单号」两列。返回 any 列以便各列表页按自身行类型 cast。
 */
export function buildRelatedColumns(): ColumnDef<any, unknown>[] {
  return [
    {
      id: 'upstreamNo',
      accessorKey: 'upstreamNo',
      header: '上游单号',
      meta: { searchable: true, filterType: 'text' },
      cell: ({ row }) => {
        const upstreamDocs = (row.original as WithRelatedRow).upstreamDocs ?? [];
        return <RelatedDocLinks docs={upstreamDocs} />;
      },
    },
    {
      id: 'downstreamNo',
      accessorKey: 'downstreamNo',
      header: '下游单号',
      meta: { searchable: true, filterType: 'text' },
      cell: ({ row }) => {
        const downstreamDocs = (row.original as WithRelatedRow).downstreamDocs ?? [];
        return <RelatedDocLinks docs={downstreamDocs} />;
      },
    },
  ];
}
