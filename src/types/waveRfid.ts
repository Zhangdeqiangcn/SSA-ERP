import { BaseEntity } from './common';

export type WaveStatus = 'draft' | 'released' | 'in_progress' | 'completed' | 'closed';
export type WaveStrategy = 'time' | 'region' | 'carrier' | 'order';
export type RfidOpType = 'receive' | 'putaway' | 'pick' | 'transfer' | 'count';

/** 波次内拣货行 */
export interface WaveLine {
  id: string;
  orderNo: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  pickedQty: number;
  location: string;
}

/** 波次拣货（P2-07）：按策略将订单/行归集为一个拣货批次 */
export interface WaveRfid extends BaseEntity {
  waveNo: string;
  name: string;
  status: WaveStatus;
  /** 分组策略：按时段 / 库区 / 承运商 / 订单 */
  strategy: WaveStrategy;
  warehouseId: string;
  warehouseName: string;
  orderCount: number;
  lineCount: number;
  plannedDate: string;
  releasedAt?: string;
  note?: string;
  lines: WaveLine[];
}

/** RFID 采集事件流水（标签扫描记录） */
export interface RfidEvent extends BaseEntity {
  tagId: string;
  epc: string;
  opType: RfidOpType;
  /** 关联业务单号（波次 / 入库 / 出库） */
  bizNo: string;
  materialCode?: string;
  location?: string;
  operator: string;
  scannedAt: string;
  result: 'ok' | 'fail';
  message?: string;
}

export const WAVE_STATUS_LABELS: Record<WaveStatus, string> = {
  draft: '草稿',
  released: '已下达',
  in_progress: '拣货中',
  completed: '已完成',
  closed: '已关闭',
};

export const WAVE_STRATEGY_LABELS: Record<WaveStrategy, string> = {
  time: '按时段',
  region: '按库区',
  carrier: '按承运商',
  order: '按订单',
};

export const RFID_OP_LABELS: Record<RfidOpType, string> = {
  receive: '收货',
  putaway: '上架',
  pick: '拣货',
  transfer: '转储',
  count: '盘点',
};
