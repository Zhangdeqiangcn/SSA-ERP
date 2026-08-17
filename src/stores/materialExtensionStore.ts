import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MaterialChangeDoc, MaterialChangeField } from '@/types';

const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const today = () => new Date().toISOString().slice(0, 10);

interface MaterialExtensionState {
  changeDocs: MaterialChangeDoc[];

  addChangeDoc: (doc: MaterialChangeDoc) => void;
  updateChangeDoc: (id: string, u: Partial<MaterialChangeDoc>) => void;
  deleteChangeDoc: (id: string) => void;
  // 便捷：记录一次物料变更（评估类/价控/工厂维度等）
  logMaterialChange: (params: {
    materialId: string; materialCode: string; materialName: string;
    changeType: MaterialChangeDoc['changeType']; fields: MaterialChangeField[];
    reason: string; operator?: string;
  }) => void;
}

export const useMaterialExtensionStore = create<MaterialExtensionState>()(
  persist(
    (set) => ({
      changeDocs: [],

      addChangeDoc: (doc) => set((s) => ({ changeDocs: [...s.changeDocs, doc] })),
      updateChangeDoc: (id, u) =>
        set((s) => ({ changeDocs: s.changeDocs.map((x) => (x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: '当前用户' } : x)) })),
      deleteChangeDoc: (id) => set((s) => ({ changeDocs: s.changeDocs.filter((x) => x.id !== id) })),

      logMaterialChange: (params) =>
        set((s) => ({
          changeDocs: [
            ...s.changeDocs,
            {
              id: uid('mcd'),
              changeNo: `MCD-${today().replace(/-/g, '')}-${s.changeDocs.length + 1}`,
              materialId: params.materialId,
              materialCode: params.materialCode,
              materialName: params.materialName,
              changeType: params.changeType,
              fields: params.fields,
              reason: params.reason,
              operator: params.operator || '当前用户',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: params.operator || '当前用户',
              updatedBy: params.operator || '当前用户',
            },
          ],
        })),
    }),
    {
      name: 'ssa-erp-material-ext',
      version: 1,
      partialize: (state) => ({ changeDocs: state.changeDocs }),
    }
  )
);
