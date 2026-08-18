import { u as useTheme, r as reactExports, j as jsxRuntimeExports, B as Box, bK as Stack, ai as AutorenewIcon, h as Typography, aL as Chip, bX as Grid, bq as Card, br as CardContent, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, bj as Alert, bk as Button, V as CartIcon, cm as BarChart, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, cU as Snackbar } from "./vendor-46QZWBd3.js";
import { u as useMaterialStore, e as useSalesStore, b as usePurchaseStore } from "./index-CcOZBoQL.js";
import { u as useAnalyticsStore } from "./analyticsStore-SaeDm71F.js";
function buildMonthlySales(salesOrders, materialId, months = 12) {
  const now = /* @__PURE__ */ new Date();
  const points = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    points.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      qty: 0
    });
  }
  const currentIdx = months - 1;
  for (const so of salesOrders) {
    if (so.status === "cancelled") continue;
    const d = new Date(so.orderDate);
    if (isNaN(d.getTime())) continue;
    const idx = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
    if (idx >= 0 && idx < months) {
      const pointIdx = currentIdx - idx;
      const qty = so.items.filter((it) => it.materialId === materialId).reduce((s, it) => s + (it.quantity || 0), 0);
      points[pointIdx].qty += qty;
    }
  }
  return points;
}
function computeDemandForecast(params) {
  const {
    monthlySales,
    currentStock,
    leadTimeDays,
    safetyStockBase = 0,
    moq = 0,
    mpq = 0
  } = params;
  const n = monthlySales.length;
  const sum = monthlySales.reduce((a, b) => a + b, 0);
  const avg = n ? sum / n : 0;
  const variance = n ? monthlySales.reduce((a, b) => a + (b - avg) ** 2, 0) / n : 0;
  const std = Math.sqrt(variance);
  const last3 = monthlySales.slice(-3);
  const forecastQty = last3.length ? last3.reduce((a, b) => a + b, 0) / last3.length : avg;
  const z = 1.65;
  const computedSS = z * std * Math.sqrt(leadTimeDays / 30);
  const safetyStock = Math.max(safetyStockBase, Math.round(computedSS));
  const leadTimeDemand = avg * (leadTimeDays / 30);
  const reorderPoint = Math.round(leadTimeDemand + safetyStock);
  let suggested = Math.max(0, Math.round(reorderPoint + forecastQty - currentStock));
  if (mpq > 0 && suggested > 0) {
    suggested = Math.ceil(suggested / mpq) * mpq;
  } else if (moq > 0 && suggested > 0) {
    suggested = Math.max(moq, Math.ceil(suggested / moq) * moq);
  }
  const hasHistory = monthlySales.some((q) => q > 0);
  return {
    monthlyHistory: monthlySales.map((qty, i) => ({
      month: `${i + 1}月`,
      qty
    })),
    forecastQty: Math.round(forecastQty * 10) / 10,
    avgMonthlyDemand: Math.round(avg * 10) / 10,
    stdDev: Math.round(std * 10) / 10,
    leadTimeDays,
    safetyStock,
    reorderPoint,
    currentStock,
    suggestedOrderQty: suggested,
    hasHistory
  };
}
const fmt = (n) => n.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
function Forecast() {
  var _a;
  const theme = useTheme();
  const materials = useMaterialStore((s) => s.materials);
  const salesOrders = useSalesStore((s) => s.salesOrders);
  const addPurchaseRequest = usePurchaseStore((s) => s.addPurchaseRequest);
  const addForecastSuggestion = useAnalyticsStore((s) => s.addForecastSuggestion);
  const suggestions = useAnalyticsStore((s) => s.forecastSuggestions);
  const [selectedId, setSelectedId] = reactExports.useState(((_a = materials[0]) == null ? void 0 : _a.id) || "");
  const [snack, setSnack] = reactExports.useState("");
  const activeMat = materials.find((m) => m.id === selectedId) || materials[0];
  const result = reactExports.useMemo(() => {
    if (!activeMat) return null;
    const monthly = buildMonthlySales(salesOrders, activeMat.id, 12).map((p) => p.qty);
    return computeDemandForecast({
      monthlySales: monthly,
      currentStock: activeMat.currentStock || 0,
      leadTimeDays: activeMat.leadTime || 7,
      safetyStockBase: activeMat.safetyStock || 0,
      moq: activeMat.moq || 0,
      mpq: activeMat.mpq || 0
    });
  }, [materials, salesOrders, activeMat]);
  const chartData = reactExports.useMemo(() => {
    if (!result) return { labels: [], values: [] };
    const hist = result.monthlyHistory.map((p) => p.qty);
    return {
      labels: [...result.monthlyHistory.map((p) => p.month), "预测"],
      values: [...hist, Math.round(result.forecastQty)]
    };
  }, [result]);
  const handleGenerate = () => {
    const mat = activeMat;
    if (!mat || !result) return;
    const reqNo = `PR-AI-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "")}-${String(Date.now()).slice(-4)}`;
    const future = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
    const req = {
      id: `PR-AI-${Date.now()}`,
      requestNo: reqNo,
      title: `智能补货-${mat.name}`,
      applicant: "智能分析",
      department: "采购部",
      type: "material",
      priority: result.suggestedOrderQty > 0 ? "high" : "normal",
      reason: "基于需求预测与库存再订货点(ROP)自动生成",
      expectedDate: future,
      status: "pending",
      items: [
        {
          id: `PRI-AI-${Date.now()}`,
          materialId: mat.id,
          materialCode: mat.code,
          materialName: mat.name,
          quantity: result.suggestedOrderQty,
          estimatedPrice: mat.price,
          estimatedAmount: Math.round(result.suggestedOrderQty * (mat.price || 0))
        }
      ],
      totalAmount: Math.round(result.suggestedOrderQty * (mat.price || 0))
    };
    addPurchaseRequest(req);
    addForecastSuggestion({
      id: `FS-${Date.now()}`,
      materialId: mat.id,
      materialCode: mat.code,
      materialName: mat.name,
      avgMonthlyDemand: result.avgMonthlyDemand,
      safetyStock: result.safetyStock,
      reorderPoint: result.reorderPoint,
      currentStock: result.currentStock,
      suggestedOrderQty: result.suggestedOrderQty,
      generatedRequestNo: reqNo,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    setSnack(`已生成采购申请 ${reqNo}`);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, "data-testid": "forecast", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AutorenewIcon, { color: "primary" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "需求预测与智能补货" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: "移动平均+安全库存(95%)+ROP", color: "primary", variant: "outlined" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, "data-testid": "fc-material", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "选择物料" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              label: "选择物料",
              value: (activeMat == null ? void 0 : activeMat.id) || "",
              onChange: (e) => setSelectedId(e.target.value),
              children: materials.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: m.id, children: [
                m.name,
                "（",
                m.code,
                "）"
              ] }, m.id))
            }
          )
        ] }),
        result && /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 1.5, sx: { mt: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Metric, { label: "月均需求", value: fmt(result.avgMonthlyDemand), testid: "fc-avg" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Metric, { label: "需求标准差", value: fmt(result.stdDev) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Metric, { label: "采购提前期", value: `${result.leadTimeDays} 天` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Metric, { label: "安全库存", value: fmt(result.safetyStock), testid: "fc-safety" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Metric, { label: "再订货点(ROP)", value: fmt(result.reorderPoint), testid: "fc-reorder" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Metric, { label: "当前库存", value: fmt(result.currentStock) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Metric,
            {
              label: "建议补货量",
              value: fmt(result.suggestedOrderQty),
              testid: "fc-suggest",
              emphasize: true
            }
          ),
          !result.hasHistory && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mt: 1 }, children: "该物料近 12 个月无销售历史，建议补货量按安全库存下限估算。" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "contained",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(CartIcon, {}),
              onClick: handleGenerate,
              "data-testid": "fc-generate",
              disabled: result.suggestedOrderQty <= 0,
              children: "生成补货建议 / 采购申请"
            }
          )
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 8, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 1 }, children: "近 12 月销量与下一周期预测" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: "100%", height: 340 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          BarChart,
          {
            xAxis: [{ scaleType: "band", data: chartData.labels }],
            series: [
              {
                data: chartData.values,
                label: "销量(件)",
                color: theme.palette.primary.main
              }
            ],
            height: 320
          }
        ) })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { sx: { mt: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 1 }, children: "已生成补货建议" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "月均需求" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "安全库存" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "再订货点" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "建议补货量" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "关联采购申请" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: suggestions.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 6, align: "center", children: "暂无建议，请在左侧选择物料并点击「生成补货建议」" }) }) : suggestions.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "fc-suggestion-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
            s.materialName,
            "（",
            s.materialCode,
            "）"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmt(s.avgMonthlyDemand) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmt(s.safetyStock) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmt(s.reorderPoint) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmt(s.suggestedOrderQty) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: s.generatedRequestNo || "-" })
        ] }, s.id)) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Snackbar, { open: !!snack, autoHideDuration: 4e3, onClose: () => setSnack(""), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "success", onClose: () => setSnack(""), children: snack }) })
  ] });
}
function Metric({
  label,
  value,
  testid,
  emphasize
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Box,
    {
      sx: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        p: 1,
        borderRadius: 1,
        bgcolor: emphasize ? "primary.50" : "grey.50",
        border: emphasize ? "1px solid" : "none",
        borderColor: "primary.main"
      },
      "data-testid": testid,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body1", fontWeight: emphasize ? 700 : 500, color: emphasize ? "primary.main" : "text.primary", children: value })
      ]
    }
  );
}
export {
  Forecast as default
};
