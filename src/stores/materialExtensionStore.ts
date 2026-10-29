import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { MaterialChangeDoc, MaterialChangeField, MaterialChangeAffected } from '@/types';
import { useBOMStore } from './bomStore';
import { parsePayload, writeRow } from './entityBackedShared';

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
  /** V3.77.0：从 D1 水合 */
  hydrateMaterialExtension: () => Promise<void>;
}

const RES = 'materialExtension';

export const useMaterialExtensionStore = create<MaterialExtensionState>()((set) => ({
  changeDocs: [],

  addChangeDoc: (doc) => {
    set((s) => ({ changeDocs: [...s.changeDocs, doc] }));
    if (isAuthed()) writeRow(RES, doc.id, doc);
  },
  updateChangeDoc: (id, u) => {
    let updated: MaterialChangeDoc | undefined;
    set((s) => ({
      changeDocs: s.changeDocs.map((x) => {
        if (x.id !== id) return x;
        updated = { ...x, ...u, updatedAt: today(), updatedBy: '当前用户' };
        return updated;
      }),
    }));
    if (updated && isAuthed()) writeRow(RES, id, updated);
  },
  deleteChangeDoc: (id) => {
    set((s) => ({ changeDocs: s.changeDocs.filter((x) => x.id !== id) }));
    if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
  },

  logMaterialChange: (params) => {
    set((s) => {
      const doc: MaterialChangeDoc = {
        id: uid('mcd'),
        changeNo: `MCD-${today().replace(/-/g, '')}-${s.changeDocs.length + 1}`,
        materialId: params.materialId,
        materialCode: params.materialCode,
        materialName: params.materialName,
        changeType: params.changeType,
        fields: params.fields,
        reason: params.reason,
        operator: params.operator || '当前用户',
        // P1-16 反查：本物料作为子件出现于哪些 BOM（非破坏补强，仅 BOM 维度，供变更记录反查下游）
        affectedObjects: useBOMStore.getState().bomList
          .filter((b) => (b.items || []).some((it) => it.materialId === params.materialId))
          .map((b) => ({ type: 'bom' as const, id: b.id, no: b.bomNo })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: params.operator || '当前用户',
        updatedBy: params.operator || '当前用户',
      };
      if (isAuthed()) writeRow(RES, doc.id, doc);
      return { changeDocs: [...s.changeDocs, doc] };
    });
  },

  hydrateMaterialExtension: async () => {
    if (!isAuthed()) return;
    try {
      const res = await entityRepo.list<MaterialChangeDoc>(RES, { page: 1, pageSize: 500 });
      const rows = parsePayload<MaterialChangeDoc>(res?.data || []);
      if (rows.length) set({ changeDocs: rows });
    } catch {
      // 离线/异常：保留本地态
    }
  },
}));

// 模块加载即自动水合（未登录/离线静默兜底）
void useMaterialExtensionStore.getState().hydrateMaterialExtension();
