import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { TripartySale } from '@/types/tripartySales';
import { tripartySales } from '@/mocks/data/tripartySales';

interface TripartySalesState {
  list: TripartySale[];
  addSale: (s: TripartySale) => void;
  updateSale: (id: string, u: Partial<TripartySale>) => void;
  deleteSale: (id: string) => void;
}

const addArr = <T,>(l: T[], i: T) => [...l, i];
const updateArr = <T extends { id: string }>(l: T[], id: string, u: Partial<T>) =>
  l.map((x) => (x.id === id ? { ...x, ...u } : x));
const deleteArr = <T extends { id: string }>(l: T[], id: string) => l.filter((x) => x.id !== id);

export const useTripartySalesStore = create<TripartySalesState>()(
  persist(
    (set) => ({
      list: [...tripartySales],
      addSale: (s) => set((st) => ({ list: addArr(st.list, s) })),
      updateSale: (id, u) => set((st) => ({ list: updateArr(st.list, id, u) })),
      deleteSale: (id) => set((st) => ({ list: deleteArr(st.list, id) })),
    }),
    {
      storage: backendStorage,
      name: 'ssa-erp-triparty-sales',
      version: 1,
      partialize: (s) => ({ list: s.list }),
    }
  )
);
