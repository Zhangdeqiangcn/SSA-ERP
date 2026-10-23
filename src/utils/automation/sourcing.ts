/**
 * V3.96.0 货源清单配额解析 + 默认供应商一致性校验（纯函数，可单测）
 * ================================================================
 * 强哥诉求（V3.96.0 第 2 条）：
 *   ① 同一物料类别默认供应商有多个时，读「货源清单」确定各供应商的**配额分配**，
 *      再按配额去下单/询价/领料（而不是不分家全下一家、或全下一堆家）。
 *   ② 当「货源清单」与「分类默认供应商」不一致时，自动运行时**报错**，
 *      **只保存草稿、不提交到下一环节**。
 *
 * 数据地基（全部已存在，本文件只做「读出来 + 算 + 判」，不碰 store / 网络）：
 *   · 分类默认供应商   MaterialCategory.defaultVendors: string[]  （V3.95.0 迁移 0112）
 *   · 货源清单          SourceListItem{materialId, vendorId, priority, quotaPercentage,
 *                          fixedVendor, validFrom/To, status}        （P0-06 已落 D1）
 *   · 价目表有效价      priceStore.getActivePrice(vendorId, materialId)?.unitPrice
 *
 * 为什么放纯函数：一致性/配额是「自动化引擎安全门控」的核心判据，
 *   强哥一贯要求「准确度优先、可单测、根因可查」，纯函数最好锁语义、最好回归。
 */

import type { SourceListItem } from '@/types';

/** 价目表取价口径：某供应商+物料是否有「有效价」，返回有效单价（未税口径）；无则 undefined */
export type PriceLookup = (vendorId: string, materialId: string) => number | undefined;

/** 单行按配额拆分后、分给某一供应商的一小片 */
export interface AllocatedVendor {
  vendorId: string;
  vendorName: string;
  /** 该供应商按配额分到的数量（已取整，整行各供应商之和 = 需求总量，最大余数法保总量） */
  quantity: number;
  /** 配额百分比（0~100；无配额时为 0，按优先级兜底） */
  quota: number;
  /** 该供应商+物料在价目表里是否有有效价 */
  hasValidPrice: boolean;
  /** 有效单价（无则 undefined） */
  unitPrice?: number;
}

/** 一致性问题的具体形态 */
export type ConsistencyIssueKind =
  | 'default_vendor_without_source' // 分类默认供应商里，某家在「该物料」货源清单里没有记录
  | 'source_outside_default'        // 货源清单里，某家供应商不是该物料分类的默认供应商
  | 'no_available_source';          // 该物料压根没有生效且在有效期内的货源

/** 一条一致性告警（界面可逐条展示，报错时可点名到供应商） */
export interface ConsistencyIssue {
  kind: ConsistencyIssueKind;
  vendorId?: string;
  vendorName?: string;
  message: string;
}

/** 输入的原料（都来自已有 store / 类型，编排器负责取好再喂进来） */
export interface SourcingInput {
  /** 该物料所属分类的默认供应商 id 列表（来自 MaterialCategory.defaultVendors，可空=未维护） */
  defaultVendorIds: string[];
  /** 该物料当前生效(status=active)且在有效期内的货源清单行（调用方已用 getActiveSourcesFor 过滤） */
  activeSources: SourceListItem[];
  /** 价目表取价（供应商+物料 → 有效单价或 undefined） */
  getActivePrice: PriceLookup;
  /** 供应商 id → 名称（报错时点名用） */
  vendorNameById: Record<string, string>;
  /** 本行需求总量（要按配额拆的对象） */
  requiredQty: number;
}

/** 解析结果 */
export interface SourcingResult {
  /** 一致性是否通过。false 时编排器必须「只存草稿、报错、不提交下一环节」 */
  consistent: boolean;
  /** 不一致的具体原因（可多条，界面逐条展示） */
  issues: ConsistencyIssue[];
  /** 按配额拆分后「该找哪些供应商、各给多少、有没有有效价」（一致或仅有可忽略偏差时仍给出，供下单/询价） */
  allocations: AllocatedVendor[];
  /** 该物料完全没有可用货源（→ 走「寻源提示」段，让采购员处理） */
  noSource: boolean;
  /** 有货源但所有可用供应商都没有有效价（→ 走「询价比价」段） */
  allNeedInquiry: boolean;
}

/**
 * 最大余数法把 requiredQty 按权重拆到 N 份，保证各份之和恰等于 requiredQty
 * （直接 Math.round(份比×总量) 会因取整漂移导致某供应商 0 或多 1，配额失真）。
 * 纯函数，便于单测。
 */
