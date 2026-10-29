import { createEntityStore } from './createEntityStore';
import { TripartySale } from '@/types/tripartySales';
import { tripartySales } from '@/mocks/data/tripartySales';
import { UseBoundStore, StoreApi } from 'zustand';

// V2.80.0 W1：三方销售（代销结算）迁真实 D1（根治双通道）。
// V3.90.0：以上 CRUD 骨架（乐观更新+失败回滚+离线兜底+空库回填）统一收敛到通用工厂
//   createEntityStore（entityRepo 主源），本文件仅保留领域接口名（addSale/updateSale/...），调用方零改动。

interface TripartySalesState {
  list: TripartySale[];
  loaded: boolean;
  load: () => Promise<void>;
  addSale: (s: TripartySale) => Promise<void>;
  updateSale: (id: string, u: Partial<TripartySale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
}

export const useTripartySalesStore = createEntityStore<TripartySale>({
  resource: 'tripartySale',
  seed: [...tripartySales],
  stateKey: 'list',
  backfillKey: 'ssa-erp-backfilled-tripartySale',
  // 领域接口名委托给工厂内部 ops，保持调用方零改动
  extend: (ctx) => ({
    addSale: (s: any) => ctx.primary.add(s),
    updateSale: (id: any, u: any) => ctx.primary.update(id, u),
    deleteSale: (id: any) => ctx.primary.remove(id),
  }),
}) as unknown as UseBoundStore<StoreApi<TripartySalesState>>;
