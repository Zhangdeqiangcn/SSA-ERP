import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { parsePayload, writeRow } from './entityBackedShared';

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
  /** V3.77.0：从 D1 水合 */
  hydrateCOA: () => Promise<void>;
}

const RES = 'coaReport';

export const useCOAStore = create<COAState>()((set, get) => ({
  records: [],

  saveCoa: (coa) => {
    const rec = { ...coa, id: coa.id || `COA-${Date.now()}` };
    set((s) => {
      const others = s.records.filter((r) => r.taskId !== rec.taskId);
      return { records: [rec, ...others] };
    });
    if (isAuthed()) writeRow(RES, rec.id, rec);
  },

  removeCoa: (id) => {
    set((s) => ({ records: s.records.filter((r) => r.id !== id) }));
    if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
  },

  hydrateCOA: async () => {
    if (!isAuthed()) return;
    try {
      const res = await entityRepo.list<COARecord>(RES, { page: 1, pageSize: 500 });
      const rows = parsePayload<COARecord>(res?.data || []);
      if (rows.length) set({ records: rows });
    } catch {
      // 离线/异常：保留本地态
    }
  },
}));

// 模块加载即自动水合（未登录/离线静默兜底）
void useCOAStore.getState().hydrateCOA();
