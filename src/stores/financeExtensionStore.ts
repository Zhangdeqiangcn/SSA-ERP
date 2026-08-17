import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 财务深化扩展 store（P2-5 核心）
 * ------------------------------------------------------------
 * 承载 V2.14 财务域之外的新增深化能力：
 *  1. 多币种汇率（exchangeRates）：以本位币 CNY 为基准，记录各外币折算汇率。
 *  2. 辅助核算维度（costCenters）：成本中心主数据，供凭证按成本中心/项目归集。
 *  3. 预算控制（budgets）：按期间 + 成本中心/科目 设定预算，与实际发生额对比。
 * 与 financeStore 解耦（避免改动其 partialize），独立 persist 键 ssa-erp-finance-ext。
 */

export type BudgetDimension = 'costCenter' | 'account' | 'project';

export interface ExchangeRate {
  id: string;
  currency: string;       // 外币代码，如 USD / EUR
  currencyName: string;   // 外币名称，如 美元
  rate: number;           // 1 外币 = rate 本位币(CNY)
  effectiveDate: string;  // 生效日期
  note?: string;
}

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  dept: string;           // 所属部门
  manager: string;        // 负责人
  note?: string;
}

export interface Budget {
  id: string;
  period: string;         // 预算期间，如 2026-07 或 2026-Q3
  dimension: BudgetDimension;
  refId: string;          // 关联的 成本中心id / 科目code / 项目id
  refName: string;        // 关联名称（冗余展示）
  amount: number;         // 预算金额（本位币）
  note?: string;
}

export const DEFAULT_EXCHANGE_RATES: ExchangeRate[] = [
  { id: 'fx-usd', currency: 'USD', currencyName: '美元', rate: 7.18, effectiveDate: '2026-07-01', note: '默认基准汇率' },
  { id: 'fx-eur', currency: 'EUR', currencyName: '欧元', rate: 7.85, effectiveDate: '2026-07-01' },
  { id: 'fx-jpy', currency: 'JPY', currencyName: '日元', rate: 0.047, effectiveDate: '2026-07-01' },
  { id: 'fx-hkd', currency: 'HKD', currencyName: '港币', rate: 0.92, effectiveDate: '2026-07-01' },
];

export const DEFAULT_COST_CENTERS: CostCenter[] = [
  { id: 'cc-001', code: 'CC-001', name: '生产中心', dept: '生产部', manager: '张工' },
  { id: 'cc-002', code: 'CC-002', name: '采购中心', dept: '采购部', manager: '李采购' },
  { id: 'cc-003', code: 'CC-003', name: '销售中心', dept: '销售部', manager: '王销售' },
  { id: 'cc-004', code: 'CC-004', name: '行政中心', dept: '管理部', manager: '赵管理' },
];

export const DEFAULT_BUDGETS: Budget[] = [
  { id: 'bg-001', period: '2026-07', dimension: 'costCenter', refId: 'cc-001', refName: '生产中心', amount: 500000, note: '生产相关费用预算' },
  { id: 'bg-002', period: '2026-07', dimension: 'costCenter', refId: 'cc-002', refName: '采购中心', amount: 300000 },
  { id: 'bg-003', period: '2026-07', dimension: 'account', refId: '6602', refName: '管理费用', amount: 200000 },
  { id: 'bg-004', period: '2026-Q3', dimension: 'costCenter', refId: 'cc-003', refName: '销售中心', amount: 250000 },
];

const BASE_CURRENCY = 'CNY';

/** 取指定外币相对本位币的汇率；本位币或缺失返回 1 */
export function getExchangeRate(currency: string | undefined, rates: ExchangeRate[]): number {
  if (!currency || currency.toUpperCase() === BASE_CURRENCY) return 1;
  const found = rates.find((r) => r.currency.toUpperCase() === currency.toUpperCase());
  return found ? found.rate : 1;
}

/** 将金额折算为指定目标币种（默认本位币 CNY） */
export function convertCurrency(
  amount: number,
  fromCurrency: string | undefined,
  rates: ExchangeRate[],
  toCurrency: string = BASE_CURRENCY
): number {
  if (!fromCurrency || fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return amount;
  const fromRate = getExchangeRate(fromCurrency, rates); // 1 from = fromRate CNY
  const toRate = getExchangeRate(toCurrency, rates);     // 1 to = toRate CNY
  const inBase = amount * fromRate;
  return toRate === 0 ? inBase : inBase / toRate;
}

export const BASE_CURRENCY_CODE = BASE_CURRENCY;

interface FinanceExtensionState {
  exchangeRates: ExchangeRate[];
  costCenters: CostCenter[];
  budgets: Budget[];

  // 汇率 CRUD
  addExchangeRate: (rate: Omit<ExchangeRate, 'id'>) => void;
  updateExchangeRate: (id: string, patch: Partial<Omit<ExchangeRate, 'id'>>) => void;
  removeExchangeRate: (id: string) => void;

  // 成本中心 CRUD
  addCostCenter: (cc: Omit<CostCenter, 'id'>) => void;
  updateCostCenter: (id: string, patch: Partial<Omit<CostCenter, 'id'>>) => void;
  removeCostCenter: (id: string) => void;

  // 预算 CRUD
  addBudget: (b: Omit<Budget, 'id'>) => void;
  updateBudget: (id: string, patch: Partial<Omit<Budget, 'id'>>) => void;
  removeBudget: (id: string) => void;

  resetAll: () => void;
}

export const useFinanceExtensionStore = create<FinanceExtensionState>()(
  persist(
    (set) => ({
      exchangeRates: DEFAULT_EXCHANGE_RATES.map((r) => ({ ...r })),
      costCenters: DEFAULT_COST_CENTERS.map((c) => ({ ...c })),
      budgets: DEFAULT_BUDGETS.map((b) => ({ ...b })),

      addExchangeRate: (rate) =>
        set((state) => ({
          exchangeRates: [...state.exchangeRates, { ...rate, id: `fx-${Date.now()}` }],
        })),
      updateExchangeRate: (id, patch) =>
        set((state) => ({
          exchangeRates: state.exchangeRates.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      removeExchangeRate: (id) =>
        set((state) => ({
          exchangeRates: state.exchangeRates.filter((r) => r.id !== id),
        })),

      addCostCenter: (cc) =>
        set((state) => ({
          costCenters: [...state.costCenters, { ...cc, id: `cc-${Date.now()}` }],
        })),
      updateCostCenter: (id, patch) =>
        set((state) => ({
          costCenters: state.costCenters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      removeCostCenter: (id) =>
        set((state) => ({
          costCenters: state.costCenters.filter((c) => c.id !== id),
        })),

      addBudget: (b) =>
        set((state) => ({
          budgets: [...state.budgets, { ...b, id: `bg-${Date.now()}` }],
        })),
      updateBudget: (id, patch) =>
        set((state) => ({
          budgets: state.budgets.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
      removeBudget: (id) =>
        set((state) => ({
          budgets: state.budgets.filter((b) => b.id !== id),
        })),

      resetAll: () =>
        set({
          exchangeRates: DEFAULT_EXCHANGE_RATES.map((r) => ({ ...r })),
          costCenters: DEFAULT_COST_CENTERS.map((c) => ({ ...c })),
          budgets: DEFAULT_BUDGETS.map((b) => ({ ...b })),
        }),
    }),
    {
      name: 'ssa-erp-finance-ext',
      version: 1,
      partialize: (state) => ({
        exchangeRates: state.exchangeRates,
        costCenters: state.costCenters,
        budgets: state.budgets,
      }),
    }
  )
);
