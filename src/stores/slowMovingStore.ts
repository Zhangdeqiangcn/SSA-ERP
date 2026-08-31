import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';

export type DispositionAction = 'scrap' | 'reuse' | 'return' | 'promote' | 'other';

export const DISPOSITION_LABEL: Record<DispositionAction, string> = {
  scrap: '报废',
  reuse: '转用/代用',
  return: '退供应商',
  promote: '促销处理',
  other: '其他',
};

export interface SlowMovingDisposal {
  materialId: string;
  materialName: string;
  materialCode: string;
  action: DispositionAction;
  reason: string;
  quantity: number;
  value: number;
  date: string;
  by?: string;
}

interface SlowMovingState {
  disposals: SlowMovingDisposal[];
  /** 对呆滞物料登记处置决策（同物料重复登记覆盖） */
  dispose: (d: Omit<SlowMovingDisposal, 'date'> & { date?: string }) => void;
  removeDisposal: (materialId: string) => void;
}

export const useSlowMovingStore = create<SlowMovingState>()(
  persist(
    (set) => ({
      disposals: [],
      dispose: (d) =>
        set((s) => {
          const others = s.disposals.filter((x) => x.materialId !== d.materialId);
          return {
            disposals: [
              ...others,
              { ...d, date: d.date || new Date().toISOString().slice(0, 10) },
            ],
          };
        }),
      removeDisposal: (materialId) =>
        set((s) => ({ disposals: s.disposals.filter((x) => x.materialId !== materialId) })),
    }),
    { storage: backendStorage, name: 'ssa-erp-slow-moving', version: 1 }
  )
);