export function apportionQuantity(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (total <= 0) return new Array(n).fill(0);
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (sumW <= 0) {
    // 无权重（全 0 配额）→ 平均摊派，仍用最大余数法保总量
    return apportionQuantity(total, new Array(n).fill(1));
  }
  const raw = weights.map((w) => (w / sumW) * total);
  const floors = raw.map((r) => Math.floor(r));
  let leftover = total - floors.reduce((a, b) => a + b, 0);
  // 余数（raw - floor）从大到小，依次 +1，直到分完
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const result = [...floors];
  for (let k = 0; k < leftover && k < order.length; k++) {
    result[order[k].i] += 1;
  }
  // 防御：总量与权重份数不匹配时（理论上不可能），兜底把差额补到第 0 份
  const diff = total - result.reduce((a, b) => a + b, 0);
  if (diff !== 0) result[0] += diff;
  return result;
}

/**
 * 核心解析：读货源清单配额 → 拆需求 → 与「分类默认供应商」做一致性校验。
 * 语义：
 *  - consistent=false  ⟺ 出现任一 ConsistencyIssue（编排器据此只存草稿、报错、停）。
 *  - noSource=true     该物料无可用货源（一致性必失败，issues 记 no_available_source）。
 *  - allNeedInquiry    货源在、但都查不到有效价（一致性可过，走询价段，非阻断）。
 */
export function resolveSourcing(input: SourcingInput): SourcingResult {
  const { defaultVendorIds, activeSources, getActivePrice, vendorNameById, requiredQty } = input;
  const issues: ConsistencyIssue[] = [];
  const nm = (id: string) => vendorNameById[id] || id;

  // 取「有配额或按优先级可参与拆单」的货源：默认全部生效货源都参与（按优先级兜底权重）
  const useSources = activeSources;

  if (useSources.length === 0) {
    issues.push({
      kind: 'no_available_source',
      message: `该物料没有「生效且在有效期内」的货源清单记录，无法自动分配供应商（请先到「货源清单」维护，或改走人工寻源）。`,
    });
    return { consistent: false, issues, allocations: [], noSource: true, allNeedInquiry: false };
  }

  // ── 一致性校验①：货源清单里的供应商是否都属于该物料分类的「默认供应商」──
  // 强哥规则：货源清单与默认供应商不一致 → 报错、只存草稿、不提交下一环节。
  // 边界：若分类未维护默认供应商（defaultVendorIds 为空），以「货源清单为准」不判不一致（没有默认集合可比对）。
  if (defaultVendorIds.length > 0) {
    const defaultSet = new Set(defaultVendorIds);
    for (const s of useSources) {
      if (!defaultSet.has(s.vendorId)) {
        issues.push({
          kind: 'source_outside_default',
          vendorId: s.vendorId,
          vendorName: s.vendorName || nm(s.vendorId),
          message: `货源清单里的供应商「${s.vendorName || s.vendorId}」不在该物料分类的默认供应商范围内，货源清单与默认供应商不一致。`,
        });
      }
    }
    // ── 一致性校验②：每个默认供应商是否都至少有一条该物料的生效货源 ──
    const sourcedVendorIds = new Set(useSources.map((s) => s.vendorId));
    for (const dv of defaultVendorIds) {
      if (!sourcedVendorIds.has(dv)) {
        issues.push({
          kind: 'default_vendor_without_source',
          vendorId: dv,
          vendorName: nm(dv),
          message: `分类默认供应商「${nm(dv)}」在该物料的货源清单里没有生效记录，默认供应商与货源清单不一致。`,
        });
      }
    }
  }

  // ── 配额拆单：有配额按配额，无配额按优先级（priority 越小越优先，权重取 1/(rank)）──
  const hasQuota = useSources.some((s) => (s.quotaPercentage ?? 0) > 0);
  let weights: number[];
  if (hasQuota) {
    weights = useSources.map((s) => Math.max(0, s.quotaPercentage ?? 0));
    // 全配额为 0 的极端：退回优先级权重，避免 apportion 走平均
    if (weights.every((w) => w === 0)) {
      weights = useSources.map((_, i) => useSources.length - i); // priority 升序，越靠前权重越大
    }
  } else {
    // 无配额 → 按优先级权重（priority 升序，第 1 名权重最大）
    weights = useSources.map((_, i) => useSources.length - i);
  }

  const split = apportionQuantity(requiredQty, weights);
  const allocations: AllocatedVendor[] = useSources.map((s, i) => {
    const unitPrice = getActivePrice(s.vendorId, s.materialId);
    return {
      vendorId: s.vendorId,
      vendorName: s.vendorName || nm(s.vendorId),
      quantity: split[i] ?? 0,
      quota: hasQuota ? Math.max(0, s.quotaPercentage ?? 0) : 0,
      hasValidPrice: unitPrice != null,
      unitPrice: unitPrice,
    };
  });

  // 全部可用供应商都没有有效价 → 走询价比价段（非一致性阻断，只是「没价」）
  const allNeedInquiry = allocations.every((a) => a.quantity > 0 && !a.hasValidPrice);

  return {
    consistent: issues.length === 0,
    issues,
    allocations,
    noSource: false,
    allNeedInquiry,
  };
}
