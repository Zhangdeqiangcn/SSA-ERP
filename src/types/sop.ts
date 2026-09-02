import { BaseEntity } from './common';

/** S&OP 销售与运营计划：连接需求预测与供应能力，达成产销平衡（P2-10） */
export type SopStatus = 'draft' | 'balanced' | 'approved' | 'executing';

export const SOP_STATUS_LABELS: Record<SopStatus, string> = {
  draft: '草稿',
  balanced: '已平衡',
  approved: '已审批',
  executing: '执行中',
};

export interface SopPlan extends BaseEntity {
  planNo: string;
  /** 计划期，如 2026-09 */
  period: string;
  /** 需求预测（吨） */
  demandForecast: number;
  /** 供应计划（吨） */
  supplyPlan: number;
  /** 产销平衡差 = 供应 - 需求（吨，正为富余、负为缺口） */
  balanceQty: number;
  status: SopStatus;
  owner: string;
  remark?: string;
}
