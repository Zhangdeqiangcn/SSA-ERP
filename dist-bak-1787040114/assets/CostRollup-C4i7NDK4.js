import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bk as Button, be as Refresh, es as Calculate, eN as FileDownload, bX as Grid, aP as Paper, aL as Chip, eJ as ResponsiveChartContainer, eM as PiePlot, cl as LinearProgress, i as Divider, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody } from "./vendor-DGU5TO-x.js";
import { u as useBOMStore } from "./bomStore-CxaOFNQN.js";
import "./index-DeeqqmHA.js";
const CostRollup = () => {
  const { bomList, bomTreeData } = useBOMStore();
  const [selectedBOM, setSelectedBOM] = reactExports.useState(bomList[0]);
  const [calculated, setCalculated] = reactExports.useState(true);
  const materialCost = bomTreeData.reduce((sum, i) => sum + i.totalCost, 0);
  const laborCost = materialCost * 0.15;
  const overheadCost = materialCost * 0.12;
  const totalCost = materialCost + laborCost + overheadCost;
  const breakdown = [
    { label: "原材料成本", value: materialCost, percentage: materialCost / totalCost * 100, color: "#3B82F6" },
    { label: "人工成本 (15%)", value: laborCost, percentage: laborCost / totalCost * 100, color: "#10B981" },
    { label: "制造费用 (12%)", value: overheadCost, percentage: overheadCost / totalCost * 100, color: "#F59E0B" }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: "#1E293B" }, children: "成本卷积计算" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Refresh, {}), size: "small", onClick: () => setCalculated(false), children: "重新计算" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Calculate, {}), size: "small", onClick: () => setCalculated(true), children: "执行卷积" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileDownload, {}), size: "small", children: "导出" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 3 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600, mb: 2 }, children: "选择 BOM" }),
        bomList.filter((b) => b.status !== "obsolete").map((bom) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          Box,
          {
            onClick: () => setSelectedBOM(bom),
            sx: {
              p: 1.5,
              borderRadius: 2,
              cursor: "pointer",
              mb: 1,
              border: `1px solid ${selectedBOM.id === bom.id ? "#3B82F6" : "rgba(226,232,240,0.8)"}`,
              bgcolor: selectedBOM.id === bom.id ? "#EFF6FF" : "#FAFAFA"
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 600 }, children: bom.productName }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { color: "#94A3B8" }, children: [
                  bom.bomNo,
                  " · ",
                  bom.type,
                  " · ",
                  bom.version
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  label: bom.status === "released" ? "已发布" : "草稿",
                  size: "small",
                  sx: { bgcolor: bom.status === "released" ? "#ECFDF5" : "#FFF7ED", color: bom.status === "released" ? "#10B981" : "#F59E0B" }
                }
              )
            ] })
          },
          bom.id
        ))
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 8, children: calculated ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 3, mb: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600, mb: 2 }, children: "成本构成" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 5, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              ResponsiveChartContainer,
              {
                series: [{
                  type: "pie",
                  data: breakdown.map((b, i) => ({ id: i, value: b.value, label: b.label, color: b.color })),
                  innerRadius: 50
                }],
                height: 200,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(PiePlot, {})
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 7, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { pt: 2 }, children: [
              breakdown.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 2 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", mb: 0.5 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 10, height: 10, borderRadius: "50%", bgcolor: item.color } }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: item.label })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { fontWeight: 600 }, children: [
                    "¥",
                    item.value.toFixed(2),
                    " (",
                    item.percentage.toFixed(1),
                    "%)"
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  LinearProgress,
                  {
                    variant: "determinate",
                    value: item.percentage,
                    sx: { height: 6, borderRadius: 3, bgcolor: "#F1F5F9", "& .MuiLinearProgress-bar": { bgcolor: item.color, borderRadius: 3 } }
                  }
                )
              ] }, item.label)),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 1.5 } }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { fontWeight: 600 }, children: "产品总成本" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", sx: { fontWeight: 700, color: "#3B82F6" }, children: [
                  "¥",
                  totalCost.toFixed(2)
                ] })
              ] })
            ] }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { p: 2.5, borderBottom: "1px solid rgba(226,232,240,0.8)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600 }, children: "物料成本明细" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料编码" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料名称" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "数量" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "单位" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "单价 (¥)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "小计 (¥)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "占比" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: bomTreeData.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontFamily: "monospace", color: "#3B82F6" }, children: item.materialCode }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: item.materialName }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: item.quantity }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: item.unit }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                "¥",
                item.unitCost.toFixed(2)
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { fontWeight: 500 }, children: [
                "¥",
                item.totalCost.toFixed(2)
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  LinearProgress,
                  {
                    variant: "determinate",
                    value: item.totalCost / materialCost * 100,
                    sx: { width: 50, height: 4, borderRadius: 2, bgcolor: "#F1F5F9" }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { color: "#64748B" }, children: [
                  (item.totalCost / materialCost * 100).toFixed(1),
                  "%"
                ] })
              ] }) })
            ] }, item.id)) })
          ] }) })
        ] })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 4, borderRadius: 3, textAlign: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Calculate, { sx: { fontSize: 56, color: "#CBD5E1", mb: 2 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { color: "#64748B", mb: 1 }, children: "点击「执行卷积」开始计算" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#94A3B8" }, children: "将基于当前BOM和物料成本数据进行卷积计算" })
      ] }) })
    ] })
  ] });
};
export {
  CostRollup as default
};
