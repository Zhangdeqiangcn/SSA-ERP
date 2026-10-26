// 详情页关联单号计算 hook（V3.113.0 新增；V3.113.1 修复水合后不重算）
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
//
// ★ V3.113.1 修复（生产实测暴露）：
//   store 未水合前，关联是用「前端 mock 初始值」算出来的；水合完成后若不重算，
//   详情页会残留基于 mock 的失效单号，点它 resolveRoute 解析不到 id → 死链。
//   例：采购订单详情页显示下游「IN20240510001」（仅存在于 mock，生产库无此单），
//       点不动；而真实下游（生产库里的入库单）根本没被算出来。
//   修法：订阅参与关联计算的 store，数据被替换（水合/刷新）时打 tick 触发重算。

import { useMemo } from 'react';
import { useEnsureRelatedStores } from './useEnsureRelatedStores';
import { withRelatedDocNos, getSourcesSignature, type RelatedDocRef } from './documentRelations';
import { getRelationTargetTypes } from './relations';

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
  // tick：关联源 store 数据被替换（水合/刷新）时 +1 → 触发下方重算（V3.113.1）
  const tick = useEnsureRelatedStores(docType);
  // 渲染期再取一次数据签名：覆盖「水合恰好发生在订阅建立前」的极窄窗口，
  // 也保证任何一次重渲染都能拿到最新关联（签名变了就重算）。
  const sig = getSourcesSignature(getRelationTargetTypes(docType));

  return useMemo(
    () => (data ? (withRelatedDocNos(docType, [data])[0] as unknown as RelatedDocsResult) : null),
    // tick / sig 任一变化 = 关联源数据已被替换 → 必须重算，否则残留失效单号（V3.113.1）
    [docType, data, tick, sig]
  );
}
