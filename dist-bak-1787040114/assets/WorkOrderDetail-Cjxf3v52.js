import { cJ as useParams, aG as useNavigate, r as reactExports, j as jsxRuntimeExports, B as Box, bj as Alert, bk as Button, eY as default_1, h as Typography, aL as Chip, c$ as default_1$1, eZ as default_1$2, e_ as default_1$3, e$ as default_1$4, f0 as default_1$5, bX as Grid, aP as Paper, i as Divider, bq as Card, br as CardContent, cl as LinearProgress, bz as Stepper, bA as Step, bB as StepLabel, d4 as StepContent, cU as Snackbar, f1 as default_1$6, f2 as default_1$7, f3 as default_1$8 } from "./vendor-DGU5TO-x.js";
import { c as useWarehouseStore } from "./index-DeeqqmHA.js";
import { C as ConfirmDialog } from "./ConfirmDialog-DFiLXnKl.js";
import { F as FlowTracker } from "./FlowTracker-CCA6kX6w.js";
import { P as PrintPreviewButton } from "./PrintPreviewButton-DI_LQm8R.js";
import { u as useProductionStore } from "./productionStore-Bdmg7HTu.js";
import { u as useBOMStore } from "./bomStore-CxaOFNQN.js";
import "./PrintPreview-cCBr3GzP.js";
import "./format-DnEevvSX.js";
const STATUS_CONFIG = {
  draft: { label: "草稿", color: "default" },
  released: { label: "已下达", color: "info" },
  in_progress: { label: "生产中", color: "warning" },
  completed: { label: "已完工", color: "success" },
  closed: { label: "已关闭", color: "default" }
};
const PRIORITY_CONFIG = {
  urgent: { label: "紧急", color: "error" },
  high: { label: "高", color: "warning" },
  normal: { label: "正常", color: "info" },
  low: { label: "低", color: "default" }
};
const OP_STATUS_ICON = {
  completed: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$8, { sx: { color: "success.main", fontSize: 20 } }),
  in_progress: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$7, { sx: { color: "warning.main", fontSize: 20 } }),
  pending: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$6, { sx: { color: "text.disabled", fontSize: 20 } })
};
const explodeBOM = (items, qtyPer, acc) => {
  for (const it of items) {
    const baseQty = (it.quantity || 0) * qtyPer;
    const withScrap = baseQty * (1 + (it.scrapRate || 0) / 100);
    if (it.children && it.children.length > 0) {
      explodeBOM(it.children, withScrap, acc);
    } else {
      const existing = acc.get(it.materialCode);
      if (existing) existing.quantity += withScrap;
      else acc.set(it.materialCode, { item: it, quantity: withScrap });
    }
  }
};
function WorkOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeStep] = reactExports.useState(0);
  const [deleteDialog, setDeleteDialog] = reactExports.useState(false);
  const [snackbar, setSnackbar] = reactExports.useState(false);
  const workOrders = useProductionStore((s) => s.workOrders);
  const deleteWorkOrder = useProductionStore((s) => s.deleteWorkOrder);
  const completeWorkOrder = useProductionStore((s) => s.completeWorkOrder);
  const { bomList, bomTreeData } = useBOMStore();
  const { addOutboundOrder } = useWarehouseStore();
  const wo = workOrders.find((w) => w.id === id);
  if (!wo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "error", children: "工单不存在" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { sx: { mt: 2 }, startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), onClick: () => navigate("/production/orders"), children: "返回列表" })
    ] });
  }
  const handleShare = () => {
    const text = `工单 ${wo.orderNo}
产品：${wo.productName}
数量：${wo.plannedQuantity}
状态：${wo.status}`;
    navigator.clipboard.writeText(text).then(() => setSnackbar(true));
  };
  const handleGenOutbound = () => {
    const bom = bomList.find((b) => b.id === wo.bomId || b.productCode === wo.productCode);
    const sourceItems2 = (bom == null ? void 0 : bom.items) && bom.items.length > 0 ? bom.items : bomTreeData.filter((t) => t.bomId === ((bom == null ? void 0 : bom.id) || ""));
    if (!sourceItems2 || sourceItems2.length === 0) {
      alert("未找到对应的BOM物料清单，请先创建BOM");
      return;
    }
    const acc = /* @__PURE__ */ new Map();
    explodeBOM(sourceItems2, wo.plannedQuantity, acc);
    const items = Array.from(acc.values()).map(({ item, quantity }, idx) => ({
      id: `oob-wo-${idx}`,
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      specification: item.materialSpec || "",
      unit: item.unit,
      quantity: Math.max(1, Math.ceil(quantity))
    }));
    if (items.length === 0) {
      alert("BOM 未包含可展开的下级物料");
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const seq = String(Date.now()).slice(-6);
    const outboundNo = `OUT-WO-${seq}`;
    const outboundId = `out-wo-${Date.now()}`;
    addOutboundOrder({
      id: outboundId,
      outboundNo,
      type: "pick",
      sourceNo: wo.orderNo,
      status: "completed",
      warehouseId: "WH-001",
      warehouseName: "原材料仓",
      operator: wo.supervisor || "生产主管",
      outboundDate: now.split("T")[0],
      remarks: `生产领料 - 工单${wo.orderNo} - ${wo.productName}`,
      items,
      createdAt: now,
      updatedAt: now
    });
    alert(`已生成领料出库单 ${outboundNo}，共 ${items.length} 种物料，库存已自动扣减`);
    navigate("/warehouse/outbound");
  };
  const handleGenFGInbound = () => {
    const ok = completeWorkOrder(wo.id, {
      completedQuantity: wo.plannedQuantity,
      scrapQuantity: 0,
      operator: wo.supervisor || "生产主管"
    });
    if (!ok) {
      alert("该工单无法完工（可能已完工/已关闭，或缺少对应成品主数据）");
      return;
    }
    alert(`工单 ${wo.orderNo} 已完工回写：成品入库、库存过账、生产成本凭证已自动生成`);
    navigate("/warehouse/inbound");
  };
  const statusConf = STATUS_CONFIG[wo.status];
  const priorityConf = PRIORITY_CONFIG[wo.priority];
  const completionPct = wo.plannedQuantity > 0 ? Math.round(wo.completedQuantity / wo.plannedQuantity * 100) : 0;
  const currentOpIndex = wo.progress ? wo.progress.findIndex((p) => p.status === "in_progress" || p.status === "pending") : -1;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 2, mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "text", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), onClick: () => navigate("/production/orders"), children: "返回" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "工单详情" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "work-order", currentStatus: wo.status, documentNo: wo.orderNo }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: statusConf.label, color: statusConf.color, size: "small" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: priorityConf.label, color: priorityConf.color, size: "small", variant: "outlined" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, {}), onClick: () => navigate(`/production/orders/${id}/edit`), children: "编辑" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "contained",
          size: "small",
          color: "success",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$2, {}),
          onClick: handleGenOutbound,
          disabled: wo.status === "draft" || wo.status === "closed",
          children: "生成领料出库"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "contained",
          size: "small",
          color: "primary",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$3, {}),
          onClick: handleGenFGInbound,
          disabled: wo.status === "draft" || wo.status === "closed",
          children: "生成成品入库"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", size: "small", color: "error", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$4, {}), onClick: () => setDeleteDialog(true), children: "删除" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$5, {}), onClick: handleShare, children: "分享" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        PrintPreviewButton,
        {
          entity: "workOrder",
          record: {
            workOrderNo: wo.orderNo,
            productName: wo.productName,
            bomName: wo.bomNo,
            quantity: wo.quantity,
            plannedStartDate: wo.plannedStartDate,
            plannedEndDate: wo.plannedEndDate,
            status: wo.status,
            remarks: wo.remarks,
            items: sourceItems.map((i) => ({
              materialCode: i.materialCode,
              materialName: i.materialName,
              specification: i.materialSpec || i.specification,
              unit: i.unit,
              quantity: i.quantity,
              unitPrice: i.unitCost,
              amount: i.totalCost
            }))
          },
          showBoth: true
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: wo.orderNo })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 4, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, mb: 2.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true, children: "基本信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 2 } }),
          [
            { label: "产品编码", value: wo.productCode },
            { label: "产品名称", value: wo.productName },
            { label: "BOM编号", value: wo.bomNo },
            { label: "工艺路线", value: wo.routeNo },
            { label: "生产车间", value: wo.workshop },
            { label: "生产主管", value: wo.supervisor },
            ...wo.projectNo ? [{ label: "项目编号", value: wo.projectNo }, { label: "项目名称", value: wo.projectName || "-" }] : [],
            { label: "计划开始", value: wo.plannedStartDate },
            { label: "计划结束", value: wo.plannedEndDate },
            ...wo.actualStartDate ? [{ label: "实际开始", value: wo.actualStartDate }] : [],
            ...wo.actualEndDate ? [{ label: "实际完成", value: wo.actualEndDate }] : []
          ].map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", mb: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: row.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: row.value })
          ] }, row.label))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true, children: "生产进度" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", alignItems: "baseline", gap: 1, mt: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "h3", fontWeight: 700, color: "primary", children: [
            completionPct,
            "%"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(LinearProgress, { variant: "determinate", value: completionPct, sx: { my: 1.5, height: 8, borderRadius: 4 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
              "已完工：",
              wo.completedQuantity,
              " 件"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
              "计划：",
              wo.plannedQuantity,
              " 件"
            ] })
          ] }),
          wo.scrapQuantity > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "error", children: [
            "报废：",
            wo.scrapQuantity,
            " 件"
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 8, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true, children: "工序执行进度" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 2.5 } }),
          wo.progress && wo.progress.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Stepper, { orientation: "vertical", activeStep: currentOpIndex >= 0 ? currentOpIndex : wo.progress.length, children: wo.progress.map((op, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Step, { completed: op.status === "completed", active: op.status === "in_progress", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              StepLabel,
              {
                icon: OP_STATUS_ICON[op.status],
                optional: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: op.status === "completed" && op.endTime ? `完工时间：${new Date(op.endTime).toLocaleString("zh-CN")}` : op.status === "in_progress" && op.startTime ? `开始时间：${new Date(op.startTime).toLocaleString("zh-CN")}` : "待开始" }),
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: op.operationName }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Chip,
                    {
                      label: op.status === "completed" ? "已完成" : op.status === "in_progress" ? "进行中" : "待处理",
                      size: "small",
                      color: op.status === "completed" ? "success" : op.status === "in_progress" ? "warning" : "default",
                      variant: "outlined",
                      sx: { fontSize: "0.65rem" }
                    }
                  )
                ] })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(StepContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 3, py: 1 }, children: [
              op.operator && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                "操作员：",
                /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: op.operator })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                "已完成数量：",
                /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: op.completedQuantity }),
                " 件"
              ] })
            ] }) })
          ] }, op.operationId)) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "工单尚未下达，暂无工序进度。" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
              "工单状态：",
              statusConf.label,
              "。下达后工序进度将在此显示。"
            ] })
          ] })
        ] }),
        wo.note && /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mt: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true, children: "备注" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: wo.note })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        open: deleteDialog,
        title: "确认删除",
        content: `确定删除工单"${wo.orderNo}"吗？此操作不可撤销。`,
        onConfirm: () => {
          deleteWorkOrder(wo.id);
          setDeleteDialog(false);
          navigate("/production/orders");
        },
        onCancel: () => setDeleteDialog(false),
        confirmText: "确认删除",
        confirmColor: "error"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Snackbar,
      {
        open: snackbar,
        autoHideDuration: 3e3,
        onClose: () => setSnackbar(false),
        message: "分享内容已复制到剪贴板"
      }
    )
  ] });
}
export {
  WorkOrderDetail as default
};
