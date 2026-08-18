import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { u as useQualityExtensionStore } from "./qualityExtensionStore-CpmmvoMW.js";
import { m as Box, T as Typography, bl as Alert, bm as Button, cD as TableContainer, aS as Paper, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aO as Chip, bY as Grid, n as Divider } from "./vendor-mui-UhJuRAfR.js";
import { L as LineChart } from "./vendor-charts-CTjfnoPO.js";
import "./vendor-C0Ken1ns.js";
import "./index-hTLNcGoC.js";
import "./vendor-date-DpsB6iVy.js";
const SPC_CONST = {
  2: { A2: 1.88, D3: 0, D4: 3.267, d2: 1.128 },
  3: { A2: 1.023, D3: 0, D4: 2.574, d2: 1.693 },
  4: { A2: 0.729, D3: 0, D4: 2.282, d2: 2.059 },
  5: { A2: 0.577, D3: 0, D4: 2.114, d2: 2.326 },
  6: { A2: 0.483, D3: 0, D4: 2.004, d2: 2.534 },
  7: { A2: 0.419, D3: 0.076, D4: 1.924, d2: 2.704 },
  8: { A2: 0.373, D3: 0.136, D4: 1.864, d2: 2.847 },
  9: { A2: 0.337, D3: 0.184, D4: 1.816, d2: 2.97 },
  10: { A2: 0.308, D3: 0.223, D4: 1.777, d2: 3.078 }
};
const round = (v) => Math.round(v * 1e3) / 1e3;
function computeSPC(subgroups, opts) {
  const n = subgroups.length ? subgroups[0].values.length : 0;
  const c = SPC_CONST[n] || SPC_CONST[5];
  const raw = subgroups.map((g) => {
    const vals = g.values;
    const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    const range = vals.length ? Math.max(...vals) - Math.min(...vals) : 0;
    return { label: g.label, mean, range };
  });
  const grandMean = raw.reduce((a, s) => a + s.mean, 0) / (raw.length || 1);
  const avgRange = raw.reduce((a, s) => a + s.range, 0) / (raw.length || 1);
  const xbarUCL = grandMean + c.A2 * avgRange;
  const xbarLCL = grandMean - c.A2 * avgRange;
  const rUCL = c.D4 * avgRange;
  const rLCL = c.D3 * avgRange;
  let oocCount = 0;
  const enriched = raw.map((s) => {
    const ooc = s.mean > xbarUCL || s.mean < xbarLCL || s.range > rUCL || s.range < rLCL;
    if (ooc) oocCount++;
    return { label: s.label, mean: round(s.mean), range: round(s.range), outOfControl: ooc };
  });
  let cp;
  let cpk;
  let cpu;
  let cpl;
  let pp;
  let ppk;
  let sigmaWithin;
  let sigmaOverall;
  let capable = false;
  let cpkGrade = "red";
  if ((opts == null ? void 0 : opts.usl) != null && (opts == null ? void 0 : opts.lsl) != null && avgRange > 0) {
    const sw = avgRange / c.d2;
    sigmaWithin = round(sw);
    const allValues = subgroups.flatMap((g) => g.values);
    const overallMean = allValues.reduce((a, v) => a + v, 0) / (allValues.length || 1);
    const variance = allValues.reduce((sum, v) => sum + (v - overallMean) ** 2, 0) / (allValues.length - 1 || 1);
    sigmaOverall = round(Math.sqrt(variance));
    cp = round((opts.usl - opts.lsl) / (6 * sw));
    cpu = round((opts.usl - grandMean) / (3 * sw));
    cpl = round((grandMean - opts.lsl) / (3 * sw));
    cpk = round(Math.min(cpu, cpl));
    capable = cpk >= 1;
    pp = sigmaOverall > 0 ? round((opts.usl - opts.lsl) / (6 * sigmaOverall)) : 0;
    ppk = sigmaOverall > 0 ? round(Math.min((opts.usl - overallMean) / (3 * sigmaOverall), (overallMean - opts.lsl) / (3 * sigmaOverall))) : 0;
    if (cpk >= 1.33) cpkGrade = "green";
    else if (cpk >= 1) cpkGrade = "yellow";
    else cpkGrade = "red";
  }
  return {
    subgroupSize: n,
    grandMean: round(grandMean),
    avgRange: round(avgRange),
    xbar: { cl: round(grandMean), ucl: round(xbarUCL), lcl: round(xbarLCL) },
    r: { cl: round(avgRange), ucl: round(rUCL), lcl: round(rLCL) },
    subgroups: enriched,
    oocCount,
    cp,
    cpk,
    cpu,
    cpl,
    pp,
    ppk,
    sigmaWithin,
    sigmaOverall,
    capable,
    cpkGrade
  };
}
const uid = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
const sampleChart = () => ({
  id: uid("spc"),
  name: "轴承外径 SPC（示例）",
  characteristic: "轴承外径",
  unit: "mm",
  subgroupSize: 5,
  usl: 25.05,
  lsl: 24.95,
  subgroups: [
    { id: "g1", label: "G1", values: [25, 25.01, 24.99, 25.02, 25] },
    { id: "g2", label: "G2", values: [24.98, 25.01, 25, 24.99, 25.02] },
    { id: "g3", label: "G3", values: [25.03, 25.02, 25.01, 25.04, 25] },
    { id: "g4", label: "G4", values: [25.3, 25.28, 25.31, 25.29, 25.27] },
    // 失控
    { id: "g5", label: "G5", values: [24.99, 25, 25.01, 24.98, 25] }
  ],
  createdAt: (/* @__PURE__ */ new Date()).toISOString(),
  updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
  createdBy: "质量部",
  updatedBy: "质量部"
});
function SPCChartPage() {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const { spcCharts, addSpcChart } = useQualityExtensionStore();
  const [selectedId, setSelectedId] = reactExports.useState(null);
  const selected = spcCharts.find((c) => c.id === selectedId) || null;
  const result = reactExports.useMemo(
    () => selected ? computeSPC(selected.subgroups, { usl: selected.usl, lsl: selected.lsl }) : null,
    [selected]
  );
  const labels = result ? result.subgroups.map((s) => s.label) : [];
  const means = result ? result.subgroups.map((s) => s.mean) : [];
  const ranges = result ? result.subgroups.map((s) => s.range) : [];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "spc-chart", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "质量 SPC 控制图（X-bar & R）" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "基于子组测量值计算均值图与极差图的控制限（CL/UCL/LCL），并判定失控点；给定规格限时估算过程能力 Cp/Cpk。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", sx: { mb: 1 }, "data-testid": "spc-add-sample", onClick: () => {
      const c = sampleChart();
      addSpcChart(c);
      setSelectedId(c.id);
    }, children: "新增示例控制图" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, sx: { mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "名称" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "特性" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "子组容量" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "子组数" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "失控点" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "能力" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: spcCharts.map((c) => {
        const r = computeSPC(c.subgroups, { usl: c.usl, lsl: c.lsl });
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "spc-row", hover: true, sx: { cursor: "pointer" }, onClick: () => setSelectedId(c.id), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: c.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: c.characteristic }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: c.subgroupSize }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: c.subgroups.length }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: `${r.oocCount} 点`, color: r.oocCount > 0 ? "error" : "success" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.cpk != null ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: `Cpk ${r.cpk}`, color: r.capable ? "success" : "warning" }) : "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", "data-testid": "spc-view", onClick: (e) => {
            e.stopPropagation();
            setSelectedId(c.id);
          }, children: "查看" }) })
        ] }, c.id);
      }) })
    ] }) }),
    selected && result && /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2 }, "data-testid": "spc-detail", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", gutterBottom: true, children: [
        selected.name,
        " · ",
        selected.characteristic,
        "（",
        selected.unit,
        "）"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mb: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { "data-testid": "spc-xbar-ucl", label: `X-bar UCL ${result.xbar.ucl}`, size: "small" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { "data-testid": "spc-xbar-cl", label: `X-bar CL ${result.xbar.cl}`, size: "small" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { "data-testid": "spc-xbar-lcl", label: `X-bar LCL ${result.xbar.lcl}`, size: "small" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { "data-testid": "spc-r-ucl", label: `R UCL ${result.r.ucl}`, size: "small" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { "data-testid": "spc-r-cl", label: `R CL ${result.r.cl}`, size: "small" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { "data-testid": "spc-ooc-count", label: `失控 ${result.oocCount}`, color: result.oocCount > 0 ? "error" : "success", size: "small" }) })
      ] }),
      result.cpk != null && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { "data-testid": "spc-cpk", label: `Cp ${result.cp} / Cpk ${result.cpk}（${result.capable ? "能力充足" : "能力不足"}）`, color: result.capable ? "success" : "warning", sx: { mb: 1 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", gutterBottom: true, children: "X-bar 均值控制图" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        LineChart,
        {
          height: 260,
          xAxis: [{ scaleType: "point", data: labels }],
          series: [
            { data: means, label: "X-bar", color: "#2563EB" },
            { data: labels.map(() => result.xbar.ucl), label: "UCL", color: "#DC2626" },
            { data: labels.map(() => result.xbar.lcl), label: "LCL", color: "#DC2626" }
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", gutterBottom: true, sx: { mt: 2 }, children: "R 极差控制图" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        LineChart,
        {
          height: 220,
          xAxis: [{ scaleType: "point", data: labels }],
          series: [
            { data: ranges, label: "R", color: "#16A34A" },
            { data: labels.map(() => result.r.ucl), label: "UCL", color: "#DC2626" },
            { data: labels.map(() => result.r.lcl), label: "LCL", color: "#DC2626" }
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, sx: { mt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "子组" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "均值" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "极差" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "判据" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: result.subgroups.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "spc-sub-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: s.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: s.mean }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: s.range }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: s.outOfControl ? "失控" : "受控", color: s.outOfControl ? "error" : "success" }) })
        ] }, s.label)) })
      ] }) })
    ] }),
    selected && result && result.cpk != null && /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mt: 2 }, "data-testid": "spc-cpk", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", gutterBottom: true, children: "过程能力分析" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 2 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, alignItems: "center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 4, sx: { textAlign: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", gutterBottom: true, color: "text.secondary", children: "过程能力指数 Cpk" }),
          (() => {
            const cpkVal = Math.min(result.cpk, 2);
            const pct = cpkVal / 2 * 100;
            const isGreen = result.cpkGrade === "green";
            const isYellow = result.cpkGrade === "yellow";
            const color = isGreen ? "#22c55e" : isYellow ? "#eab308" : "#ef4444";
            const circumference = 2 * Math.PI * 65;
            const dashOffset = circumference - pct / 100 * circumference;
            return /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { position: "relative", display: "inline-flex" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "180", height: "150", "data-testid": "spc-cpk-value", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "90", cy: "80", r: "65", fill: "none", stroke: "#e5e7eb", strokeWidth: "12" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "circle",
                {
                  cx: "90",
                  cy: "80",
                  r: "65",
                  fill: "none",
                  stroke: color,
                  strokeWidth: "12",
                  strokeDasharray: circumference,
                  strokeDashoffset: dashOffset,
                  strokeLinecap: "round",
                  transform: "rotate(-90 90 80)",
                  style: { transition: "stroke-dashoffset 0.6s ease" }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: "90", y: "72", textAnchor: "middle", fill: color, fontSize: "28", fontWeight: "bold", children: result.cpk.toFixed(2) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: "90", y: "95", textAnchor: "middle", fill: "#6b7280", fontSize: "12", children: isGreen ? "能力充足 (≥1.33)" : isYellow ? "能力尚可 (≥1.0)" : "能力不足 (<1.0)" })
            ] }) });
          })()
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 8, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardBox, { label: "规格上限 USL", value: (_a = selected.usl) == null ? void 0 : _a.toFixed(3) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardBox, { label: "规格下限 LSL", value: (_b = selected.lsl) == null ? void 0 : _b.toFixed(3) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardBox, { label: "过程均值", value: result.grandMean.toFixed(3) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardBox, { label: "CPU（上限能力）", value: (_c = result.cpu) == null ? void 0 : _c.toFixed(3), color: "primary" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardBox, { label: "CPL（下限能力）", value: (_d = result.cpl) == null ? void 0 : _d.toFixed(3), color: "primary" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            CardBox,
            {
              label: "Cpk",
              value: result.cpk.toFixed(3),
              color: result.cpkGrade === "green" ? "success.main" : result.cpkGrade === "yellow" ? "warning.main" : "error.main"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardBox, { label: "Pp（过程性能）", value: (_e = result.pp) == null ? void 0 : _e.toFixed(3), color: "primary" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardBox, { label: "Ppk", value: (_f = result.ppk) == null ? void 0 : _f.toFixed(3), color: "primary" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardBox, { label: "σ_within", value: (_g = result.sigmaWithin) == null ? void 0 : _g.toFixed(4) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardBox, { label: "σ_overall", value: (_h = result.sigmaOverall) == null ? void 0 : _h.toFixed(4) }) })
        ] }) })
      ] })
    ] })
  ] });
}
function CardBox({ label, value, color }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { bgcolor: "grey.50", p: 1.5, borderRadius: 1 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", noWrap: true, children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body1", fontWeight: 600, color: color || "text.primary", children: value ?? "—" })
  ] });
}
export {
  SPCChartPage as default
};
