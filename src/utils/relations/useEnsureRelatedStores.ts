// 触发上下游关联数据填充 + 预拉取相关 store 的钩子（V3.113.0 新增；V3.113.1 增强）
// 列表页在组件里调用一次：useEnsureRelatedStores('purchaseRequest')。
// 作用：
//   1) 加载 relations.ts（副作用：把数据源/关系/路由填进 documentRelations 的空表）；
//   2) 对本单据的「上游目标类型」与「下游目标类型」逐个触发其 store 的 load/hydrate，
//      保证仅"进页才 hydrate"的 store 也能拿到数据，下游反向查不漏；
//   3) ★ V3.113.1：订阅参与关联计算的 store，一旦其数据被替换（水合/刷新），
//      强制本组件重渲染 → 列表页的 withRelatedDocNos 与详情页的关联区块随之重算。
//      不做这一步会残留「基于前端 mock 的失效单号」，点它解析不到 id → 死链。
//
// 返回值：关联源数据版本计数（数据变化即 +1）。调用方把它放进 useMemo 依赖即可拿到新鲜关联。

import { useEffect, useMemo, useState } from 'react';
import '../relations/relations'; // 副作用：填充中央关系登记表
import { DOC_RELATIONS, DOC_SOURCES, getSourcesSignature } from '../relations/documentRelations';
import { RELATION_STORES, getRelationTargetTypes } from '../relations/relations';

/** 列表页调用：确保本单据相关的数据源已就绪；返回关联源数据版本计数 */
export function useEnsureRelatedStores(docType: string): number {
  const [tick, setTick] = useState(0);
  const targets = useMemo(() => getRelationTargetTypes(docType), [docType]);

  useEffect(() => {
    const rel = DOC_RELATIONS[docType];
    const targets2 = new Set<string>();
    if (rel?.upstream?.target) targets2.add(rel.upstream.target);
    for (const d of rel?.downstream ?? []) targets2.add(d.target);
    // V3.115.0：同源（兄弟）单据的数据源也要预拉取，否则 siblingResolver 查了个空表 ——
    // 表现为「入库单列表里的采购发票/付款计划列全空」，且报不出任何错。
    for (const t of rel?.siblingTargets ?? []) targets2.add(t);
    for (const t of targets2) {
      try {
        DOC_SOURCES[t]?.ensureLoaded?.();
      } catch {
        /* 忽略单个 store 拉取异常，优雅降级 */
      }
    }
  }, [docType]);

  // 关联源数据变化 → 强制重渲染（使列表/详情页重算上下游）
  useEffect(() => {
    if (!docType) return;
    let last = getSourcesSignature(targets);
    const unsubs: Array<() => void> = [];
    for (const store of RELATION_STORES) {
      try {
        const un = store.subscribe(() => {
          const now = getSourcesSignature(targets);
          if (now !== last) {
            last = now;
            setTick((t) => t + 1);
          }
        });
        if (typeof un === 'function') unsubs.push(un);
      } catch {
        /* 单个 store 订阅失败不影响其它来源 */
      }
    }
    return () => {
      for (const un of unsubs) {
        try {
          un();
        } catch {
          /* 忽略解绑异常 */
        }
      }
    };
  }, [docType, targets]);

  return tick;
}
