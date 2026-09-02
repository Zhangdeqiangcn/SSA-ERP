import { BaseEntity } from './common';

export type MesConnStatus = 'connected' | 'disconnected' | 'error';
export type DeviceStatus = 'running' | 'idle' | 'down' | 'maintenance';
export type WipStatus = 'waiting' | 'processing' | 'done';
export type OpReportStatus = 'pending' | 'in_progress' | 'completed';

/** MES 连接配置（P2-09）：与车间 MES 系统的接口对接 */
export interface MesConnection extends BaseEntity {
  name: string;
  endpoint: string;
  protocol: 'REST' | 'OPC-UA' | 'MQTT';
  apiKey?: string;
  status: MesConnStatus;
  lastSyncAt?: string;
  note?: string;
}

/** 设备状态（车间执行层采集） */
export interface MesDeviceStatus extends BaseEntity {
  deviceCode: string;
  deviceName: string;
  workCenter: string;
  status: DeviceStatus;
  /** 设备综合效率 OEE（%） */
  oee: number;
  reportedAt: string;
}

/** 在制品 WIP 跟踪 */
export interface WipTrack extends BaseEntity {
  workOrderId: string;
  workOrderNo: string;
  productCode: string;
  productName: string;
  qty: number;
  station: string;
  status: WipStatus;
  updatedAt: string;
}

/** 工序级报工（车间执行层数据采集，复用 production.OperationReport 思路） */
export interface MesOperationReport extends BaseEntity {
  workOrderId: string;
  workOrderNo: string;
  operationName: string;
  workCenter: string;
  operator: string;
  goodQuantity: number;
  scrapQuantity: number;
  reportedAt: string;
  status: OpReportStatus;
}

export const MES_CONN_STATUS_LABELS: Record<MesConnStatus, string> = {
  connected: '已连接',
  disconnected: '未连接',
  error: '异常',
};

export const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  running: '运行',
  idle: '空闲',
  down: '故障',
  maintenance: '保养',
};

export const WIP_STATUS_LABELS: Record<WipStatus, string> = {
  waiting: '等待',
  processing: '加工中',
  done: '完成',
};

export const OP_REPORT_STATUS_LABELS: Record<OpReportStatus, string> = {
  pending: '待报工',
  in_progress: '进行中',
  completed: '已报工',
};
