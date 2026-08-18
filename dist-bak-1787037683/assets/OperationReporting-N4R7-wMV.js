import { r as reactExports, j as jsxRuntimeExports, bj as Alert, bX as Grid, aP as Paper, bK as Stack, fd as default_1, h as Typography, i as Divider, bq as Card, br as CardContent, aL as Chip, B as Box, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, bk as Button, fe as default_1$1, k as Tooltip, aJ as IconButton, ff as default_1$2, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bt as TextField, bC as DialogActions } from "./vendor-46QZWBd3.js";
import "./index-CcOZBoQL.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import { u as useProductionStore } from "./productionStore-D_DSIs05.js";
import { u as useProductionOperationStore } from "./productionOperationStore-ZzJ7_OWX.js";
const nowISO = () => (/* @__PURE__ */ new Date()).toISOString();
const toLocal = (iso) => iso ? new Date(iso).toLocaleString("zh-CN", { hour12: false }) : "-";
const OPEN_STATUSES = ["draft", "released", "in_progress"];
const WO_STATUS_LABEL = {
  draft: "草稿",
  released: "已下达",
  in_progress: "生产中",
  completed: "已完成",
  closed: "已关闭"
};
const WO_STATUS_COLOR = {
  draft: "default",
  released: "info",
  in_progress: "warning",
  completed: "success",
  closed: "secondary"
};
const OP_STATUS_LABEL = {
  pending: "未开始",
  in_progress: "进行中",
  completed: "已完成"
};
const OP_STATUS_COLOR = {
  pending: "default",
  in_progress: "warning",
  completed: "success"
};
function OperationReporting() {
  var _a;
  const { workOrders, processRoutes, updateWorkOrder } = useProductionStore();
  const { operationReports, addOperationReport, removeOperationReport } = useProductionOperationStore();
  const [selectedWoId, setSelectedWoId] = reactExports.useState("");
  const [dialogOpId, setDialogOpId] = reactExports.useState(null);
  const [draft, setDraft] = reactExports.useState({
    goodQuantity: "",
    scrapQuantity: "0",
    operator: "",
    startTime: "",
    endTime: "",
    note: ""
  });
  const openWos = reactExports.useMemo(
    () => workOrders.filter((wo) => OPEN_STATUSES.includes(wo.status)),
    [workOrders]
  );
  const selectedWo = reactExports.useMemo(
    () => workOrders.find((wo) => wo.id === selectedWoId) || openWos[0] || null,
    [workOrders, openWos, selectedWoId]
  );
  const route = reactExports.useMemo(() => {
    if (!selectedWo) return null;
    return processRoutes.find((r) => r.id === selectedWo.routeId) || processRoutes.find((r) => r.routeNo === selectedWo.routeNo) || processRoutes.find((r) => r.productCode === selectedWo.productCode) || null;
  }, [selectedWo, processRoutes]);
  const operationRows = reactExports.useMemo(() => {
    if (!route) return [];
    return route.operations.slice().sort((a, b) => a.sequence - b.sequence).map((op) => {
      var _a2;
      const prog = (_a2 = selectedWo == null ? void 0 : selectedWo.progress) == null ? void 0 : _a2.find((p) => p.operationId === op.id);
      const reported = operationReports.filter(
        (r) => r.workOrderId === (selectedWo == null ? void 0 : selectedWo.id) && r.operationId === op.id
      );
      return {
        op,
        status: (prog == null ? void 0 : prog.status) || "pending",
        completedQuantity: (prog == null ? void 0 : prog.completedQuantity) ?? 0,
        reported
      };
    });
  }, [route, selectedWo, operationReports]);
  const openReportDialog = (opId, defaultGood) => {
    setDialogOpId(opId);
    setDraft({
      goodQuantity: String(defaultGood),
      scrapQuantity: "0",
      operator: "",
      startTime: (/* @__PURE__ */ new Date()).toISOString().slice(0, 16),
      endTime: (/* @__PURE__ */ new Date()).toISOString().slice(0, 16),
      note: ""
    });
  };
  const handleSubmit = () => {
    if (!selectedWo || !route || !dialogOpId) return;
    const op = route.operations.find((o) => o.id === dialogOpId);
    if (!op) return;
    const good = Math.max(0, Number(draft.goodQuantity) || 0);
    const scrap = Math.max(0, Number(draft.scrapQuantity) || 0);
    addOperationReport({
      workOrderId: selectedWo.id,
      workOrderNo: selectedWo.orderNo,
      operationId: op.id,
      operationName: op.operationName,
      workCenter: op.workCenter,
      operator: draft.operator || "未指定",
      startTime: new Date(draft.startTime).toISOString(),
      endTime: new Date(draft.endTime).toISOString(),
      goodQuantity: good,
      scrapQuantity: scrap,
      laborHours: Number(((op.setupTime + op.runTime * good) / 60).toFixed(2)),
      note: draft.note
    });
    const progress = selectedWo.progress ? [...selectedWo.progress] : [];
    const idx = progress.findIndex((p) => p.operationId === op.id);
    const entry = {
      operationId: op.id,
      operationName: op.operationName,
      status: "completed",
      completedQuantity: good,
      startTime: new Date(draft.startTime).toISOString(),
      endTime: new Date(draft.endTime).toISOString(),
      operator: draft.operator || "未指定"
    };
    if (idx >= 0) progress[idx] = entry;
    else progress.push(entry);
    const allOps = route.operations;
    const completedAll = allOps.every(
      (o) => {
        var _a2;
        return ((_a2 = progress.find((p) => p.operationId === o.id)) == null ? void 0 : _a2.status) === "completed";
      }
    );
    const lastCompleted = [...progress].filter((p) => p.status === "completed").sort((a, b) => {
      var _a2, _b;
      const sa = ((_a2 = allOps.find((o) => o.id === a.operationId)) == null ? void 0 : _a2.sequence) ?? 0;
      const sb = ((_b = allOps.find((o) => o.id === b.operationId)) == null ? void 0 : _b.sequence) ?? 0;
      return sb - sa;
    })[0];
    const completedQty = lastCompleted ? lastCompleted.completedQuantity : selectedWo.completedQuantity;
    const scrapQty = operationReports.filter((r) => r.workOrderId === selectedWo.id).reduce((s, r) => s + r.scrapQuantity, scrap);
    const nextStatus = completedAll ? "completed" : "in_progress";
    updateWorkOrder(selectedWo.id, {
      progress,
      completedQuantity: completedQty,
      scrapQuantity: scrapQty,
      status: nextStatus,
      actualStartDate: selectedWo.actualStartDate || nowISO(),
      actualEndDate: completedAll ? nowISO() : selectedWo.actualEndDate
    });
    setDialogOpId(null);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "工序报工",
      subtitle: "车间执行层数据采集：按工单逐工序上报合格/报废，自动回写工单进度与完工状态",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 2 }, children: [
          "报工会实时写入",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "工序报工记录" }),
          "并回写对应工单的「工序进度」。当工单全部工序报工完成，工单状态自动置为",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "已完成" }),
          "。 数据同时驱动「WIP 看板」与「成本归集」页面。"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, borderRadius: 3, maxHeight: 620, overflow: "auto" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 1.5 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, { sx: { color: "#3B82F6" } }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, children: [
                "未完工工单（",
                openWos.length,
                "）"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 1.5 } }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 1, children: [
              openWos.map((wo) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                Card,
                {
                  variant: (selectedWo == null ? void 0 : selectedWo.id) === wo.id ? "elevation" : "outlined",
                  sx: {
                    cursor: "pointer",
                    borderRadius: 2,
                    borderColor: (selectedWo == null ? void 0 : selectedWo.id) === wo.id ? "#3B82F6" : "divider",
                    boxShadow: (selectedWo == null ? void 0 : selectedWo.id) === wo.id ? "0 0 0 2px #3B82F633" : "none"
                  },
                  onClick: () => setSelectedWoId(wo.id),
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 1.5, "&:last-child": { pb: 1.5 } }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: wo.orderNo }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: WO_STATUS_LABEL[wo.status], size: "small", color: WO_STATUS_COLOR[wo.status] })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: wo.productName }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", display: "block", children: [
                      "计划 ",
                      wo.plannedQuantity,
                      " 件 · 已报 ",
                      wo.completedQuantity,
                      " 件"
                    ] })
                  ] })
                },
                wo.id
              )),
              openWos.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", sx: { py: 2, textAlign: "center" }, children: "当前没有未完工工单。" })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 8, children: selectedWo && route ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", sx: { mb: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, children: [
                  selectedWo.orderNo,
                  " · ",
                  route.name
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                  "产品 ",
                  selectedWo.productName,
                  " · 计划 ",
                  selectedWo.plannedQuantity,
                  " 件"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: WO_STATUS_LABEL[selectedWo.status], color: WO_STATUS_COLOR[selectedWo.status] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 1.5 } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "序号" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "工序" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "工作中心" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "状态" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "已合格" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "操作" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: operationRows.map(({ op, status, completedQuantity, reported }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: op.sequence }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: op.operationName }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: op.operationCode })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: op.workCenter }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: OP_STATUS_LABEL[status], size: "small", color: OP_STATUS_COLOR[status] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: completedQuantity }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    size: "small",
                    variant: status === "completed" ? "outlined" : "contained",
                    onClick: () => openReportDialog(op.id, selectedWo.plannedQuantity),
                    children: status === "completed" ? "重报" : "报工"
                  }
                ) })
              ] }, op.id)) })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 2 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 1 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, { sx: { color: "#8B5CF6" } }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "本工单报工记录" })
              ] }),
              operationReports.filter((r) => r.workOrderId === selectedWo.id).length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "暂无报工记录。" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "工序" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "操作工" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "合格" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "报废" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "上报时间" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 } })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: operationReports.filter((r) => r.workOrderId === selectedWo.id).map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.operationName }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.operator }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: r.goodQuantity }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: r.scrapQuantity }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: toLocal(r.reportedAt) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "删除报工", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => removeOperationReport(r.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$2, { fontSize: "small" }) }) }) })
                ] }, r.id)) })
              ] }) })
            ] })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 4, textAlign: "center", borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { color: "text.secondary", children: "请选择左侧工单进行报工。" }) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: dialogOpId !== null, onClose: () => setDialogOpId(null), maxWidth: "sm", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
            "工序报工",
            dialogOpId && route ? ` · ${((_a = route.operations.find((o) => o.id === dialogOpId)) == null ? void 0 : _a.operationName) ?? ""}` : ""
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { dividers: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, sx: { mt: 0.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "合格数量",
                type: "number",
                size: "small",
                value: draft.goodQuantity,
                onChange: (e) => setDraft((d) => ({ ...d, goodQuantity: e.target.value })),
                inputProps: { min: 0 },
                fullWidth: true
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "报废数量",
                type: "number",
                size: "small",
                value: draft.scrapQuantity,
                onChange: (e) => setDraft((d) => ({ ...d, scrapQuantity: e.target.value })),
                inputProps: { min: 0 },
                fullWidth: true
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "操作工",
                size: "small",
                value: draft.operator,
                onChange: (e) => setDraft((d) => ({ ...d, operator: e.target.value })),
                fullWidth: true
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "开工时间",
                type: "datetime-local",
                size: "small",
                value: draft.startTime,
                onChange: (e) => setDraft((d) => ({ ...d, startTime: e.target.value })),
                InputLabelProps: { shrink: true },
                fullWidth: true
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "完工时间",
                type: "datetime-local",
                size: "small",
                value: draft.endTime,
                onChange: (e) => setDraft((d) => ({ ...d, endTime: e.target.value })),
                InputLabelProps: { shrink: true },
                fullWidth: true
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "备注",
                size: "small",
                value: draft.note,
                onChange: (e) => setDraft((d) => ({ ...d, note: e.target.value })),
                multiline: true,
                minRows: 2,
                fullWidth: true
              }
            )
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDialogOpId(null), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleSubmit, children: "提交报工" })
          ] })
        ] })
      ]
    }
  );
}
export {
  OperationReporting as default
};
