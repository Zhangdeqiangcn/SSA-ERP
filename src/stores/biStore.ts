import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { BiConnection, BiStatus } from '@/types/bi';
import { biConnections } from '@/mocks/data/bi';

interface BiState {
  list: BiConnection[];
  addConn: (c: BiConnection) => void;
  updateConn: (id: string, updates: Partial<BiConnection>) => void;
  deleteConn: (id: string) => void;
  /** 触发一次同步：置为 connected 并记录 lastSyncAt（模拟 BI 平台拉取成功） */
  syncConnection: (id: string) => void;
}

const addArr = <T,>(list: T[], item: T) => [...list, item];
const updateArr = <T extends { id: string }>(list: T[], id: string, u: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...u } : x));
const deleteArr = <T extends { id: string }>(list: T[], id: string) =>
  list.filter((x) => x.id !== id);

export const useBiStore = create<BiState>()(
  persist(
    (set) => ({
      list: [...biConnections],
      addConn: (c) => set((s) => ({ list: addArr(s.list, c) })),
      updateConn: (id, u) => set((s) => ({ list: updateArr(s.list, id, u) })),
      deleteConn: (id) => set((s) => ({ list: deleteArr(s.list, id) })),
      syncConnection: (id) =>
        set((s) => ({
          list: s.list.map((c) =>
            c.id === id ? { ...c, status: 'connected' as BiStatus, lastSyncAt: new Date().toISOString() } : c
          ),
        })),
    }),
    {
      storage: backendStorage,
      name: 'ssa-erp-bi',
      version: 1,
      partialize: (state) => ({ list: state.list }),
    }
  )
);
