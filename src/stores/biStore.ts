import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { BiConnection, BiStatus } from '@/types/bi';
import { biConnections } from '@/mocks/data/bi';

// V2.80.0 W1：BI 集成迁真实 D1（根治双通道）。
// 单资源 biIntegration 经 entityRepo 读写，移除原 persist(backendStorage) 本地存储 Blob。
// 乐观更新 + 失败回滚 + 首次空库回填 seed（离线/Mock 兜底，不阻断 UI）。
interface BiState {
  list: BiConnection[];
  loaded: boolean;
  load: () => Promise<void>;
  addConn: (c: BiConnection) => Promise<void>;
  updateConn: (id: string, updates: Partial<BiConnection>) => Promise<void>;
  deleteConn: (id: string) => Promise<void>;
  /** 触发一次同步：置为 connected 并记录 lastSyncAt（模拟 BI 平台拉取成功） */
  syncConnection: (id: string) => Promise<void>;
}

const BI = 'biIntegration';
const flagKey = 'ssa-erp-backfilled-bi';

export const useBiStore = create<BiState>()((set, get) => ({
  list: [...biConnections],
  loaded: false,

  load: async () => {
    try {
      const r = await entityRepo.list<BiConnection>(BI, { page: 1, pageSize: 200 });
      const list = (r?.data || []) as BiConnection[];
      if (list.length === 0 && !localStorage.getItem(flagKey)) {
        localStorage.setItem(flagKey, '1');
        for (const c of biConnections) { try { await entityRepo.create<BiConnection>(BI, c); } catch { /* 尽力回填 */ } }
        const r2 = await entityRepo.list<BiConnection>(BI, { page: 1, pageSize: 200 });
        set({ list: ((r2?.data || []) as BiConnection[]).length ? (r2?.data as BiConnection[]) : [...biConnections], loaded: true });
        return;
      }
      set({ list: list.length ? list : [...biConnections], loaded: true });
    } catch {
      set({ list: [...biConnections], loaded: true });
    }
  },

  addConn: async (c) => {
    set((s) => ({ list: [...s.list, c] }));
    try {
      const created = await entityRepo.create<BiConnection>(BI, c);
      set((s) => ({ list: s.list.map((x) => (x.id === c.id ? (created as BiConnection) : x)) }));
    } catch { set((s) => ({ list: s.list.filter((x) => x.id !== c.id) })); }
  },
  updateConn: async (id, u) => {
    const prev = get().list.find((x) => x.id === id);
    set((s) => ({ list: s.list.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    try { await entityRepo.update<BiConnection>(BI, id, u); }
    catch { if (prev) set((s) => ({ list: s.list.map((x) => (x.id === id ? prev : x)) })); }
  },
  deleteConn: async (id) => {
    const prev = [...get().list];
    set((s) => ({ list: s.list.filter((x) => x.id !== id) }));
    try { await entityRepo.remove(BI, id); } catch { set({ list: prev }); }
  },
  syncConnection: async (id) => {
    const prev = get().list.find((x) => x.id === id);
    const patch = { status: 'connected' as BiStatus, lastSyncAt: new Date().toISOString() };
    set((s) => ({ list: s.list.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    try { await entityRepo.update<BiConnection>(BI, id, patch); }
    catch { if (prev) set((s) => ({ list: s.list.map((x) => (x.id === id ? prev : x)) })); }
  },
}));
