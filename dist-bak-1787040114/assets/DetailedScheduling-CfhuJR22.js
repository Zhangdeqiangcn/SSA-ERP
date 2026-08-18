import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bj as Alert, cO as TableContainer, aP as Paper, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, bt as TextField, bk as Button, fj as default_1, fk as default_1$1, aL as Chip } from "./vendor-DGU5TO-x.js";
import { u as useProductionStore } from "./productionStore-Bdmg7HTu.js";
import { u as useProductionSchedulingStore } from "./productionSchedulingStore-DTA-q4iJ.js";
import "./index-DeeqqmHA.js";
function DetailedScheduling() {
  const { workOrders, processRoutes } = useProductionStore();
  const { locks, toggleLock, setAnchor } = useProductionSchedulingStore();
  const ops = reactExports.useMemo(() => {
    const active = workOrders.filter((w) => w.status !== "completed" && w.status !== "closed");
    const list = [];
    for (const wo of active) {
      const route = processRoutes.find((r) => r.id === wo.routeId) || processRoutes.find((r) => r.routeNo === wo.routeNo) || processRoutes.find((r) => r.productCode === wo.productCode);
      if (!route) continue;
      for (const op of route.operations) {
        list.push({
          key: `${wo.id}:${op.id}`,
          woNo: wo.orderNo,
          opName: op.operationName,
          workCenter: op.workCenter,
          baseStart: wo.plannedStartDate
        });
      }
    }
    return list;
  }, [workOrders, processRoutes]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "scheduling", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "详细工序排程" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "工序级排程：可对关键工序「锁单」防止 APS 自动重排覆盖，或手工指定计划开始日（锚定）。锁定的工序在有限产能排程中保持不动。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "工单" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "工序" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "工作中心" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "基准开始日" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "锚定开始日" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "锁单" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: ops.map((op) => {
        const lock = locks[op.key];
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "sched-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: op.woNo }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: op.opName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: op.workCenter }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: op.baseStart }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              type: "date",
              size: "small",
              value: (lock == null ? void 0 : lock.anchorDate) ?? "",
              onChange: (e) => setAnchor(op.key, e.target.value),
              InputLabelProps: { shrink: true },
              "data-testid": "sched-anchor"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "small",
              "data-testid": "sched-lock",
              variant: (lock == null ? void 0 : lock.locked) ? "contained" : "outlined",
              color: (lock == null ? void 0 : lock.locked) ? "warning" : "inherit",
              startIcon: (lock == null ? void 0 : lock.locked) ? /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, {}),
              onClick: () => toggleLock(op.key),
              children: (lock == null ? void 0 : lock.locked) ? "已锁" : "锁单"
            }
          ) })
        ] }, op.key);
      }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mt: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { "data-testid": "sched-locked-count", label: `已锁工序 ${Object.values(locks).filter((l) => l.locked).length}`, color: "warning" }) })
  ] });
}
export {
  DetailedScheduling as default
};
