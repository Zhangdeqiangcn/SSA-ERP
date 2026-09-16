// 需求预测与智能补货算法（P3-6，V3.5.0 B4 增强）
// 基于历史销量：指数平滑（含趋势）+ 季节因子 + 安全库存（服务水平 95%）+ 再订货点（ROP）
//
// ── B4 为什么要把「近 3 个月移动平均」换掉 ──────────────────────────
// 移动平均有两个硬伤，在真实业务里都会直接算错：
//
//   ① **它对转折视而不见**。若销量从 100/月 掉到 50/月，三个月平均要等第三个月
//      才降到 50 —— 前两个月会按 67、58 去备货，多备的货压在仓库里。
//      指数平滑（简单指数平滑 SES）对最近一期加权，转折时反应快得多。
//
//   ② **它完全没有季节性概念**。卖空调的厂家在 5 月备货和在 11 月备货，
//      需要的量差好几倍；移动平均给出的数会把「旺季的高」和「淡季的低」抹平，
//      于是旺季缺货、淡季压仓 —— 这是制造与流通企业最典型的一类损失。
//
// ── 为什么用「霍尔特-温特斯（Holt-Winters）加法模型」──────────────────
// 它是工业界最常用的组合：水平（level）+ 趋势（trend）+ 季节（season）。
//   · 加水平 ── 直接给 SES，能跟上转折；
//   · 加趋势 ── 回答「是在涨还是在跌」（霍尔特线性趋势）；
//   · 加季节 ── 回答「这个月本来就该多/少」（温特斯季节分量）。
// 选择「加法」而非「乘法」季节：加法假设季节波动是**绝对量**（每月多卖 200 件），
//   乘法假设是**比例**（每月多卖 30%）。制造业的备货通常按绝对数量估算产能与仓位，
//   且加法模型在数据量少（本系统常见：12~24 个月）时更稳定、不会因某个旺季尖峰被放大。
//
// ── 为什么参数是「可调」而不是写死 ────────────────────────────────
// α/β/γ 三个平滑系数决定了模型对变化的敏感度。没有一组参数对所有物料都好：
//   快消品需要高 α（快速跟随），大宗原料需要低 α（滤掉噪声）。
// 因此这里把参数做成可选入参并给出工业常用默认值（α=0.3、β=0.1、γ=0.3），
// 同时把「拟合优度（MAPE）」算出来，让使用者能判断这组参数在此物料上是否可信。

export interface MonthlyPoint {
  month: string; // YYYY-MM
  qty: number;
}

/** 从销售订单明细按物料聚合最近 N 个月销量 */
export function buildMonthlySales(
  salesOrders: {
    orderDate: string;
    status: string;
    items: { materialId: string; quantity: number }[];
  }[],
  materialId: string,
  months = 12
): MonthlyPoint[] {
  const now = new Date();
  const points: MonthlyPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    points.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      qty: 0,
    });
  }
  const currentIdx = months - 1; // points 中当前月的下标
  for (const so of salesOrders) {
    if (so.status === 'cancelled') continue;
    const d = new Date(so.orderDate);
    if (isNaN(d.getTime())) continue;
    const idx =
      (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
    if (idx >= 0 && idx < months) {
      const pointIdx = currentIdx - idx;
      const qty = so.items
        .filter((it) => it.materialId === materialId)
        .reduce((s, it) => s + (it.quantity || 0), 0);
      points[pointIdx].qty += qty;
    }
  }
  return points;
}

