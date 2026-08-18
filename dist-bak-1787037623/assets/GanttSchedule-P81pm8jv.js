import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { m as Box, aP as FormControl, dC as FormLabel, dD as RadioGroup, cM as FormControlLabel, dE as Radio, bl as Alert, T as Typography, bL as Stack, aO as Chip, aM as IconButton, eW as default_1, eX as default_1$1, aS as Paper, eY as default_1$2, b9 as Dialog, ba as DialogTitle, eH as default_1$3, bc as DialogContent, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, bE as DialogActions, bm as Button, eZ as default_1$4, e_ as default_1$5 } from "./vendor-mui-DsZGB15g.js";
import "./index-CU2cqxc8.js";
import "./vendor-date-DI3D_gXa.js";
import { P as PageWrapper } from "./PageWrapper-CjuAUfYF.js";
import { u as useProductionStore } from "./productionStore-3WoghQIz.js";
import { u as useProductionOperationStore, b as DEFAULT_WORK_CENTERS, m as mapCenter, C as CENTER_COLORS } from "./productionOperationStore-BOD4obub.js";
import { u as useProductionSchedulingStore } from "./productionSchedulingStore-jeZjQvFy.js";
import "./vendor-t9csHBDX.js";
const OPEN_STATUSES = ["draft", "released", "in_progress"];
const PRIORITY_WEIGHT = { urgent: 4, high: 3, normal: 2, low: 1 };
const parseDate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmtDate = (dt) => {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const addDays = (s, n) => {
  const dt = parseDate(s);
  dt.setDate(dt.getDate() + n);
  return fmtDate(dt);
};
const dayDiff = (a, b) => Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / 864e5);
function GanttSchedule() {
  const { workOrders, processRoutes, updateWorkOrder } = useProductionStore();
  const { workCenters } = useProductionOperationStore();
  const {
    schedulingMode,
    setSchedulingMode,
    setRescheduleResult
  } = useProductionSchedulingStore();
  const [dragId, setDragId] = reactExports.useState(null);
  const [conflictDialogOpen, setConflictDialogOpen] = reactExports.useState(false);
  const [conflicts, setConflicts] = reactExports.useState([]);
  const centers = workCenters.length ? workCenters : DEFAULT_WORK_CENTERS;
  const mainCenter = reactExports.useCallback(
    (wo) => {
      var _a, _b;
      const route = processRoutes.find((r) => r.id === wo.routeId) || processRoutes.find((r) => r.routeNo === wo.routeNo) || processRoutes.find((r) => r.productCode === wo.productCode);
      const firstOp = (_a = route == null ? void 0 : route.operations) == null ? void 0 : _a[0];
      return firstOp ? mapCenter(firstOp.workCenter) : ((_b = centers[0]) == null ? void 0 : _b.name) || "切割中心";
    },
    [processRoutes, centers]
  );
  const woHours = reactExports.useCallback(
    (wo) => {
      const route = processRoutes.find((r) => r.id === wo.routeId) || processRoutes.find((r) => r.routeNo === wo.routeNo) || processRoutes.find((r) => r.productCode === wo.productCode);
      if (!route || route.operations.length === 0) return wo.plannedQuantity * 0.5;
      return route.operations.reduce(
        (sum, op) => sum + (op.setupTime + op.runTime * wo.plannedQuantity) / 60,
        0
      );
    },
    [processRoutes]
  );
  const openOrders = reactExports.useMemo(
    () => workOrders.filter((wo) => OPEN_STATUSES.includes(wo.status)),
    [workOrders]
  );
  const { windowStart, windowEnd, days } = reactExports.useMemo(() => {
    if (openOrders.length === 0) {
      const today = fmtDate(/* @__PURE__ */ new Date());
      return { windowStart: today, windowEnd: today, days: [today] };
    }
    let min = openOrders[0].plannedStartDate;
    let max = openOrders[0].plannedEndDate;
    openOrders.forEach((wo) => {
      if (parseDate(wo.plannedStartDate) < parseDate(min)) min = wo.plannedStartDate;
      if (parseDate(wo.plannedEndDate) > parseDate(max)) max = wo.plannedEndDate;
    });
    const arr = [];
    let cur = min;
    while (parseDate(cur) <= parseDate(max)) {
      arr.push(cur);
      cur = addDays(cur, 1);
    }
    return { windowStart: min, windowEnd: max, days: arr };
  }, [openOrders]);
  const N = days.length;
  const ordersByCenter = reactExports.useMemo(() => {
    const map = {};
    centers.forEach((c) => {
      map[c.name] = [];
    });
    openOrders.forEach((wo) => {
      const c = mainCenter(wo);
      (map[c] || (map[c] = [])).push(wo);
    });
    return map;
  }, [openOrders, centers, mainCenter]);
  const loadByCenter = reactExports.useMemo(() => {
    const res = {};
    centers.forEach((c) => {
      const daily = days.map((d) => {
        const cnt = (ordersByCenter[c.name] || []).filter(
          (wo) => parseDate(wo.plannedStartDate) <= parseDate(d) && parseDate(d) <= parseDate(wo.plannedEndDate)
        ).length;
        return cnt;
      });
      res[c.name] = { peak: Math.max(0, ...daily), daily };
    });
    return res;
  }, [centers, days, ordersByCenter]);
  const onBarPointerDown = (e, wo) => {
    e.preventDefault();
    const startX = e.clientX;
    const track = e.currentTarget.parentElement;
    const trackWidth = track ? track.getBoundingClientRect().width : 0;
    const dayWidth = trackWidth / Math.max(1, N);
    setDragId(wo.id);
    const move = (ev) => {
      Math.round((ev.clientX - startX) / Math.max(1, dayWidth));
    };
    const up = (ev) => {
      const deltaDays = Math.round((ev.clientX - startX) / Math.max(1, dayWidth));
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDragId(null);
      if (deltaDays !== 0) {
        updateWorkOrder(wo.id, {
          plannedStartDate: addDays(wo.plannedStartDate, deltaDays),
          plannedEndDate: addDays(wo.plannedEndDate, deltaDays)
        });
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const shift = (wo, delta) => {
    updateWorkOrder(wo.id, {
      plannedStartDate: addDays(wo.plannedStartDate, delta),
      plannedEndDate: addDays(wo.plannedEndDate, delta)
    });
  };
  const handleReschedule = () => {
    const cursorBase = windowStart;
    centers.forEach((c) => {
      const cap = c.capacityHours || 16;
      const wos = (ordersByCenter[c.name] || []).slice().sort(
        (a, b) => (PRIORITY_WEIGHT[b.priority] ?? 2) - (PRIORITY_WEIGHT[a.priority] ?? 2) || dayDiff(a.plannedStartDate, b.plannedStartDate)
      );
      let cursor = cursorBase;
      wos.forEach((wo) => {
        const h = woHours(wo);
        const dur = Math.max(1, Math.ceil(h / cap));
        const start = cursor;
        const end = addDays(start, dur - 1);
        updateWorkOrder(wo.id, { plannedStartDate: start, plannedEndDate: end });
        cursor = addDays(end, 1);
      });
    });
  };
  const detectConflicts = reactExports.useCallback(() => {
    const result = [];
    centers.forEach((c) => {
      const dailyMap = {};
      const wos = ordersByCenter[c.name] || [];
      wos.forEach((wo) => {
        let d = wo.plannedStartDate;
        while (parseDate(d) <= parseDate(wo.plannedEndDate)) {
          (dailyMap[d] || (dailyMap[d] = [])).push(wo.id);
          d = addDays(d, 1);
        }
      });
      Object.entries(dailyMap).forEach(([date, orderIds]) => {
        if (orderIds.length > 1) {
          result.push({
            workCenter: c.name,
            date,
            orderIds,
            loadPercent: orderIds.length * 100,
            suggestionMoveDays: orderIds.length
          });
        }
      });
    });
    return result;
  }, [centers, ordersByCenter]);
  const handleAutoReschedule = () => {
    detectConflicts();
    let resolvedCount = 0;
    centers.forEach((c) => {
      const cap = c.capacityHours || 16;
      const wos = (ordersByCenter[c.name] || []).slice().sort(
        (a, b) => (PRIORITY_WEIGHT[b.priority] ?? 2) - (PRIORITY_WEIGHT[a.priority] ?? 2) || dayDiff(a.plannedStartDate, b.plannedStartDate)
      );
      if (schedulingMode === "forward") {
        let cursor = windowStart;
        wos.forEach((wo) => {
          const h = woHours(wo);
          const dur = Math.max(1, Math.ceil(h / cap));
          updateWorkOrder(wo.id, { plannedStartDate: cursor, plannedEndDate: addDays(cursor, dur - 1) });
          cursor = addDays(cursor, dur);
          resolvedCount++;
        });
      } else {
        let cursor = windowEnd;
        const reversed = [...wos].reverse();
        reversed.forEach((wo) => {
          const h = woHours(wo);
          const dur = Math.max(1, Math.ceil(h / cap));
          const endDate = cursor;
          const startDate = addDays(cursor, -(dur - 1));
          updateWorkOrder(wo.id, { plannedStartDate: startDate, plannedEndDate: endDate });
          cursor = addDays(startDate, -1);
          resolvedCount++;
        });
      }
    });
    const remainingConflicts = detectConflicts();
    setConflicts(remainingConflicts);
    setConflictDialogOpen(true);
    setRescheduleResult({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      mode: schedulingMode,
      resolvedCount,
      remainingConflicts
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "甘特排产（C2 · 拖拽 + 负荷联动重排 + P1-20 自动排程）",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$4, {}), onClick: handleReschedule, "data-testid": "reschedule-btn", size: "small", children: "负荷联动重排" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", color: "warning", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$5, {}), onClick: handleAutoReschedule, "data-testid": "gantt-auto-reschedule", size: "small", children: "自动重排" })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { component: "fieldset", "data-testid": "gantt-mode", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { component: "legend", sx: { fontSize: "0.875rem", fontWeight: 600, mb: 0.5 }, children: "排程模式" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            RadioGroup,
            {
              row: true,
              value: schedulingMode,
              onChange: (e) => setSchedulingMode(e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormControlLabel, { value: "forward", control: /* @__PURE__ */ jsxRuntimeExports.jsx(Radio, { size: "small" }), label: "正排 (Forward)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormControlLabel, { value: "backward", control: /* @__PURE__ */ jsxRuntimeExports.jsx(Radio, { size: "small" }), label: "倒排 (Backward)" })
              ]
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 2 }, children: [
          "工单按工艺路线",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "首工序" }),
          "映射到主工作中心泳道；工单在某中心占用当日即计满该中心日产能， 利用率 = 当日重叠工单数 × 100%，峰值 > 100% 标红「超载」。点击",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "负荷联动重排" }),
          "按有限能力前向顺排（同中心不重叠）， 重排后峰值利用率 ≤ 100%。",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "自动重排" }),
          "检查所有工单的产能冲突，按优先级逐个重排并展示冲突摘要。"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { "data-testid": "gantt-root", sx: { overflowX: "auto" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { minWidth: 760 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", position: "sticky", top: 0, bgcolor: "background.paper", zIndex: 2 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 140, flexShrink: 0, py: 1, borderRight: "1px solid", borderColor: "divider" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "工作中心 / 负荷" }) }),
            days.map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { flex: 1, minWidth: 46, py: 1, textAlign: "center", borderRight: "1px solid", borderColor: "divider" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
              parseDate(d).getMonth() + 1,
              "/",
              parseDate(d).getDate()
            ] }) }, i))
          ] }),
          centers.map((c) => {
            const wos = ordersByCenter[c.name] || [];
            const load = loadByCenter[c.name];
            const overload = load.peak > 1;
            const color = CENTER_COLORS[c.name] || "#64748B";
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Box,
              {
                sx: { display: "flex", alignItems: "stretch", borderTop: "1px solid", borderColor: "divider" },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { width: 140, flexShrink: 0, py: 1, px: 1, borderRight: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column", gap: 0.5 }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 0.75, children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 9, height: 9, borderRadius: "50%", bgcolor: color } }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", fontWeight: 600, children: c.name })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { "data-testid": `load-peak-${c.name}`, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", fontWeight: 700, color: overload ? "#EF4444" : load.peak >= 1 ? "#F59E0B" : "#10B981", children: [
                      "峰值 ",
                      load.peak * 100,
                      "%"
                    ] }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Box,
                      {
                        "data-testid": `load-overload-${c.name}`,
                        sx: { display: overload ? "inline-flex" : "none" },
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "超载", size: "small", sx: { bgcolor: "#EF4444", color: "#fff", height: 18, fontSize: "0.62rem", fontWeight: 700 } })
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { position: "relative", flex: 1, minHeight: wos.length ? 52 : 36 }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", position: "absolute", inset: 0 }, children: days.map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Box,
                      {
                        sx: {
                          flex: 1,
                          minWidth: 46,
                          borderRight: "1px solid",
                          borderColor: "divider",
                          bgcolor: i % 2 ? "action.hover" : "transparent"
                        }
                      },
                      i
                    )) }),
                    wos.map((wo) => {
                      const col = dayDiff(wo.plannedStartDate, windowStart);
                      const span = dayDiff(wo.plannedEndDate, wo.plannedStartDate) + 1;
                      const leftPct = col / N * 100;
                      const widthPct = span / N * 100;
                      const isDragging = dragId === wo.id;
                      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Box,
                        {
                          "data-testid": `wo-bar-${wo.id}`,
                          "data-start": wo.plannedStartDate,
                          "data-end": wo.plannedEndDate,
                          onPointerDown: (e) => onBarPointerDown(e, wo),
                          sx: {
                            position: "absolute",
                            top: 8,
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            height: 36,
                            borderRadius: 1.5,
                            bgcolor: color,
                            color: "#fff",
                            boxShadow: isDragging ? 6 : 1,
                            cursor: "grab",
                            opacity: isDragging ? 0.85 : 1,
                            display: "flex",
                            alignItems: "center",
                            px: 0.75,
                            gap: 0.25,
                            userSelect: "none",
                            touchAction: "none"
                          },
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              IconButton,
                              {
                                size: "small",
                                "data-testid": `wo-shift-left-${wo.id}`,
                                onClick: (e) => {
                                  e.stopPropagation();
                                  shift(wo, -1);
                                },
                                sx: { color: "#fff", p: 0.25 },
                                children: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, { sx: { fontSize: 16 } })
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { flex: 1, minWidth: 0 }, children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", fontWeight: 700, sx: { fontSize: "0.66rem", lineHeight: 1.1, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: wo.orderNo }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                Typography,
                                {
                                  variant: "caption",
                                  "data-testid": `wo-planned-start-${wo.id}`,
                                  sx: { fontSize: "0.6rem", lineHeight: 1.1, display: "block", opacity: 0.9 },
                                  children: wo.plannedStartDate
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                Typography,
                                {
                                  variant: "caption",
                                  "data-testid": `wo-planned-end-${wo.id}`,
                                  sx: { fontSize: "0.6rem", lineHeight: 1.1, display: "block", opacity: 0.9 },
                                  children: wo.plannedEndDate
                                }
                              )
                            ] }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              IconButton,
                              {
                                size: "small",
                                "data-testid": `wo-shift-right-${wo.id}`,
                                onClick: (e) => {
                                  e.stopPropagation();
                                  shift(wo, 1);
                                },
                                sx: { color: "#fff", p: 0.25 },
                                children: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, { sx: { fontSize: 16 } })
                              }
                            )
                          ]
                        },
                        wo.id
                      );
                    }),
                    wos.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { position: "absolute", inset: 0, display: "flex", alignItems: "center", pl: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.disabled", children: "无工单" }) })
                  ] })
                ]
              },
              c.id
            );
          }),
          openOrders.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { py: 3, textAlign: "center", color: "#94A3B8" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: "当前没有未完工工单，无需排产。" }) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mt: 2, borderRadius: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$2, { sx: { color: "#3B82F6" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "排产说明" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { lineHeight: 1.8 }, children: [
            "· 泳道按工单工艺路线",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "首工序" }),
            "映射的主工作中心划分（切割 / 焊接 / 喷涂 / 装配 / 质检）。",
            /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
            "· 利用率采用有限能力模型：工单在某中心占用的每一天计满该中心日产能，利用率 = 当日重叠工单数 × 100%。",
            /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
            "· 拖动甘特条或使用前 / 后移按钮改期；点击「负荷联动重排」按优先级做同中心前向顺排（时长 = ⌈工单工时 / 日产能⌉），消除超载。",
            /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
            "· ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "P1-20 自动排程" }),
            "：选择正排/倒排模式后点击「自动重排」，系统检查所有产能冲突并按优先级逐个重排；冲突摘要弹窗展示冲突工单及建议移动天数。"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: conflictDialogOpen, onClose: () => setConflictDialogOpen(false), maxWidth: "md", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { sx: { fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$3, { color: conflicts.length > 0 ? "warning" : "success" }),
            "产能冲突摘要"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { sx: { pt: 2 }, children: conflicts.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "success", sx: { borderRadius: 2 }, children: "所有工单排程完成，无产能冲突。各工作中心利用率均在 100% 以下。" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "warning", sx: { mb: 2, borderRadius: 2 }, children: [
              "检测到 ",
              conflicts.length,
              " 处产能冲突（同一工作中心同一天总占用 > 100%）。"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#FEF3C7" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "工作中心" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "日期" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "冲突工单" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, align: "center" }, children: "负载率" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, align: "center" }, children: "建议移动天数" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: conflicts.map((cf, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: cf.workCenter, size: "small", color: "primary", variant: "outlined" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: cf.date }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 0.5, flexWrap: "wrap", useFlexGap: true, children: cf.orderIds.map((oid) => {
                  const wo = workOrders.find((w) => w.id === oid);
                  return /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Chip,
                    {
                      label: (wo == null ? void 0 : wo.orderNo) || oid.slice(0, 8),
                      size: "small",
                      sx: { fontSize: "0.7rem" }
                    },
                    oid
                  );
                }) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Chip,
                  {
                    label: `${cf.loadPercent}%`,
                    size: "small",
                    color: "error",
                    sx: { fontWeight: 700 }
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Chip,
                  {
                    label: `+${cf.suggestionMoveDays}天`,
                    size: "small",
                    color: "warning",
                    variant: "outlined"
                  }
                ) })
              ] }, idx)) })
            ] }) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setConflictDialogOpen(false), children: "关闭" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: () => {
              setConflictDialogOpen(false);
              handleReschedule();
            }, children: "执行负荷联动重排" })
          ] })
        ] })
      ]
    }
  );
}
export {
  GanttSchedule as default
};
