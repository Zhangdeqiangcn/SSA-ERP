import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { TripartySale } from '@/types/tripartySales';
import { tripartySales } from '@/mocks/data/tripartySales';

// V2.80.0 W1：三方销售（代销结算）迁真实 D1（根治双通道）。
// 单资源 tripartySale 经 entityRepo 读写，移除原 persist(backendStorage) 本地存储 Blob。
interface TripartySalesState {
  list: TripartySale[];
  loaded: boolean;
  load: () => Promise<void>;
  addSale: (s: TripartySale) => Promise<void>;
  updateSale: (id: string, u: Partial<TripartySale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
}

const RES = 'tripartySale';
const flagKey = 'ssa-erp-backfilled-tripartySale';

export const useTripartySalesStore = create<TripartySalesState>()((set, get) => ({
  list: [...tripartySales],
  loaded: false,

  load: async () => {
    try {
      const res = await entityRepo.list<TripartySale>(RES, { page: 1, pageSize: 200 });
      const list = (res?.data || []) as TripartySale[];
      if (list.length === 0 && !localStorage.getItem(flagKey)) {
        localStorage.setItem(flagKey, '1');
        for (const item of tripartySales) { try { await entityRepo.create<TripartySale>(RES, item); } catch { /* 尽力回填 */ } }
        const refreshed = await entityRepo.list<TripartySale>(RES, { page: 1, pageSize: 200 });
        set({ list: (refreshed?.data || []) as TripartySale[], loaded: true });
        return;
      }
      set({ list: list.length ? list : [...tripartySales], loaded: true });
    } catch {
      set({ list: [...tripartySales], loaded: true });
    }
  },

  addSale: async (s) => {
    set((st) => ({ list: [...st.list, s] }));
    try {
      const created = await entityRepo.create<TripartySale>(RES, s);
      set((st) => ({ list: st.list.map((x) => (x.id === s.id ? (created as TripartySale) : x)) }));
    } catch { set((st) => ({ list: st.list.filter((x) => x.id !== s.id) })); }
  },

  updateSale: async (id, u) => {
    const prev = get().list.find((x) => x.id === id);
    set((st) => ({ list: st.list.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    try { await entityRepo.update<TripartySale>(RES, id, u); }
    catch { if (prev) set((st) => ({ list: st.list.map((x) => (x.id === id ? prev : x)) })); }
  },

  deleteSale: async (id) => {
    const prev = [...get().list];
    set((st) => ({ list: st.list.filter((x) => x.id !== id) }));
    try { await entityRepo.remove(RES, id); } catch { set({ list: prev }); }
  },
}));
