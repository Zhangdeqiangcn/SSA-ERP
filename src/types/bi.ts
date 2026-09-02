import { BaseEntity } from './common';

/** BI 集成：连接外部商业智能平台（Power BI / Tableau / 帆软等）的数据源与看板（P2-19） */
export type BiPlatform = 'powerbi' | 'tableau' | 'finereport' | 'metabase' | 'superset';

export const BI_PLATFORM_LABELS: Record<BiPlatform, string> = {
  powerbi: 'Power BI',
  tableau: 'Tableau',
  finereport: '帆软报表',
  metabase: 'Metabase',
  superset: 'Apache Superset',
};

export type BiStatus = 'connected' | 'disconnected' | 'error';

export const BI_STATUS_LABELS: Record<BiStatus, string> = {
  connected: '已连接',
  disconnected: '未连接',
  error: '异常',
};

export interface BiConnection extends BaseEntity {
  connNo: string;
  connName: string;
  platform: BiPlatform;
  /** 服务地址 / API Endpoint */
  endpoint: string;
  /** 数据集 / 看板名称 */
  dataset: string;
  status: BiStatus;
  lastSyncAt?: string;
  remark?: string;
}
