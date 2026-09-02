import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { SopPlan } from '@/types/sop';
import { sopPlans } from '@/mocks/data/sop';

interface SopState {
  list: SopPlan[];
  addPlan: (p: SopPlan) => void;
  updatePlan: (id: string, updates: Partial<SopPlan>) => void;
  deletePlan: (id: string) => void;
}

const addArr = <T,>(list: T[], item: T) => [...list, item];
const updateArr = <T extends { id: string }>(list: T[], id: string, u: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...u } : x));
const deleteArr = <T extends { id: string }>(list: T[], id: string) =>
  list.filter((x) => x.id !== id);

export const useSopStore = create<SopState>()(
  persist(
    (set) => ({
      list: [...sopPlans],
      addPlan: (p) => set((s) => ({ list: addArr(s.list, p) })),
      updatePlan: (id, u) => set((s) => ({ list: updateArr(s.list, id, u) })),
      deletePlan: (id) => set((s) => ({ list: deleteArr(s.list, id) })),
    }),
    {
      storage: backendStorage,
      name: 'ssa-erp-sop',
      version: 1,
      partialize: (state) => ({ list: state.list }),
    }
  )
);
