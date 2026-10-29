import { createEntityStore } from './createEntityStore';
import { CopaRecord } from '@/types/copa';
import { copaRecords } from '@/mocks/data/copa';
import { UseBoundStore, StoreApi } from 'zustand';

// V2.80.0 W1：COPA 获利分析迁真实 D1（根治双通道）。
// V3.90.0：以上 CRUD 骨架（乐观更新+失败回滚+离线兜底+空库回填）统一收敛到通用工厂
//   createEntityStore（entityRepo 主源），本文件仅保留领域接口名（addRecord/updateRecord/...），调用方零改动。

interface CopaState {
  list: CopaRecord[];
  loaded: boolean;
  load: () => Promise<void>;
  addRecord: (r: CopaRecord) => Promise<void>;
  updateRecord: (id: string, u: Partial<CopaRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
}

export const useCopaStore = createEntityStore<CopaRecord>({
  resource: 'copa',
  seed: [...copaRecords],
  stateKey: 'list',
  backfillKey: 'ssa-erp-backfilled-copa',
  // 领域接口名委托给工厂内部 ops，保持调用方零改动
  extend: (ctx) => ({
    addRecord: (r: any) => ctx.primary.add(r),
    updateRecord: (id: any, u: any) => ctx.primary.update(id, u),
    deleteRecord: (id: any) => ctx.primary.remove(id),
  }),
}) as unknown as UseBoundStore<StoreApi<CopaState>>;
