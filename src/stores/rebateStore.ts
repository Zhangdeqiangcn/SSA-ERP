import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { RebateRule, RebateSettlement } from '@/types/sales';

interface RebateState {
  rules: RebateRule[];
  settlements: RebateSettlement[];

  // 规则 CRUD
  addRule: (rule: Omit<RebateRule, 'id'>) => void;
  updateRule: (id: string, patch: Partial<RebateRule>) => void;
  deleteRule: (id: string) => void;

  // 结算 CRUD
  addSettlement: (settlement: Omit<RebateSettlement, 'id'>) => void;
  updateSettlement: (id: string, patch: Partial<RebateSettlement>) => void;
  deleteSettlement: (id: string) => void;

  // 计算返利
  calculateRebate: (ruleId: string, baseAmount: number) => number;
}

const genId = () => `reb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const seedRules: RebateRule[] = [
  {
    id: 'rule-001',
    name: '年度返利-宝钢',
    customerId: 'cust-001',
    customerName: '上海宝钢商贸',
    type: 'percent',
    rate: 3,
    minAmount: 500000,
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    enabled: true,
  },
  {
    id: 'rule-002',
    name: '季度返利-鞍钢',
    customerId: 'cust-002',
    customerName: '鞍山钢铁贸易',
    type: 'fixed',
    rate: 50,
    minAmount: 200000,
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    enabled: true,
  },
  {
    id: 'rule-003',
    name: '物料返利-冷轧板',
    materialId: 'mat-001',
    materialName: '冷轧板 SPCC 1.0',
    type: 'percent',
    rate: 2,
    minAmount: 100000,
    validFrom: '2026-07-01',
    validTo: '2026-12-31',
    enabled: true,
  },
];

export const useRebateStore = create<RebateState>()(
  persist(
    (set, get) => ({
      rules: seedRules,
      settlements: [],

      addRule: (rule) => set((s) => ({ rules: [...s.rules, { ...rule, id: genId() }] })),
      updateRule: (id, patch) => set((s) => ({
        rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      })),
      deleteRule: (id) => set((s) => ({
        rules: s.rules.filter((r) => r.id !== id),
      })),

      addSettlement: (settlement) => set((s) => ({ settlements: [...s.settlements, { ...settlement, id: genId() }] })),
      updateSettlement: (id, patch) => set((s) => ({
        settlements: s.settlements.map((st) => (st.id === id ? { ...st, ...patch } : st)),
      })),
      deleteSettlement: (id) => set((s) => ({
        settlements: s.settlements.filter((st) => st.id !== id),
      })),

      calculateRebate: (ruleId, baseAmount) => {
        const rule = get().rules.find((r) => r.id === ruleId);
        if (!rule) return 0;
        if (rule.minAmount && baseAmount < rule.minAmount) return 0;
        if (rule.type === 'percent') {
          return Math.round(baseAmount * rule.rate / 100 * 100) / 100;
        }
        return rule.rate;
      },
    }),
    { storage: backendStorage,
     name: 'ssa-erp-rebate' }
  )
);