export interface DemandForecastResult {
  monthlyHistory: MonthlyPoint[];
  forecastQty: number; // 下一周期预测销量
  avgMonthlyDemand: number;
  stdDev: number;
  leadTimeDays: number;
  safetyStock: number;
  reorderPoint: number;
  currentStock: number;
  suggestedOrderQty: number;
  hasHistory: boolean;
  // ── B4 新增：平滑与季节 ──────────────────────────────────────────
  /** 季节因子表（下标 0 = 1 月 … 11 = 12 月），1.0 表示无季节影响 */
  seasonalFactors: number[];
  /** 未来若干期的预测值（含季节与趋势） */
  forecastSeries: { period: string; qty: number }[];
  /** 趋势斜率（每月平均增减量）：正=需求在涨，负=在跌 */
  trend: number;
  /** 拟合优度：平均绝对百分误差（%）。越小越可信；>30% 说明历史太乱或季节性不成立 */
  mape: number;
  /** 使用的平滑系数（回显给界面，便于解释结果怎么来的） */
  alpha: number;
  beta: number;
  gamma: number;
  /** 本物料的历史是否足以估计季节（至少需要 2 个完整年度） */
  hasSeasonality: boolean;
}

export interface DemandForecastParams {
  monthlySales: number[];
  currentStock: number;
  leadTimeDays: number;
  safetyStockBase?: number; // 物料主数据设定的安全库存下限
  moq?: number;
  mpq?: number;
  // ── B4：平滑参数（不传则用工业常用默认值）──
  /** 水平平滑系数 α：越大越跟随近期变化（0.05~0.5） */
  alpha?: number;
  /** 趋势平滑系数 β：越大越相信趋势的变化（0.05~0.3） */
  beta?: number;
  /** 季节平滑系数 γ：越大越相信本期季节表现（0.1~0.5） */
  gamma?: number;
  /** 历史数据的月份标签（YYYY-MM，与 monthlySales 一一对应），用于正确对位季节因子 */
  monthLabels?: string[];
  /** 向前预测多少期（默认 1，即只给下一期） */
  horizon?: number;
}

/** B4：霍尔特-温特斯（加法季节）模型的输出 */
export interface HoltWintersResult {
  /** 下一期（或多期）预测值 */
  forecasts: number[];
  /** 最后的水平分量 */
  level: number;
  /** 最后的趋势分量（每期增减量） */
  trend: number;
  /** 12 个月的季节因子（1 月在前） */
  seasonal: number[];
  /** 平均绝对百分误差（%） */
  mape: number;
  /** 是否有足够数据估计季节（需要 ≥ 2 个完整年度） */
  hasSeasonality: boolean;
}

const DEFAULT_ALPHA = 0.3;
const DEFAULT_BETA = 0.1;
const DEFAULT_GAMMA = 0.3;
/** 季节估计所需的最少数据点：两个完整年度，少于这个数季节因子必然是噪声 */
const MIN_POINTS_FOR_SEASON = 24;

/**
 * 霍尔特-温特斯加法季节模型（B4）。
 *
 * 算法分三步（这是该类模型的标准做法，顺序不能换）：
 *   1) **初始化**：水平取前 12 期均值；趋势取首尾年度均值之差 ÷ 12；季节因子取
 *      「每月实际 − 当年均值」的多年平均（这正是「加法」的含义）。
 *   2) **逐期迭代**：对每个历史点，用上一期的水平/趋势/季节预测本期，
 *      再用本期实际值分别修正三者（水平跟随、趋势跟随、季节跟随）。
 *   3) **向前外推**：水平 + h×趋势 + 对应月份的季节因子。
 *      注意季节因子在这里重新起作用 —— 这正是「5 月备货」与「11 月备货」算法上
 *      唯一的不同之处，也是这个模型存在的全部意义。
 */
