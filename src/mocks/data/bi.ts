import { BiConnection } from '@/types/bi';

const now = new Date().toISOString();

export const biConnections: BiConnection[] = [
  {
    id: 'bi-001', connNo: 'BI-2026-0001', connName: '经营驾驶舱-PowerBI',
    platform: 'powerbi', endpoint: 'https://pbisrv.internal/erp-cockpit', dataset: '经营驾驶舱',
    status: 'connected', lastSyncAt: now,
    createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin',
  },
  {
    id: 'bi-002', connNo: 'BI-2026-0002', connName: '销售分析-Tableau',
    platform: 'tableau', endpoint: 'https://tableau.internal/sales', dataset: '销售主题',
    status: 'disconnected',
    createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin',
  },
  {
    id: 'bi-003', connNo: 'BI-2026-0003', connName: '财务报表-帆软',
    platform: 'finereport', endpoint: 'https://finereport.internal/finance', dataset: '三大财务报表',
    status: 'error',
    createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin',
  },
];
