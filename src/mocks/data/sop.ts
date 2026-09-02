import { SopPlan } from '@/types/sop';

const now = new Date().toISOString();

export const sopPlans: SopPlan[] = [
  {
    id: 'sop-001', planNo: 'SOP-2026-0001', period: '2026-09',
    demandForecast: 12000, supplyPlan: 12500, balanceQty: 500,
    status: 'approved', owner: '生产计划部',
    createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin',
  },
  {
    id: 'sop-002', planNo: 'SOP-2026-0002', period: '2026-10',
    demandForecast: 13500, supplyPlan: 13000, balanceQty: -500,
    status: 'balanced', owner: '生产计划部',
    createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin',
  },
  {
    id: 'sop-003', planNo: 'SOP-2026-0003', period: '2026-11',
    demandForecast: 11000, supplyPlan: 11000, balanceQty: 0,
    status: 'draft', owner: '生产计划部',
    createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin',
  },
];
