import { r as reactExports, j as jsxRuntimeExports, bj as Alert, aP as Paper, bK as Stack, fh as default_1, h as Typography, bt as TextField, bk as Button, B as Box, bX as Grid, aL as Chip, k as Tooltip, aJ as IconButton, fi as default_1$1, i as Divider, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody } from "./vendor-46QZWBd3.js";
import "./index-CcOZBoQL.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import { u as useProductionStore } from "./productionStore-D_DSIs05.js";
import { u as useProductionOperationStore, D as DEFAULT_LABOR_RATE, a as DEFAULT_MACHINE_RATE } from "./productionOperationStore-ZzJ7_OWX.js";
import { u as useBOMStore } from "./bomStore-VWzRK_BU.js";
const fmt = (n) => `¥${Number(n).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}`;
function CostCollection() {
  const { workOrders, processRoutes, updateWorkOrder } = useProductionStore();
  const { operationReports, laborRate, machineRate, setLaborRate, setMachineRate } = useProductionOperationStore();
  const { bomList } = useBOMStore();
  const [laborInput, setLaborInput] = reactExports.useState(String(laborRate));
  const [machineInput, setMachineInput] = reactExports.useState(String(machineRate));
  const activeWos = reactExports.useMemo(() => workOrders.filter((wo) => wo.status !== "closed"), [workOrders]);
  const compute = reactExports.useMemo(() => {
    return activeWos.map((wo) => {
      const route = processRoutes.find((r) => r.id === wo.routeId) || processRoutes.find((r) => r.routeNo === wo.routeNo) || processRoutes.find((r) => r.productCode === wo.productCode);
      const bom = bomList.find((b) => b.id === wo.bomId) || bomList.find((b) => b.bomNo === wo.bomNo);
      const unitMaterial = (bom == null ? void 0 : bom.items) ? bom.items.reduce((s, it) => s + (it.totalCost || 0), 0) : 0;
      let stdHours = 0;
      route == null ? void 0 : route.operations.forEach((op) => {
        stdHours += (op.setupTime + op.runTime * wo.plannedQuantity) / 60;
      });
      const stdMaterial = unitMaterial * wo.plannedQuantity;
      const stdLabor = stdHours * laborRate;
      const stdMachine = stdHours * machineRate;
      const stdTotal = stdMaterial + stdLabor + stdMachine;
      const reports = operationReports.filter((r) => r.workOrderId === wo.id);
      let actHours = 0;
      reports.forEach((r) => {
        const op = route == null ? void 0 : route.operations.find((o) => o.id === r.operationId);
        const h = r.laborHours ?? (op ? (op.setupTime + op.runTime * r.goodQuantity) / 60 : 0);
        actHours += h;
      });
      const actMaterial = unitMaterial * wo.completedQuantity;
      const actLabor = actHours * laborRate;
      const actMachine = actHours * machineRate;
      const actTotal = actMaterial + actLabor + actMachine;
      const variance = actTotal - stdTotal;
      const variancePct = stdTotal > 0 ? variance / stdTotal * 100 : 0;
      return {
        wo,
        hasBom: !!bom,
        unitMaterial,
        stdMaterial,
        stdLabor,
        stdMachine,
        stdTotal,
        actMaterial,
        actLabor,
        actMachine,
        actTotal,
        actHours,
        variance,
        variancePct
      };
    });
  }, [activeWos, processRoutes, bomList, operationReports, laborRate, machineRate]);
  const grandStd = compute.reduce((s, c) => s + c.stdTotal, 0);
  const grandAct = compute.reduce((s, c) => s + c.actTotal, 0);
  const grandVar = grandAct - grandStd;
  const applyRates = () => {
    setLaborRate(Number(laborInput) || DEFAULT_LABOR_RATE);
    setMachineRate(Number(machineInput) || DEFAULT_MACHINE_RATE);
  };
  const saveWoCost = (c) => {
    updateWorkOrder(c.wo.id, {
      actualMaterialCost: Number(c.actMaterial.toFixed(2)),
      actualLaborCost: Number(c.actLabor.toFixed(2)),
      actualMachineCost: Number(c.actMachine.toFixed(2)),
      actualTotalCost: Number(c.actTotal.toFixed(2))
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "成本归集", subtitle: "按工单归集 物料(BOM) / 人工(报工工时×费率) / 机器费用，对比标准成本差异", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 2 }, children: [
      "物料成本取 BOM 单位成本 × 数量；人工与机器费用取",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "报工工时 × 费率" }),
      "。 标准成本按",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "计划量" }),
      "测算，实际成本按",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "完成量/报工" }),
      "测算，差异 = 实际 − 标准（正值代表超支）。"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2, borderRadius: 3, mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: { xs: "column", sm: "row" }, spacing: 2, alignItems: "center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, { sx: { color: "#10B981" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "成本费率（元/小时）" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          label: "人工费率",
          type: "number",
          size: "small",
          value: laborInput,
          onChange: (e) => setLaborInput(e.target.value),
          inputProps: { min: 0 },
          sx: { width: 140 }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          label: "机器费率",
          type: "number",
          size: "small",
          value: machineInput,
          onChange: (e) => setMachineInput(e.target.value),
          inputProps: { min: 0 },
          sx: { width: 140 }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: applyRates, children: "应用费率" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { flex: 1 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "标准总成本" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 700, children: fmt(grandStd) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "实际总成本" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 700, color: "#3B82F6", children: fmt(grandAct) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "总差异" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "h6", fontWeight: 700, color: grandVar > 0 ? "#EF4444" : "#10B981", children: [
            grandVar >= 0 ? "+" : "",
            fmt(grandVar)
          ] })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
      compute.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", sx: { mb: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, children: [
              c.wo.orderNo,
              " · ",
              c.wo.productName
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
              "计划 ",
              c.wo.plannedQuantity,
              " / 完成 ",
              c.wo.completedQuantity,
              " 件",
              !c.hasBom && " · 无关联 BOM（物料成本按 0 计）"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: `差异 ${c.variance >= 0 ? "+" : ""}${fmt(c.variance)} (${c.variancePct.toFixed(0)}%)`,
                size: "small",
                color: c.variance > 0 ? "error" : "success"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "归集并保存至工单", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "primary", onClick: () => saveWoCost(c), children: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, { fontSize: "small" }) }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 1 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "成本项" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "标准成本" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "实际成本" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "差异" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
            [
              { name: "物料成本", s: c.stdMaterial, a: c.actMaterial },
              { name: "人工成本", s: c.stdLabor, a: c.actLabor },
              { name: "机器费用", s: c.stdMachine, a: c.actMachine }
            ].map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: row.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: fmt(row.s) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: fmt(row.a) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                TableCell,
                {
                  align: "right",
                  sx: { color: row.a - row.s > 0 ? "#EF4444" : "#10B981", fontWeight: 600 },
                  children: [
                    row.a - row.s >= 0 ? "+" : "",
                    fmt(row.a - row.s)
                  ]
                }
              )
            ] }, row.name)),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 700 }, children: "合计" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 700 }, children: fmt(c.stdTotal) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 700 }, children: fmt(c.actTotal) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                TableCell,
                {
                  align: "right",
                  sx: { fontWeight: 700, color: c.variance > 0 ? "#EF4444" : "#10B981" },
                  children: [
                    c.variance >= 0 ? "+" : "",
                    fmt(c.variance)
                  ]
                }
              )
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { mt: 1, display: "block" }, children: [
          "报工工时合计 ",
          c.actHours.toFixed(2),
          " h",
          c.wo.actualTotalCost != null && " · 已保存实际总成本至工单"
        ] })
      ] }) }, c.wo.id)),
      compute.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 4, textAlign: "center", borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { color: "text.secondary", children: "当前没有可归集成本的工单。" }) }) })
    ] })
  ] });
}
export {
  CostCollection as default
};
