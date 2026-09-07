import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { EsgReport } from '@/types/esg';
import { esgReports } from '@/mocks/data/esg';

// V2.80.0 W1：ESG 报告迁真实 D1（根治双通道）。
// 单资源 esgReport 经 entityRepo 读写，移除原 persist(backendStorage) 本地存储 Blob。
// 首次空库回填 seed（flagKey 防重复），离线/Mock 兜底 + 乐观更新失败回滚。
interface EsgState {
  list: EsgReport[];
  loaded: boolean;
  load: () => Promise<void>;
  addReport: (r: EsgReport) => Promise<void>;
  updateReport: (id: string, updates: Partial<EsgReport>) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
}

const RES = 'esgReport';
const flagKey = 'ssa-erp-backfilled-esg';

export const useEsgStore = create<EsgState>()((set, get) => ({
  list: [...esgReports],
  loaded: false,

  load: async () => {
    try {
      const res = await entityRepo.list<EsgReport>(RES, { page: 1, pageSize: 200 });
      const list = (res?.data || []) as EsgReport[];
      if (list.length === 0 && !localStorage.getItem(flagKey)) {
        localStorage.setItem(flagKey, '1');
        for (const r of esgReports) { try { await entityRepo.create<EsgReport>(RES, r); } catch { /* 尽力回填 */ } }
        const res2 = await entityRepo.list<EsgReport>(RES, { page: 1, pageSize: 200 });
        set({ list: (res2?.data || []) as EsgReport[], loaded: true });
        return;
      }
      set({ list: list.length ? list : [...esgReports], loaded: true });
    } catch {
      set({ list: [...esgReports], loaded: true });
    }
  },

  addReport: async (r) => {
    set((s) => ({ list: [...s.list, r] }));
    try {
      const created = await entityRepo.create<EsgReport>(RES, r);
      set((s) => ({ list: s.list.map((x) => (x.id === r.id ? (created as EsgReport) : x)) }));
    } catch { set((s) => ({ list: s.list.filter((x) => x.id !== r.id) })); }
  },

  updateReport: async (id, u) => {
    const prev = get().list.find((x) => x.id === id);
    set((s) => ({ list: s.list.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    try { await entityRepo.update<EsgReport>(RES, id, u); }
    catch { if (prev) set((s) => ({ list: s.list.map((x) => (x.id === id ? prev : x)) })); }
  },

  deleteReport: async (id) => {
    const prev = [...get().list];
    set((s) => ({ list: s.list.filter((x) => x.id !== id) }));
    try { await entityRepo.remove(RES, id); } catch { set({ list: prev }); }
  },
}));
