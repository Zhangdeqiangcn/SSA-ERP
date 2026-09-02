import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { EsgReport } from '@/types/esg';
import { esgReports } from '@/mocks/data/esg';

interface EsgState {
  list: EsgReport[];
  addReport: (r: EsgReport) => void;
  updateReport: (id: string, updates: Partial<EsgReport>) => void;
  deleteReport: (id: string) => void;
}

const addArr = <T,>(list: T[], item: T) => [...list, item];
const updateArr = <T extends { id: string }>(list: T[], id: string, u: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...u } : x));
const deleteArr = <T extends { id: string }>(list: T[], id: string) =>
  list.filter((x) => x.id !== id);

export const useEsgStore = create<EsgState>()(
  persist(
    (set) => ({
      list: [...esgReports],
      addReport: (r) => set((s) => ({ list: addArr(s.list, r) })),
      updateReport: (id, u) => set((s) => ({ list: updateArr(s.list, id, u) })),
      deleteReport: (id) => set((s) => ({ list: deleteArr(s.list, id) })),
    }),
    {
      storage: backendStorage,
      name: 'ssa-erp-esg',
      version: 1,
      partialize: (state) => ({ list: state.list }),
    }
  )
);
