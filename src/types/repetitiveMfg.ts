import { BaseEntity } from './common';

export type RepLineStatus = 'running' | 'idle' | 'maintenance';
export type RepPeriodStatus = 'active' | 'closed';

/** 生产线 / 装配线（重复制造主数据） */
export interface ProductionLine extends BaseEntity {
  lineNo: string;
  name: string;
  workCenterId?: string;
  workCenterName?: string;
  status: RepLineStatus;
  /** 日产能（件） */
  dailyCapacity: number;
  note?: string;
}

/** 物料倒冲明细（单件标准耗用） */
export interface BackflushItem {
  id: string;
  materialCode: string;
  materialName: string;
  unit: string;
  /** 单件标准耗用量 */
  stdQty: number;
  /** 已倒冲耗用累计 */
  consumedQty: number;
}

/** 重复制造周期（P2-08）：按产线 + 期间归集产量，完工倒冲物料 */
export interface RepetitiveMfgPeriod extends BaseEntity {
  periodNo: string;
  lineId: string;
  lineNo: string;
  lineName: string;
  materialCode: string;
  materialName: string;
  startDate: string;
  endDate: string;
  plannedQty: number;
  producedQty: number;
  scrapQty: number;
  status: RepPeriodStatus;
  note?: string;
  backflushItems: BackflushItem[];
}

export const REP_LINE_STATUS_LABELS: Record<RepLineStatus, string> = {
  running: '运行中',
  idle: '空闲',
  maintenance: '保养中',
};

export const REP_PERIOD_STATUS_LABELS: Record<RepPeriodStatus, string> = {
  active: '进行中',
  closed: '已关闭',
};
