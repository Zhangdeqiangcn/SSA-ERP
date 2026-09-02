import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { ProductionLine, RepetitiveMfgPeriod } from '@/types/repetitiveMfg';
import { productionLines, repetitivePeriods } from '@/mocks/data/repetitiveMfg';

interface RepetitiveMfgState {
  lines: ProductionLine[];
  periods: RepetitiveMfgPeriod[];

  addLine: (l: ProductionLine) => void;
  updateLine: (id: string, updates: Partial<ProductionLine>) => void;
  deleteLine: (id: string) => void;

  addPeriod: (p: RepetitiveMfgPeriod) => void;
  updatePeriod: (id: string, updates: Partial<RepetitiveMfgPeriod>) => void;
  deletePeriod: (id: string) => void;

  /**
   * 产量报工（P2-08 核心）：按产出数量回写周期产量，并据此倒冲(backflush)各物料耗用。
   * 倒冲：consumedQty += stdQty * 报工合格数；报废单独累计，不计入产出但计入 scrapQty。
   */
  reportProduction: (periodId: string, goodQty: number, scrapQty: number) => boolean;
}

const addArr = <T,>(list: T[], item: T) => [...list, item];
const updateArr = <T extends { id: string }>(list: T[], id: string, u: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...u } : x));
const deleteArr = <T extends { id: string }>(list: T[], id: string) =>
  list.filter((x) => x.id !== id);

export const useRepetitiveMfgStore = create<RepetitiveMfgState>()(
  persist(
    (set, get) => ({
      lines: [...productionLines],
      periods: [...repetitivePeriods],

      addLine: (l) => set((s) => ({ lines: addArr(s.lines, l) })),
      updateLine: (id, u) => set((s) => ({ lines: updateArr(s.lines, id, u) })),
      deleteLine: (id) => set((s) => ({ lines: deleteArr(s.lines, id) })),

      addPeriod: (p) => set((s) => ({ periods: addArr(s.periods, p) })),
      updatePeriod: (id, u) => set((s) => ({ periods: updateArr(s.periods, id, u) })),
      deletePeriod: (id) => set((s) => ({ periods: deleteArr(s.periods, id) })),

      reportProduction: (periodId, goodQty, scrapQty) => {
        const period = get().periods.find((p) => p.id === periodId);
        if (!period || period.status === 'closed') return false;
        const backflushItems = period.backflushItems.map((it) => ({
          ...it,
          consumedQty: Math.round((it.consumedQty + it.stdQty * goodQty) * 1000) / 1000,
        }));
        set((s) => ({
          periods: s.periods.map((p) =>
            p.id === periodId
              ? {
                  ...p,
                  producedQty: p.producedQty + goodQty,
                  scrapQty: p.scrapQty + scrapQty,
                  backflushItems,
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
        return true;
      },
    }),
    {
      storage: backendStorage,
      name: 'ssa-erp-repetitive-mfg',
      version: 1,
      partialize: (state) => ({ lines: state.lines, periods: state.periods }),
    }
  )
);
