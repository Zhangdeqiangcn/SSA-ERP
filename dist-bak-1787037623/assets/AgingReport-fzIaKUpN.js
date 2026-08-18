import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { m as Box, T as Typography, bY as Grid, bs as Card, bt as CardContent, aS as Paper, c2 as Tabs, c3 as Tab, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aO as Chip, f4 as default_1 } from "./vendor-mui-DsZGB15g.js";
import { f as useFinanceStore, e as useSalesStore } from "./index-CU2cqxc8.js";
import { F as FlowTracker } from "./FlowTracker-B5McqHb_.js";
import "./vendor-date-DI3D_gXa.js";
import { u as useFinanceExtensionStore, c as convertCurrency, B as BASE_CURRENCY_CODE } from "./financeExtensionStore-DxSjHPMg.js";
import "./vendor-t9csHBDX.js";
const BUCKETS = [
  { key: "current", label: "未到期", color: "#388e3c" },
  { key: "d0_30", label: "逾期 1-30 天", color: "#f57c00" },
  { key: "d31_60", label: "逾期 31-60 天", color: "#ef6c00" },
  { key: "d61_90", label: "逾期 61-90 天", color: "#e64a19" },
  { key: "d90", label: "逾期 90 天以上", color: "#d32f2f" }
];
function daysBetween(dueDate) {
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  return Math.round((now - due) / (24 * 3600 * 1e3));
}
function bucketOf(days) {
  if (days < 0) return "current";
  if (days <= 30) return "d0_30";
  if (days <= 60) return "d31_60";
  if (days <= 90) return "d61_90";
  return "d90";
}
function AgingReport() {
  const { paymentPlans } = useFinanceStore();
  const { salesOrders } = useSalesStore();
  const { exchangeRates } = useFinanceExtensionStore();
  const [tab, setTab] = reactExports.useState(0);
  const apRows = reactExports.useMemo(() => {
    return paymentPlans.filter((p) => p.status !== "paid").map((p) => {
      const unpaid = +(p.totalAmount - p.paidAmount).toFixed(2);
      const days = daysBetween(p.dueDate);
      const base = convertCurrency(unpaid, p.currency, exchangeRates);
      return {
        id: p.id,
        ref: p.planNo,
        name: p.vendorName,
        unpaid,
        currency: p.currency || BASE_CURRENCY_CODE,
        base,
        days,
        bucket: days < 0 ? "current" : bucketOf(days),
        dueDate: p.dueDate
      };
    });
  }, [paymentPlans, exchangeRates]);
  const arRows = reactExports.useMemo(() => {
    const openStatus = ["confirmed", "in_production", "partial_shipped", "fully_shipped"];
    return salesOrders.filter((o) => openStatus.includes(o.status)).map((o) => {
      const received = o.receivedAmount ?? 0;
      const unpaid = +(o.grandTotal - received).toFixed(2);
      if (unpaid <= 0) return null;
      const dueDate = o.arDueDate || o.expectedDeliveryDate;
      const days = daysBetween(dueDate);
      const base = convertCurrency(unpaid, o.currency, exchangeRates);
      return {
        id: o.id,
        ref: o.orderNo,
        name: o.customerName,
        unpaid,
        currency: o.currency || BASE_CURRENCY_CODE,
        base,
        days,
        bucket: days < 0 ? "current" : bucketOf(days),
        dueDate
      };
    }).filter((x) => x !== null);
  }, [salesOrders, exchangeRates]);
  const summarize = (rows2) => {
    const result = { current: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90: 0 };
    rows2.forEach((r) => {
      result[r.bucket] += r.base;
    });
    return result;
  };
  const apSummary = summarize(apRows);
  const arSummary = summarize(arRows);
  const rows = tab === 0 ? apRows : arRows;
  const summary = tab === 0 ? apSummary : arSummary;
  const totalBase = rows.reduce((s, r) => s + r.base, 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "账龄分析（AR / AP）" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "finance", currentStatus: "fin_aging" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [
      BUCKETS.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 2.4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 1.5, "&:last-child": { pb: 1.5 } }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: b.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 700, sx: { color: b.color }, children: [
          "¥",
          (summary[b.key] || 0).toLocaleString(void 0, { maximumFractionDigits: 0 })
        ] })
      ] }) }) }, b.key)),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 2.4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 1.5, "&:last-child": { pb: 1.5 } }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
          "合计(",
          BASE_CURRENCY_CODE,
          ")"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 700, children: [
          "¥",
          totalBase.toLocaleString(void 0, { maximumFractionDigits: 0 })
        ] })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tab, onChange: (_, v) => setTab(v), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: `应付账龄 (AP) · ${apRows.length} 笔` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: `应收账龄 (AR) · ${arRows.length} 笔` })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "单据号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "往来单位" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "到期日" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "原币未结" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "原币" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", sx: { fontWeight: 600 }, children: [
          "折合",
          BASE_CURRENCY_CODE
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "账龄" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "区间" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
        rows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 8, align: "center", sx: { py: 4, color: "text.secondary" }, children: "无未结单据" }) }),
        rows.map((r) => {
          const b = BUCKETS.find((x) => x.key === r.bucket);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: r.ref }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.dueDate }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: r.unpaid.toLocaleString(void 0, { maximumFractionDigits: 2 }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.currency }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { fontWeight: 600, children: [
              "¥",
              r.base.toLocaleString(void 0, { maximumFractionDigits: 2 })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.days < 0 ? `剩 ${Math.abs(r.days)} 天` : `${r.days} 天` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: b.label, size: "small", sx: { bgcolor: b.color, color: "#fff" } }) })
          ] }, r.id);
        })
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mt: 2, color: "text.secondary" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, { fontSize: "small" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", children: [
        "账龄按到期日与当前日期差值分桶；外币单据按汇率管理维护的折算率折合为",
        BASE_CURRENCY_CODE,
        "。AP 来自未付清的付款计划，AR 来自未结清销售订单（应收=含税总额−已收）。"
      ] })
    ] })
  ] });
}
export {
  AgingReport as default
};
