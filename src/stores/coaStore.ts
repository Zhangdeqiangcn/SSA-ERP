import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';

export interface COAItem {
  inspectionItem: string;
  standard: string;
  result: string;
  unit: string;
  conclusion: 'pass' | 'fail';
}

export interface COARecord {
  id: string;
  taskId: string;
  taskNo: string;
  productName: string;
  batchNo: string;
  standardName: string;
  items: COAItem[];
  overallConclusion: string;
  generatedDate: string;
  inspector: string;
  /** 自定义抬头信息（模板可配置） */
  companyName?: string;
  disclaimer?: string;
}

interface COAState {
  records: COARecord[];
  saveCoa: (coa: COARecord) => void;
  removeCoa: (id: string) => void;
}

export const useCOAStore = create<COAState>()(
  persist(
    (set) => ({
      records: [],
      saveCoa: (coa) =>
        set((s) => {
          const others = s.records.filter((r) => r.taskId !== coa.taskId);
          return { records: [{ ...coa, id: coa.id || `COA-${Date.now()}` }, ...others] };
        }),
      removeCoa: (id) => set((s) => ({ records: s.records.filter((r) => r.id !== id) })),
    }),
    { storage: backendStorage, name: 'ssa-erp-coa', version: 1 }
  )
);
