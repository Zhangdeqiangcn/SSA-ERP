import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bj as Alert, aL as Chip, cO as TableContainer, aP as Paper, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody } from "./vendor-DGU5TO-x.js";
import { u as useProductionOperationStore } from "./productionOperationStore-ByOb08ia.js";
import "./index-DeeqqmHA.js";
function ProcessSPC() {
  const { operationReports } = useProductionOperationStore();
  const rows = reactExports.useMemo(() => {
    const groups = /* @__PURE__ */ new Map();
    for (const r of operationReports) {
      const arr = groups.get(r.operationName) || [];
      arr.push(r.goodQuantity);
      groups.set(r.operationName, arr);
    }
    return Array.from(groups.entries()).map(([name, vals]) => {
      const n = vals.length;
      const sum = vals.reduce((a, b) => a + b, 0);
      const mean = Math.round(sum / n * 100) / 100;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const range = max - min;
      const outOfControl = n >= 3 && range > mean / 2;
      return { operationName: name, samples: n, mean, min, max, range, outOfControl };
    });
  }, [operationReports]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "spc", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "工序级 SPC（统计过程控制）" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "基于工序报工合格数，按工序聚合计 X-bar（均值）与 R（极差），对离散度大的工序给出失控提示（对标车间质量 SPC）。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { "data-testid": "spc-op-count", label: `受控工序 ${rows.length}`, sx: { mb: 1 } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "工序" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "样本数" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "均值(X-bar)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "最小" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "最大" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "极差(R)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "判据" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "spc-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.operationName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.samples }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.mean }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.min }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.max }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.range }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: r.outOfControl ? "失控" : "受控", color: r.outOfControl ? "error" : "success" }) })
      ] }, r.operationName)) })
    ] }) })
  ] });
}
export {
  ProcessSPC as default
};
