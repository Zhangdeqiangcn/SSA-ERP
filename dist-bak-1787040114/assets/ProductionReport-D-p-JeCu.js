import { j as jsxRuntimeExports, B as Box, h as Typography, bX as Grid, f9 as default_1, fa as default_1$1, fb as default_1$2, bq as Card, br as CardContent, aP as Paper, eJ as ResponsiveChartContainer, eK as BarPlot, eM as PiePlot, eL as LinePlot, i as Divider, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip } from "./vendor-DGU5TO-x.js";
const monthlyOutput = [
  { month: "1月", planned: 42, actual: 40 },
  { month: "2月", planned: 38, actual: 35 },
  { month: "3月", planned: 50, actual: 49 },
  { month: "4月", planned: 55, actual: 52 },
  { month: "5月", planned: 60, actual: 38 }
];
const workshopStats = [
  { name: "焊接车间", orders: 12, completed: 10, onTime: 9, efficiency: 92 },
  { name: "钣金车间", orders: 8, completed: 7, onTime: 6, efficiency: 86 },
  { name: "喷涂车间", orders: 5, completed: 5, onTime: 5, efficiency: 100 },
  { name: "激光切割区", orders: 3, completed: 3, onTime: 3, efficiency: 100 }
];
const workOrderStatusDist = [
  { id: 0, value: 5, label: "进行中", color: "#ff9800" },
  { id: 1, value: 12, label: "已完工", color: "#4caf50" },
  { id: 2, value: 3, label: "已下达", color: "#2196f3" },
  { id: 3, value: 2, label: "已关闭", color: "#9e9e9e" }
];
const efficiencyTrend = [35, 38, 40, 42, 44, 46, 45, 48, 50, 52, 49, 38];
const xMonths = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
function ProductionReport() {
  const totalOrders = workshopStats.reduce((s, w) => s + w.orders, 0);
  const totalCompleted = workshopStats.reduce((s, w) => s + w.completed, 0);
  const totalOnTime = workshopStats.reduce((s, w) => s + w.onTime, 0);
  const onTimeRate = totalCompleted > 0 ? Math.round(totalOnTime / totalCompleted * 100) : 0;
  const completionRate = totalOrders > 0 ? Math.round(totalCompleted / totalOrders * 100) : 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, sx: { mb: 3 }, children: "生产报表" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [
      { label: "本月工单总数", value: totalOrders, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), color: "#1976d2" },
      { label: "完工数", value: totalCompleted, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, {}), color: "#388e3c" },
      { label: "完工率", value: `${completionRate}%`, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$2, {}), color: "#7b1fa2" },
      { label: "按期交付率", value: `${onTimeRate}%`, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, {}), color: "#f57c00" }
    ].map((kpi) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 2, "&:last-child": { pb: 2 } }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color: kpi.color }, children: kpi.icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: kpi.label })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", fontWeight: 700, sx: { color: kpi.color }, children: kpi.value })
    ] }) }) }, kpi.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 7, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, gutterBottom: true, children: "月度产量：计划 vs 实际" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResponsiveChartContainer,
          {
            series: [
              { type: "bar", data: monthlyOutput.map((d) => d.planned), label: "计划产量", color: "#90caf9" },
              { type: "bar", data: monthlyOutput.map((d) => d.actual), label: "实际产量", color: "#1976d2" }
            ],
            xAxis: [{ scaleType: "band", data: monthlyOutput.map((d) => d.month) }],
            height: 240,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(BarPlot, {})
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 5, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, gutterBottom: true, children: "工单状态分布" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResponsiveChartContainer,
          {
            series: [{
              type: "pie",
              data: workOrderStatusDist,
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
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, gutterBottom: true, children: "生产效率趋势（件/班次）" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        ResponsiveChartContainer,
        {
          series: [{ type: "line", data: efficiencyTrend, label: "产能效率", color: "#388e3c" }],
          xAxis: [{ scaleType: "band", data: xMonths }],
          height: 200,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(LinePlot, {})
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { p: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "各车间生产统计" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "车间" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "工单数" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "已完工" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "准时完工" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "准时率" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "综合效率" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", sx: { fontWeight: 600 }, children: "评级" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: workshopStats.map((ws) => {
          const onTimeRateWs = ws.completed > 0 ? Math.round(ws.onTime / ws.completed * 100) : 0;
          const grade = ws.efficiency >= 95 ? { label: "优秀", color: "success" } : ws.efficiency >= 85 ? { label: "良好", color: "info" } : { label: "需改进", color: "warning" };
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: ws.name }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: ws.orders }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: ws.completed }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: ws.onTime }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
              onTimeRateWs,
              "%"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 600, color: ws.efficiency >= 95 ? "success.main" : ws.efficiency >= 85 ? "info.main" : "warning.main", children: [
              ws.efficiency,
              "%"
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: grade.label, size: "small", color: grade.color }) })
          ] }, ws.name);
        }) })
      ] }) })
    ] })
  ] });
}
export {
  ProductionReport as default
};
