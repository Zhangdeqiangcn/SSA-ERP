import { r as reactExports, j as jsxRuntimeExports, bX as Grid, aP as Paper, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, bj as Alert, cc as TrendingUp, cd as TrendingDown, fE as Remove, h as Typography, B as Box, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody } from "./vendor-46QZWBd3.js";
import { u as useMaterialStore } from "./index-CcOZBoQL.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import { u as usePriceStore } from "./priceStore-BUzakAdL.js";
import { u as useConditionStore } from "./conditionStore-BSext3Wu.js";
const PriceTrendChart = ({ data }) => {
  if (data.length === 0) return /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { color: "text.secondary", children: "暂无数据" });
  const W = 600;
  const H = 300;
  const PAD_LEFT = 60;
  const PAD_RIGHT = 30;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 40;
  const plotW = W - PAD_LEFT - PAD_RIGHT;
  const allPrices = data.map((d) => d.price);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice || 1;
  const H_lines = 5;
  const scaleX = (i) => PAD_LEFT + i / Math.max(data.length - 1, 1) * plotW;
  const scaleY = (price) => H - PAD_BOTTOM - (price - minPrice) / priceRange * (H - PAD_TOP - PAD_BOTTOM);
  const pathD = data.map((d, i) => `${i === 0 ? "M" : "L"} ${scaleX(i).toFixed(1)} ${scaleY(d.price).toFixed(1)}`).join(" ");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: "300", children: [
    Array.from({ length: H_lines + 1 }).map((_, i) => {
      const y = PAD_TOP + i / H_lines * (H - PAD_TOP - PAD_BOTTOM);
      const price = maxPrice - i / H_lines * priceRange;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: PAD_LEFT, y1: y, x2: W - PAD_RIGHT, y2: y, stroke: "#E5E7EB", strokeWidth: 1 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: PAD_LEFT - 8, y: y + 4, textAnchor: "end", fontSize: "11", fill: "#6B7280", children: price.toFixed(0) })
      ] }, i);
    }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: pathD, fill: "none", stroke: "#3B82F6", strokeWidth: 2.5 }),
    data.map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: scaleX(i), cy: scaleY(d.price), r: 4, fill: "#3B82F6" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: scaleX(i), cy: scaleY(d.price), r: 7, fill: "none", stroke: "#3B82F6", strokeWidth: 1, opacity: 0.3 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: scaleX(i), y: scaleY(d.price) - 12, textAnchor: "middle", fontSize: "10", fill: "#374151", fontWeight: 600, children: d.price })
    ] }, i)),
    data.map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      "text",
      {
        x: scaleX(i),
        y: H - 10,
        textAnchor: data.length > 12 ? "end" : "middle",
        fontSize: "10",
        fill: "#6B7280",
        transform: data.length > 12 ? `rotate(-45, ${scaleX(i)}, ${H - 10})` : void 0,
        children: d.label
      },
      i
    ))
  ] });
};
const PriceAnalysis = () => {
  const { priceList } = usePriceStore();
  const { conditions } = useConditionStore();
  const { materials } = useMaterialStore();
  const [selectedMaterial, setSelectedMaterial] = reactExports.useState("all");
  const allPriceData = reactExports.useMemo(() => {
    const data = [];
    priceList.forEach((p) => {
      data.push({
        materialName: p.materialName || "",
        materialCode: p.materialCode || "",
        price: p.price || p.unitPrice || 0,
        date: p.effectiveDate || p.createdAt || ""
      });
    });
    conditions.forEach((c) => {
      if (c.conditionType === "price") {
        data.push({
          materialName: c.materialName || "",
          materialCode: c.materialCode || c.materialId || "",
          price: c.rate || 0,
          date: c.validFrom || c.createdAt || ""
        });
      }
    });
    return data.filter((d) => d.price > 0 && d.date);
  }, [priceList, conditions]);
  const filteredData = reactExports.useMemo(() => {
    if (selectedMaterial === "all") return allPriceData;
    return allPriceData.filter((d) => d.materialName === selectedMaterial);
  }, [allPriceData, selectedMaterial]);
  const monthlyTrend = reactExports.useMemo(() => {
    const sorted = [...filteredData].sort((a, b) => a.date.localeCompare(b.date));
    const months = {};
    sorted.forEach((d) => {
      const month = d.date.slice(0, 7);
      if (!months[month]) months[month] = { total: 0, count: 0 };
      months[month].total += d.price;
      months[month].count++;
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([label, v]) => ({
      label: label.slice(2),
      // MM 或 YY-MM
      price: Math.round(v.total / v.count * 100) / 100
    }));
  }, [filteredData]);
  const trendMetrics = reactExports.useMemo(() => {
    if (monthlyTrend.length < 2) return null;
    const current = monthlyTrend[monthlyTrend.length - 1];
    const prev = monthlyTrend[monthlyTrend.length - 2];
    const mom = prev.price > 0 ? (current.price - prev.price) / prev.price * 100 : 0;
    const yoyMonth = current.label;
    const yoyData = monthlyTrend.filter((d) => d.label === yoyMonth);
    let yoy = 0;
    if (yoyData.length >= 2) {
      const lastYear = yoyData[yoyData.length - 2];
      yoy = lastYear.price > 0 ? (current.price - lastYear.price) / lastYear.price * 100 : 0;
    }
    return { mom, yoy, current: current.price, prev: prev.price };
  }, [monthlyTrend]);
  const volatility = reactExports.useMemo(() => {
    if (monthlyTrend.length < 2) return null;
    const prices = monthlyTrend.map((d) => d.price);
    const avg = prices.reduce((s, v) => s + v, 0) / prices.length;
    const variance = prices.reduce((s, v) => s + (v - avg) ** 2, 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const cv = avg > 0 ? stdDev / avg * 100 : 0;
    return { avg, stdDev, cv, min: Math.min(...prices), max: Math.max(...prices) };
  }, [monthlyTrend]);
  const materialOptions = reactExports.useMemo(() => {
    const names = [...new Set(allPriceData.map((d) => d.materialName).filter(Boolean))];
    return names.sort();
  }, [allPriceData]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "价格趋势分析", subtitle: "采购价格趋势、同环比与价差分析", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2, borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, alignItems: "center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "选择物料" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: selectedMaterial, label: "选择物料", onChange: (e) => setSelectedMaterial(e.target.value), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "all", children: "全部物料" }),
          materialOptions.map((name) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: name, children: name }, name))
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 8, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { py: 0 }, children: "数据来源：价目表 + 条件技术引擎。展示最近12个月价格趋势。" }) })
    ] }) }) }),
    trendMetrics && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, children: [
      { label: "当前均价", value: `${trendMetrics.current.toLocaleString()} 元`, color: "#3B82F6" },
      {
        label: "环比变化",
        value: `${trendMetrics.mom > 0 ? "+" : ""}${trendMetrics.mom.toFixed(1)}%`,
        color: trendMetrics.mom > 0 ? "#EF4444" : trendMetrics.mom < 0 ? "#10B981" : "#6B7280",
        icon: trendMetrics.mom > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {}) : trendMetrics.mom < 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(Remove, {})
      },
      {
        label: "同比变化",
        value: `${trendMetrics.yoy > 0 ? "+" : ""}${trendMetrics.yoy.toFixed(1)}%`,
        color: trendMetrics.yoy > 0 ? "#EF4444" : trendMetrics.yoy < 0 ? "#10B981" : "#6B7280",
        icon: trendMetrics.yoy > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {}) : trendMetrics.yoy < 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(Remove, {})
      },
      volatility && {
        label: "价格变异系数",
        value: `${volatility.cv.toFixed(1)}%`,
        color: volatility.cv > 15 ? "#EF4444" : volatility.cv > 5 ? "#F59E0B" : "#10B981",
        icon: void 0
      }
    ].filter(Boolean).map((metric, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, textAlign: "center", borderRadius: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: metric.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, mt: 0.5 }, children: [
        metric.icon && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color: metric.color }, children: metric.icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 700, color: metric.color }, children: metric.value })
      ] })
    ] }) }, idx)) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 2 }, "data-testid": "price-trend", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, gutterBottom: true, children: [
        "近12月价格趋势（",
        selectedMaterial === "all" ? "全部物料均价" : selectedMaterial,
        "）"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(PriceTrendChart, { data: monthlyTrend })
    ] }) }),
    volatility && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, gutterBottom: true, children: "价差分析" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, children: [
        { label: "平均价格", value: `${volatility.avg.toLocaleString()} 元` },
        { label: "最高价格", value: `${volatility.max.toLocaleString()} 元`, color: "#EF4444" },
        { label: "最低价格", value: `${volatility.min.toLocaleString()} 元`, color: "#10B981" },
        { label: "标准差", value: `${volatility.stdDev.toFixed(2)}` },
        { label: "变异系数 CV", value: `${volatility.cv.toFixed(1)}%`, color: volatility.cv > 15 ? "#EF4444" : "#10B981" },
        { label: "价差幅度", value: `${((volatility.max - volatility.min) / volatility.avg * 100).toFixed(1)}%` }
      ].map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { textAlign: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: item.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body1", fontWeight: 600, sx: { color: item.color }, children: item.value })
      ] }) }, idx)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { px: 2, py: 1.5, borderBottom: "1px solid #E5E7EB" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "最近价格记录" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "价格" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "日期" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
          filteredData.slice(-20).reverse().map((d, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: d.materialName }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: d.materialCode })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { fontWeight: 600, children: [
              d.price.toLocaleString(),
              " 元"
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: d.date.slice(0, 10) })
          ] }, idx)),
          filteredData.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 3, align: "center", sx: { py: 3, color: "#94A3B8" }, children: "暂无价格记录" }) })
        ] })
      ] }) })
    ] }) })
  ] }) });
};
export {
  PriceAnalysis as default
};
