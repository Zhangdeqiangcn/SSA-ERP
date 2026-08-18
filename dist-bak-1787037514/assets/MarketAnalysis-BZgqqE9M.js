import { j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { e as useSalesStore } from "./index-hTLNcGoC.js";
import { f as formatCurrency } from "./format-BXPn3erM.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { m as Box, a0 as AttachMoney, R as People, c8 as TrendingUp, _ as CartIcon, aS as Paper, bL as Stack, T as Typography, bY as Grid, er as PieChart, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aO as Chip, ch as LinearProgress, c9 as TrendingDown } from "./vendor-mui-UhJuRAfR.js";
import { L as LineChart, B as BarChart } from "./vendor-charts-CTjfnoPO.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
const MarketAnalysis = () => {
  var _a;
  const { marketData } = useSalesStore();
  const data = marketData[0];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "市场分析", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 2, mb: 3 }, children: [
      { label: "本月营收", value: formatCurrency(data.totalRevenue), icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AttachMoney, {}), color: "#3B82F6" },
      { label: "新增客户", value: data.newCustomers + " 家", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(People, {}), color: "#10B981" },
      { label: "转化率", value: data.conversionRate + "%", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {}), color: "#8B5CF6" },
      { label: "订单数", value: ((_a = data.salesTrend[data.salesTrend.length - 1]) == null ? void 0 : _a.orderCount) + " 单", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CartIcon, {}), color: "#F59E0B" }
    ].map((kpi, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, flex: 1, border: `1px solid ${kpi.color}20` }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", mb: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: kpi.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color: kpi.color, opacity: 0.7 }, children: kpi.icon })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, color: kpi.color, children: kpi.value })
    ] }, idx)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 3, borderRadius: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "月度销售趋势" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { height: 300 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        LineChart,
        {
          dataset: data.salesTrend.map((t) => ({ month: t.month.substring(5), 营收: t.revenue / 1e4, 订单数: t.orderCount })),
          xAxis: [{ dataKey: "month", label: "月份" }],
          yAxis: [{ label: "营收(万元)" }, { label: "订单数" }],
          series: [
            { dataKey: "营收", color: "#3B82F6", area: true },
            { dataKey: "订单数", color: "#10B981" }
          ],
          height: 280
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 3, height: "100%" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(PieChart, { sx: { fontSize: 18, mr: 0.5, verticalAlign: "middle" } }),
          "热销产品 Top 3"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "产品" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "销量(吨)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "销售额" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "市场份额" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "增长率" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: data.topProducts.map((p, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: idx + 1, size: "small", color: idx === 0 ? "primary" : idx === 1 ? "warning" : "default" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: p.productName })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: p.salesVolume }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(p.salesAmount) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                LinearProgress,
                {
                  variant: "determinate",
                  value: p.marketShare,
                  sx: { width: 80, height: 6, borderRadius: 3, display: "inline-block", mr: 1 }
                }
              ),
              p.marketShare,
              "%"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: p.growthRate > 0 ? "#10B981" : "#EF4444", fontWeight: 500, children: [
              p.growthRate > 0 ? "+" : "",
              p.growthRate,
              "%"
            ] }) })
          ] }, p.productCode)) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 3, height: "100%" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { sx: { fontSize: 18, mr: 0.5, verticalAlign: "middle" } }),
          "区域销售分布"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 2, children: data.regionalData.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", mb: 0.5, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: r.region }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                r.customerCount,
                "家客户 · ",
                r.orderCount,
                "单"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: formatCurrency(r.salesAmount) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            LinearProgress,
            {
              variant: "determinate",
              value: Math.max(r.salesAmount / data.totalRevenue * 100, 2),
              sx: { height: 8, borderRadius: 3, mb: 0.5 }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", justifyContent: "flex-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: `同比 ${r.yoyGrowth > 0 ? "+" : ""}${r.yoyGrowth}%`,
              size: "small",
              color: r.yoyGrowth > 0 ? "success" : "error",
              variant: "outlined",
              icon: r.yoyGrowth > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, {}),
              sx: { height: 22, fontSize: "0.65rem" }
            }
          ) })
        ] }, r.region)) }),
        data.regionalData.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { height: 200, mt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          BarChart,
          {
            dataset: data.regionalData.map((r) => ({ 区域: r.region, 销售额: r.salesAmount / 1e4 })),
            xAxis: [{ dataKey: "区域", scaleType: "band" }],
            yAxis: [{ label: "万元" }],
            series: [{ dataKey: "销售额", color: "#3B82F6" }],
            height: 180
          }
        ) })
      ] }) })
    ] })
  ] });
};
export {
  MarketAnalysis as default
};
