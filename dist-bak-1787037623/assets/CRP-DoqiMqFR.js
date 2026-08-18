import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { u as useProductionStore } from "./productionStore-3WoghQIz.js";
import { u as useProductionOperationStore } from "./productionOperationStore-BOD4obub.js";
import { m as Box, T as Typography, bl as Alert, aO as Chip, cD as TableContainer, aS as Paper, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./index-CU2cqxc8.js";
import "./vendor-date-DI3D_gXa.js";
function computeCRP(workOrders, routes, workCenters) {
  const active = workOrders.filter((w) => w.status !== "completed" && w.status !== "closed");
  const reqMap = /* @__PURE__ */ new Map();
  for (const wo of active) {
    const route = routes.find((r) => r.id === wo.routeId) || routes.find((r) => r.routeNo === wo.routeNo) || routes.find((r) => r.productCode === wo.productCode);
    if (!route) continue;
    for (const op of route.operations) {
      const wcName = op.workCenter;
      const perPieceMin = (op.setupTime + op.runTime * wo.plannedQuantity) / 60;
      const prev = reqMap.get(wcName) || { requiredHours: 0, orderCount: 0 };
      reqMap.set(wcName, {
        requiredHours: prev.requiredHours + perPieceMin,
        orderCount: prev.orderCount + 1
      });
    }
  }
  const lines = workCenters.map((wc) => {
    const agg = reqMap.get(wc.name) || { requiredHours: 0, orderCount: 0 };
    const requiredHours = Math.round(agg.requiredHours * 100) / 100;
    return {
      workCenterId: wc.id,
      name: wc.name,
      capacityHours: wc.capacityHours,
      requiredHours,
      loadPct: wc.capacityHours > 0 ? Math.round(requiredHours / wc.capacityHours * 1e3) / 10 : 0,
      orderCount: agg.orderCount
    };
  });
  const totalCapacity = lines.reduce((s, l) => s + l.capacityHours, 0);
  const totalRequired = Math.round(lines.reduce((s, l) => s + l.requiredHours, 0) * 100) / 100;
  const overloadCount = lines.filter((l) => l.loadPct > 100).length;
  return { lines, totalCapacity, totalRequired, overloadCount };
}
const fmt = (n) => n.toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
function CRP() {
  const { workOrders, processRoutes } = useProductionStore();
  const { workCenters } = useProductionOperationStore();
  const result = reactExports.useMemo(
    () => computeCRP(workOrders, processRoutes, workCenters),
    [workOrders, processRoutes, workCenters]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "crp", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "CRP 产能需求计划" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "按所有未完工工单的工艺路线展开，累计各工作中心的需求工时并与日产能比较（负荷率）。负荷率 > 100% 表示资源超载。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 1, display: "flex", gap: 1, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { "data-testid": "crp-total-capacity", label: `总产能 ${fmt(result.totalCapacity)} h` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { "data-testid": "crp-total-required", label: `总需求 ${fmt(result.totalRequired)} h`, color: "primary" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { "data-testid": "crp-overload", label: `超载资源 ${result.overloadCount}`, color: result.overloadCount > 0 ? "error" : "success" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "工作中心" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "日产能(h)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "需求工时(h)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "负荷率" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "涉及工单数" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: result.lines.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "crp-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: l.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmt(l.capacityHours) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmt(l.requiredHours) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: `${l.loadPct}%`, color: l.loadPct > 100 ? "error" : l.loadPct > 80 ? "warning" : "success" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: l.orderCount })
      ] }, l.workCenterId)) })
    ] }) })
  ] });
}
export {
  CRP as default
};
