import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { parsePayload, writeRow } from './entityBackedShared';

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
  /** V3.80.0：从 D1 水合 */
  hydrateSlowMoving: () => Promise<void>;
}

const RES = 'slowMovingDisposal';

export const useSlowMovingStore = create<SlowMovingState>()(
    (set) => ({
      disposals: [],
      dispose: (d) =>
        set((s) => {
          const others = s.disposals.filter((x) => x.materialId !== d.materialId);
          const rec = { ...d, date: d.date || new Date().toISOString().slice(0, 10) } as SlowMovingDisposal;
          if (isAuthed()) writeRow(RES, rec.materialId, rec);
          return { disposals: [...others, rec] };
        }),
      removeDisposal: (materialId) => {
        set((s) => ({ disposals: s.disposals.filter((x) => x.materialId !== materialId) }));
        if (isAuthed()) void entityRepo.remove(RES, materialId).catch(() => {});
      },
      hydrateSlowMoving: async () => {
        if (!isAuthed()) return;
        try {
          const res = await entityRepo.list<SlowMovingDisposal>(RES, { page: 1, pageSize: 500 });
          const rows = parsePayload<SlowMovingDisposal>(res?.data || []);
          if (rows.length) set({ disposals: rows });
        } catch {
          // 离线/异常：保留本地态
        }
      },
    }),
);

// 模块加载即自动水合（未登录/离线静默兜底）
void useSlowMovingStore.getState().hydrateSlowMoving();
