import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { m as Box, T as Typography, aS as Paper, c8 as TrendingUp, bv as TextField, aM as IconButton, bw as Send, aO as Chip, n as Divider, bs as Card, bt as CardContent, ap as BarChart, M as Assessment } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
const BarChartSVG = ({ data, title }) => {
  const w = 500, h = 220, pad = { top: 20, right: 20, bottom: 35, left: 40 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const maxV = Math.max(...data.map((d) => d.value));
  const barW = chartW / data.length * 0.6;
  const gap = chartW / data.length;
  const colors = ["#1976d2", "#388e3c", "#f57c00", "#d32f2f", "#7b1fa2", "#0097a7"];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: `0 0 ${w} ${h}`, style: { width: "100%", maxWidth: 500, height: "auto" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: pad.left, y: pad.top, fontSize: 13, fontWeight: 600, fill: "#333", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: pad.left, y1: pad.top, x2: pad.left, y2: h - pad.bottom, stroke: "#ccc", strokeWidth: 1 }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: pad.left, y1: h - pad.bottom, x2: w - pad.right, y2: h - pad.bottom, stroke: "#ccc", strokeWidth: 1 }),
    [0, 0.25, 0.5, 0.75, 1].map((pct) => {
      const y = h - pad.bottom - pct * chartH;
      const val = Math.round(maxV * pct);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: pad.left - 5, y: y + 4, fontSize: 9, fill: "#999", textAnchor: "end", children: val }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: pad.left, y1: y, x2: w - pad.right, y2: y, stroke: "#eee", strokeWidth: 0.5, strokeDasharray: "4 4" })
      ] }, pct);
    }),
    data.map((d, i) => {
      const barH = d.value / maxV * chartH;
      const x = pad.left + gap * i + (gap - barW) / 2;
      const y = h - pad.bottom - barH;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x, y, width: barW, height: barH, rx: 3, ry: 3, fill: colors[i % colors.length], opacity: 0.85 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: x + barW / 2, y: h - pad.bottom + 14, fontSize: 9, fill: "#666", textAnchor: "middle", children: d.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: x + barW / 2, y: y - 4, fontSize: 9, fill: "#333", textAnchor: "middle", fontWeight: 500, children: d.value })
      ] }, i);
    })
  ] });
};
const DonutChartSVG = ({ data, title }) => {
  const size = 220, cx = size / 2, cy = size / 2, r = 80, strokeW = 30;
  const total = data.reduce((s, d) => s + d.value, 0);
  let offset = 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: `0 0 ${size} ${size + 120}`, style: { width: "100%", maxWidth: 300, height: "auto" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: cx, y: 18, fontSize: 12, fontWeight: 600, fill: "#333", textAnchor: "middle", children: title }),
    data.map((d, i) => {
      const pct = d.value / total;
      const dash = pct * 2 * Math.PI * r;
      const circumference = 2 * Math.PI * r;
      const gap = circumference - dash;
      const o = offset;
      offset += pct;
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        "circle",
        {
          cx,
          cy,
          r,
          fill: "none",
          stroke: d.color,
          strokeWidth: strokeW,
          strokeDasharray: `${dash} ${gap}`,
          strokeDashoffset: -o * circumference + circumference / 4,
          opacity: 0.85,
          style: { transition: "all 0.5s ease" }
        },
        i
      );
    }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: cx, y: cy - 5, fontSize: 20, fontWeight: 700, fill: "#333", textAnchor: "middle", children: total.toFixed(1) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: cx, y: cy + 15, fontSize: 10, fill: "#999", textAnchor: "middle", children: "周转率" }),
    data.map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: 25, y: size + 15 + i * 18, width: 10, height: 10, rx: 2, fill: d.color }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("text", { x: 40, y: size + 24 + i * 18, fontSize: 10, fill: "#666", children: [
        d.label,
        " (",
        d.value,
        ")"
      ] })
    ] }, i))
  ] });
};
const HorizontalBarSVG = ({ data, title }) => {
  const w = 480, itemH = 40, pad = { left: 100, right: 80 };
  const maxV = Math.max(...data.map((d) => Math.max(d.value, d.secondary)));
  const colors = ["#1976d2", "#388e3c", "#f57c00", "#d32f2f", "#7b1fa2", "#0097a7"];
  const h = 40 + data.length * itemH;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: `0 0 ${w} ${h}`, style: { width: "100%", maxWidth: 480, height: "auto" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: pad.left, y: 20, fontSize: 13, fontWeight: 600, fill: "#333", children: title }),
    data.map((d, i) => {
      const bw = d.value / maxV * (w - pad.left - pad.right);
      const sw = d.secondary / maxV * (w - pad.left - pad.right);
      const y = 38 + i * itemH;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: pad.left - 5, y: y + itemH / 2 + 4, fontSize: 10, fill: "#666", textAnchor: "end", children: d.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: pad.left, y, width: bw, height: 16, rx: 3, fill: colors[i % colors.length], opacity: 0.8 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: pad.left + bw + 4, y: y + 12, fontSize: 9, fill: "#333", children: d.value }),
        d.secondary > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: pad.left, y: y + 18, width: sw, height: 16, rx: 3, fill: colors[i % colors.length], opacity: 0.35 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: pad.left + sw + 4, y: y + 30, fontSize: 9, fill: "#999", children: d.secondary })
        ] })
      ] }, i);
    })
  ] });
};
const MOCK_RESPONSES = {
  "本月销售趋势": {
    title: "本月销售趋势",
    description: "2026年8月前11天销售额趋势（模拟数据）",
    chartType: "bar",
    data: [
      { label: "8/1", value: 280 },
      { label: "8/2", value: 320 },
      { label: "8/3", value: 450 },
      { label: "8/4", value: 380 },
      { label: "8/5", value: 520 },
      { label: "8/6", value: 610 },
      { label: "8/7", value: 490 },
      { label: "8/8", value: 560 },
      { label: "8/9", value: 640 },
      { label: "8/10", value: 580 },
      { label: "8/11", value: 700 }
    ]
  },
  "库存周转率": {
    title: "库存周转率分析",
    description: "各物料类别库存周转率（次/月）（模拟数据）",
    chartType: "donut",
    data: [
      { label: "冷轧板", value: 4.2, color: "#1976d2" },
      { label: "热轧卷", value: 3.6, color: "#388e3c" },
      { label: "镀锌板", value: 2.8, color: "#f57c00" },
      { label: "不锈钢", value: 5.1, color: "#d32f2f" }
    ]
  },
  "供应商质量排名": {
    title: "供应商质量排名",
    description: "供应商到货合格率与综合评分（模拟数据）",
    chartType: "horizontalBar",
    data: [
      { label: "宝钢股份", value: 98.5, secondary: 95.2 },
      { label: "鞍钢集团", value: 96.2, secondary: 92.8 },
      { label: "首钢集团", value: 94.8, secondary: 90.1 },
      { label: "河钢集团", value: 93.5, secondary: 89.5 },
      { label: "太钢集团", value: 91.2, secondary: 87.3 }
    ]
  }
};
const matchQuery = (query) => {
  for (const [key, value] of Object.entries(MOCK_RESPONSES)) {
    if (query.includes(key)) return value;
  }
  return null;
};
const ChatBI = () => {
  const [input, setInput] = reactExports.useState("");
  const [result, setResult] = reactExports.useState(null);
  const [history, setHistory] = reactExports.useState([]);
  const handleSend = () => {
    const q = input.trim();
    if (!q) return;
    setHistory((prev) => [...prev, q]);
    const r = matchQuery(q);
    setResult(r);
    setInput("");
  };
  const renderChart = () => {
    if (!result) return null;
    switch (result.chartType) {
      case "bar":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(BarChartSVG, { data: result.data, title: result.title });
      case "donut":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(DonutChartSVG, { data: result.data, title: result.title });
      case "horizontalBar":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(HorizontalBarSVG, { data: result.data, title: result.title });
      default:
        return null;
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { maxWidth: 800, mx: "auto" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "ChatBI 对话式分析" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: '模拟/Demo — 输入自然语言问句，获取可视化分析结果。支持："本月销售趋势"、"库存周转率"、"供应商质量排名"' }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2, mb: 3, display: "flex", alignItems: "center", gap: 1, borderRadius: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { color: "primary" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          fullWidth: true,
          size: "small",
          variant: "standard",
          placeholder: '输入分析问句，如"本月销售趋势"...',
          value: input,
          onChange: (e) => setInput(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          },
          inputProps: { "data-testid": "chatbi-input" }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { color: "primary", onClick: handleSend, disabled: !input.trim(), "data-testid": "chatbi-send", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, {}) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mb: 3, display: "flex", gap: 1, flexWrap: "wrap" }, children: Object.keys(MOCK_RESPONSES).map((k) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      Chip,
      {
        label: k,
        variant: "outlined",
        color: "primary",
        size: "small",
        onClick: () => {
          setInput(k);
          setHistory((prev) => [...prev, k]);
          setResult(matchQuery(k));
        },
        sx: { cursor: "pointer" }
      },
      k
    )) }),
    history.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.disabled", gutterBottom: true, sx: { display: "block" }, children: "对话记录" }),
      history.map((h, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: h, size: "small", sx: { mr: 0.5, mb: 0.5 } }, i))
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 3 } }),
    result ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", sx: { borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(BarChart, { color: "primary", fontSize: "small" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: result.title })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: result.description }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", justifyContent: "center" }, children: renderChart() })
    ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", sx: { borderRadius: 2, textAlign: "center", py: 6 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Assessment, { sx: { fontSize: 48, color: "text.disabled", mb: 1 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { color: "text.secondary", children: "输入问句开始分析，例如「本月销售趋势」" })
    ] }) })
  ] });
};
export {
  ChatBI as default
};
