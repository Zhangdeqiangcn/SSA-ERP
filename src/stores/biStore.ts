import type { UseBoundStore, StoreApi } from 'zustand';
import { BiConnection, BiStatus } from '@/types/bi';
import { biConnections } from '@/mocks/data/bi';
import { createEntityStore } from './createEntityStore';

// 迁统一仓储工厂（V2）：单资源 biIntegration，云端数据库主源 + 模拟兜底 + 空库回填。
// 保留既有 list/addConn/updateConn/deleteConn 接口；自定义 syncConnection 经 extend 钩子
// 复用工厂的乐观更新 + 失败回滚（置 connected 并记录 lastSyncAt）。调用页面无需改动。
// 注：工厂返回通用类型，这里用领域接口 + 类型断言还原强类型（运行行为不变）。
interface BiState {
  list: BiConnection[];
  loaded: boolean;
  load: () => Promise<void>;
  addConn: (c: BiConnection) => Promise<void>;
  updateConn: (id: string, u: Partial<BiConnection>) => Promise<void>;
  deleteConn: (id: string) => Promise<void>;
  syncConnection: (id: string) => Promise<void>;
}

export const useBiStore = createEntityStore<BiConnection>({
  resource: 'biIntegration',
  seed: [...biConnections],
  stateKey: 'list',
  backfillKey: 'ssa-erp-backfilled-bi',
  extend: (ctx) => ({
    addConn: (c: BiConnection) => ctx.primary.add(c),
    updateConn: (id: string, u: Partial<BiConnection>) => ctx.primary.update(id, u),
    deleteConn: (id: string) => ctx.primary.remove(id),
    syncConnection: async (id: string) => {
      const patch = { status: 'connected' as BiStatus, lastSyncAt: new Date().toISOString() };
      await ctx.primary.update(id, patch);
    },
  }),
}) as unknown as UseBoundStore<StoreApi<BiState>>;
