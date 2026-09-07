import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { CopaRecord } from '@/types/copa';
import { copaRecords } from '@/mocks/data/copa';

// V2.80.0 W1：COPA 获利分析迁真实 D1（根治双通道）。
// 单资源 copa 经 entityRepo 读写，移除原 persist(backendStorage) 本地存储 Blob。
// 首次空库回填 seed（flagKey 防重复回填），离线/Mock 兜底 + 乐观更新失败回滚。
interface CopaState {
  list: CopaRecord[];
  loaded: boolean;
  load: () => Promise<void>;
  addRecord: (r: CopaRecord) => Promise<void>;
  updateRecord: (id: string, u: Partial<CopaRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
}

const COPA = 'copa';
const flagKey = 'ssa-erp-backfilled-copa';

export const useCopaStore = create<CopaState>()((set, get) => ({
  list: [...copaRecords],
  loaded: false,

  load: async () => {
    try {
      const res = await entityRepo.list<CopaRecord>(COPA, { page: 1, pageSize: 200 });
      const list = (res?.data || []) as CopaRecord[];
      if (list.length === 0 && !localStorage.getItem(flagKey)) {
        localStorage.setItem(flagKey, '1');
        for (const r of copaRecords) { try { await entityRepo.create<CopaRecord>(COPA, r); } catch { /* 尽力回填 */ } }
        const res2 = await entityRepo.list<CopaRecord>(COPA, { page: 1, pageSize: 200 });
        set({ list: (res2?.data || []) as CopaRecord[], loaded: true });
        return;
      }
      set({ list: list.length ? list : [...copaRecords], loaded: true });
    } catch {
      set({ list: [...copaRecords], loaded: true });
    }
  },

  addRecord: async (r) => {
    set((s) => ({ list: [...s.list, r] }));
    try {
      const created = await entityRepo.create<CopaRecord>(COPA, r);
      set((s) => ({ list: s.list.map((x) => (x.id === r.id ? (created as CopaRecord) : x)) }));
    } catch { set((s) => ({ list: s.list.filter((x) => x.id !== r.id) })); }
  },
  updateRecord: async (id, u) => {
    const prev = get().list.find((x) => x.id === id);
    set((s) => ({ list: s.list.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    try { await entityRepo.update<CopaRecord>(COPA, id, u); }
    catch { if (prev) set((s) => ({ list: s.list.map((x) => (x.id === id ? prev : x)) })); }
  },
  deleteRecord: async (id) => {
    const prev = [...get().list];
    set((s) => ({ list: s.list.filter((x) => x.id !== id) }));
    try { await entityRepo.remove(COPA, id); } catch { set({ list: prev }); }
  },
}));
