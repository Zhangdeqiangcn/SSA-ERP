import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import {
  UNIT_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_TERM_OPTIONS,
  TRADE_TERM_OPTIONS,
  INVOICE_TYPE_OPTIONS,
  DISPOSITION_OPTIONS,
  PURCHASE_TYPE_OPTIONS,
} from '@/constants/options';

/**
 * 数据字典单一数据源（P2-1 核心）
 * ------------------------------------------------------------
 * 把散落在 options.ts（中央默认值）与 BasicConfigTab（ssa-basic-config）的
 * 枚举/下拉选项收敛到唯一的 zustand persist store，键 ssa-erp-datadict。
 * 各业务表单（如物料单位、订单付款条件）统一从这里读取，设置页「数据字典」Tab
 * 负责维护。首次启动从 options 默认值播种，并一次性迁移旧 ssa-basic-config 中
 * 用户自定义项，避免数据丢失。
 */

export type DataDictCategory =
  | 'units'
  | 'paymentMethods'
  | 'paymentTerms'
  | 'tradeTerms'
  | 'currencies'
  | 'languages'
  | 'jobRoles'
  | 'invoiceTypes'
  | 'dispositions'
  | 'purchaseTypes';

export interface DataDictState {
  units: string[];
  paymentMethods: string[];
  paymentTerms: string[];
  tradeTerms: string[];
  currencies: string[];
  languages: string[];
  jobRoles: string[];
  invoiceTypes: string[];
  dispositions: string[];
  purchaseTypes: string[];
  setCategory: (category: DataDictCategory, values: string[]) => void;
  addItem: (category: DataDictCategory, value: string) => void;
  updateItem: (category: DataDictCategory, index: number, value: string) => void;
  removeItem: (category: DataDictCategory, index: number) => void;
  resetCategory: (category: DataDictCategory) => void;
  resetAll: () => void;
}

/** 分类中文标签，供设置页数据字典 Tab 展示 */
export const DATA_DICT_LABELS: Record<DataDictCategory, string> = {
  units: '计量单位',
  paymentMethods: '付款方式',
  paymentTerms: '付款条件（账期）',
  tradeTerms: '贸易条款',
  currencies: '货币',
  languages: '语言',
  jobRoles: '岗位角色',
  invoiceTypes: '发票类型',
  dispositions: '不合格处置方式',
  purchaseTypes: '采购类型',
};

/** 出厂默认种子（与 options.ts 中央默认值保持一致） */
const DEFAULTS: Record<DataDictCategory, string[]> = {
  units: [...UNIT_OPTIONS],
  paymentMethods: [...PAYMENT_METHOD_OPTIONS],
  paymentTerms: [...PAYMENT_TERM_OPTIONS],
  tradeTerms: [...TRADE_TERM_OPTIONS],
  currencies: ['人民币 (CNY)', '美元 (USD)', '欧元 (EUR)', '日元 (JPY)', '港币 (HKD)'],
  languages: ['简体中文', 'English', '日本語', '한국어'],
  jobRoles: ['采购员', '质检员', '库管员', '生产主管', '班长', '财务主管', '会计', '销售经理', '物流调度'],
  invoiceTypes: INVOICE_TYPE_OPTIONS.map((o) => o.label),
  dispositions: DISPOSITION_OPTIONS.map((o) => o.label),
  purchaseTypes: PURCHASE_TYPE_OPTIONS.map((o) => o.label),
};

/** 从旧的 BasicConfig（ssa-basic-config）一次性迁移用户自定义项到数据字典 */
const migrateFromLegacy = (): Record<DataDictCategory, string[]> => {
  const seed: Record<DataDictCategory, string[]> = {
    units: [...DEFAULTS.units],
    paymentMethods: [...DEFAULTS.paymentMethods],
    paymentTerms: [...DEFAULTS.paymentTerms],
    tradeTerms: [...DEFAULTS.tradeTerms],
    currencies: [...DEFAULTS.currencies],
    languages: [...DEFAULTS.languages],
    jobRoles: [...DEFAULTS.jobRoles],
    invoiceTypes: [...DEFAULTS.invoiceTypes],
    dispositions: [...DEFAULTS.dispositions],
    purchaseTypes: [...DEFAULTS.purchaseTypes],
  };
  try {
    const raw = localStorage.getItem('ssa-basic-config');
    if (raw) {
      const cfg = JSON.parse(raw);
      const pick = (k: string): string[] | undefined => {
        const v = cfg[k];
        return Array.isArray(v) && v.length ? v : undefined;
      };
      const mu = pick('measurementUnits');
      if (mu) seed.units = mu;
      const pm = pick('paymentMethods');
      if (pm) seed.paymentMethods = pm;
      const pt = pick('paymentTerms');
      if (pt) seed.paymentTerms = pt;
      const tt = pick('tradeTerms');
      if (tt) seed.tradeTerms = tt;
      const cur = pick('currencies');
      if (cur) seed.currencies = cur;
      const lang = pick('languages');
      if (lang) seed.languages = lang;
      const role = pick('jobRoles');
      if (role) seed.jobRoles = role;
    }
  } catch {
    /* ignore */
  }
  return seed;
};

export const useDataDictStore = create<DataDictState>()(
  persist(
    (set) => ({
      ...migrateFromLegacy(),

      setCategory: (category, values) =>
        set(() => ({ [category]: [...values] } as Partial<DataDictState>)),

      addItem: (category, value) =>
        set((state) => {
          const v = value.trim();
          if (!v) return state;
          const list = state[category];
          if (list.includes(v)) return state;
          return { [category]: [...list, v] } as Partial<DataDictState>;
        }),

      updateItem: (category, index, value) =>
        set((state) => {
          const v = value.trim();
          if (!v) return state;
          const list = [...state[category]];
          if (index < 0 || index >= list.length) return state;
          list[index] = v;
          return { [category]: list } as Partial<DataDictState>;
        }),

      removeItem: (category, index) =>
        set((state) => {
          const list = state[category];
          if (index < 0 || index >= list.length) return state;
          return { [category]: list.filter((_, i) => i !== index) } as Partial<DataDictState>;
        }),

      resetCategory: (category) =>
        set(() => ({ [category]: [...DEFAULTS[category]] } as Partial<DataDictState>)),

      resetAll: () =>
        set(() => ({
          units: [...DEFAULTS.units],
          paymentMethods: [...DEFAULTS.paymentMethods],
          paymentTerms: [...DEFAULTS.paymentTerms],
          tradeTerms: [...DEFAULTS.tradeTerms],
          currencies: [...DEFAULTS.currencies],
          languages: [...DEFAULTS.languages],
          jobRoles: [...DEFAULTS.jobRoles],
          invoiceTypes: [...DEFAULTS.invoiceTypes],
          dispositions: [...DEFAULTS.dispositions],
          purchaseTypes: [...DEFAULTS.purchaseTypes],
        })),
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-datadict',
      version: 1,
      // 仅持久化数据字段，函数不落盘
      partialize: (state) => ({
        units: state.units,
        paymentMethods: state.paymentMethods,
        paymentTerms: state.paymentTerms,
        tradeTerms: state.tradeTerms,
        currencies: state.currencies,
        languages: state.languages,
        jobRoles: state.jobRoles,
        invoiceTypes: state.invoiceTypes,
        dispositions: state.dispositions,
        purchaseTypes: state.purchaseTypes,
      }),
    }
  )
);
