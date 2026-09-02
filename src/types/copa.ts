import { BaseEntity } from './common';

/** COPA 获利分析维度 */
export type CopaDimension = 'product' | 'customer' | 'region' | 'period';

/** 获利分析记录：按维度归集的收入与成本（毛利/毛利率派生） */
export interface CopaRecord extends BaseEntity {
  dimension: CopaDimension;
  key: string;
  label: string;
  period: string;
  revenue: number;
  cogs: number;
}

export const COPA_DIMENSION_LABELS: Record<CopaDimension, string> = {
  product: '产品',
  customer: '客户',
  region: '区域',
  period: '期间',
};
