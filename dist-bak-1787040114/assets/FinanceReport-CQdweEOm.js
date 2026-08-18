import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bX as Grid, bq as Card, br as CardContent, aP as Paper, eJ as ResponsiveChartContainer, eK as BarPlot, eM as PiePlot, eL as LinePlot, i as Divider, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip } from "./vendor-DGU5TO-x.js";
import { f as useFinanceStore } from "./index-DeeqqmHA.js";
const STATUS_CHIP = {
  pending: { label: "待支付", color: "warning" },
  partial: { label: "部分付款", color: "info" },
  paid: { label: "已付清", color: "success" },
  overdue: { label: "已逾期", color: "error" }
};
const COST_CATEGORY = [
  { key: "material", label: "原材料", color: "#1976d2", match: ["原材料", "材料", "采购", "原料"] },
  { key: "labor", label: "人工成本", color: "#388e3c", match: ["人工", "工资", "薪酬", "社保"] },
  { key: "mfg", label: "制造费用", color: "#f57c00", match: ["制造", "车间", "折旧", "能源"] },
  { key: "admin", label: "管理费用", color: "#7b1fa2", match: ["管理", "费用", "办公", "差旅"] }
];
function FinanceReport() {
  const invoices = useFinanceStore((s) => s.invoices);
  const accountEntries = useFinanceStore((s) => s.accountEntries);
  const financeStats = useFinanceStore((s) => s.financeStats);
  const { months, monthlyPayables, monthlyPaid } = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const inv of invoices) {
      if (inv.status === "cancelled") continue;
      const key = (inv.invoiceDate || "").slice(0, 7);
      if (!key) continue;
      const bucket = map.get(key) ?? { payable: 0, paid: 0 };
      bucket.payable += inv.totalAmount || 0;
      if (inv.status === "paid") bucket.paid += inv.totalAmount || 0;
      map.set(key, bucket);
    }
    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      months: sorted.map(([k]) => `${parseInt(k.split("-")[1], 10)}月`),
      monthlyPayables: sorted.map(([, v]) => Math.round(v.payable)),
      monthlyPaid: sorted.map(([, v]) => Math.round(v.paid))
    };
  }, [invoices]);
  const cashFlowTrend = monthlyPaid;
  const vendorPayables = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const inv of invoices) {
      if (inv.status === "cancelled") continue;
      const cur = map.get(inv.vendorName) ?? { amount: 0, paid: 0, total: 0 };
      cur.total += inv.totalAmount || 0;
      if (inv.status === "paid") cur.paid += inv.totalAmount || 0;
      else cur.amount += inv.totalAmount || 0;
      map.set(inv.vendorName, cur);
    }
    return Array.from(map.entries()).map(([vendor, v]) => {
      let status = "paid";
      if (v.paid === 0 && v.amount > 0) status = "pending";
      else if (v.amount > 0) status = "partial";
      return { vendor, amount: v.amount, status };
    });
  }, [invoices]);
  const costDist = reactExports.useMemo(() => {
    const sums = {};
    for (const e of accountEntries) {
      const acc = (e.debitAccount || "") + (e.creditAccount || "");
      const hit = COST_CATEGORY.find((c) => c.match.some((m) => acc.includes(m)));
      const key = (hit == null ? void 0 : hit.key) ?? "other";
      sums[key] = (sums[key] || 0) + (e.amount || 0);
    }
    const result = COST_CATEGORY.map((c) => ({
      id: c.key,
      value: Math.round(sums[c.key] || 0),
      label: c.label,
      color: c.color
    }));
    const other = Math.round(sums["other"] || 0);
    if (other > 0) result.push({ id: "other", value: other, label: "其他", color: "#9e9e9e" });
    return result.filter((r) => r.value > 0);
  }, [accountEntries]);
  const totalPayable = (financeStats == null ? void 0 : financeStats.totalPayable) || 0;
  const totalPaid = (financeStats == null ? void 0 : financeStats.thisMonthPaid) || 0;
  const overdueAmount = (financeStats == null ? void 0 : financeStats.overdueAmount) || 0;
  const paymentRate = totalPayable > 0 ? Math.round(totalPaid / totalPayable * 100) : 0;
  const overdueRate = totalPayable > 0 ? Math.round(overdueAmount / totalPayable * 100) : 0;
  const kpis = [
    { label: "应付账款总额", value: `¥${totalPayable.toLocaleString()}`, color: "#1976d2" },
    { label: "本月已付", value: `¥${totalPaid.toLocaleString()}`, color: "#388e3c" },
    { label: "付款率", value: `${paymentRate}%`, color: "#f57c00" },
    { label: "逾期比率", value: `${overdueRate}%`, color: "#d32f2f" }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, sx: { mb: 3 }, children: "财务报表" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: kpis.map((kpi) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 2, "&:last-child": { pb: 2 } }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: kpi.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, sx: { color: kpi.color }, children: kpi.value })
    ] }) }) }, kpi.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 7, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, gutterBottom: true, children: "月度应付 vs 实付（元）" }),
        months.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "暂无发票数据" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResponsiveChartContainer,
          {
            series: [
              { type: "bar", data: monthlyPayables, label: "应付账款", color: "#90caf9" },
              { type: "bar", data: monthlyPaid, label: "实付金额", color: "#1976d2" }
            ],
            xAxis: [{ scaleType: "band", data: months }],
            height: 240,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(BarPlot, {})
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 5, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, gutterBottom: true, children: "成本结构分布" }),
        costDist.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "暂无凭证数据" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResponsiveChartContainer,
          {
            series: [{
              type: "pie",
              data: costDist,
              innerRadius: 50,
              outerRadius: 90,
              paddingAngle: 3,
              cornerRadius: 4
            }],
            height: 240,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(PiePlot, {})
          }
        )
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, gutterBottom: true, children: "月度现金支出趋势（元）" }),
      months.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "暂无支出数据" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        ResponsiveChartContainer,
        {
          series: [{ type: "line", data: cashFlowTrend, label: "支出金额", color: "#d32f2f" }],
          xAxis: [{ scaleType: "band", data: months }],
          height: 200,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(LinePlot, {})
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { p: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "供应商应付款汇总" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "供应商" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "应付金额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "状态" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: vendorPayables.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 3, align: "center", sx: { color: "#94A3B8" }, children: "暂无应付款" }) }) : vendorPayables.map((vp) => {
          const sc = STATUS_CHIP[vp.status];
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: vp.vendor }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { fontWeight: 600, children: [
              "¥",
              vp.amount.toLocaleString()
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: sc.label, size: "small", color: sc.color }) })
          ] }, vp.vendor);
        }) })
      ] }) })
    ] })
  ] });
}
export {
  FinanceReport as default
};
