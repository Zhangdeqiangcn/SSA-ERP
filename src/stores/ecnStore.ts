import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EngineeringChange } from '@/types/material';

const STORE_KEY = 'ssa-erp-ecn';

const seedECNs: EngineeringChange[] = [
  {
    id: 'ecn-001',
    changeNo: 'ECN-2026-001',
    title: '钢板厚度升级',
    materialId: 'mat-001',
    materialName: '热轧钢板 Q235B 3mm',
    fromVersion: 'V1.0',
    toVersion: 'V2.0',
    changeType: 'material',
    oldValue: '3mm',
    newValue: '5mm',
    effectiveDate: '2026-09-01',
    status: 'draft',
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'ecn-002',
    changeNo: 'ECN-2026-002',
    title: '焊接工艺变更',
    materialId: 'mat-002',
    materialName: 'H型钢 200×200×8×12',
    fromVersion: 'V1.0',
    toVersion: 'V2.0',
    changeType: 'bom',
    oldValue: '手工焊接',
    newValue: '自动焊接',
    effectiveDate: '2026-10-01',
    status: 'approved',
    approvedBy: '工艺主管',
    createdAt: '2026-08-05T08:00:00Z',
    updatedAt: '2026-08-05T08:00:00Z',
  },
];

interface ECNState {
  ecns: EngineeringChange[];
  addECN: (ecn: EngineeringChange) => void;
  updateECN: (id: string, patch: Partial<EngineeringChange>) => void;
  deleteECN: (id: string) => void;
  getECNById: (id: string) => EngineeringChange | undefined;
}

export const useECNStore = create<ECNState>()(
  persist(
    (set, get) => ({
      ecns: seedECNs.map((e) => ({ ...e })),

      addECN: (ecn) => set((state) => ({ ecns: [...state.ecns, ecn] })),

      updateECN: (id, patch) =>
        set((state) => ({
          ecns: state.ecns.map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e
          ),
        })),

      deleteECN: (id) =>
        set((state) => ({ ecns: state.ecns.filter((e) => e.id !== id) })),

      getECNById: (id) => get().ecns.find((e) => e.id === id),
    }),
    {
      name: STORE_KEY,
      version: 1,
      partialize: (state) => ({ ecns: state.ecns }),
    }
  )
);
