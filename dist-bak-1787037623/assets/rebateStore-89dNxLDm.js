import { a2 as create, a3 as persist } from "./vendor-t9csHBDX.js";
import { l as backendStorage } from "./index-CU2cqxc8.js";
const genId = () => `reb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const seedRules = [
  {
    id: "rule-001",
    name: "年度返利-宝钢",
    customerId: "cust-001",
    customerName: "上海宝钢商贸",
    type: "percent",
    rate: 3,
    minAmount: 5e5,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    enabled: true
  },
  {
    id: "rule-002",
    name: "季度返利-鞍钢",
    customerId: "cust-002",
    customerName: "鞍山钢铁贸易",
    type: "fixed",
    rate: 50,
    minAmount: 2e5,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    enabled: true
  },
  {
    id: "rule-003",
    name: "物料返利-冷轧板",
    materialId: "mat-001",
    materialName: "冷轧板 SPCC 1.0",
    type: "percent",
    rate: 2,
    minAmount: 1e5,
    validFrom: "2026-07-01",
    validTo: "2026-12-31",
    enabled: true
  }
];
const useRebateStore = create()(
  persist(
    (set, get) => ({
      rules: seedRules,
      settlements: [],
      addRule: (rule) => set((s) => ({ rules: [...s.rules, { ...rule, id: genId() }] })),
      updateRule: (id, patch) => set((s) => ({
        rules: s.rules.map((r) => r.id === id ? { ...r, ...patch } : r)
      })),
      deleteRule: (id) => set((s) => ({
        rules: s.rules.filter((r) => r.id !== id)
      })),
      addSettlement: (settlement) => set((s) => ({ settlements: [...s.settlements, { ...settlement, id: genId() }] })),
      updateSettlement: (id, patch) => set((s) => ({
        settlements: s.settlements.map((st) => st.id === id ? { ...st, ...patch } : st)
      })),
      deleteSettlement: (id) => set((s) => ({
        settlements: s.settlements.filter((st) => st.id !== id)
      })),
      calculateRebate: (ruleId, baseAmount) => {
        const rule = get().rules.find((r) => r.id === ruleId);
        if (!rule) return 0;
        if (rule.minAmount && baseAmount < rule.minAmount) return 0;
        if (rule.type === "percent") {
          return Math.round(baseAmount * rule.rate / 100 * 100) / 100;
        }
        return rule.rate;
      }
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-rebate"
    }
  )
);
export {
  useRebateStore as u
};
