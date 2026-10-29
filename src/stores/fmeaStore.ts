import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { parsePayload, writeRow } from './entityBackedShared';

export type FMEAStatus = 'draft' | 'reviewed' | 'approved';

export interface FMEA {
  id: string;
  number: string;
  item: string;
  function: string;
  failureMode: string;
  effect: string;
  severity: number;
  cause: string;
  occurrence: number;
  currentControl: string;
  detection: number;
  rpn: number;
  recommendedAction?: string;
  status: FMEAStatus;
  /** P2-15 关联物料主数据 */
  materialId?: string;
  materialName?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const seedFMEA: FMEA[] = [
  {
    id: uid('fmea'),
    number: 'FMEA-2026-001',
    item: '缸体铸造',
    function: '提供发动机缸体毛坯',
    failureMode: '气孔缺陷',
    effect: '缸体强度不足，可能导致发动机漏油',
    severity: 9,
    cause: '浇注温度偏低，排气不畅',
    occurrence: 5,
    currentControl: 'X光探伤抽检',
    detection: 6,
    rpn: 270,
    recommendedAction: '优化浇注系统排气设计，提高浇注温度监控',
    status: 'reviewed',
    createdAt: now(),
    updatedAt: now(),
    createdBy: '质量部',
    updatedBy: '质量部',
  },
  {
    id: uid('fmea'),
    number: 'FMEA-2026-002',
    item: '钢板剪裁',
    function: '按规格尺寸剪裁钢板',
    failureMode: '尺寸超差',
    effect: '后续焊接装配困难，影响产品合格率',
    severity: 7,
    cause: '剪板机刀具磨损',
    occurrence: 4,
    currentControl: '首件检验+巡检',
    detection: 3,
    rpn: 84,
    status: 'draft',
    createdAt: now(),
    updatedAt: now(),
    createdBy: '质量部',
    updatedBy: '质量部',
  },
];

interface FMEAState {
  items: FMEA[];
  addItem: (item: FMEA) => void;
  updateItem: (id: string, updates: Partial<FMEA>) => void;
  deleteItem: (id: string) => void;
  /** V3.81.0：从 D1 水合 */
  hydrateFMEA: () => Promise<void>;
}

const RES = 'fmeaItem';

export const useFMEAStore = create<FMEAState>()(
    (set) => ({
      items: [...seedFMEA],

      addItem: (item) => {
        set((s) => ({ items: [...s.items, item] }));
        if (isAuthed()) writeRow(RES, item.id, item);
      },
      updateItem: (id, updates) => {
        let updated: FMEA | undefined;
        set((s) => ({
          items: s.items.map((x) => {
            if (x.id !== id) return x;
            updated = { ...x, ...updates, updatedAt: now(), updatedBy: '当前用户' };
            return updated;
          }),
        }));
        if (updated && isAuthed()) writeRow(RES, id, updated);
      },
      deleteItem: (id) => {
        set((s) => ({ items: s.items.filter((x) => x.id !== id) }));
        if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
      },
      hydrateFMEA: async () => {
        if (!isAuthed()) return;
        try {
          const res = await entityRepo.list<FMEA>(RES, { page: 1, pageSize: 500 });
          const rows = parsePayload<FMEA>(res?.data || []);
          if (rows.length) set({ items: rows });
        } catch {
          // 离线/异常：保留本地态（含种子）
        }
      },
    }),
);

// 模块加载即自动水合（未登录/离线静默兜底）
void useFMEAStore.getState().hydrateFMEA();
