import type { VendorRatingConfig, VendorRatingWeights } from '@/stores/settingsStore';

export interface VendorRatingInput {
  /** 来料检验通过率 0-100；无检验数据时为 null */
  qualityPassRate: number | null;
  /** 按约交付率 0-100；无交付记录时为 null */
  onTimeDeliveryRate: number | null;
  /** 价格竞争力 0-100（对比同物料最低价）；无价目表数据时为 null */
  priceCompetitiveness: number | null;
}

export interface VendorRatingIndicator {
  key: keyof VendorRatingWeights;
  label: string;
  value: number | null;
  available: boolean;
}

export type VendorGrade = 'A' | 'B' | 'C' | 'D' | '数据不足';

export interface VendorRatingResult {
  score: number | null;
  grade: VendorGrade;
  indicators: VendorRatingIndicator[];
}

export const VENDOR_RATING_LABELS: Record<keyof VendorRatingWeights, string> = {
  quality: '质量合格率',
  delivery: '交期达成率',
  price: '价格竞争力',
};

/**
 * 供应商绩效自动评级：按可配置权重聚合 质量/交期/价格 三类指标，
 * 计算加权总分并映射为 A/B/C/D 等级。与物料自动评级（M4）同构。
 * 任一指标数据不足时不计入（权重归一化），全部缺失则标记「数据不足」。
 */
export function computeVendorRating(
  input: VendorRatingInput,
  config: VendorRatingConfig
): VendorRatingResult {
  const indicators: VendorRatingIndicator[] = [
    { key: 'quality', label: VENDOR_RATING_LABELS.quality, value: input.qualityPassRate, available: input.qualityPassRate !== null },
    { key: 'delivery', label: VENDOR_RATING_LABELS.delivery, value: input.onTimeDeliveryRate, available: input.onTimeDeliveryRate !== null },
    { key: 'price', label: VENDOR_RATING_LABELS.price, value: input.priceCompetitiveness, available: input.priceCompetitiveness !== null },
  ];

  const available = indicators.filter((i) => i.available);
  if (available.length === 0) {
    return { score: null, grade: '数据不足', indicators };
  }

  const weightSum = available.reduce((s, i) => s + (config.weights[i.key] || 0), 0);
  const sum = available.reduce((s, i) => s + (i.value ?? 0) * (config.weights[i.key] || 0), 0);
  const score = weightSum > 0 ? Math.round(sum / weightSum) : 0;

  let grade: VendorGrade;
  if (score >= config.thresholds.A) grade = 'A';
  else if (score >= config.thresholds.B) grade = 'B';
  else if (score >= config.thresholds.C) grade = 'C';
  else grade = 'D';

  return { score, grade, indicators };
}

/** 从各业务 store 的明细数据计算三指标原始值（用于详情页实时聚合） */
export function buildVendorRatingInput(params: {
  inspectionTasks: { vendorId?: string; status: string }[];
  purchaseOrders: { vendorId: string; status: string; expectedDeliveryDate: string; actualDeliveryDate?: string }[];
  priceList: { vendorId: string; materialId: string; unitPrice: number; status: string }[];
  vendorId: string;
}): VendorRatingInput {
  const { inspectionTasks, purchaseOrders, priceList, vendorId } = params;

  // 1) 质量：该供应商的来料检验通过率
  const vendorInspections = inspectionTasks.filter((t) => t.vendorId === vendorId);
  const qualityPassRate =
    vendorInspections.length === 0
      ? null
      : Math.round(
          (vendorInspections.filter((t) => t.status === 'passed').length / vendorInspections.length) * 100
        );

  // 2) 交期：有实际交付日期的订单中，按期（实际 <= 预期）占比
  const delivered = purchaseOrders.filter(
    (o) => o.vendorId === vendorId && !!o.actualDeliveryDate
  );
  const onTimeDeliveryRate =
    delivered.length === 0
      ? null
      : Math.round(
          (delivered.filter((o) => o.actualDeliveryDate! <= o.expectedDeliveryDate).length / delivered.length) * 100
        );

  // 3) 价格：该供应商各物料价 vs 同物料全供应商最低价
  const vendorPrices = priceList.filter((p) => p.vendorId === vendorId && p.status === 'active');
  let priceCompetitiveness: number | null = null;
  if (vendorPrices.length > 0) {
    const scores = vendorPrices.map((vp) => {
      const minForMaterial = Math.min(
        ...priceList
          .filter((p) => p.materialId === vp.materialId && p.status === 'active')
          .map((p) => p.unitPrice)
      );
      if (minForMaterial <= 0) return 100;
      return Math.min(100, Math.round((minForMaterial / vp.unitPrice) * 100));
    });
    priceCompetitiveness = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  return { qualityPassRate, onTimeDeliveryRate, priceCompetitiveness };
}
