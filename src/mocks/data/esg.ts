import { EsgReport } from '@/types/esg';

const now = new Date().toISOString();

export const esgReports: EsgReport[] = [
  // 环境 E
  { id: 'esg-e1', reportNo: 'ESG-2026-E001', period: '2026-H1', category: 'E', indicator: '单位产品碳排放', value: 1.82, unit: 'tCO2/吨钢', target: 1.75, status: 'published', createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'esg-e2', reportNo: 'ESG-2026-E002', period: '2026-H1', category: 'E', indicator: '综合能耗', value: 580, unit: 'kgce/吨钢', target: 560, status: 'published', createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'esg-e3', reportNo: 'ESG-2026-E003', period: '2026-H1', category: 'E', indicator: '工业水重复利用率', value: 97.5, unit: '%', target: 98, status: 'draft', createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  // 社会 S
  { id: 'esg-s1', reportNo: 'ESG-2026-S001', period: '2026-H1', category: 'S', indicator: '千人工伤率', value: 0.12, unit: '‰', target: 0.1, status: 'published', createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'esg-s2', reportNo: 'ESG-2026-S002', period: '2026-H1', category: 'S', indicator: '员工培训时长', value: 42, unit: '小时/人年', target: 40, status: 'published', createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  // 治理 G
  { id: 'esg-g1', reportNo: 'ESG-2026-G001', period: '2026-H1', category: 'G', indicator: '合规事项完成率', value: 99.1, unit: '%', target: 99, status: 'published', createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'esg-g2', reportNo: 'ESG-2026-G002', period: '2026-H1', category: 'G', indicator: '独立董事占比', value: 38, unit: '%', target: 33, status: 'published', createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
];
