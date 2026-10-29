import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { parsePayload, splitByKind, withKind, writeRow } from './entityBackedShared';

/**
 * 财务深化扩展 store（P2-5 核心）
 * ------------------------------------------------------------
 * 承载 V2.14 财务域之外的新增深化能力：
 *  1. 多币种汇率（exchangeRates）：以本位币 CNY 为基准，记录各外币折算汇率。
 *  2. 辅助核算维度（costCenters）：成本中心主数据，供凭证按成本中心/项目归集。
 *  3. 预算控制（budgets）：按期间 + 成本中心/科目 设定预算，与实际发生额对比。
 * 与 financeStore 解耦（避免改动其 partialize），独立持久化键 ssa-erp-finance-ext。
 * V3.77.0：迁 D1 关系表 finance_extensions（迁移 0101，resource financeExtension，rls 'all'）。
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

/**
 * 取指定外币相对本位币的汇率。
 *
 * 默认（不传 asOfDate / strict）：本位币或缺失返回 1 —— 报表折算等展示层可接受的降级。
 *
 * ★ P1-A 新增两个可选参数（向后兼容，不影响既有 4 处报表调用）：
 *   · asOfDate（'YYYY-MM-DD'）—— 期末口径：只取 `effectiveDate <= asOfDate` 的汇率里
 *     **最后一条**（即该时点真正生效的那条）。期末汇兑损益必须用「期末生效的汇率」，
 *     而不是「store 里碰巧当前那条」——这是审计 P1-A「按期间末最后一条取数」的落地。
 *   · strict（bool）—— fail-closed：开启后若取不到汇率（缺失 / 无 asOfDate 之前的记录）
 *     返回 `NaN` 而非 1。调用方检测 NaN 即可判断「汇率缺失、这行不能算」，
 *     避免外币按 1 静默算出虚假的汇兑损益（审计 P1-A「缺失时静默按 1」的 fail-open）。
 *     报表折算保持 strict=false（缺失=1 是展示层可接受的），只有期末汇兑这类
 *     影响损益数字的场景才开 strict，避免过度 fail-closed 让整张报表变 NaN。
 */
export function getExchangeRate(
  currency: string | undefined,
  rates: ExchangeRate[],
  asOfDate?: string,
  strict?: boolean
): number {
  if (!currency || currency.toUpperCase() === BASE_CURRENCY) return 1;
  const key = currency.toUpperCase();
  let found: ExchangeRate | undefined;
  if (asOfDate) {
    // 期末口径：取 effectiveDate <= asOfDate 的里按生效日最后一条（无 effectiveDate 视为最早生效）
    found = rates
      .filter((r) => r.currency.toUpperCase() === key && String(r.effectiveDate || '') <= asOfDate)
      .sort((a, b) => String(b.effectiveDate || '').localeCompare(String(a.effectiveDate || '')))[0];
  } else {
    found = rates.find((r) => r.currency.toUpperCase() === key);
  }
  if (found) return found.rate;
  return strict ? Number.NaN : 1; // strict 模式缺失不再静默按 1
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
  /** V3.77.0：从 D1 水合 */
  hydrateFinanceExtension: () => Promise<void>;
}

const RES = 'financeExtension';

