import type { UseBoundStore, StoreApi } from 'zustand';
import { EsgReport } from '@/types/esg';
import { esgReports } from '@/mocks/data/esg';
import { createEntityStore } from './createEntityStore';

// 迁统一仓储工厂（V2）：单资源 esgReport，云端数据库主源 + 模拟兜底 + 空库回填。
// 保留既有 list/addReport/updateReport/deleteReport 接口（stateKey + extend），
// 调用页面无需改动；回填标记沿用旧键，避免重复灌种子。
// 注：工厂返回通用类型，这里用领域接口 + 类型断言还原强类型（运行行为不变）。
interface EsgState {
  list: EsgReport[];
  loaded: boolean;
  load: () => Promise<void>;
  addReport: (r: EsgReport) => Promise<void>;
  updateReport: (id: string, u: Partial<EsgReport>) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
}

export const useEsgStore = createEntityStore<EsgReport>({
  resource: 'esgReport',
  seed: [...esgReports],
  stateKey: 'list',
  backfillKey: 'ssa-erp-backfilled-esg',
  extend: (ctx) => ({
    addReport: (r: EsgReport) => ctx.primary.add(r),
    updateReport: (id: string, u: Partial<EsgReport>) => ctx.primary.update(id, u),
    deleteReport: (id: string) => ctx.primary.remove(id),
  }),
}) as unknown as UseBoundStore<StoreApi<EsgState>>;
