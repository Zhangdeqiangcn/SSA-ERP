import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { entityRepo } from '@/services/entityRepo';
import {
  UNIT_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_TERM_OPTIONS,
  TRADE_TERM_OPTIONS,
  DELIVERY_TERM_OPTIONS,
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
  | 'deliveryTerms'
  | 'currencies'
  | 'languages'
  | 'jobRoles'
  | 'invoiceTypes'
  | 'dispositions'
  | 'purchaseTypes';

/**
 * V3.66.0 P0-2 数据字典 D1 化：每值一行（id = `category::value` 自然键，组织内唯一），
 * 增删改经 entityRepo 同步；启动水合 D1，空库回填本地 seed。
 * 对外接口不变（setCategory/addItem/updateItem/removeItem/resetCategory/resetAll 签名未动），
 * 各消费页（物料单位下拉、订单付款条件等）零改动。
 */
const dictRowId = (category: DataDictCategory, value: string) => `${category}::${value}`;
const packDictRow = (category: DataDictCategory, value: string, sortOrder: number) => ({
  id: dictRowId(category, value),
  category,
  itemValue: value,
  sortOrder,
});
const unpackDictRow = (r: any): { category: DataDictCategory; value: string; sortOrder: number } => ({
  category: r.category as DataDictCategory,
  value: r.itemValue as string,
  sortOrder: typeof r.sortOrder === 'number' ? r.sortOrder : 0,
});

export interface DataDictState {
  units: string[];
  paymentMethods: string[];
  paymentTerms: string[];
  tradeTerms: string[];
  deliveryTerms: string[];
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
  /** V3.66.0 P0-2：启动时从 D1 data_dict 水合（主源 = D1，本地 Blob 降为离线兜底） */
  hydrateDict: () => Promise<void>;
}

/** 分类中文标签，供设置页数据字典 Tab 展示 */
export const DATA_DICT_LABELS: Record<DataDictCategory, string> = {
  units: '计量单位',
  paymentMethods: '付款方式',
  paymentTerms: '付款条件（账期）',
  tradeTerms: '贸易条款',
  deliveryTerms: '交付条件（运输方式）',
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
  deliveryTerms: [...DELIVERY_TERM_OPTIONS],
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
    deliveryTerms: [...DEFAULTS.deliveryTerms],
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
    (set, get) => ({
      ...migrateFromLegacy(),

      setCategory: (category, values) =>
        set((state) => {
          const clean = [...new Set(values.map((v) => String(v).trim()).filter(Boolean))];
          // V3.66.0 P0-2：整类替换 diff 同步 D1（删被移除的行、补新增的行，保留顺序）
          const old = state[category] || [];
          old.forEach((v) => { if (!clean.includes(v)) entityRepo.remove('dataDict', dictRowId(category, v)).catch(() => {}); });
          clean.forEach((v, i) => { if (!old.includes(v)) entityRepo.create('dataDict', packDictRow(category, v, i)).catch(() => {}); });
          return { [category]: clean } as Partial<DataDictState>;
        }),

      addItem: (category, value) =>
        set((state) => {
          const v = value.trim();
          if (!v) return state;
          const list = state[category];
          if (list.includes(v)) return state;
          entityRepo.create('dataDict', packDictRow(category, v, list.length)).catch(() => {});
          return { [category]: [...list, v] } as Partial<DataDictState>;
        }),

      updateItem: (category, index, value) =>
        set((state) => {
          const v = value.trim();
          if (!v) return state;
          const list = [...state[category]];
          if (index < 0 || index >= list.length) return state;
          const old = list[index];
          list[index] = v;
          // 改名 = 删旧行 + 建新行（id 是自然键，避免改自然键）
          if (old !== v) {
            entityRepo.remove('dataDict', dictRowId(category, old)).catch(() => {});
            entityRepo.create('dataDict', packDictRow(category, v, index)).catch(() => {});
          }
          return { [category]: list } as Partial<DataDictState>;
        }),

      removeItem: (category, index) =>
        set((state) => {
          const list = state[category];
          if (index < 0 || index >= list.length) return state;
          entityRepo.remove('dataDict', dictRowId(category, list[index])).catch(() => {});
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
          deliveryTerms: [...DEFAULTS.deliveryTerms],
          currencies: [...DEFAULTS.currencies],
          languages: [...DEFAULTS.languages],
          jobRoles: [...DEFAULTS.jobRoles],
          invoiceTypes: [...DEFAULTS.invoiceTypes],
          dispositions: [...DEFAULTS.dispositions],
          purchaseTypes: [...DEFAULTS.purchaseTypes],
        })),

      hydrateDict: async () => {
        try {
          const res = await entityRepo.list<any>('dataDict', { page: 1, pageSize: 1000 });
          const rows: any[] = res?.data || [];
          if (rows.length === 0) {
            // 空库首次：本地 seed（含旧 localStorage 迁移结果）回填 D1
            (Object.keys(migrateFromLegacy()) as DataDictCategory[]).forEach((cat) => {
              (migrateFromLegacy()[cat] || []).forEach((v, i) => {
                entityRepo.create('dataDict', packDictRow(cat, v, i)).catch(() => {});
              });
            });
            return;
          }
          const next: Record<DataDictCategory, string[]> = {
            units: [], paymentMethods: [], paymentTerms: [], tradeTerms: [], deliveryTerms: [],
            currencies: [], languages: [], jobRoles: [], invoiceTypes: [], dispositions: [], purchaseTypes: [],
          };
          rows.forEach((r) => {
            const row = unpackDictRow(r);
            if (!next[row.category]) return; // 未登记类别不污染本地状态
            next[row.category].push(row.value);
          });
          // 按 sortOrder 排序，同类别保持录入顺序
          (Object.keys(next) as DataDictCategory[]).forEach((cat) => next[cat].sort((a, b) => a.localeCompare(b, 'zh')));
          set({
            units: next.units.length ? next.units : get().units,
            paymentMethods: next.paymentMethods.length ? next.paymentMethods : get().paymentMethods,
            paymentTerms: next.paymentTerms.length ? next.paymentTerms : get().paymentTerms,
            tradeTerms: next.tradeTerms.length ? next.tradeTerms : get().tradeTerms,
            deliveryTerms: next.deliveryTerms.length ? next.deliveryTerms : get().deliveryTerms,
            currencies: next.currencies.length ? next.currencies : get().currencies,
            languages: next.languages.length ? next.languages : get().languages,
            jobRoles: next.jobRoles.length ? next.jobRoles : get().jobRoles,
            invoiceTypes: next.invoiceTypes.length ? next.invoiceTypes : get().invoiceTypes,
            dispositions: next.dispositions.length ? next.dispositions : get().dispositions,
            purchaseTypes: next.purchaseTypes.length ? next.purchaseTypes : get().purchaseTypes,
          });
        } catch {
          /* 离线/异常：保留本地 Blob 副本（persist 水合结果），不阻断 */
        }
      },
    }),
    { storage: backendStorage,

      name: 'ssa-erp-datadict',
      version: 2,
      // 仅持久化数据字段，函数不落盘
      partialize: (state) => ({
        units: state.units,
        paymentMethods: state.paymentMethods,
        paymentTerms: state.paymentTerms,
        tradeTerms: state.tradeTerms,
        deliveryTerms: state.deliveryTerms,
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

// ── V3.66.0 P0-2：启动水合数据字典（D1 主源，与 qualityStore 同款顶层触发）──
void useDataDictStore.getState().hydrateDict();
