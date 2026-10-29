import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { entityRepo } from '@/services/entityRepo';
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
  /** V3.66.0 P1-2：启动时从 D1 rebate_rules/rebate_settlements 水合（主源 = D1，本地 Blob 降为离线兜底） */
  hydrateRebate: () => Promise<void>;
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

      addRule: (rule) => {
        const r = { ...rule, id: genId() };
        set((s) => ({ rules: [...s.rules, r] }));
        // V3.66.0 P1-2：返利规则同步 D1（财务返利计提可按行引用；失败静默不阻断）
        entityRepo.create('rebateRule', { ...r, enabled: r.enabled ? 1 : 0 } as any).catch(() => {});
      },
      updateRule: (id, patch) => {
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }));
        entityRepo.update('rebateRule', id, patch as any).catch(() => {});
      },
      deleteRule: (id) => {
        set((s) => ({
          rules: s.rules.filter((r) => r.id !== id),
        }));
        entityRepo.remove('rebateRule', id).catch(() => {});
      },

      addSettlement: (settlement) => {
        const st = { ...settlement, id: genId() };
        set((s) => ({ settlements: [...s.settlements, st] }));
        entityRepo.create('rebateSettlement', st as any).catch(() => {});
      },
      updateSettlement: (id, patch) => {
        set((s) => ({
          settlements: s.settlements.map((st) => (st.id === id ? { ...st, ...patch } : st)),
        }));
        entityRepo.update('rebateSettlement', id, patch as any).catch(() => {});
      },
      deleteSettlement: (id) => {
        set((s) => ({
          settlements: s.settlements.filter((st) => st.id !== id),
        }));
        entityRepo.remove('rebateSettlement', id).catch(() => {});
      },

      calculateRebate: (ruleId, baseAmount) => {
        const rule = get().rules.find((r) => r.id === ruleId);
        if (!rule) return 0;
        if (rule.minAmount && baseAmount < rule.minAmount) return 0;
        if (rule.type === 'percent') {
          return Math.round(baseAmount * rule.rate / 100 * 100) / 100;
        }
        return rule.rate;
      },

      // V3.66.0 P1-2：返利台账水合（D1 主源；空库回填本地 seed，之后 CRUD 经 D1 同步）
      hydrateRebate: async () => {
        try {
          const [ruleRes, stlRes] = await Promise.all([
            entityRepo.list<any>('rebateRule', { page: 1, pageSize: 500 }),
            entityRepo.list<any>('rebateSettlement', { page: 1, pageSize: 500 }),
          ]);
          const rows: any[] = ruleRes?.data || [];
          if (rows.length === 0) {
            // D1 空库：本地 seed 回填一次
            for (const r of seedRules) {
              try { await entityRepo.create('rebateRule', { ...r, enabled: r.enabled ? 1 : 0 } as any); } catch { /* 冲突忽略 */ }
            }
            const refreshed = await entityRepo.list<any>('rebateRule', { page: 1, pageSize: 500 });
            set({ rules: ((refreshed?.data || []) as any[]).map((r) => ({ ...r, enabled: !!r.enabled })) });
            return;
          }
          set({
            rules: rows.map((r) => ({ ...r, enabled: !!r.enabled })),
            settlements: (stlRes?.data || []) as RebateSettlement[],
          });
        } catch {
          /* 离线/异常：保留本地 Blob 副本（persist 水合结果），不阻断 */
        }
      },
    }),
    { storage: backendStorage,
     name: 'ssa-erp-rebate',
     version: 2,
     partialize: (state) => ({ rules: state.rules, settlements: state.settlements }) }
  )
);

// ── V3.66.0 P1-2：启动水合返利台账（D1 主源，与 qualityStore 同款顶层触发）──
void useRebateStore.getState().hydrateRebate();
