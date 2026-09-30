import { BaseEntity } from './common';

export type BOMType = 'EBOM' | 'MBOM';
export type BOMStatus = 'draft' | 'released' | 'obsolete';

/** 联产品项 */
export interface CoProduct {
  materialId: string;
  materialName: string;
  outputRatio: number; // 每产出一单位主产品，联产 ratio 单位的联产品
}

/** 副产品项 */
export interface ByProduct {
  materialId: string;
  materialName: string;
  outputQuantity: number; // 固定产出量
  unitPrice?: number;     // 价值抵减
}

export type CostSplitMethod = 'weight' | 'volume' | 'market_value';

export interface BOMHeader extends BaseEntity {
  bomNo: string;
  name: string;
  sourceOrderNo?: string; // 关联来源销售订单号（由 SO 一键创建 BOM 时写入）
  type: BOMType;
  status: BOMStatus;
  productId: string;
  productCode: string;
  productName: string;
  version: string;
  effectiveDate: string;
  expiryDate?: string;
  totalCost?: number;
  currency: string;
  description?: string;
  approvedBy?: string;
  approvedAt?: string;
  items?: BOMItem[];

  // ── P1-18 替代BOM ──
  /** 是否替代BOM */
  isAlternate?: boolean;
  /** 使用概率（%） */
  usageProbability?: number;
  /** 优先级（越小越优先选） */
  priority?: number;

  // ── P1-19 联产品/副产品 ──
  /** 联产品 */
  coProducts?: CoProduct[];
  /** 副产品 */
  byProducts?: ByProduct[];
  /** 成本分摊方法 */
  costSplitMethod?: CostSplitMethod;
}

export interface BOMItem {
  id: string;
  bomId: string;
  level: number;
  sequence: number;
  materialId: string;
  materialCode: string;
  materialName: string;
  materialSpec?: string;
  unit: string;
  quantity: number;
  scrapRate: number;       // 废品率 %
  unitCost: number;
  totalCost: number;
  /**
   * 实际单价（移动均价口径，与 unitCost 同单位同口径）。
   * 真实来源应为物料主数据的 movingAvgPrice（按 materialId 关联、单位一致时优先采用）；
   * 演示态由 BOM 项自带此字段，避免强依赖物料主数据对齐。待 bomTreeData 接通 D1 后切换为真实来源。
   */
  actualUnitCost?: number;
  leadTime?: number;       // 采购/生产提前期（天）
  source: 'purchase' | 'manufacture' | 'phantom';
  isCritical: boolean;
  children?: BOMItem[];

  // 成本卷积扩展字段
  childProductCode?: string; // 若该项引用一个"子装配/子产品"，则通过 productCode 递归其 BOM
  laborCost?: number;        // 该项的人工/工时成本
  processCost?: number;      // 该项的工序成本
}

export interface CostRollupResult {
  bomId: string;
  bomNo: string;
  productName: string;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  costBreakdown: CostBreakdownItem[];
  updatedAt: string;
}

export interface CostBreakdownItem {
  level: number;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  percentage: number;
}
