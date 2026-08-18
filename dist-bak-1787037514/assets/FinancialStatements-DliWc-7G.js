import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { m as Box, T as Typography, bv as TextField, aR as MenuItem, bm as Button, dx as default_1, c2 as Tabs, c3 as Tab, bl as Alert, aS as Paper, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody } from "./vendor-mui-UhJuRAfR.js";
import { f as useFinanceStore, e as useSalesStore } from "./index-hTLNcGoC.js";
import { b as buildBalanceSheet, a as buildIncomeStatement, c as buildCashFlowStatement, d as buildAPSubledger, e as buildARSubledger } from "./financialStatements-BEqRnI6u.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
const fmt = (n) => (n < 0 ? "-" : "") + "¥" + Math.abs(n).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PERIODS = [
  { value: "all", label: "累计（全部期间）" },
  { value: "2026-01", label: "2026年01期" }
];
function SectionTable({ rows, total, totalLabel, testId }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, sx: { mt: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "科目编码" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "科目名称" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "分组" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "金额" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
      rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: r.code }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.section || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: fmt(r.amount) }) })
      ] }, r.code)),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.100" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 3, sx: { fontWeight: 700 }, children: totalLabel }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 700 }, "data-testid": testId, children: fmt(total) })
      ] })
    ] })
  ] }) });
}
function FinancialStatements() {
  const { accountEntries, chartOfAccounts, invoices, paymentPlans } = useFinanceStore();
  const { salesOrders } = useSalesStore();
  const [tab, setTab] = reactExports.useState(0);
  const [period, setPeriod] = reactExports.useState("2026-01");
  const bs = reactExports.useMemo(() => buildBalanceSheet(accountEntries, chartOfAccounts, period), [accountEntries, chartOfAccounts, period]);
  const is = reactExports.useMemo(() => buildIncomeStatement(accountEntries, chartOfAccounts, period), [accountEntries, chartOfAccounts, period]);
  const cf = reactExports.useMemo(() => buildCashFlowStatement(accountEntries, chartOfAccounts, period), [accountEntries, chartOfAccounts, period]);
  const ap = reactExports.useMemo(() => buildAPSubledger(invoices, paymentPlans), [invoices, paymentPlans]);
  const ar = reactExports.useMemo(() => buildARSubledger(salesOrders), [salesOrders]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, "data-testid": "financial-statements", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "财务报表" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { select: true, size: "small", label: "会计期间", value: period, onChange: (e) => setPeriod(e.target.value), sx: { minWidth: 180 }, children: PERIODS.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: p.value, children: p.label }, p.value)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), size: "small", onClick: () => window.print(), children: "打印" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tab, onChange: (_, v) => setTab(v), sx: { borderBottom: 1, borderColor: "divider", mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "资产负债表" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "利润表" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "现金流量表" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "应收明细账" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "应付明细账" })
    ] }),
    tab === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: bs.balanced ? "success" : "warning", sx: { mb: 2 }, "data-testid": "bs-balanced", children: bs.balanced ? `资产负债表平衡：资产合计 ${fmt(bs.totalAssets)} = 负债 ${fmt(bs.totalLiabilities)} + 权益 ${fmt(bs.totalEquity)}` : `资产负债表不平衡：资产 ${fmt(bs.totalAssets)} / 负债权益 ${fmt(bs.totalLiabilities + bs.totalEquity)}` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 700, mt: 1, children: "资产" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SectionTable, { rows: bs.assets, total: bs.totalAssets, totalLabel: "资产总计", testId: "bs-total-assets" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 700, mt: 3, children: "负债" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SectionTable, { rows: bs.liabilities, total: bs.totalLiabilities, totalLabel: "负债合计", testId: "bs-total-liabilities" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 700, mt: 3, children: "所有者权益" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SectionTable, { rows: bs.equity, total: bs.totalEquity, totalLabel: "所有者权益合计", testId: "bs-total-equity" })
    ] }),
    tab === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SectionTable, { rows: is.revenue, total: is.totalRevenue, totalLabel: "营业收入合计", testId: "is-total-revenue" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 700, mt: 3, children: "减：营业成本与费用" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SectionTable, { rows: is.expense, total: is.totalExpense, totalLabel: "成本费用合计", testId: "is-total-expense" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mt: 2 }, "data-testid": "is-net-profit", children: [
        "净利润（收入 - 成本费用）：",
        fmt(is.netProfit)
      ] })
    ] }),
    tab === 2 && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { mt: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "项目" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "流入" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "流出" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "净额" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "经营活动现金流量" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: fmt(cf.operating.inflow) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: fmt(cf.operating.outflow) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", "data-testid": "cf-operating-net", children: fmt(cf.operating.net) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "投资活动现金流量" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: fmt(cf.investing.inflow) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: fmt(cf.investing.outflow) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: fmt(cf.investing.net) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "筹资活动现金流量" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: fmt(cf.financing.inflow) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: fmt(cf.financing.outflow) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: fmt(cf.financing.net) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.100" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 700 }, children: "现金及现金等价物净增加额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 700 }, "data-testid": "cf-total-net", children: fmt(cf.totalNet) })
        ] })
      ] })
    ] }) }) }) }),
    tab === 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", color: "text.secondary", mb: 1, children: "应收账款（取销售订单：应收金额 - 已收金额）" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, sx: { mt: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "客户" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "应收总额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "已收金额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "未收余额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "到期日" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
          ar.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.party }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: fmt(r.documentAmount) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: fmt(r.settledAmount) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { fontWeight: r.balance > 0 ? 700 : 400, color: r.balance > 0 ? "error.main" : "text.primary", children: fmt(r.balance) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.dueDate || "—" })
          ] }, r.party)),
          ar.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 5, align: "center", color: "text.disabled", children: "无应收账款数据" }) })
        ] })
      ] }) })
    ] }),
    tab === 4 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", color: "text.secondary", mb: 1, children: "应付账款（取采购发票与付款计划）" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, sx: { mt: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "供应商" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "应付总额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "已付金额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "未付余额" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: ap.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.party }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: fmt(r.documentAmount) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: fmt(r.settledAmount) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { fontWeight: r.balance > 0 ? 700 : 400, color: r.balance > 0 ? "error.main" : "text.primary", children: fmt(r.balance) }) })
        ] }, r.party)) })
      ] }) })
    ] })
  ] });
}
export {
  FinancialStatements as default
};
