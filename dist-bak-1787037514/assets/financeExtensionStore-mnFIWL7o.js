import { a2 as create, a3 as persist } from "./vendor-C0Ken1ns.js";
import { l as backendStorage } from "./index-hTLNcGoC.js";
const DEFAULT_EXCHANGE_RATES = [
  { id: "fx-usd", currency: "USD", currencyName: "美元", rate: 7.18, effectiveDate: "2026-07-01", note: "默认基准汇率" },
  { id: "fx-eur", currency: "EUR", currencyName: "欧元", rate: 7.85, effectiveDate: "2026-07-01" },
  { id: "fx-jpy", currency: "JPY", currencyName: "日元", rate: 0.047, effectiveDate: "2026-07-01" },
  { id: "fx-hkd", currency: "HKD", currencyName: "港币", rate: 0.92, effectiveDate: "2026-07-01" }
];
const DEFAULT_COST_CENTERS = [
  { id: "cc-001", code: "CC-001", name: "生产中心", dept: "生产部", manager: "张工" },
  { id: "cc-002", code: "CC-002", name: "采购中心", dept: "采购部", manager: "李采购" },
  { id: "cc-003", code: "CC-003", name: "销售中心", dept: "销售部", manager: "王销售" },
  { id: "cc-004", code: "CC-004", name: "行政中心", dept: "管理部", manager: "赵管理" }
];
const DEFAULT_BUDGETS = [
  { id: "bg-001", period: "2026-07", dimension: "costCenter", refId: "cc-001", refName: "生产中心", amount: 5e5, note: "生产相关费用预算" },
  { id: "bg-002", period: "2026-07", dimension: "costCenter", refId: "cc-002", refName: "采购中心", amount: 3e5 },
  { id: "bg-003", period: "2026-07", dimension: "account", refId: "6602", refName: "管理费用", amount: 2e5 },
  { id: "bg-004", period: "2026-Q3", dimension: "costCenter", refId: "cc-003", refName: "销售中心", amount: 25e4 }
];
const BASE_CURRENCY = "CNY";
function getExchangeRate(currency, rates) {
  if (!currency || currency.toUpperCase() === BASE_CURRENCY) return 1;
  const found = rates.find((r) => r.currency.toUpperCase() === currency.toUpperCase());
  return found ? found.rate : 1;
}
function convertCurrency(amount, fromCurrency, rates, toCurrency = BASE_CURRENCY) {
  if (!fromCurrency || fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return amount;
  const fromRate = getExchangeRate(fromCurrency, rates);
  const toRate = getExchangeRate(toCurrency, rates);
  const inBase = amount * fromRate;
  return toRate === 0 ? inBase : inBase / toRate;
}
const BASE_CURRENCY_CODE = BASE_CURRENCY;
const useFinanceExtensionStore = create()(
  persist(
    (set) => ({
      exchangeRates: DEFAULT_EXCHANGE_RATES.map((r) => ({ ...r })),
      costCenters: DEFAULT_COST_CENTERS.map((c) => ({ ...c })),
      budgets: DEFAULT_BUDGETS.map((b) => ({ ...b })),
      addExchangeRate: (rate) => set((state) => ({
        exchangeRates: [...state.exchangeRates, { ...rate, id: `fx-${Date.now()}` }]
      })),
      updateExchangeRate: (id, patch) => set((state) => ({
        exchangeRates: state.exchangeRates.map((r) => r.id === id ? { ...r, ...patch } : r)
      })),
      removeExchangeRate: (id) => set((state) => ({
        exchangeRates: state.exchangeRates.filter((r) => r.id !== id)
      })),
      addCostCenter: (cc) => set((state) => ({
        costCenters: [...state.costCenters, { ...cc, id: `cc-${Date.now()}` }]
      })),
      updateCostCenter: (id, patch) => set((state) => ({
        costCenters: state.costCenters.map((c) => c.id === id ? { ...c, ...patch } : c)
      })),
      removeCostCenter: (id) => set((state) => ({
        costCenters: state.costCenters.filter((c) => c.id !== id)
      })),
      addBudget: (b) => set((state) => ({
        budgets: [...state.budgets, { ...b, id: `bg-${Date.now()}` }]
      })),
      updateBudget: (id, patch) => set((state) => ({
        budgets: state.budgets.map((b) => b.id === id ? { ...b, ...patch } : b)
      })),
      removeBudget: (id) => set((state) => ({
        budgets: state.budgets.filter((b) => b.id !== id)
      })),
      resetAll: () => set({
        exchangeRates: DEFAULT_EXCHANGE_RATES.map((r) => ({ ...r })),
        costCenters: DEFAULT_COST_CENTERS.map((c) => ({ ...c })),
        budgets: DEFAULT_BUDGETS.map((b) => ({ ...b }))
      })
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-finance-ext",
      version: 1,
      partialize: (state) => ({
        exchangeRates: state.exchangeRates,
        costCenters: state.costCenters,
        budgets: state.budgets
      })
    }
  )
);
export {
  BASE_CURRENCY_CODE as B,
  convertCurrency as c,
  getExchangeRate as g,
  useFinanceExtensionStore as u
};
