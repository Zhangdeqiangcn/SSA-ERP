/**
 * 毛利口径统一（审计 S-10 · V3.59.0）
 * ──────────────────────────────────────────────────────────────
 * 历史漂移：毛利 / 毛利率在三个页面各自算了一遍，且规则不一致：
 *   · CopaAnalysis：毛利 = 收入 − 成本（2 位小数）；毛利率 = 毛利/收入，
 *     再 Math.round(… × 10000)/100 → **2 位小数**百分比（如 23.21%）。
 *   · Cockpit「预估毛利率」：成本用**物料标准价 × 数量**（仅估算，非实际成本），
 *     毛利率 = (收入 − 估算成本)/收入，显示 (×100).toFixed(1) → **1 位小数**（如 23.2%）。
 *   · ProjectAccounting：毛利 / 毛利率来自核算单数据（项目实际成本口径），直接展示。
 *
 * 收敛目标（S-10）：毛利 / 毛利率的「数学定义 + 舍入 + 展示」收敛为单一权威实现，
 *   全前端共用，消除漂移。
 *
 * ★ 成本来源（成本口径）**不强行合并** —— 这是刻意的设计判断：
 *   项目核算用「项目实际成本」、驾驶舱用「标准价估算」、COPA 用「手工录入」，
 *   三者业务含义不同（项目 P&L vs 公司实时预估 vs 手工分析），合并反而会掩盖差异；
 *   统一的是「同一个毛利 = 收入 − 成本、同一个毛利率 = 毛利/收入」的计算与 2 位小数展示。
 *   每个页面调用处都标注其成本口径（见 GROSS_PROFIT_COST_BASIS），避免误导。
 */

/** 金额统一 2 位小数（与全系统 formatCurrency 小数位一致） */
export const roundMoney = (v: number): number => Math.round((Number(v) || 0) * 100) / 100;

/** 毛利 = 收入 − 成本（2 位小数） */
export const computeGrossProfit = (revenue: number, cost: number): number =>
  roundMoney((Number(revenue) || 0) - (Number(cost) || 0));

/**
 * 毛利率 = 毛利 / 收入，返回**百分比数值**（如 23.21 表示 23.21%），2 位小数。
 * 收入为 0 或非正时返回 0（避免除零 / 负毛利率噪声）。
 */
export const computeGrossMargin = (revenue: number, cost: number): number => {
  const rev = Number(revenue) || 0;
  if (rev <= 0) return 0;
  return Math.round((computeGrossProfit(rev, cost) / rev) * 10000) / 100;
};

/** 毛利率展示：统一 2 位小数百分比字符串（如 "23.21%"） */
export const formatGrossMargin = (margin: number): string => {
  if (margin === undefined || margin === null || Number.isNaN(Number(margin))) return '-';
  return `${(Number(margin) || 0).toFixed(2)}%`;
};

/** 成本口径标签：清晰区分三个页面的成本来源，避免「同一个毛利率数字、三种含义」误导 */
export const GROSS_PROFIT_COST_BASIS = {
  projectActual: '项目实际成本',
  standardPriceEstimate: '标准价估算成本',
  manualEntry: '手工录入',
} as const;