export function holtWinters(
  series: number[],
  monthLabels: string[] | undefined,
  opts: { alpha?: number; beta?: number; gamma?: number; horizon?: number } = {},
): HoltWintersResult {
  const alpha = opts.alpha ?? DEFAULT_ALPHA;
  const beta = opts.beta ?? DEFAULT_BETA;
  const gamma = opts.gamma ?? DEFAULT_GAMMA;
  const horizon = opts.horizon ?? 1;

  const n = series.length;
  const seasonal = new Array<number>(12).fill(0);

  // 数据不足两个完整年度 → 不估计季节，退化为「霍尔特线性趋势」
  // 为什么是 24 期：少于两年时每一年的季节表现只出现一次，
  // 无法区分「这是季节」还是「今年恰好如此」，强行估计只会把噪声当规律。
  const hasSeasonality = n >= MIN_POINTS_FOR_SEASON;

  // 无数据：全部返回 0，让上层走「无历史」提示分支
  if (n === 0) {
    return { forecasts: new Array(horizon).fill(0), level: 0, trend: 0, seasonal, mape: 0, hasSeasonality: false };
  }
  if (n === 1) {
    return { forecasts: new Array(horizon).fill(series[0]), level: series[0], trend: 0, seasonal, mape: 0, hasSeasonality: false };
  }

  // 取月份的辅助：优先用真实标签，缺标签时按「第一期 = 1 月」回退
  const monthOf = (i: number): number => {
    const label = monthLabels?.[i];
    if (label) {
      const m = parseInt(label.slice(5, 7), 10);
      if (m >= 1 && m <= 12) return m - 1;
    }
    return i % 12;
  };

  // ── 1) 初始化 ──
  let level: number;
  let trend: number;

  if (hasSeasonality) {
    // 季节因子 = 各年「同期值 − 当年均值」的平均
    const yearlyAvgs: number[] = [];
    for (let y = 0; y + 11 < n; y += 12) {
      const slice = series.slice(y, y + 12);
      yearlyAvgs.push(slice.reduce((a, b) => a + b, 0) / 12);
    }
    const overallAvg = yearlyAvgs.reduce((a, b) => a + b, 0) / (yearlyAvgs.length || 1);
    for (let m = 0; m < 12; m++) {
      let sum = 0;
      let cnt = 0;
      for (let y = 0; y * 12 + m < n; y++) {
        const idx = y * 12 + m;
        if (idx < n) {
          sum += series[idx] - (yearlyAvgs[y] ?? overallAvg);
          cnt += 1;
        }
      }
      seasonal[m] = cnt > 0 ? sum / cnt : 0;
    }
    // 季节因子归一化：12 个因子之和应为 0（加法模型的定义），
    // 否则会把系统性偏差带进每一期预测（例如所有因子都偏正 → 整体高估）。
    const sSum = seasonal.reduce((a, b) => a + b, 0);
    const adj = sSum / 12;
    for (let m = 0; m < 12; m++) seasonal[m] = Math.round((seasonal[m] - adj) * 100) / 100;

    const firstYearAvg = yearlyAvgs[0] ?? overallAvg;
    const lastYearAvg = yearlyAvgs[yearlyAvgs.length - 1] ?? overallAvg;
    level = lastYearAvg;
    trend = (lastYearAvg - firstYearAvg) / Math.max(1, (yearlyAvgs.length - 1) * 12);
  } else {
    // 数据不足：用前 3 期均值做水平，趋势暂时置 0（不臆断趋势）
    const head = series.slice(0, Math.min(3, n));
    level = head.reduce((a, b) => a + b, 0) / head.length;
    trend = 0;
  }

  // ── 2) 逐期迭代修正 ──
  // 误差累计用于 MAPE：只统计实际值 > 0 的期，避免除零与「0 销量」拉偏指标
  let errSum = 0;
  let errCnt = 0;

  for (let i = 0; i < n; i++) {
    const m = monthOf(i);
    const s = hasSeasonality ? seasonal[m] : 0;
    const predicted = level + trend + s;
    const actual = series[i];

    if (actual > 0) {
      errSum += Math.abs((actual - predicted) / actual);
      errCnt += 1;
    }

    const prevLevel = level;
    level = alpha * (actual - s) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    if (hasSeasonality) {
      seasonal[m] = gamma * (actual - level) + (1 - gamma) * seasonal[m];
    }
  }

  // ── 3) 向前外推 ──
  const lastMonth = monthOf(n - 1);
  const forecasts: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    const m = (lastMonth + h) % 12;
    const s = hasSeasonality ? seasonal[m] : 0;
    // 趋势外推加阻尼（h 用平方根而非线性）：长期线性外推会把趋势放大到不合理的量级
    // （例如近三个月每月涨 10，线性外推 12 个月就是 +120）。平方根衰减是工业实践中的
    // 常用折中：短期仍跟随趋势，长期自动收敛。
    const trendProjection = trend * (h <= 1 ? h : 1 + Math.sqrt(h - 1));
    forecasts.push(Math.max(0, level + trendProjection + s));
  }

  const mape = errCnt > 0 ? (errSum / errCnt) * 100 : 0;

  return {
    forecasts,
    level: Math.round(level * 100) / 100,
    trend: Math.round(trend * 100) / 100,
    seasonal,
    mape: Math.round(mape * 10) / 10,
    hasSeasonality,
  };
}

