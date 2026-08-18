import { n as useParams, h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { c as useWarehouseStore } from "./index-CU2cqxc8.js";
import { D as DataTable } from "./DataTable-uFcG_dYG.js";
import { a as formatDate } from "./format-DXPckS9-.js";
import { D as DetailActions } from "./DetailActions-CuG0mGuF.js";
import { P as PageWrapper } from "./PageWrapper-CjuAUfYF.js";
import { T as Typography, aS as Paper, bY as Grid, aO as Chip, bB as Stepper, bC as Step, bD as StepLabel, m as Box, dH as PlayArrow, bW as CheckCircle, J as Inventory2, X as LocalShipping } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./vendor-date-DI3D_gXa.js";
import "./StatusBadge-D4Muac94.js";
import "./vendor-table-ClDZT4tF.js";
import "./PrintPreviewButton-DAktPrxC.js";
import "./PrintPreview-B9z7TG1v.js";
const STATUS_STEPS = ["pending", "picking", "picked", "packed", "shipped"];
const STATUS_LABELS = {
  pending: "待出库",
  processing: "出库中",
  picking: "拣配中",
  picked: "已拣配",
  packed: "已包装",
  shipped: "已发货",
  completed: "已完成",
  cancelled: "已取消"
};
const STATUS_COLORS = {
  pending: "#94A3B8",
  processing: "#F59E0B",
  picking: "#3B82F6",
  picked: "#8B5CF6",
  packed: "#F59E0B",
  shipped: "#10B981",
  completed: "#10B981",
  cancelled: "#EF4444"
};
const PACKAGING_LABELS = {
  carton: "纸箱",
  wooden: "木箱",
  pallet: "托盘",
  bare: "裸装"
};
const OutboundDetail = () => {
  var _a;
  const { id } = useParams();
  const navigate = useNavigate();
  const outboundOrders = useWarehouseStore((s) => s.outboundOrders);
  const updateOutboundOrder = useWarehouseStore((s) => s.updateOutboundOrder);
  const order = reactExports.useMemo(() => outboundOrders.find((o) => o.id === id), [id, outboundOrders]);
  if (!order) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "出库详情", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { color: "text.secondary", children: "未找到出库单" }) });
  }
  const currentStepIndex = order.status === "completed" || order.status === "shipped" ? STATUS_STEPS.length : STATUS_STEPS.indexOf(order.status) >= 0 ? STATUS_STEPS.indexOf(order.status) : 0;
  const handleStartPicking = () => {
    updateOutboundOrder(order.id, {
      status: "picking",
      pickingStartedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  };
  const handleFinishPicking = () => {
    updateOutboundOrder(order.id, {
      status: "picked",
      pickingFinishedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  };
  const handleFinishPack = () => {
    updateOutboundOrder(order.id, {
      status: "packed",
      packedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  };
  const handleShip = () => {
    updateOutboundOrder(order.id, {
      status: "shipped",
      shippedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  };
  const canStartPick = order.status === "pending" || order.status === "processing";
  const canFinishPick = order.status === "picking";
  const canFinishPack = order.status === "picked";
  const canShip = order.status === "packed";
  const typeMap = {
    sale: "销售出库",
    pick: "领料出库",
    transfer: "调拨出库",
    return: "退货出库",
    subcontract: "委外发料",
    scrap: "报废出库"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: `出库单 ${order.outboundNo}`,
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(
        DetailActions,
        {
          entity: "warehouseOutbound",
          record: order,
          onBack: () => navigate(-1),
          onEdit: () => navigate(`/warehouse/outbound/create`)
        }
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 3, borderRadius: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, sx: { mb: 2 }, children: "基本信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, md: 3, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "出库类型" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: typeMap[order.type] || order.type })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, md: 3, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "仓库" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: order.warehouseName || "-" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, md: 3, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "操作员" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: order.operator })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, md: 3, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "出库日期" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: formatDate(order.outboundDate) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, md: 3, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "客户" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: order.customerName || "-" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, md: 3, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "拣配人" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: order.picker || "-" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, md: 3, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "包装方式" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: order.packagingMethod ? PACKAGING_LABELS[order.packagingMethod] : "-" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, md: 3, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "状态" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  label: STATUS_LABELS[order.status] || order.status,
                  size: "small",
                  sx: { bgcolor: STATUS_COLORS[order.status] + "15", color: STATUS_COLORS[order.status], fontWeight: 500 }
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 3, borderRadius: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, sx: { mb: 2 }, children: "拣配进度" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Stepper, { activeStep: currentStepIndex, alternativeLabel: true, sx: { mb: 2 }, children: STATUS_STEPS.map((step) => /* @__PURE__ */ jsxRuntimeExports.jsx(Step, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(StepLabel, { children: STATUS_LABELS[step] }) }, step)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 1, justifyContent: "center", mt: 2 }, children: [
            canStartPick && /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "contained",
                startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(PlayArrow, {}),
                onClick: handleStartPicking,
                "data-testid": "ob-start-pick",
                color: "primary",
                children: "开始拣配"
              }
            ),
            canFinishPick && /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "contained",
                startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}),
                onClick: handleFinishPicking,
                "data-testid": "ob-finish-pick",
                color: "success",
                children: "完成拣配"
              }
            ),
            canFinishPack && /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "contained",
                startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Inventory2, {}),
                onClick: handleFinishPack,
                "data-testid": "ob-finish-pack",
                color: "warning",
                children: "包装完成"
              }
            ),
            canShip && /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "contained",
                startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(LocalShipping, {}),
                onClick: handleShip,
                color: "success",
                children: "确认发货"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 3, height: "100%" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, sx: { mb: 2 }, children: "包装清单" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "包装方式" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: order.packagingMethod ? PACKAGING_LABELS[order.packagingMethod] : "未指定" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "件数" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: order.packageCount ?? "-" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "重量(kg)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: order.weight ?? "-" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "体积(m³)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: order.volume ?? "-" })
              ] })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 3, height: "100%" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, sx: { mb: 2 }, children: "快递信息" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "快递公司" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: order.expressCompany || "未指定" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "快递单号" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: order.expressNo || "未指定" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "拣配开始" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: order.pickingStartedAt ? formatDate(order.pickingStartedAt) : "-" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "拣配完成" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: order.pickingFinishedAt ? formatDate(order.pickingFinishedAt) : "-" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "包装完成" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: order.packedAt ? formatDate(order.packedAt) : "-" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "发货时间" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: order.shippedAt ? formatDate(order.shippedAt) : "-" })
              ] })
            ] })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, sx: { p: 3, pb: 0 }, children: [
            "出库物料明细 (",
            ((_a = order.items) == null ? void 0 : _a.length) || 0,
            " 项)"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            DataTable,
            {
              data: order.items || [],
              enablePagination: false,
              enableRowSelection: false,
              sapStyle: true,
              columns: [
                {
                  id: "materialCode",
                  header: "物料编码",
                  cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: row.original.materialCode || "-" })
                },
                {
                  id: "materialName",
                  header: "物料名称",
                  cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: row.original.materialName || "-" })
                },
                {
                  id: "specification",
                  header: "规格型号",
                  accessorKey: "specification",
                  cell: ({ row }) => row.original.specification || "-"
                },
                { id: "unit", header: "单位", accessorKey: "unit" },
                {
                  id: "quantity",
                  header: "数量",
                  accessorKey: "quantity",
                  cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: row.original.quantity })
                },
                {
                  id: "batchNo",
                  header: "批次号",
                  accessorKey: "batchNo",
                  cell: ({ row }) => row.original.batchNo || "-"
                },
                {
                  id: "locationName",
                  header: "库位",
                  accessorKey: "locationName",
                  cell: ({ row }) => row.original.locationName || "-"
                }
              ]
            }
          )
        ] })
      ]
    }
  );
};
export {
  OutboundDetail as default
};
