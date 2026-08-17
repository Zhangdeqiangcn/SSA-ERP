/**
 * A4 成本核算公共工具（移动平均价 / 库存金额滚动）
 * ------------------------------------------------------------------
 * 对标 SAP MM 物料评估（MBEW）口径：
 *  - 评估库存数量  LBKUM  →  Material.currentStock
 *  - 评估库存金额  SALK3  →  Material.stockValue
 *  - 移动平均价    VERPR  →  Material.movingAvgPrice
 *
 * 核心恒等式（任一时点都必须成立）：
 *      stockValue ≈ currentStock × movingAvgPrice
 *
 * 入库（收货）：
 *      新均价 = (原库存金额 + 本次入库未税金额) / (原库存数量 + 本次入库数量)
 *      —— 单价随进价变动而"滚动"
 *
 * 出库（销售发货 / 生产领料）：
 *      结转成本 = 出库数量 × 当前移动平均价
 *      —— 单价不变，只减数量与金额
 *
 * 金额一律 2 位小数，单价 4 位小数（对标 SAP 移动平均价精度，避免单价被过早截断
 * 导致「数量×单价 ≠ 金额」的分位漂移）。
 */
import { Material } from '@/types';

/** 金额精度：保留 2 位小数 */
export const roundAmount = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

/** 单价精度：保留 4 位小数 */
export const roundPrice = (n: number): number => Math.round((Number(n) || 0) * 10000) / 10000;

/**
 * 取物料「现行成本单价」。
 * 优先级：移动平均价 > 标准价 > 采购价（price）。
 * 用于存量物料 movingAvgPrice 尚未初始化时的兜底，保证成本永不为 0。
 */
export const getUnitCost = (m?: Partial<Material> | null): number => {
  if (!m) return 0;
  if (typeof m.movingAvgPrice === 'number' && m.movingAvgPrice > 0) return m.movingAvgPrice;
  if (typeof m.standardPrice === 'number' && m.standardPrice > 0) return m.standardPrice;
  return typeof m.price === 'number' ? m.price : 0;
};

/**
 * 取物料「库存金额」。
 * stockValue 未初始化时按 库存数量 × 现行成本单价 兜底推算。
 */
export const getStockValue = (m?: Partial<Material> | null): number => {
  if (!m) return 0;
  if (typeof m.stockValue === 'number') return m.stockValue;
  return roundAmount((m.currentStock || 0) * getUnitCost(m));
};

/** 成本滚动结果（回写物料主数据的三个字段） */
export interface CostRollResult {
  /** 滚动后库存数量 */
  quantity: number;
  /** 滚动后库存金额 */
  stockValue: number;
  /** 滚动后移动平均价 */
  movingAvgPrice: number;
}

/** 出库滚动结果：额外返回本次结转的成本金额（COGS 取数口径） */
export interface CostIssueResult extends CostRollResult {
  /** 本次结转成本金额 = 出库数量 × 结转单价 */
  costAmount: number;
  /** 本次结转单价（结转时点的移动平均价快照） */
  unitCost: number;
}

/**
 * 入库：移动平均价滚动。
 * @param prevQty     原库存数量
 * @param prevValue   原库存金额
 * @param inQty       本次入库数量
 * @param inUnitPrice 本次入库未税单价
 */
export const rollInMovingAverage = (
  prevQty: number,
  prevValue: number,
  inQty: number,
  inUnitPrice: number
): CostRollResult => {
  const q0 = Number.isFinite(prevQty) ? Number(prevQty) : 0;
  const v0 = Number.isFinite(prevValue) ? Number(prevValue) : 0;
  const qi = Number.isFinite(inQty) && inQty > 0 ? Number(inQty) : 0;
  const pi = Number.isFinite(inUnitPrice) && inUnitPrice > 0 ? Number(inUnitPrice) : 0;

  const nextQty = q0 + qi;
  const nextValue = v0 + qi * pi;
  // 原均价：数量为 0 时退化为本次进价，避免除零
  const prevPrice = q0 > 0 ? v0 / q0 : pi;
  const nextPrice = nextQty > 0 ? nextValue / nextQty : prevPrice;

  return {
    quantity: nextQty,
    stockValue: roundAmount(nextValue),
    movingAvgPrice: roundPrice(nextPrice),
  };
};

/**
 * 出库：按现行移动平均价结转成本。单价不变，只减数量与金额。
 * @param prevQty   原库存数量
 * @param prevValue 原库存金额
 * @param outQty    本次出库数量
 * @param unitCost  结转单价（缺省时由 原库存金额/原库存数量 推算）
 *
 * 注：不做负库存 clamp —— 超发时数量/金额转负，属需人工冲正的异常，
 *     强行归零会静默吞掉成本，导致利润虚高（比负库存更危险）。
 */
export const rollOutMovingAverage = (
  prevQty: number,
  prevValue: number,
  outQty: number,
  unitCost?: number
): CostIssueResult => {
  const q0 = Number.isFinite(prevQty) ? Number(prevQty) : 0;
  const v0 = Number.isFinite(prevValue) ? Number(prevValue) : 0;
  const qo = Number.isFinite(outQty) && outQty > 0 ? Number(outQty) : 0;

  const fallback = q0 > 0 ? v0 / q0 : 0;
  const price = roundPrice(
    Number.isFinite(unitCost as number) && (unitCost as number) > 0 ? (unitCost as number) : fallback
  );
  const costAmount = roundAmount(qo * price);

  return {
    quantity: q0 - qo,
    stockValue: roundAmount(v0 - costAmount),
    movingAvgPrice: price,
    costAmount,
    unitCost: price,
  };
};

/**
 * 物料成本字段规范化：为存量/种子物料补齐 movingAvgPrice 与 stockValue。
 * 同时用于 materialStore 的初始 state 与 persist migrate，保证两条加载路径口径一致。
 */
export const normalizeMaterialCost = <T extends Partial<Material>>(m: T): T => {
  const unitCost = getUnitCost(m);
  const movingAvgPrice =
    typeof m.movingAvgPrice === 'number' && m.movingAvgPrice > 0 ? m.movingAvgPrice : roundPrice(unitCost);
  const stockValue =
    typeof m.stockValue === 'number' ? m.stockValue : roundAmount((m.currentStock || 0) * movingAvgPrice);
  return { ...m, movingAvgPrice, stockValue };
};