/** 计算需求预测与安全库存/再订货点/建议补货量 */
export function computeDemandForecast(params: DemandForecastParams): DemandForecastResult {
  const {
    monthlySales,
    currentStock,
    leadTimeDays,
    safetyStockBase = 0,
    moq = 0,
    mpq = 0,
    alpha = DEFAULT_ALPHA,
    beta = DEFAULT_BETA,
    gamma = DEFAULT_GAMMA,
    monthLabels,
    horizon = 1,
  } = params;

  const n = monthlySales.length;
  const sum = monthlySales.reduce((a, b) => a + b, 0);
  const avg = n ? sum / n : 0;
  const variance = n ? monthlySales.reduce((a, b) => a + (b - avg) ** 2, 0) / n : 0;
  const std = Math.sqrt(variance);

  // ── B4：用霍尔特-温特斯替代「近 3 期移动平均」──
  const hw = holtWinters(monthlySales, monthLabels, { alpha, beta, gamma, horizon });
  const forecastQty = hw.forecasts[0] ?? avg;

  // 服务水平 95% → z ≈ 1.65
  const z = 1.65;
  const computedSS = z * std * Math.sqrt(leadTimeDays / 30);
  const safetyStock = Math.max(safetyStockBase, Math.round(computedSS));

  // 提前期内需求：用「预测的月度需求」而不是「历史平均」来折算，
  // 否则刚发生的转折（销量腰斩或翻倍）在再订货点上反映不出来。
  const leadTimeDemand = forecastQty * (leadTimeDays / 30);
  const reorderPoint = Math.round(leadTimeDemand + safetyStock);

  let suggested = Math.max(0, Math.round(reorderPoint + forecastQty - currentStock));
  if (mpq > 0 && suggested > 0) {
    suggested = Math.ceil(suggested / mpq) * mpq;
  } else if (moq > 0 && suggested > 0) {
    suggested = Math.max(moq, Math.ceil(suggested / moq) * moq);
  }

  const hasHistory = monthlySales.some((q) => q > 0);

  // 预测序列的期标签：从历史最后一个月的次月开始逐月递增
  const forecastSeries: { period: string; qty: number }[] = [];
  const lastLabel = monthLabels?.[n - 1];
  const baseDate = lastLabel
    ? new Date(`${lastLabel}-01`)
    : new Date();
  for (let h = 1; h <= horizon; h++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + h, 1);
    forecastSeries.push({
      period: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      qty: Math.round((hw.forecasts[h - 1] ?? 0) * 10) / 10,
    });
  }

  return {
    monthlyHistory: monthlySales.map((qty, i) => ({
      month: monthLabels?.[i] ?? `${i + 1}月`,
      qty,
    })),
    forecastQty: Math.round(forecastQty * 10) / 10,
    avgMonthlyDemand: Math.round(avg * 10) / 10,
    stdDev: Math.round(std * 10) / 10,
    leadTimeDays,
    safetyStock,
    reorderPoint,
    currentStock,
    suggestedOrderQty: suggested,
    hasHistory,
    seasonalFactors: hw.seasonal,
    forecastSeries,
    trend: hw.trend,
    mape: hw.mape,
    alpha,
    beta,
    gamma,
    hasSeasonality: hw.hasSeasonality,
  };
}
