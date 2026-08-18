import { r as reactExports, j as jsxRuntimeExports, bj as Alert, bX as Grid, bq as Card, br as CardContent, h as Typography, aP as Paper, bK as Stack, cz as default_1, i as Divider, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, B as Box, cl as LinearProgress, aL as Chip, cm as BarChart, fc as default_1$1, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bt as TextField, bC as DialogActions, bk as Button, c$ as default_1$2 } from "./vendor-DGU5TO-x.js";
import "./index-DeeqqmHA.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import { u as useProductionStore } from "./productionStore-Bdmg7HTu.js";
import { u as useProductionOperationStore, m as mapCenter, C as CENTER_COLORS } from "./productionOperationStore-ByOb08ia.js";
const OPEN_STATUSES = ["draft", "released", "in_progress"];
const DAYS = 14;
function CapacityScheduling() {
  const { workOrders, processRoutes } = useProductionStore();
  const { workCenters, updateWorkCenter } = useProductionOperationStore();
  const [dialogOpen, setDialogOpen] = reactExports.useState(false);
  const [draft, setDraft] = reactExports.useState([]);
  const { loadByCenter, openOrders, tasks } = reactExports.useMemo(() => {
    const loadMap = {};
    workCenters.forEach((c) => {
      loadMap[c.name] = 0;
    });
    const open = workOrders.filter((wo) => OPEN_STATUSES.includes(wo.status));
    const taskList = [];
    let rr = 0;
    open.forEach((wo) => {
      const route = processRoutes.find((r) => r.id === wo.routeId) || processRoutes.find((r) => r.routeNo === wo.routeNo) || processRoutes.find((r) => r.productCode === wo.productCode);
      if (route && route.operations.length > 0) {
        route.operations.slice().sort((a, b) => a.sequence - b.sequence).forEach((op) => {
          const hours = (op.setupTime + op.runTime * wo.plannedQuantity) / 60;
          const center = mapCenter(op.workCenter);
          loadMap[center] = (loadMap[center] || 0) + hours;
          taskList.push({ woNo: wo.orderNo, opName: op.operationName, center, hours });
        });
      } else {
        const total = wo.plannedQuantity * 0.5;
        const target = workCenters[rr % workCenters.length];
        rr += 1;
        if (target) {
          loadMap[target.name] = (loadMap[target.name] || 0) + total;
          taskList.push({ woNo: wo.orderNo, opName: "通用工序", center: target.name, hours: total });
        }
      }
    });
    return { loadByCenter: loadMap, openOrders: open, tasks: taskList };
  }, [workOrders, processRoutes, workCenters]);
  const gantt = reactExports.useMemo(() => {
    const byCenter = {};
    workCenters.forEach((c) => {
      byCenter[c.name] = Array.from({ length: DAYS }, () => []);
    });
    const dayPtr = {};
    workCenters.forEach((c) => {
      dayPtr[c.name] = 0;
    });
    tasks.forEach((t) => {
      const ptr = dayPtr[t.center] ?? 0;
      const day = Math.min(ptr, DAYS - 1);
      byCenter[t.center][day].push({ woNo: t.woNo, opName: t.opName });
      dayPtr[t.center] = ptr + 1;
    });
    return byCenter;
  }, [tasks, workCenters]);
  const days = reactExports.useMemo(
    () => Array.from({ length: DAYS }, (_, i) => {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() + i);
      return d;
    }),
    []
  );
  const chartCenters = reactExports.useMemo(() => workCenters.map((c) => c.name), [workCenters]);
  const chartLoad = reactExports.useMemo(
    () => workCenters.map((c) => Number((loadByCenter[c.name] || 0).toFixed(1))),
    [workCenters, loadByCenter]
  );
  const chartCapacity = reactExports.useMemo(() => workCenters.map((c) => c.capacityHours), [workCenters]);
  const overloaded = workCenters.filter((c) => {
    const util = c.capacityHours > 0 ? (loadByCenter[c.name] || 0) / c.capacityHours * 100 : 0;
    return util > 100;
  }).length;
  const handleOpenDialog = () => {
    setDraft(workCenters.map((c) => ({ id: c.id, capacityHours: c.capacityHours })));
    setDialogOpen(true);
  };
  const handleSave = () => {
    draft.forEach((d) => updateWorkCenter(d.id, { capacityHours: d.capacityHours }));
    setDialogOpen(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "产能排产（MRP 增强）",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$2, {}), onClick: handleOpenDialog, size: "small", children: "编辑产能" }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 2 }, children: [
          "本页为 MRP 产能增强模块：基于未完工工单与其工艺路线，按工序标准工时汇总各工作中心负荷， 并进行",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "前向排程" }),
          "与",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "负荷均衡" }),
          "，辅助识别产能瓶颈（利用率 > 100% 标红）。 工作中心产能主数据来自 productionOperationStore。"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 2 }, children: [
          { label: "未完工工单", value: openOrders.length, color: "#3B82F6" },
          { label: "参与工序", value: tasks.length, color: "#8B5CF6" },
          { label: "过载中心", value: overloaded, color: overloaded > 0 ? "#EF4444" : "#10B981" },
          { label: "产能中心", value: workCenters.length, color: "#F59E0B" }
        ].map((kpi) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 2, "&:last-child": { pb: 2 } }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: kpi.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", fontWeight: 700, sx: { color: kpi.color }, children: kpi.value })
        ] }) }) }, kpi.label)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, mb: 2.5, borderRadius: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 1.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, { sx: { color: "#3B82F6" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "工作中心负荷汇总" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 1.5 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "工作中心" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "负荷(小时)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "产能(小时)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "利用率" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "状态" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: workCenters.map((c) => {
              const load = loadByCenter[c.name] || 0;
              const util = c.capacityHours > 0 ? load / c.capacityHours * 100 : 0;
              const barColor = util > 100 ? "#EF4444" : util >= 80 ? "#F59E0B" : "#10B981";
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 10, height: 10, borderRadius: "50%", bgcolor: CENTER_COLORS[c.name] || "#64748B" } }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: c.name })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: load.toFixed(1) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: c.capacityHours }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { minWidth: 160 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    LinearProgress,
                    {
                      variant: "determinate",
                      value: Math.min(util, 100),
                      sx: { flex: 1, height: 8, borderRadius: 4, "& .MuiLinearProgress-bar": { backgroundColor: barColor } }
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 600, color: barColor, sx: { width: 48, textAlign: "right" }, children: [
                    util.toFixed(0),
                    "%"
                  ] })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Chip,
                  {
                    label: util > 100 ? "过载" : util >= 80 ? "偏紧" : "正常",
                    size: "small",
                    sx: {
                      bgcolor: (util > 100 ? "#EF4444" : util >= 80 ? "#F59E0B" : "#10B981") + "15",
                      color: util > 100 ? "#EF4444" : util >= 80 ? "#F59E0B" : "#10B981",
                      fontWeight: 500
                    }
                  }
                ) })
              ] }, c.id);
            }) })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, mb: 2.5, borderRadius: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 1.5 }, children: "负荷 vs 产能对比（小时）" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { height: 300 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            BarChart,
            {
              xAxis: [{ scaleType: "band", data: chartCenters }],
              series: [
                { data: chartLoad, label: "负荷(小时)", color: "#F59E0B" },
                { data: chartCapacity, label: "产能(小时)", color: "#3B82F6" }
              ],
              height: 300
            }
          ) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 1.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, { sx: { color: "#3B82F6" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, children: [
              "前向排程甘特（未来 ",
              DAYS,
              " 天）"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 1.5 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { overflowX: "auto" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { minWidth: 820 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", position: "sticky", top: 0, bgcolor: "background.paper" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 96, flexShrink: 0, py: 1, borderRight: "1px solid", borderColor: "divider" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "工作中心" }) }),
              days.map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { flex: 1, minWidth: 52, py: 1, textAlign: "center", borderRight: "1px solid", borderColor: "divider" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                d.getMonth() + 1,
                "/",
                d.getDate()
              ] }) }, i))
            ] }),
            workCenters.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "stretch", borderTop: "1px solid", borderColor: "divider" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { width: 96, flexShrink: 0, py: 1, px: 1, borderRight: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", gap: 0.5 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 8, height: 8, borderRadius: "50%", bgcolor: CENTER_COLORS[c.name] || "#64748B" } }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", fontWeight: 500, children: c.name })
              ] }),
              days.map((_, dayIdx) => {
                var _a;
                const blocks = ((_a = gantt[c.name]) == null ? void 0 : _a[dayIdx]) || [];
                return /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { flex: 1, minWidth: 52, minHeight: 40, p: 0.5, borderRight: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column", gap: 0.25 }, children: blocks.map((b, bi) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { bgcolor: (CENTER_COLORS[c.name] || "#64748B") + "1A", borderLeft: `3px solid ${CENTER_COLORS[c.name] || "#64748B"}`, borderRadius: 0.5, px: 0.5, py: 0.25 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", fontWeight: 600, sx: { fontSize: "0.62rem", lineHeight: 1.1, display: "block" }, children: b.woNo }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { fontSize: "0.6rem", color: "text.secondary", lineHeight: 1.1, display: "block" }, children: b.opName })
                ] }, bi)) }, dayIdx);
              })
            ] }, c.id)),
            openOrders.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { py: 3, textAlign: "center", color: "#94A3B8" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: "当前没有未完工工单，无需排程。" }) })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: dialogOpen, onClose: () => setDialogOpen(false), maxWidth: "sm", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "编辑工作中心日产能（小时）" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { dividers: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "工作中心" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "日产能(小时)" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: draft.map((d, idx) => {
                const c = workCenters.find((w) => w.id === d.id);
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 10, height: 10, borderRadius: "50%", bgcolor: CENTER_COLORS[(c == null ? void 0 : c.name) || ""] || "#64748B" } }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: c == null ? void 0 : c.name })
                  ] }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      type: "number",
                      size: "small",
                      value: d.capacityHours,
                      onChange: (e) => {
                        const val = Number(e.target.value);
                        setDraft((prev) => prev.map((p, i) => i === idx ? { ...p, capacityHours: Number.isFinite(val) && val > 0 ? val : 0 } : p));
                      },
                      inputProps: { min: 0, style: { textAlign: "right" } }
                    }
                  ) })
                ] }, d.id);
              }) })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mt: 1, display: "block" }, children: "配置保存到 productionOperationStore（persist 键 ssa-erp-production-op）。" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDialogOpen(false), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleSave, children: "保存" })
          ] })
        ] })
      ]
    }
  );
}
export {
  CapacityScheduling as default
};
