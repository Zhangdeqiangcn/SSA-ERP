import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { CopaRecord } from '@/types/copa';
import { copaRecords } from '@/mocks/data/copa';

interface CopaState {
  list: CopaRecord[];
  addRecord: (r: CopaRecord) => void;
  updateRecord: (id: string, u: Partial<CopaRecord>) => void;
  deleteRecord: (id: string) => void;
}

const addArr = <T,>(l: T[], i: T) => [...l, i];
const updateArr = <T extends { id: string }>(l: T[], id: string, u: Partial<T>) =>
  l.map((x) => (x.id === id ? { ...x, ...u } : x));
const deleteArr = <T extends { id: string }>(l: T[], id: string) => l.filter((x) => x.id !== id);

export const useCopaStore = create<CopaState>()(
  persist(
    (set) => ({
      list: [...copaRecords],
      addRecord: (r) => set((s) => ({ list: addArr(s.list, r) })),
      updateRecord: (id, u) => set((s) => ({ list: updateArr(s.list, id, u) })),
      deleteRecord: (id) => set((s) => ({ list: deleteArr(s.list, id) })),
    }),
    {
      storage: backendStorage,
      name: 'ssa-erp-copa',
      version: 1,
      partialize: (s) => ({ list: s.list }),
    }
  )
);
