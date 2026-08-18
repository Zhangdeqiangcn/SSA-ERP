import { r as reactExports, j as jsxRuntimeExports, bj as Alert, bX as Grid, bq as Card, br as CardContent, h as Typography, bK as Stack, aP as Paper, B as Box, aL as Chip, i as Divider, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, fg as default_1, cl as LinearProgress } from "./vendor-46QZWBd3.js";
import "./index-CcOZBoQL.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import { u as useProductionStore } from "./productionStore-D_DSIs05.js";
import { u as useProductionOperationStore, m as mapCenter, C as CENTER_COLORS } from "./productionOperationStore-ZzJ7_OWX.js";
const WO_STATUS_LABEL = {
  draft: "草稿",
  released: "已下达",
  in_progress: "生产中",
  completed: "已完成",
  closed: "已关闭"
};
const OP_STATUS_COLOR = {
  pending: "default",
  in_progress: "warning",
  completed: "success"
};
function WipBoard() {
  const { workOrders, processRoutes } = useProductionStore();
  const { operationReports, workCenters } = useProductionOperationStore();
  const activeWos = reactExports.useMemo(
    () => workOrders.filter((wo) => wo.status !== "closed"),
    [workOrders]
  );
  const wipByWo = reactExports.useMemo(() => {
    return activeWos.map((wo) => {
      const route = processRoutes.find((r) => r.id === wo.routeId) || processRoutes.find((r) => r.routeNo === wo.routeNo) || processRoutes.find((r) => r.productCode === wo.productCode);
      const rows = [];
      if (route) {
        let upstream = wo.plannedQuantity;
        route.operations.slice().sort((a, b) => a.sequence - b.sequence).forEach((op) => {
          var _a;
          const prog = (_a = wo.progress) == null ? void 0 : _a.find((p) => p.operationId === op.id);
          const good = operationReports.filter((r) => r.workOrderId === wo.id && r.operationId === op.id).reduce((s, r) => s + r.goodQuantity, 0);
          const status = (prog == null ? void 0 : prog.status) || (good > 0 ? good >= wo.plannedQuantity ? "completed" : "in_progress" : "pending");
          const wip = Math.max(0, upstream - good);
          const stuck = status === "pending" && wip > 0;
          rows.push({
            sequence: op.sequence,
            operationName: op.operationName,
            workCenter: op.workCenter,
            status,
            upstream,
            good,
            wip,
            stuck
          });
          upstream = good;
        });
      }
      const totalWip = rows.reduce((s, r) => s + r.wip, 0);
      const stuckCount = rows.filter((r) => r.stuck).length;
      return { wo, rows, totalWip, stuckCount };
    });
  }, [activeWos, processRoutes, operationReports]);
  const wipByCenter = reactExports.useMemo(() => {
    const map = {};
    wipByWo.forEach(({ rows }) => {
      rows.forEach((r) => {
        if (r.wip <= 0) return;
        const c = mapCenter(r.workCenter);
        map[c] = (map[c] || 0) + r.wip;
      });
    });
    return map;
  }, [wipByWo]);
  const totalWipAll = wipByWo.reduce((s, x) => s + x.totalWip, 0);
  const totalStuck = wipByWo.reduce((s, x) => s + x.stuckCount, 0);
  const maxCenterWip = Math.max(0, ...Object.values(wipByCenter));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "WIP 在制品看板", subtitle: "按工序层级计算在制品（上游合格 − 本序合格），识别滞留瓶颈", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 2 }, children: [
      "在制(WIP) = 上一序合格数 − 本序合格数；正值表示该工序仍有在产/待处理物料。",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "滞留" }),
      "标记表示工序尚未开始但已有上游物料等待流入，通常意味着排产缺口或资源瓶颈。"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 2 }, children: [
      { label: "在制工单", value: activeWos.length, color: "#3B82F6" },
      { label: "WIP 合计", value: totalWipAll, color: "#8B5CF6" },
      { label: "滞留工序", value: totalStuck, color: totalStuck > 0 ? "#EF4444" : "#10B981" },
      { label: "涉及工作中心", value: Object.keys(wipByCenter).length, color: "#F59E0B" }
    ].map((kpi) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 2, "&:last-child": { pb: 2 } }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: kpi.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", fontWeight: 700, sx: { color: kpi.color }, children: kpi.value })
    ] }) }) }, kpi.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 8, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, children: [
        wipByWo.map(({ wo, rows, totalWip, stuckCount }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", sx: { mb: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, children: [
                wo.orderNo,
                " · ",
                wo.productName
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                "计划 ",
                wo.plannedQuantity,
                " 件 ·",
                /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: WO_STATUS_LABEL[wo.status], size: "small", sx: { mx: 0.5, verticalAlign: "middle" } })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
              stuckCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `滞留 ${stuckCount}`, size: "small", color: "error" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `WIP ${totalWip}`, size: "small", color: totalWip > 0 ? "warning" : "success" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 1 } }),
          rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "该工单无工艺路线，无法计算工序 WIP。" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "序" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "工序" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "工作中心" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "状态" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "上游到达" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "本序合格" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "在制" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.sequence }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: r.operationName }),
                r.stuck && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "滞留", size: "small", color: "error", sx: { mt: 0.25 } })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.workCenter }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  label: r.status === "completed" ? "已完成" : r.status === "in_progress" ? "进行中" : "未开始",
                  size: "small",
                  color: OP_STATUS_COLOR[r.status]
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: r.upstream }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: r.good }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { fontWeight: 600, color: r.wip > 0 ? "#F59E0B" : "text.secondary", children: r.wip }) })
            ] }, r.sequence)) })
          ] }) })
        ] }, wo.id)),
        wipByWo.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 4, textAlign: "center", borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { color: "text.secondary", children: "当前没有进行中的工单。" }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 1.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, { sx: { color: "#3B82F6" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "工作中心在制汇总" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 1.5 } }),
        Object.keys(wipByCenter).length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "各工作中心当前无在制物料。" }) : workCenters.map((c) => {
          const wip = wipByCenter[c.name] || 0;
          const pct = maxCenterWip > 0 ? wip / maxCenterWip * 100 : 0;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 1.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 10, height: 10, borderRadius: "50%", bgcolor: CENTER_COLORS[c.name] || "#64748B" } }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: c.name })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: wip })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              LinearProgress,
              {
                variant: "determinate",
                value: pct,
                sx: { height: 8, borderRadius: 4, mt: 0.5, "& .MuiLinearProgress-bar": { backgroundColor: CENTER_COLORS[c.name] || "#64748B" } }
              }
            )
          ] }, c.id);
        })
      ] }) })
    ] })
  ] });
}
export {
  WipBoard as default
};
