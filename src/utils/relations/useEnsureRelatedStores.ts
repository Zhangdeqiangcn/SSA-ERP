// 触发上下游关联数据填充 + 预拉取相关 store 的钩子（V3.113.0 新增）
// 列表页在组件里调用一次：useEnsureRelatedStores('purchaseRequest')。
// 作用：
//   1) 加载 relations.ts（副作用：把数据源/关系/路由填进 documentRelations 的空表）；
//   2) 对本单据的「上游目标类型」与「下游目标类型」逐个触发其 store 的 load/hydrate，
//      保证仅"进页才 hydrate"的 store 也能拿到数据，下游反向查不漏。

import { useEffect } from 'react';
import '../relations/relations'; // 副作用：填充中央关系登记表
import { DOC_RELATIONS, DOC_SOURCES } from '../relations/documentRelations';

/** 列表页调用：确保本单据相关的数据源已就绪 */
export function useEnsureRelatedStores(docType: string): void {
  useEffect(() => {
    const rel = DOC_RELATIONS[docType];
    const targets = new Set<string>();
    if (rel?.upstream?.target) targets.add(rel.upstream.target);
    if (rel?.upstreamResolver) {
      // resolver 内可能引用任意类型，保守地预载其下游/上游涉及的常见目标：这里仅确保本单下游目标
    }
    for (const d of rel?.downstream ?? []) targets.add(d.target);
    for (const t of targets) {
      try {
        DOC_SOURCES[t]?.ensureLoaded?.();
      } catch {
        /* 忽略单个 store 拉取异常，优雅降级 */
      }
    }
  }, [docType]);
}
