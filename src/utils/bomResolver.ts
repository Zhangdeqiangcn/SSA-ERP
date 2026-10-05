import type { BOMHeader, BOMItem } from '@/types/bom';

/**
 * ★ V3.46.0 第2批④：唯一的 BOM 解析函数（resolveChildBom 的前端同款口径）
 *
 * ── 为什么必须收敛到一个函数（此前散落 4 处、口径各不相同）────────────
 * 「给定一个产品编码，该用哪张 BOM」这个判断在项目里被手写了 4 次：
 *   bomStore.getBOMByProductCode   released 优先 → 任意
 *   WorkOrderDetail.tsx:111        `b.id === wo.bomId || b.productCode === ...`（**没排序**，
 *                                  列表顺序一变就换一张）
 *   WorkOrderDetail.tsx:124        released 优先 → 任意（与前者同文件、不同函数，口径却不同）
 *   MTOCreate.tsx:41               `bomList[0]` 兜底（**产品都不匹配也照样拿第一张**）
 *   MRPPlan.tsx:590                无 released 优先
 *
 * 后果不是"风格不统一"，而是**同一张工单在领料页挂 A 版 BOM、在成本卷积页挂 B 版 BOM**，
 * 两页数量对不上却谁也说不清为什么。而 mock 的 EBOM/MBOM `productCode` 相同，
 * 无排序的 find 拿到的一定是数组里的第一张 —— 于是永远拿 EBOM 冒充 MBOM。
 *
 * ── 判定顺序（每条都对应标杆的成熟做法）────────────────────────────
 * ① 显式指定 bomId 优先（工单已挂 BOM 就用它，不猜）
 * ② 状态：已发布(released)优先 —— 未发布的 BOM 是草稿，领料按草稿算需求等于用废纸排产
 * ③ 有效期：`effectiveDate <= asOf <= expiryDate`（对标 SAP CS_BOM 的有效期区间；
 *   金蝶/用友同样按有效期选版本）。日期串按 ISO 'YYYY-MM-DD' 天然可字典比较
 * ④ 非替代 BOM 优先于替代 BOM（`isAlternate`）—— 替代 BOM 只在主 BOM 缺料时才启用
 * ⑤ 替代 BOM 之间按 `priority` 升序（数值小者优先），同优先级按 `usageProbability` 降序
 * ⑥ 仍并列则按 `createdAt` 倒序（后建的版本视为新版本）
 * ⑦ 全程**不兜底返回别的产品的 BOM**：宁可不匹配，也不要给一张错的
 *    （MTOCreate 原来的 `|| bomList[0]` 会无声地拿一张完全不相干的 BOM 去算成本）
 */

export interface ResolveBomOptions {
  /** 显式指定 BOM id（工单已挂载时最高优先） */
  bomId?: string | null;
  /** 判定基准日期，默认今天（`YYYY-MM-DD`） */
  asOf?: string;
  /** 放宽有效期约束：允许命中已过期/未生效的版本（历史单据复算时用） */
  ignoreEffectiveDate?: boolean;
  /** 无匹配时是否允许退回任意一张（默认 false —— 宁可无解也不给错的） */
  allowAnyFallback?: boolean;
}

const todayStr = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 状态是否可投产：仅 released 可直接用于领料/成本；其余视为草稿 */
const isReleased = (b: BOMHeader): boolean => String(b.status || '').toLowerCase() === 'released';

/** 是否在有效期内（日期串按 ISO 格式，字典比较即时间比较） */
const inEffectiveWindow = (b: BOMHeader, asOf: string): boolean => {
  const from = String(b.effectiveDate || '').slice(0, 10);
  const to = String(b.expiryDate || '').slice(0, 10);
  if (from && asOf < from) return false;
  if (to && asOf > to) return false;
  return true;
};

export function resolveBOM(list: BOMHeader[] | undefined | null, productCode: string, opts: ResolveBomOptions = {}): BOMHeader | undefined {
  const all = Array.isArray(list) ? list : [];
  const code = String(productCode || '').trim();
  const asOf = String(opts.asOf || todayStr()).slice(0, 10);

  // ① 显式 id 优先（先按 id 命中，再退回编码匹配 —— 显式指定不应因编码缺失而失效）
  if (opts.bomId) {
    const byId = all.find((b) => b.id === opts.bomId);
    if (byId) return byId;
  }
  if (!code) return opts.allowAnyFallback ? all[0] : undefined;

  const cands = all.filter((b) => String(b.productCode || '') === code);
  if (cands.length === 0) {
    return opts.allowAnyFallback ? all[0] : undefined;
  }

  // 有效期过滤（可放宽）
  let pool = opts.ignoreEffectiveDate ? cands : cands.filter((b) => inEffectiveWindow(b, asOf));
  if (pool.length === 0) pool = cands; // 全部不在有效期 → 退回候选集（配合 ignore 语义由调用方决定是否报错）

  const sorted = [...pool].sort((a, b) => {
    // ② 已发布优先
    const ra = isReleased(a) ? 0 : 1;
    const rb = isReleased(b) ? 0 : 1;
    if (ra !== rb) return ra - rb;
    // ④ 主 BOM 优先于替代 BOM
    const aa = a.isAlternate ? 1 : 0;
    const ab = b.isAlternate ? 1 : 0;
    if (aa !== ab) return aa - ab;
    // ⑤ 替代 BOM 按 priority 升序（越小越优先）
    const pa = Number.isFinite(Number(a.priority)) ? Number(a.priority) : 9999;
    const pb = Number.isFinite(Number(b.priority)) ? Number(b.priority) : 9999;
    if (pa !== pb) return pa - pb;
    // 使用概率降序
    const ua = Number.isFinite(Number(a.usageProbability)) ? Number(a.usageProbability) : -1;
    const ub = Number.isFinite(Number(b.usageProbability)) ? Number(b.usageProbability) : -1;
    if (ua !== ub) return ub - ua;
    // ⑥ 创建时间倒序（新版本优先）
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });

  return sorted[0];
}

/**
 * 取某张 BOM 的**顶层**明细行（子装配行在此，需要时再递归展开）。
 * 空数组与 undefined 区分开：前者表示"有 BOM 但无明细"，后者表示"没匹配到 BOM"。
 */
export function topLevelItems(bom: BOMHeader | undefined): BOMItem[] | undefined {
  if (!bom) return undefined;
  return Array.isArray(bom.items) && bom.items.length > 0 ? bom.items : undefined;
}

/**
 * 深度优先展开 BOM 子装配为叶子物料行（对标 SAP 多层 BOM 展开 / 低层码）。
 *
 * ★ 存在的意义：后端 `nestItems` 还原了 children 树后，若调用方仍只取 `items`，
 *   子装配件会被当成实物料领用（其子件一分不领）。凡是需要"全部实物料"的地方
 *   （领料、MRP 需求、成本卷积）都必须走本函数展开。
 *
 * @param items  顶层明细行
 * @param depth  当前递归深度（内部使用）
 * @returns 叶子行数组（不含子装配自身），每行带 `__level` 标注原始层级便于对账
 */
export function flattenBomLeaves(items: BOMItem[] | undefined, depth = 1): (BOMItem & { __level: number })[] {
  const out: (BOMItem & { __level: number })[] = [];
  for (const it of Array.isArray(items) ? items : []) {
    const children = (it as BOMItem).children;
    if (Array.isArray(children) && children.length > 0) {
      // 子装配：自身不作为实物料，展开其子件
      out.push(...flattenBomLeaves(children, depth + 1));
    } else {
      out.push({ ...it, __level: depth });
    }
  }
  return out;
}
