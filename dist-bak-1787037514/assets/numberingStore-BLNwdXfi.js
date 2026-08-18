import { a2 as create, a3 as persist } from "./vendor-C0Ken1ns.js";
import { l as backendStorage } from "./index-hTLNcGoC.js";
const datePart = (pattern) => {
  const d = /* @__PURE__ */ new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  switch (pattern) {
    case "YYYY":
      return String(y);
    case "YYYYMM":
      return `${y}${m}`;
    case "YYYYMMDD":
      return `${y}${m}${day}`;
    default:
      return "";
  }
};
const formatNo = (rule, seq) => {
  const seqStr = seq.toString().padStart(rule.seqLength, "0");
  const dp = datePart(rule.datePattern);
  if (!dp) return `${rule.prefix}${rule.separator}${seqStr}`;
  return `${rule.prefix}${rule.separator}${dp}${rule.separator}${seqStr}`;
};
const seedRules = {
  PO: { docType: "PO", prefix: "PO", separator: "-", datePattern: "YYYYMMDD", seqLength: 4, currentSeq: 0, label: "采购订单" },
  SO: { docType: "SO", prefix: "SO", separator: "-", datePattern: "YYYYMMDD", seqLength: 4, currentSeq: 0, label: "销售订单" },
  WO: { docType: "WO", prefix: "WO", separator: "-", datePattern: "YYYY", seqLength: 4, currentSeq: 0, label: "生产工单" },
  PR: { docType: "PR", prefix: "PR", separator: "-", datePattern: "YYYYMMDD", seqLength: 4, currentSeq: 0, label: "采购申请" },
  IN: { docType: "IN", prefix: "IN", separator: "-", datePattern: "YYYYMMDD", seqLength: 4, currentSeq: 0, label: "入库单" },
  OUT: { docType: "OUT", prefix: "OUT", separator: "-", datePattern: "YYYYMMDD", seqLength: 4, currentSeq: 0, label: "出库单" },
  FG: { docType: "FG", prefix: "FG", separator: "-", datePattern: "YYYYMMDD", seqLength: 4, currentSeq: 0, label: "成品入库" },
  QC: { docType: "QC", prefix: "QC", separator: "-", datePattern: "YYYYMMDD", seqLength: 4, currentSeq: 0, label: "质检单" },
  MRP: { docType: "MRP", prefix: "MRP", separator: "-", datePattern: "YYYYMMDD", seqLength: 4, currentSeq: 0, label: "MRP计划" }
};
const DOC_TYPES = Object.keys(seedRules);
const useNumberingStore = create()(
  persist(
    (set, get) => ({
      rules: { ...seedRules },
      nextNo: (docType) => {
        const rule = get().rules[docType];
        const seq = rule.currentSeq + 1;
        const no = formatNo(rule, seq);
        set((s) => ({
          rules: { ...s.rules, [docType]: { ...rule, currentSeq: seq } }
        }));
        return no;
      },
      previewNext: (docType) => {
        const rule = get().rules[docType];
        return formatNo(rule, rule.currentSeq + 1);
      },
      updateRule: (docType, partial) => set((s) => ({
        rules: {
          ...s.rules,
          [docType]: { ...s.rules[docType], ...partial, docType }
        }
      })),
      resetSeq: (docType) => set((s) => ({
        rules: { ...s.rules, [docType]: { ...s.rules[docType], currentSeq: 0 } }
      })),
      resetAll: () => set({ rules: { ...seedRules } })
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-numbering",
      version: 1,
      partialize: (state) => ({ rules: state.rules })
    }
  )
);
export {
  DOC_TYPES as D,
  useNumberingStore as u
};