export const useFinanceExtensionStore = create<FinanceExtensionState>()((set, get) => ({
  exchangeRates: DEFAULT_EXCHANGE_RATES.map((r) => ({ ...r })),
  costCenters: DEFAULT_COST_CENTERS.map((c) => ({ ...c })),
  budgets: DEFAULT_BUDGETS.map((b) => ({ ...b })),

  addExchangeRate: (rate) => {
    const item: ExchangeRate = { ...rate, id: `fx-${Date.now()}` };
    set((state) => ({ exchangeRates: [...state.exchangeRates, item] }));
    if (isAuthed()) writeRow(RES, item.id, withKind('fx', item));
  },
  updateExchangeRate: (id, patch) => {
    let updated: ExchangeRate | undefined;
    set((state) => ({
      exchangeRates: state.exchangeRates.map((r) => {
        if (r.id !== id) return r;
        updated = { ...r, ...patch };
        return updated;
      }),
    }));
    if (updated && isAuthed()) writeRow(RES, id, withKind('fx', updated));
  },
  removeExchangeRate: (id) => {
    set((state) => ({ exchangeRates: state.exchangeRates.filter((r) => r.id !== id) }));
    if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
  },

  addCostCenter: (cc) => {
    const item: CostCenter = { ...cc, id: `cc-${Date.now()}` };
    set((state) => ({ costCenters: [...state.costCenters, item] }));
    if (isAuthed()) writeRow(RES, item.id, withKind('cc', item));
  },
  updateCostCenter: (id, patch) => {
    let updated: CostCenter | undefined;
    set((state) => ({
      costCenters: state.costCenters.map((c) => {
        if (c.id !== id) return c;
        updated = { ...c, ...patch };
        return updated;
      }),
    }));
    if (updated && isAuthed()) writeRow(RES, id, withKind('cc', updated));
  },
  removeCostCenter: (id) => {
    set((state) => ({ costCenters: state.costCenters.filter((c) => c.id !== id) }));
    if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
  },

  addBudget: (b) => {
    const item: Budget = { ...b, id: `bg-${Date.now()}` };
    set((state) => ({ budgets: [...state.budgets, item] }));
    if (isAuthed()) writeRow(RES, item.id, withKind('bg', item));
  },
  updateBudget: (id, patch) => {
    let updated: Budget | undefined;
    set((state) => ({
      budgets: state.budgets.map((b) => {
        if (b.id !== id) return b;
        updated = { ...b, ...patch };
        return updated;
      }),
    }));
    if (updated && isAuthed()) writeRow(RES, id, withKind('bg', updated));
  },
  removeBudget: (id) => {
    set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }));
    if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
  },

  resetAll: () => {
    set({
      exchangeRates: DEFAULT_EXCHANGE_RATES.map((r) => ({ ...r })),
      costCenters: DEFAULT_COST_CENTERS.map((c) => ({ ...c })),
      budgets: DEFAULT_BUDGETS.map((b) => ({ ...b })),
    });
    if (isAuthed()) {
      for (const r of DEFAULT_EXCHANGE_RATES) writeRow(RES, r.id, withKind('fx', r));
      for (const c of DEFAULT_COST_CENTERS) writeRow(RES, c.id, withKind('cc', c));
      for (const b of DEFAULT_BUDGETS) writeRow(RES, b.id, withKind('bg', b));
    }
  },

  hydrateFinanceExtension: async () => {
    if (!isAuthed()) return;
    try {
      const res = await entityRepo.list(RES, { page: 1, pageSize: 500 });
      const rows = parsePayload(res?.data || []);
      if (rows.length === 0) {
        for (const r of DEFAULT_EXCHANGE_RATES) writeRow(RES, r.id, withKind('fx', r));
        for (const c of DEFAULT_COST_CENTERS) writeRow(RES, c.id, withKind('cc', c));
        for (const b of DEFAULT_BUDGETS) writeRow(RES, b.id, withKind('bg', b));
        const rf = await entityRepo.list(RES, { page: 1, pageSize: 500 });
        const r2 = parsePayload(rf?.data || []);
        set({
          exchangeRates: splitByKind<ExchangeRate>(r2, 'fx'),
          costCenters: splitByKind<CostCenter>(r2, 'cc'),
          budgets: splitByKind<Budget>(r2, 'bg'),
        });
        return;
      }
      set({
        exchangeRates: splitByKind<ExchangeRate>(rows, 'fx'),
        costCenters: splitByKind<CostCenter>(rows, 'cc'),
        budgets: splitByKind<Budget>(rows, 'bg'),
      });
    } catch {
      // 离线/异常：保留本地种子态
    }
  },
}));

// 模块加载即自动水合（未登录/离线静默兜底）
void useFinanceExtensionStore.getState().hydrateFinanceExtension();
