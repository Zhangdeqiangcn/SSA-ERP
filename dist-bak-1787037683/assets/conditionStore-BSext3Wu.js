import { a as create, p as persist } from "./vendor-46QZWBd3.js";
import { l as backendStorage } from "./index-CcOZBoQL.js";
const uid = () => `cond-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
const todayStr = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const inPeriod = (from, to) => {
  const t = todayStr();
  if (from && t < from) return false;
  if (to && t > to) return false;
  return true;
};
const seedConditions = [
  {
    id: "cond-seed-1",
    conditionType: "price",
    vendorId: "v-001",
    vendorName: "宝山钢铁股份有限公司",
    materialId: "mat-001",
    materialName: "钢板 Q235B",
    rate: 4200,
    currency: "CNY",
    unit: "吨",
    calcRule: "fixed",
    priority: 10,
    active: true
  },
  {
    id: "cond-seed-2",
    conditionType: "discount",
    vendorId: "v-001",
    vendorName: "宝山钢铁股份有限公司",
    materialId: "mat-001",
    materialName: "钢板 Q235B",
    rate: 5,
    calcRule: "percentage",
    priority: 5,
    active: true,
    fromDate: "2026-01-01",
    toDate: "2026-12-31"
  },
  {
    id: "cond-seed-3",
    conditionType: "freight",
    vendorId: "v-001",
    vendorName: "宝山钢铁股份有限公司",
    rate: 150,
    currency: "CNY",
    unit: "吨",
    calcRule: "fixed",
    priority: 3,
    active: true
  },
  {
    id: "cond-seed-4",
    conditionType: "tax",
    rate: 13,
    calcRule: "percentage",
    priority: 1,
    active: true
  },
  {
    id: "cond-seed-5",
    conditionType: "surcharge",
    vendorId: "v-001",
    vendorName: "宝山钢铁股份有限公司",
    rate: 100,
    currency: "CNY",
    unit: "吨",
    calcRule: "fixed",
    priority: 2,
    active: false
  },
  {
    id: "cond-seed-6",
    conditionType: "price",
    vendorId: "v-002",
    vendorName: "鞍钢股份有限公司",
    materialId: "mat-002",
    materialName: "无缝钢管",
    rate: 5e3,
    currency: "CNY",
    unit: "吨",
    calcRule: "fixed",
    priority: 10,
    active: true
  }
];
const useConditionStore = create()(
  persist(
    (set, get) => ({
      conditions: [...seedConditions],
      addCondition: (item) => {
        const id = uid();
        set((s) => ({ conditions: [...s.conditions, { ...item, id }] }));
      },
      updateCondition: (id, patch) => {
        set((s) => ({
          conditions: s.conditions.map((c) => c.id === id ? { ...c, ...patch } : c)
        }));
      },
      deleteCondition: (id) => {
        set((s) => ({ conditions: s.conditions.filter((c) => c.id !== id) }));
      },
      resolvePrice: (vendorId, materialId, qty, basePrice) => {
        const all = get().conditions.filter(
          (c) => c.active && inPeriod(c.fromDate, c.toDate)
        );
        const matches = all.filter((c) => {
          const vendorMatch = !c.vendorId || c.vendorId === vendorId;
          const materialMatch = !c.materialId || c.materialId === materialId;
          return vendorMatch && materialMatch;
        });
        if (matches.length === 0) {
          return { finalPrice: basePrice, matchedConditions: [] };
        }
        const best = matches.reduce((a, b) => a.priority > b.priority ? a : b);
        let result = basePrice;
        switch (best.conditionType) {
          case "price":
            if (best.calcRule === "fixed") result = best.rate;
            else if (best.calcRule === "percentage") result = basePrice * (1 + best.rate / 100);
            break;
          case "discount":
            if (best.calcRule === "percentage") result = basePrice * (1 - best.rate / 100);
            else if (best.calcRule === "fixed") result = basePrice - best.rate;
            break;
          case "freight":
          case "surcharge":
            if (best.calcRule === "fixed") result = basePrice + best.rate;
            else if (best.calcRule === "percentage") result = basePrice * (1 + best.rate / 100);
            else if (best.calcRule === "quantity_based") result = basePrice + best.rate * qty;
            break;
          case "tax":
            if (best.calcRule === "percentage") result = basePrice * (1 + best.rate / 100);
            else result = basePrice + best.rate;
            break;
        }
        return { finalPrice: Math.max(0, result), matchedConditions: [best.id] };
      }
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-conditions",
      version: 1
    }
  )
);
export {
  useConditionStore as u
};
