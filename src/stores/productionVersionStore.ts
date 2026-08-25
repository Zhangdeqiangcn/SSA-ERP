import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { ProductionVersion, ECN } from '@/types/production';
import { useBOMStore } from './bomStore';

const STORE_KEY = 'ssa-erp-prod-versions';

const seedVersions: ProductionVersion[] = [
  {
    id: 'pv-001',
    version: 'V1.0',
    materialId: 'mat-001',
    materialCode: 'PRD-FRAME-001',
    materialName: '重型钢结构焊接架 H1200',
    bomId: 'bom-001',
    bomNo: 'BOM-2024-001',
    routeId: 'route-001',
    routeNo: 'R-2024-001',
    status: 'active',
    effectiveDate: '2026-01-01',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'system',
    updatedBy: 'system',
  },
];

const seedECNs: ECN[] = [
  {
    id: 'ecn-001',
    changeNo: 'ECN-2026-001',
    title: '焊接架结构加强',
    reason: '客户反馈承重不足，增加加强筋工序',
    materialId: 'mat-001',
    materialCode: 'PRD-FRAME-001',
    materialName: '重型钢结构焊接架 H1200',
    bomId: 'bom-001',
    bomNo: 'BOM-2024-001',
    oldVersion: 'V2.0',
    newVersion: 'V2.1',
    effectiveDate: '2026-08-01',
    status: 'draft',
    createdAt: '2026-07-10T08:00:00.000Z',
    updatedAt: '2026-07-10T08:00:00.000Z',
    createdBy: 'system',
    updatedBy: 'system',
  },
];

interface ProductionVersionState {
  versions: ProductionVersion[];
  ecns: ECN[];
  addVersion: (v: ProductionVersion) => void;
  updateVersion: (id: string, patch: Partial<ProductionVersion>) => void;
  deleteVersion: (id: string) => void;
  addECN: (e: ECN) => void;
  updateECN: (id: string, patch: Partial<ECN>) => void;
  deleteECN: (id: string) => void;
  /** 发布 ECN：切换关联 BOM 至新版本并生效 */
  releaseECN: (id: string) => void;
}

export const useProductionVersionStore = create<ProductionVersionState>()(
  persist(
    (set, get) => ({
      versions: seedVersions.map((v) => ({ ...v })),
      ecns: seedECNs.map((e) => ({ ...e })),
      addVersion: (v) => set((s) => ({ versions: [...s.versions, v] })),
      updateVersion: (id, patch) =>
        set((s) => ({ versions: s.versions.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),
      deleteVersion: (id) => set((s) => ({ versions: s.versions.filter((v) => v.id !== id) })),
      addECN: (e) => set((s) => ({ ecns: [...s.ecns, e] })),
      updateECN: (id, patch) =>
        set((s) => ({ ecns: s.ecns.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteECN: (id) => set((s) => ({ ecns: s.ecns.filter((e) => e.id !== id) })),
      releaseECN: (id) => {
        const ecn = get().ecns.find((e) => e.id === id);
        if (!ecn) return;
        // 联动 BOM 版本切换
        useBOMStore.getState().updateBOM(ecn.bomId, {
          version: ecn.newVersion,
          status: 'released',
          effectiveDate: ecn.effectiveDate,
        });
        set((s) => ({
          ecns: s.ecns.map((e) =>
            e.id === id ? { ...e, status: 'released', releasedAt: new Date().toISOString() } : e,
          ),
        }));
      },
    }),
    { storage: backendStorage,
    
      name: STORE_KEY,
      version: 1,
      partialize: (state) => ({ versions: state.versions, ecns: state.ecns }),
    },
  ),
);
