import { r as reactExports, j as jsxRuntimeExports, bj as Alert, bX as Grid, bq as Card, br as CardContent, h as Typography, aP as Paper, B as Box, cm as BarChart, bK as Stack, fc as default_1, i as Divider, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, cl as LinearProgress, aL as Chip, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bt as TextField, bC as DialogActions, bk as Button, c$ as default_1$1 } from "./vendor-46QZWBd3.js";
import "./index-CcOZBoQL.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import { u as useProductionStore } from "./productionStore-D_DSIs05.js";
import { u as useProductionOperationStore, m as mapCenter, C as CENTER_COLORS } from "./productionOperationStore-ZzJ7_OWX.js";
const OPEN_STATUSES = ["draft", "released", "in_progress"];
const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 };
const DAYS = 14;
function FiniteCapacity() {
  const { workOrders, processRoutes } = useProductionStore();
  const { workCenters, updateWorkCenter } = useProductionOperationStore();
  const [dialogOpen, setDialogOpen] = reactExports.useState(false);
  const [draft, setDraft] = reactExports.useState([]);
  const capacityOf = (name) => {
    var _a;
    return ((_a = workCenters.find((c) => c.name === name)) == null ? void 0 : _a.capacityHours) ?? 0;
  };
  const { schedule, loadByCenter, days, utilizationByCenter, overloadedCenters, openOrders, taskCount } = reactExports.useMemo(() => {
    const load = {};
    workCenters.forEach((c) => {
      load[c.name] = Array.from({ length: DAYS }, () => 0);
    });
    const sched = [];
    const open = workOrders.filter((wo) => OPEN_STATUSES.includes(wo.status)).slice().sort((a, b) => {
      const pa = PRIORITY_RANK[a.priority] ?? 9;
      const pb = PRIORITY_RANK[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      return a.plannedStartDate.localeCompare(b.plannedStartDate);
    });
    const firstAvailable = (center, fromDay, hours) => {
      const cap = capacityOf(center);
      for (let d = fromDay; d < DAYS; d++) {
        if (cap <= 0 || load[center][d] + hours <= cap) return { day: d, overflow: false };
      }
      return { day: DAYS - 1, overflow: true };
    };
    let placed = 0;
    open.forEach((wo) => {
      const route = processRoutes.find((r) => r.id === wo.routeId) || processRoutes.find((r) => r.routeNo === wo.routeNo) || processRoutes.find((r) => r.productCode === wo.productCode);
      if (!route || route.operations.length === 0) {
        const center = "切割中心";
        const hours = Number((wo.plannedQuantity * 0.5).toFixed(2));
        const { day, overflow } = firstAvailable(center, 0, hours);
        load[center][day] += hours;
        sched.push({ woNo: wo.orderNo, opName: "通用工序", center, hours, day, overflow });
        placed += 1;
        return;
      }
      let prevEndDay = 0;
      route.operations.slice().sort((a, b) => a.sequence - b.sequence).forEach((op) => {
        const center = mapCenter(op.workCenter);
        const goodReported = 0;
        const remaining = Math.max(0, wo.plannedQuantity - goodReported);
        const hours = Number(((op.setupTime + op.runTime * remaining) / 60).toFixed(2));
        const { day, overflow } = firstAvailable(center, prevEndDay, hours);
        load[center][day] += hours;
        sched.push({ woNo: wo.orderNo, opName: op.operationName, center, hours, day, overflow });
        prevEndDay = day;
        placed += 1;
      });
    });
    const loadMap = {};
    const utilMap = {};
    workCenters.forEach((c) => {
      const total = load[c.name].reduce((s, h) => s + h, 0);
      loadMap[c.name] = Number(total.toFixed(1));
      const cap = c.capacityHours * DAYS;
      utilMap[c.name] = cap > 0 ? Number((total / cap * 100).toFixed(0)) : 0;
    });
    const overloaded = workCenters.filter((c) => c.capacityHours > 0 && loadMap[c.name] > c.capacityHours * DAYS);
    const dateList = Array.from({ length: DAYS }, (_, i) => {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() + i);
      return d;
    });
    return {
      schedule: sched,
      loadByCenter: loadMap,
      days: dateList,
      utilizationByCenter: utilMap,
      overloadedCenters: overloaded,
      openOrders: open,
      taskCount: placed
    };
  }, [workOrders, processRoutes, workCenters]);
  const gantt = reactExports.useMemo(() => {
    const byCenter = {};
    workCenters.forEach((c) => {
      byCenter[c.name] = Array.from({ length: DAYS }, () => []);
    });
    schedule.forEach((t) => {
      var _a;
      (_a = byCenter[t.center][t.day]) == null ? void 0 : _a.push({ woNo: t.woNo, opName: t.opName, overflow: t.overflow });
    });
    return byCenter;
  }, [schedule, workCenters]);
  const openDialog = () => {
    setDraft(workCenters.map((c) => ({ id: c.id, capacityHours: c.capacityHours })));
    setDialogOpen(true);
  };
  const saveDialog = () => {
    draft.forEach((d) => updateWorkCenter(d.id, { capacityHours: d.capacityHours }));
    setDialogOpen(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "APS 有限产能排程",
      subtitle: "以工作中心日产能为硬约束前向排程，超产能顺延次日，识别瓶颈中心",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, {}), onClick: openDialog, size: "small", children: "编辑产能" }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 2 }, children: [
          "与「产能排产（负荷汇总）」不同，本页采用",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "有限产能" }),
          "算法：每道工序必须落入某工作中心 「当日剩余产能」之内，超出则顺延至次日，最终形成跨日甘特。利用率 = 总负荷 ÷（天数 × 日产能）。"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 2 }, children: [
          { label: "未完工工单", value: openOrders.length, color: "#3B82F6" },
          { label: "调度工序", value: taskCount, color: "#8B5CF6" },
          { label: "过载中心", value: overloadedCenters.length, color: overloadedCenters.length > 0 ? "#EF4444" : "#10B981" },
          { label: "工作中心", value: workCenters.length, color: "#F59E0B" }
        ].map((kpi) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 2, "&:last-child": { pb: 2 } }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: kpi.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", fontWeight: 700, sx: { color: kpi.color }, children: kpi.value })
        ] }) }) }, kpi.label)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, mb: 2.5, borderRadius: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 1.5 }, children: "计划期内负荷（小时）" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { height: 300 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            BarChart,
            {
              xAxis: [{ scaleType: "band", data: workCenters.map((c) => c.name) }],
              series: [{ data: workCenters.map((c) => loadByCenter[c.name] || 0), label: "负荷(小时)", color: "#F59E0B" }],
              height: 300
            }
          ) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, mb: 2.5, borderRadius: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 1.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, { sx: { color: "#3B82F6" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, children: [
              "工作中心利用率（",
              DAYS,
              " 天）"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 1.5 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "工作中心" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "负荷(小时)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "可用产能(小时)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "利用率" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "状态" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: workCenters.map((c) => {
              const load = loadByCenter[c.name] || 0;
              const cap = c.capacityHours * DAYS;
              const util = utilizationByCenter[c.name] || 0;
              const barColor = util > 100 ? "#EF4444" : util >= 80 ? "#F59E0B" : "#10B981";
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 10, height: 10, borderRadius: "50%", bgcolor: CENTER_COLORS[c.name] || "#64748B" } }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: c.name })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: load }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: cap }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { sx: { minWidth: 160 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    LinearProgress,
                    {
                      variant: "determinate",
                      value: Math.min(util, 100),
                      sx: { height: 8, borderRadius: 4, "& .MuiLinearProgress-bar": { backgroundColor: barColor } }
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", fontWeight: 600, color: barColor, children: [
                    util,
                    "%"
                  ] })
                ] }),
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
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 1.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, { sx: { color: "#3B82F6" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, children: [
              "有限产能前向排程甘特（未来 ",
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
                return /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { flex: 1, minWidth: 52, minHeight: 40, p: 0.5, borderRight: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column", gap: 0.25 }, children: blocks.map((b, bi) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { bgcolor: (CENTER_COLORS[c.name] || "#64748B") + "1A", borderLeft: `3px solid ${b.overflow ? "#EF4444" : CENTER_COLORS[c.name] || "#64748B"}`, borderRadius: 0.5, px: 0.5, py: 0.25 }, children: [
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
                        const v = Number(e.target.value);
                        setDraft((prev) => prev.map((p, i) => i === idx ? { ...p, capacityHours: Number.isFinite(v) && v > 0 ? v : 0 } : p));
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
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: saveDialog, children: "保存" })
          ] })
        ] })
      ]
    }
  );
}
export {
  FiniteCapacity as default
};
