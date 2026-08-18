import { a2 as create, a3 as persist } from "./vendor-C0Ken1ns.js";
import { l as backendStorage } from "./index-hTLNcGoC.js";
import { T as TRADE_TERM_OPTIONS, P as PAYMENT_TERM_OPTIONS, a as PAYMENT_METHOD_OPTIONS, U as UNIT_OPTIONS, b as PURCHASE_TYPE_OPTIONS, D as DISPOSITION_OPTIONS, I as INVOICE_TYPE_OPTIONS } from "./options-BINuI5Gr.js";
const DATA_DICT_LABELS = {
  units: "计量单位",
  paymentMethods: "付款方式",
  paymentTerms: "付款条件（账期）",
  tradeTerms: "贸易条款",
  currencies: "货币",
  languages: "语言",
  jobRoles: "岗位角色",
  invoiceTypes: "发票类型",
  dispositions: "不合格处置方式",
  purchaseTypes: "采购类型"
};
const DEFAULTS = {
  units: [...UNIT_OPTIONS],
  paymentMethods: [...PAYMENT_METHOD_OPTIONS],
  paymentTerms: [...PAYMENT_TERM_OPTIONS],
  tradeTerms: [...TRADE_TERM_OPTIONS],
  currencies: ["人民币 (CNY)", "美元 (USD)", "欧元 (EUR)", "日元 (JPY)", "港币 (HKD)"],
  languages: ["简体中文", "English", "日本語", "한국어"],
  jobRoles: ["采购员", "质检员", "库管员", "生产主管", "班长", "财务主管", "会计", "销售经理", "物流调度"],
  invoiceTypes: INVOICE_TYPE_OPTIONS.map((o) => o.label),
  dispositions: DISPOSITION_OPTIONS.map((o) => o.label),
  purchaseTypes: PURCHASE_TYPE_OPTIONS.map((o) => o.label)
};
const migrateFromLegacy = () => {
  const seed = {
    units: [...DEFAULTS.units],
    paymentMethods: [...DEFAULTS.paymentMethods],
    paymentTerms: [...DEFAULTS.paymentTerms],
    tradeTerms: [...DEFAULTS.tradeTerms],
    currencies: [...DEFAULTS.currencies],
    languages: [...DEFAULTS.languages],
    jobRoles: [...DEFAULTS.jobRoles],
    invoiceTypes: [...DEFAULTS.invoiceTypes],
    dispositions: [...DEFAULTS.dispositions],
    purchaseTypes: [...DEFAULTS.purchaseTypes]
  };
  try {
    const raw = localStorage.getItem("ssa-basic-config");
    if (raw) {
      const cfg = JSON.parse(raw);
      const pick = (k) => {
        const v = cfg[k];
        return Array.isArray(v) && v.length ? v : void 0;
      };
      const mu = pick("measurementUnits");
      if (mu) seed.units = mu;
      const pm = pick("paymentMethods");
      if (pm) seed.paymentMethods = pm;
      const pt = pick("paymentTerms");
      if (pt) seed.paymentTerms = pt;
      const tt = pick("tradeTerms");
      if (tt) seed.tradeTerms = tt;
      const cur = pick("currencies");
      if (cur) seed.currencies = cur;
      const lang = pick("languages");
      if (lang) seed.languages = lang;
      const role = pick("jobRoles");
      if (role) seed.jobRoles = role;
    }
  } catch {
  }
  return seed;
};
const useDataDictStore = create()(
  persist(
    (set) => ({
      ...migrateFromLegacy(),
      setCategory: (category, values) => set(() => ({ [category]: [...values] })),
      addItem: (category, value) => set((state) => {
        const v = value.trim();
        if (!v) return state;
        const list = state[category];
        if (list.includes(v)) return state;
        return { [category]: [...list, v] };
      }),
      updateItem: (category, index, value) => set((state) => {
        const v = value.trim();
        if (!v) return state;
        const list = [...state[category]];
        if (index < 0 || index >= list.length) return state;
        list[index] = v;
        return { [category]: list };
      }),
      removeItem: (category, index) => set((state) => {
        const list = state[category];
        if (index < 0 || index >= list.length) return state;
        return { [category]: list.filter((_, i) => i !== index) };
      }),
      resetCategory: (category) => set(() => ({ [category]: [...DEFAULTS[category]] })),
      resetAll: () => set(() => ({
        units: [...DEFAULTS.units],
        paymentMethods: [...DEFAULTS.paymentMethods],
        paymentTerms: [...DEFAULTS.paymentTerms],
        tradeTerms: [...DEFAULTS.tradeTerms],
        currencies: [...DEFAULTS.currencies],
        languages: [...DEFAULTS.languages],
        jobRoles: [...DEFAULTS.jobRoles],
        invoiceTypes: [...DEFAULTS.invoiceTypes],
        dispositions: [...DEFAULTS.dispositions],
        purchaseTypes: [...DEFAULTS.purchaseTypes]
      }))
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-datadict",
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
        purchaseTypes: state.purchaseTypes
      })
    }
  )
);
export {
  DATA_DICT_LABELS as D,
  useDataDictStore as u
};
