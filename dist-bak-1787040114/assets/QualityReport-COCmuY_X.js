import { j as jsxRuntimeExports, B as Box, h as Typography, bk as Button, be as Refresh, dg as Download, bX as Grid, aP as Paper, cl as LinearProgress, eJ as ResponsiveChartContainer, eK as BarPlot, eL as LinePlot, eM as PiePlot, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip } from "./vendor-DGU5TO-x.js";
import { d as useQualityStore } from "./index-DeeqqmHA.js";
const QualityReport = () => {
  const { inspectionTasks, unqualifiedItems, pdcaRecords } = useQualityStore();
  const passed = inspectionTasks.filter((t) => t.status === "passed").length;
  const failed = inspectionTasks.filter((t) => t.status === "failed").length;
  const total = inspectionTasks.length;
  const passRate = total > 0 ? Math.round(passed / (passed + failed) * 100) : 0;
  const monthlyData = [
    { month: "1月", total: 18, passed: 17, rate: 94.4 },
    { month: "2月", total: 22, passed: 21, rate: 95.5 },
    { month: "3月", total: 25, passed: 23, rate: 92 },
    { month: "4月", total: 20, passed: 19, rate: 95 },
    { month: "5月", total, passed, rate: passRate }
  ];
  const defectTypes = [
    { type: "尺寸超差", count: 5, color: "#3B82F6" },
    { type: "螺纹不合格", count: 3, color: "#EF4444" },
    { type: "外观缺陷", count: 4, color: "#F59E0B" },
    { type: "强度不足", count: 2, color: "#8B5CF6" },
    { type: "化学成分偏差", count: 1, color: "#10B981" }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: "#1E293B" }, children: "质量报表" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Refresh, {}), size: "small", children: "刷新" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, {}), size: "small", children: "导出报表" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2.5, sx: { mb: 3 }, children: [
      { label: "综合合格率", value: `${passRate}%`, target: "≥95%", color: passRate >= 95 ? "#10B981" : "#F59E0B", progress: passRate },
      { label: "待处理不合格品", value: unqualifiedItems.filter((i) => i.dispositionStatus !== "completed").length, target: "目标: 0", color: "#EF4444", progress: null },
      { label: "进行中PDCA", value: pdcaRecords.filter((r) => r.status !== "closed").length, target: "持续改进中", color: "#6366F1", progress: null },
      { label: "本月检验总批次", value: total, target: "已完成/进行中", color: "#3B82F6", progress: null }
    ].map((kpi) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, border: `1px solid ${kpi.color}20` }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#64748B", mb: 0.5 }, children: kpi.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: kpi.color, fontSize: "1.875rem" }, children: kpi.value }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#94A3B8" }, children: kpi.target }),
      kpi.progress !== null && /* @__PURE__ */ jsxRuntimeExports.jsx(
        LinearProgress,
        {
          variant: "determinate",
          value: kpi.progress,
          sx: { mt: 1.5, height: 4, borderRadius: 2, bgcolor: "#F1F5F9", "& .MuiLinearProgress-bar": { bgcolor: kpi.color, borderRadius: 2 } }
        }
      )
    ] }) }, kpi.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 8, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 3 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600, mb: 3 }, children: "月度合格率趋势" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          ResponsiveChartContainer,
          {
            series: [
              { type: "bar", data: monthlyData.map((d) => d.total), color: "#E2E8F0", label: "总检批次" },
              { type: "bar", data: monthlyData.map((d) => d.passed), color: "#3B82F6", label: "合格批次" },
              { type: "line", data: monthlyData.map((d) => d.rate), color: "#10B981", label: "合格率(%)" }
            ],
            xAxis: [{ scaleType: "band", data: monthlyData.map((d) => d.month) }],
            height: 280,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(BarPlot, {}),
              /* @__PURE__ */ jsxRuntimeExports.jsx(LinePlot, {})
            ]
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 3 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600, mb: 3 }, children: "缺陷类型分布" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResponsiveChartContainer,
          {
            series: [{
              type: "pie",
              data: defectTypes.map((d, i) => ({ id: i, value: d.count, label: d.type, color: d.color })),
              innerRadius: 40
            }],
            height: 200,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(PiePlot, {})
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mt: 2, display: "flex", flexDirection: "column", gap: 1 }, children: defectTypes.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 8, height: 8, borderRadius: "50%", bgcolor: d.color } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#475569" }, children: d.type })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { fontWeight: 600, color: "#1E293B" }, children: [
            d.count,
            " 次"
          ] })
        ] }, d.type)) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 3 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600, mb: 2 }, children: "供应商质量排名（近3个月）" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "排名" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "供应商" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "检验批次" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "合格批次" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "合格率" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "不合格品数量" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "评级" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: [
            { rank: 1, name: "上海宝钢贸易有限公司", total: 12, passed: 12, rate: 100, defects: 0, grade: "A" },
            { rank: 2, name: "上海施耐德电气有限公司", total: 8, passed: 8, rate: 100, defects: 0, grade: "A" },
            { rank: 3, name: "苏州金属材料有限公司", total: 10, passed: 9, rate: 90, defects: 50, grade: "B" },
            { rank: 4, name: "宁波紧固件制造有限公司", total: 8, passed: 6, rate: 75, defects: 300, grade: "C" }
          ].map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: {
              width: 28,
              height: 28,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: row.rank <= 2 ? "#FEF3C7" : "#F8FAFC",
              color: row.rank <= 2 ? "#D97706" : "#64748B",
              fontWeight: 700,
              fontSize: "0.8125rem"
            }, children: row.rank }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 500 }, children: row.name }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.total }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.passed }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                LinearProgress,
                {
                  variant: "determinate",
                  value: row.rate,
                  sx: { width: 60, height: 4, borderRadius: 2, bgcolor: "#F1F5F9", "& .MuiLinearProgress-bar": { bgcolor: row.rate >= 95 ? "#10B981" : row.rate >= 80 ? "#F59E0B" : "#EF4444", borderRadius: 2 } }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { fontWeight: 500, color: row.rate >= 95 ? "#10B981" : row.rate >= 80 ? "#F59E0B" : "#EF4444" }, children: [
                row.rate,
                "%"
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: row.defects > 0 ? "#EF4444" : "#10B981" }, children: row.defects }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: row.grade,
                size: "small",
                sx: {
                  bgcolor: row.grade === "A" ? "#ECFDF5" : row.grade === "B" ? "#FFF7ED" : "#FEF2F2",
                  color: row.grade === "A" ? "#10B981" : row.grade === "B" ? "#F59E0B" : "#EF4444",
                  fontWeight: 700
                }
              }
            ) })
          ] }, row.rank)) })
        ] }) })
      ] }) })
    ] })
  ] });
};
export {
  QualityReport as default
};
