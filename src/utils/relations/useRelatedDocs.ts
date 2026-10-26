// 详情页关联单号计算 hook（V3.113.0 新增）
// 封装「确保关系表已加载(useEnsureRelatedStores) + 计算上下游(withRelatedDocNos)」，
// 详情页一行即可拿到 upstreamDocs / downstreamDocs，直接喂给 <RelatedDocLinks> 渲染可点击链接。
//
// 用法：
//   const rel = useRelatedDocs('inbound', order);
//   <RelatedDocLinks docs={rel?.upstreamDocs} />
//   <RelatedDocLinks docs={rel?.downstreamDocs} />
//
// 注意：本文件 import useEnsureRelatedStores，其模块顶层静态 import relations.ts，
// 因此加载本 hook 时 DOC_RELATIONS / DOC_SOURCES 已同步填充，首帧即可正确解析。

import { useMemo } from 'react';
import { useEnsureRelatedStores } from './useEnsureRelatedStores';
import { withRelatedDocNos, type RelatedDocRef } from './documentRelations';

export interface RelatedDocsResult {
  upstreamNo: string;
  upstreamDocs: RelatedDocRef[];
  downstreamNo: string;
  downstreamDocs: RelatedDocRef[];
}

/** 详情页调用：返回当前单据的上下游关联引用（数据为空时返回 null） */
export function useRelatedDocs<T extends Record<string, any>>(
  docType: string,
  data: T | undefined | null
): RelatedDocsResult | null {
  useEnsureRelatedStores(docType);
  return useMemo(
    () => (data ? (withRelatedDocNos(docType, [data])[0] as unknown as RelatedDocsResult) : null),
    [docType, data]
  );
}
