import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { parsePayload, writeRow } from './entityBackedShared';
import type { ConditionRecord, ConditionType, CalculationRule } from '@/types';

const uid = () => `cond-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const todayStr = () => new Date().toISOString().slice(0, 10);

const inPeriod = (from?: string, to?: string): boolean => {
  const t = todayStr();
  if (from && t < from) return false;
  if (to && t > to) return false;
  return true;
};

// 种子数据（6 条）
const seedConditions: ConditionRecord[] = [
  {
    id: 'cond-seed-1',
    conditionType: 'price',
    vendorId: 'v-001',
    vendorName: '宝山钢铁股份有限公司',
    materialId: 'mat-001',
    materialName: '钢板 Q235B',
    rate: 4200,
    currency: 'CNY',
    unit: '吨',
    calcRule: 'fixed',
    priority: 10,
    active: true,
  },
  {
    id: 'cond-seed-2',
    conditionType: 'discount',
    vendorId: 'v-001',
    vendorName: '宝山钢铁股份有限公司',
    materialId: 'mat-001',
    materialName: '钢板 Q235B',
    rate: 5,
    calcRule: 'percentage',
    priority: 5,
    active: true,
    fromDate: '2026-01-01',
    toDate: '2026-12-31',
  },
  {
    id: 'cond-seed-3',
    conditionType: 'freight',
    vendorId: 'v-001',
    vendorName: '宝山钢铁股份有限公司',
    rate: 150,
    currency: 'CNY',
    unit: '吨',
    calcRule: 'fixed',
    priority: 3,
    active: true,
  },
  {
    id: 'cond-seed-4',
    conditionType: 'tax',
    rate: 13,
    calcRule: 'percentage',
    priority: 1,
    active: true,
  },
  {
    id: 'cond-seed-5',
    conditionType: 'surcharge',
    vendorId: 'v-001',
    vendorName: '宝山钢铁股份有限公司',
    rate: 100,
    currency: 'CNY',
    unit: '吨',
    calcRule: 'fixed',
    priority: 2,
    active: false,
  },
  {
    id: 'cond-seed-6',
    conditionType: 'price',
    vendorId: 'v-002',
    vendorName: '鞍钢股份有限公司',
    materialId: 'mat-002',
    materialName: '无缝钢管',
    rate: 5000,
    currency: 'CNY',
    unit: '吨',
    calcRule: 'fixed',
    priority: 10,
    active: true,
  },
];

interface ConditionState {
  conditions: ConditionRecord[];
  addCondition: (item: Omit<ConditionRecord, 'id'>) => void;
  updateCondition: (id: string, patch: Partial<ConditionRecord>) => void;
  deleteCondition: (id: string) => void;
  /** 根据供应商/物料/数量/基准价解析最终价格 */
  resolvePrice: (
    vendorId: string | undefined,
    materialId: string,
    qty: number,
    basePrice: number,
  ) => { finalPrice: number; matchedConditions: string[] };
  /** V3.80.0：从 D1 水合 */
  hydrateCondition: () => Promise<void>;
}

const RES = 'purchaseCondition';

export const useConditionStore = create<ConditionState>()(
    (set, get) => ({
      conditions: [...seedConditions],

      addCondition: (item) => {
        const id = uid();
        const rec = { ...item, id };
        set((s) => ({ conditions: [...s.conditions, rec] }));
        if (isAuthed()) writeRow(RES, id, rec);
      },
      updateCondition: (id, patch) => {
        let updated: ConditionRecord | undefined;
        set((s) => ({
          conditions: s.conditions.map((c) => {
            if (c.id !== id) return c;
            updated = { ...c, ...patch };
            return updated;
          }),
        }));
        if (updated && isAuthed()) writeRow(RES, id, updated);
      },
      deleteCondition: (id) => {
        set((s) => ({ conditions: s.conditions.filter((c) => c.id !== id) }));
        if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
      },

      resolvePrice: (vendorId, materialId, qty, basePrice) => {
        const all = get().conditions.filter(
          (c) => c.active && inPeriod(c.fromDate, c.toDate),
        );

        // 匹配条件：供应商/物料维度任一匹配（空值视为通用）
        const matches = all.filter((c) => {
          const vendorMatch = !c.vendorId || c.vendorId === vendorId;
          const materialMatch = !c.materialId || c.materialId === materialId;
          return vendorMatch && materialMatch;
        });

        if (matches.length === 0) {
          return { finalPrice: basePrice, matchedConditions: [] };
        }

        // 多条匹配时按 priority 最高的生效
        const best = matches.reduce((a, b) => (a.priority > b.priority ? a : b));

        let result = basePrice;
        switch (best.conditionType) {
          case 'price':
            if (best.calcRule === 'fixed') result = best.rate;
            else if (best.calcRule === 'percentage') result = basePrice * (1 + best.rate / 100);
            break;
          case 'discount':
            if (best.calcRule === 'percentage') result = basePrice * (1 - best.rate / 100);
            else if (best.calcRule === 'fixed') result = basePrice - best.rate;
            break;
          case 'freight':
          case 'surcharge':
            if (best.calcRule === 'fixed') result = basePrice + best.rate;
            else if (best.calcRule === 'percentage') result = basePrice * (1 + best.rate / 100);
            else if (best.calcRule === 'quantity_based') result = basePrice + best.rate * qty;
            break;
          case 'tax':
            if (best.calcRule === 'percentage') result = basePrice * (1 + best.rate / 100);
            else result = basePrice + best.rate;
            break;
        }

        return { finalPrice: Math.max(0, result), matchedConditions: [best.id] };
      },

      hydrateCondition: async () => {
        if (!isAuthed()) return;
        try {
          const res = await entityRepo.list<ConditionRecord>(RES, { page: 1, pageSize: 500 });
          const rows = parsePayload<ConditionRecord>(res?.data || []);
          if (rows.length) set({ conditions: rows });
        } catch {
          // 离线/异常：保留本地态（含种子）
        }
      },
    }),
);

// 模块加载即自动水合（未登录/离线静默兜底）
void useConditionStore.getState().hydrateCondition();
