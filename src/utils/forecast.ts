// 需求预测与智能补货算法（P3-6）
// 基于历史销量：移动平均预测 + 安全库存（服务水平 95%）+ 再订货点（ROP）

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
}

export interface DemandForecastParams {
  monthlySales: number[];
  currentStock: number;
  leadTimeDays: number;
  safetyStockBase?: number; // 物料主数据设定的安全库存下限
  moq?: number;
  mpq?: number;
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
  } = params;

  const n = monthlySales.length;
  const sum = monthlySales.reduce((a, b) => a + b, 0);
  const avg = n ? sum / n : 0;
  const variance = n ? monthlySales.reduce((a, b) => a + (b - avg) ** 2, 0) / n : 0;
  const std = Math.sqrt(variance);

  const last3 = monthlySales.slice(-3);
  const forecastQty = last3.length ? last3.reduce((a, b) => a + b, 0) / last3.length : avg;

  // 服务水平 95% → z ≈ 1.65
  const z = 1.65;
  const computedSS = z * std * Math.sqrt(leadTimeDays / 30);
  const safetyStock = Math.max(safetyStockBase, Math.round(computedSS));

  const leadTimeDemand = avg * (leadTimeDays / 30);
  const reorderPoint = Math.round(leadTimeDemand + safetyStock);

  let suggested = Math.max(0, Math.round(reorderPoint + forecastQty - currentStock));
  if (mpq > 0 && suggested > 0) {
    suggested = Math.ceil(suggested / mpq) * mpq;
  } else if (moq > 0 && suggested > 0) {
    suggested = Math.max(moq, Math.ceil(suggested / moq) * moq);
  }

  const hasHistory = monthlySales.some((q) => q > 0);

  return {
    monthlyHistory: monthlySales.map((qty, i) => ({
      month: `${i + 1}月`,
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
  };
}
