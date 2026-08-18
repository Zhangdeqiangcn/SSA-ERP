import { n as useParams, h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { f as useFinanceStore, b as usePurchaseStore, a as useVendorStore, z as calcTaxTotals, t as round2, c as useWarehouseStore } from "./index-CU2cqxc8.js";
import { D as DataTable } from "./DataTable-uFcG_dYG.js";
import { D as DetailSection, O as OperationTimeline } from "./OperationTimeline-C3NNckCu.js";
import { S as StatusBadge } from "./StatusBadge-D4Muac94.js";
import { C as ConfirmDialog } from "./ConfirmDialog-Dv8y0jQp.js";
import { A as ApprovalFlow } from "./ApprovalFlow-DQ4c2KP4.js";
import { F as FlowTracker } from "./FlowTracker-B5McqHb_.js";
import { a as formatDate, f as formatCurrency } from "./format-DXPckS9-.js";
import { P as PrintPreviewButton } from "./PrintPreviewButton-DAktPrxC.js";
import { P as PageWrapper } from "./PageWrapper-CjuAUfYF.js";
import { O as ObjectPage } from "./ObjectPage-BbgABnJn.js";
import { bl as Alert, m as Box, aO as Chip, p as Tooltip, df as ContentCopy, T as Typography, da as LinkOutlined, Q as OpenInNew, aS as Paper, ch as LinearProgress, bY as Grid, n as Divider, bL as Stack, bm as Button, bi as Edit, be as Delete, cK as Share, bZ as ArrowBack, cJ as Snackbar } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./vendor-date-DI3D_gXa.js";
import "./vendor-table-ClDZT4tF.js";
import "./PrintPreview-B9z7TG1v.js";
const buildApprovalNodes = (status) => [
  { id: "n1", role: "创建订单", approver: "admin", status: "approved", time: "2024-05-06 10:00" },
  { id: "n2", role: "发送供应商", approver: "采购员", status: ["sent", "confirmed", "partial", "received", "closed"].includes(status) ? "approved" : "pending", time: ["sent", "confirmed", "partial", "received", "closed"].includes(status) ? "2024-05-06 14:00" : void 0 },
  { id: "n3", role: "供应商确认", approver: "供应商", status: ["confirmed", "partial", "received", "closed"].includes(status) ? "approved" : "waiting", time: ["confirmed", "partial", "received", "closed"].includes(status) ? "2024-05-07 09:00" : void 0 },
  { id: "n4", role: "收货入库", approver: "仓库主管", status: ["received", "closed"].includes(status) ? "approved" : status === "partial" ? "pending" : "waiting", time: ["received", "closed"].includes(status) ? "2024-05-14 15:00" : void 0 },
  { id: "n5", role: "完成关闭", approver: void 0, status: status === "closed" ? "approved" : "waiting" }
];
const statusToFlowNode = {
  created: "po_draft",
  sent: "po_sent",
  confirmed: "po_confirmed",
  partial: "po_receiving",
  received: "po_received",
  closed: "po_closed",
  cancelled: "po_closed"
};
const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices } = useFinanceStore();
  const { purchaseOrders, purchaseRequests, deletePurchaseOrder } = usePurchaseStore();
  const applyVendorCreditDelta = useVendorStore((s) => s.applyVendorCreditDelta);
  const order = purchaseOrders.find((o) => o.id === id);
  const [deleteDialog, setDeleteDialog] = reactExports.useState(false);
  const [snackbar, setSnackbar] = reactExports.useState(false);
  if (!order) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "采购订单详情", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", children: "采购订单不存在，请返回列表重新选择。" }) });
  }
  const relatedRequest = order.requestId ? purchaseRequests.find((r) => r.id === order.requestId) : null;
  const currency = order.currency || "CNY";
  const taxTotals = calcTaxTotals(order.items);
  const orderNetTotal = order.totalAmount ?? taxTotals.totalAmount;
  const orderTaxTotal = order.totalTaxAmount ?? taxTotals.totalTaxAmount;
  const orderGrandTotal = order.grandTotal ?? round2(orderNetTotal + orderTaxTotal);
  const creditTotal = order.creditOccupied ? order.creditAmount ?? orderGrandTotal : 0;
  const creditOutstanding = order.creditOccupied ? Math.max(0, round2(creditTotal - (order.creditReleasedAmount ?? 0))) : 0;
  const { inboundOrders } = useWarehouseStore();
  const relatedInbounds = inboundOrders.filter((o) => o.sourceNo === order.orderNo);
  const receivedQty = relatedInbounds.reduce((s, o) => s + o.items.reduce((a, it) => a + (it.actualQuantity || 0), 0), 0);
  const relatedInvoices = invoices.filter((inv) => inv.purchaseOrderNo === order.orderNo);
  const invoiceTotal = relatedInvoices.reduce((s, inv) => s + (inv.totalAmount || 0), 0);
  const invoiceTaxTotal = relatedInvoices.reduce((s, inv) => s + (inv.taxAmount || 0), 0);
  const orderedQty = order.items.reduce((s, i) => s + i.orderedQuantity, 0);
  const qtyMatch = orderedQty > 0 && receivedQty === orderedQty;
  const amountMatch = Math.abs(invoiceTotal - orderGrandTotal) < 0.01;
  const taxMatch = relatedInvoices.length > 0 && Math.abs(invoiceTaxTotal - orderTaxTotal) < 0.01;
  const hasMatchData = relatedInbounds.length > 0 || relatedInvoices.length > 0;
  const matchStatus = !hasMatchData ? "pending" : qtyMatch && amountMatch ? "matched" : "diff";
  const MATCH_CONFIG = {
    pending: { label: "待处理", color: "#94A3B8" },
    matched: { label: "匹配一致", color: "#10B981" },
    diff: { label: "存在差异", color: "#F59E0B" }
  }[matchStatus];
  const canEdit = ["created"].includes(order.status);
  const handleShare = () => {
    const shareText = `采购订单 ${order.orderNo}
供应商：${order.vendorName}
价税合计：${formatCurrency(orderGrandTotal, currency)}
状态：${order.status}`;
    navigator.clipboard.writeText(shareText).then(() => {
      setSnackbar(true);
    });
  };
  const basicFields = [
    {
      label: "订单号",
      value: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: order.orderNo, size: "small", sx: { fontFamily: "monospace", bgcolor: "#EFF6FF", color: "#1D4ED8" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "复制", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ContentCopy, { sx: { fontSize: 14, color: "#94A3B8", cursor: "pointer" }, onClick: () => navigator.clipboard.writeText(order.orderNo) }) })
      ] })
    },
    { label: "供应商", value: order.vendorName },
    { label: "联系人", value: order.contact || "-" },
    { label: "联系电话", value: order.phone || "-" },
    { label: "订单状态", value: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: order.status }) },
    { label: "下单日期", value: formatDate(order.orderDate) },
    { label: "预计交货", value: formatDate(order.expectedDeliveryDate) },
    { label: "实际交货", value: order.actualDeliveryDate ? formatDate(order.actualDeliveryDate) : "-" },
    { label: "付款条款", value: order.paymentTerms || "-" },
    { label: "贸易条件", value: order.tradeTerms || "-" },
    { label: "币种", value: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: currency, size: "small", sx: { fontFamily: "monospace", bgcolor: "#F1F5F9", color: "#334155" } }) },
    { label: "价格类型", value: order.taxIncluded ? "含税价" : "未税价" },
    { label: "未税总额", value: formatCurrency(orderNetTotal, currency) },
    { label: "税额合计", value: formatCurrency(orderTaxTotal, currency) },
    { label: "价税合计", value: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { color: "#1D4ED8" }, children: formatCurrency(orderGrandTotal, currency) }) },
    {
      label: "信用占用",
      value: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "po-credit-status", children: order.creditOccupied ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "已占用", size: "small", color: "warning", sx: { mr: 1 } }),
        formatCurrency(creditOutstanding, currency),
        (order.creditReleasedAmount ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "#64748B", marginLeft: 6 }, children: [
          "（已释放 ",
          formatCurrency(order.creditReleasedAmount ?? 0, currency),
          "）"
        ] })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "未占用 / 已释放", size: "small", sx: { bgcolor: "#F1F5F9", color: "#334155" } }) })
    },
    { label: "收货地址", value: order.deliveryAddress || "-" },
    { label: "关联项目", value: order.projectName ? `${order.projectNo} - ${order.projectName}` : "-" },
    { label: "备注", value: order.remarks || "-" },
    { label: "创建人", value: order.createdBy },
    { label: "创建时间", value: formatDate(order.createdAt) }
  ];
  const totalOrdered = order.items.reduce((s, i) => s + i.orderedQuantity, 0);
  const totalDelivered = order.items.reduce((s, i) => s + i.deliveredQuantity, 0);
  const deliveryProgress = totalOrdered > 0 ? Math.round(totalDelivered / totalOrdered * 100) : 0;
  const approvalNodes = buildApprovalNodes(order.status);
  const operationLogs = [
    { id: "op-1", action: "info", operator: order.createdBy, time: order.createdAt, description: "创建采购订单" },
    ...order.status !== "created" ? [{ id: "op-2", action: "approve", operator: "采购员", time: order.updatedAt, description: `订单已发送至供应商 ${order.vendorName}` }] : [],
    ...["confirmed", "partial", "received", "closed"].includes(order.status) ? [{ id: "op-3", action: "approve", operator: order.vendorName || "供应商", time: order.updatedAt, description: "供应商已确认订单" }] : [],
    ...["partial", "received", "closed"].includes(order.status) ? [{ id: "op-4", action: "approve", operator: "仓库主管", time: order.actualDeliveryDate || order.updatedAt, description: `收货入库，进度：${deliveryProgress}%` }] : []
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ObjectPage,
      {
        title: order.orderNo,
        subtitle: order.vendorName,
        breadcrumbs: [{ label: "采购订单", path: "/purchase/orders" }],
        status: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: order.status }),
        headerFields: [
          { label: "供应商", value: order.vendorName },
          { label: "订单状态", value: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: order.status }) },
          { label: "下单日期", value: formatDate(order.orderDate) },
          { label: "预计交货", value: formatDate(order.expectedDeliveryDate) },
          { label: "未税总额", value: formatCurrency(orderNetTotal, currency) },
          { label: "价税合计", value: formatCurrency(orderGrandTotal, currency) }
        ],
        actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "purchase-order", currentStatus: statusToFlowNode[order.status] || "po_draft", documentNo: order.orderNo }),
          canEdit && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "outlined",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, {}),
              onClick: () => navigate(`/purchase/orders/${id}/edit`),
              children: "修改"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "outlined",
              color: "error",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, {}),
              onClick: () => setDeleteDialog(true),
              children: "删除"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "outlined",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Share, {}),
              onClick: handleShare,
              children: "分享"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "outlined",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}),
              onClick: () => navigate("/purchase/orders"),
              children: "返回"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            PrintPreviewButton,
            {
              entity: "purchaseOrder",
              record: {
                ...order,
                items: order.items.map((i) => ({
                  materialCode: i.materialCode,
                  materialName: i.materialName,
                  specification: i.specification,
                  unit: i.unit,
                  quantity: i.orderedQuantity,
                  unitPrice: i.unitPrice,
                  amount: i.amount
                }))
              },
              showBoth: true
            }
          )
        ] }),
        sections: [
          {
            id: "links",
            title: "单据流转关联",
            content: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2, bgcolor: "#F0F9FF", borderRadius: 2, border: "1px solid #BAE6FD" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { color: "#0369A1", fontWeight: 600, display: "block", mb: 1 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(LinkOutlined, { sx: { fontSize: 14, mr: 0.5, verticalAlign: "middle" } }),
                "单据流转关联"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 1, flexWrap: "wrap" }, children: [
                relatedRequest && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Chip,
                  {
                    label: `📋 采购申请 (${relatedRequest.requestNo})`,
                    size: "small",
                    variant: "filled",
                    color: "primary",
                    onClick: () => navigate(`/purchase/${relatedRequest.id}`),
                    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(OpenInNew, { sx: { fontSize: "14px !important" } }),
                    sx: { cursor: "pointer", fontSize: "0.8rem" }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Chip,
                  {
                    label: `🏭 入库单`,
                    size: "small",
                    variant: "outlined",
                    onClick: () => navigate("/warehouse/inbound"),
                    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(OpenInNew, { sx: { fontSize: "14px !important" } }),
                    sx: { cursor: "pointer", fontSize: "0.8rem" }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Chip,
                  {
                    label: `💰 付款计划`,
                    size: "small",
                    variant: "outlined",
                    onClick: () => navigate("/finance/payments"),
                    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(OpenInNew, { sx: { fontSize: "14px !important" } }),
                    sx: { cursor: "pointer", fontSize: "0.8rem" }
                  }
                )
              ] })
            ] })
          },
          {
            id: "approval",
            title: "审批流程",
            content: /* @__PURE__ */ jsxRuntimeExports.jsx(ApprovalFlow, { nodes: approvalNodes })
          },
          {
            id: "basic",
            title: "基本信息",
            content: /* @__PURE__ */ jsxRuntimeExports.jsx(DetailSection, { fields: basicFields })
          },
          {
            id: "delivery",
            title: "收货进度",
            content: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { elevation: 0, sx: { border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "收货进度" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                  "已收 ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: totalDelivered }),
                  " / 订购 ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: totalOrdered }),
                  " (",
                  deliveryProgress,
                  "%)"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                LinearProgress,
                {
                  variant: "determinate",
                  value: deliveryProgress,
                  color: deliveryProgress === 100 ? "success" : "primary",
                  sx: { height: 8, borderRadius: 4 }
                }
              )
            ] })
          },
          {
            id: "match",
            title: "三单匹配",
            content: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { elevation: 0, sx: { border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "三单匹配（采购订单 / 收货 / 发票）" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: MATCH_CONFIG.label, size: "small", sx: { bgcolor: MATCH_CONFIG.color + "15", color: MATCH_CONFIG.color, fontWeight: 600 } })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 4, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "采购订单（价税合计）" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, "data-testid": "twm-po-grand", children: formatCurrency(orderGrandTotal, currency) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                    "未税 ",
                    formatCurrency(orderNetTotal, currency),
                    " · 税额 ",
                    formatCurrency(orderTaxTotal, currency),
                    " · 订购 ",
                    orderedQty,
                    " 件"
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 4, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "收货入库" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 600, children: [
                    receivedQty,
                    " 件"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: qtyMatch ? "success.main" : "text.secondary", children: [
                    "数量",
                    qtyMatch ? "一致 ✓" : "差异 ✗"
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 4, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "发票（价税合计）" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, "data-testid": "twm-invoice-total", children: formatCurrency(invoiceTotal, currency) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: amountMatch ? "success.main" : "text.secondary", display: "block", children: [
                    "金额",
                    amountMatch ? "一致 ✓" : "差异 ✗"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: taxMatch ? "success.main" : "text.secondary", children: [
                    "进项税 ",
                    formatCurrency(invoiceTaxTotal, currency),
                    relatedInvoices.length > 0 ? taxMatch ? " 一致 ✓" : " 差异 ✗" : ""
                  ] })
                ] })
              ] }),
              relatedInvoices.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mt: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                "关联发票：",
                relatedInvoices.map((i) => i.invoiceNo).join("、"),
                !taxMatch && `（订单预估进项税 ${formatCurrency(orderTaxTotal, currency)}，发票实际 ${formatCurrency(invoiceTaxTotal, currency)}，差额 ${formatCurrency(round2(invoiceTaxTotal - orderTaxTotal), currency)}）`
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: matchStatus === "matched" ? "success" : matchStatus === "diff" ? "warning" : "info", sx: { mt: 1.5, py: 0 }, children: matchStatus === "matched" ? "采购订单、收货数量与发票金额一致，可进入付款流程。" : matchStatus === "diff" ? "存在数量或金额差异，请核对收货单与发票后再付款。" : "尚未关联收货单或发票，三单匹配待处理。" })
            ] })
          },
          {
            id: "items",
            title: "物料明细",
            content: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { elevation: 0, sx: { border: "1px solid", borderColor: "divider", borderRadius: 2 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "订单物料明细" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                  "价税合计：",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { color: "#1D4ED8" }, children: formatCurrency(orderGrandTotal, currency) })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                DataTable,
                {
                  data: order.items,
                  enablePagination: false,
                  enableRowSelection: false,
                  sapStyle: true,
                  columns: [
                    {
                      id: "materialCode",
                      header: "物料编码",
                      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Chip,
                        {
                          label: row.original.materialCode,
                          size: "small",
                          sx: { fontSize: "0.75rem", bgcolor: "#EFF6FF", color: "#1D4ED8", fontFamily: "monospace" }
                        }
                      )
                    },
                    {
                      id: "materialName",
                      header: "物料名称",
                      accessorKey: "materialName",
                      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { fontWeight: 500 }, children: row.original.materialName })
                    },
                    {
                      id: "specification",
                      header: "规格型号",
                      accessorKey: "specification",
                      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color: "#64748B", fontSize: "0.8125rem" }, children: row.original.specification })
                    },
                    {
                      id: "unit",
                      header: "单位",
                      accessorKey: "unit",
                      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "center" }, children: row.original.unit })
                    },
                    {
                      id: "orderedQuantity",
                      header: "订购数量",
                      accessorKey: "orderedQuantity",
                      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right", fontWeight: 500 }, children: row.original.orderedQuantity.toLocaleString() })
                    },
                    {
                      id: "deliveredQuantity",
                      header: "已收数量",
                      accessorKey: "deliveredQuantity",
                      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: row.original.deliveredQuantity === row.original.orderedQuantity ? "success.main" : "text.primary", children: row.original.deliveredQuantity.toLocaleString() }) })
                    },
                    {
                      id: "unitPrice",
                      header: "未税单价",
                      accessorKey: "unitPrice",
                      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: formatCurrency(row.original.unitPrice, currency) })
                    },
                    {
                      id: "amount",
                      header: "未税金额",
                      accessorKey: "amount",
                      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right", fontWeight: 500 }, children: formatCurrency(row.original.amount, currency) })
                    },
                    {
                      id: "taxRate",
                      header: "税率",
                      cell: ({ row }) => {
                        const lineRate = row.original.taxRate ?? 13;
                        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { textAlign: "right", color: "#64748B" }, children: [
                          lineRate,
                          "%"
                        ] });
                      }
                    },
                    {
                      id: "taxAmount",
                      header: "税额",
                      cell: ({ row }) => {
                        const lineRate = row.original.taxRate ?? 13;
                        const lineTax = row.original.taxAmount ?? round2(row.original.amount * lineRate / 100);
                        return /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right", color: "#64748B" }, children: formatCurrency(lineTax, currency) });
                      }
                    },
                    {
                      id: "amountWithTax",
                      header: "价税合计",
                      cell: ({ row }) => {
                        const lineRate = row.original.taxRate ?? 13;
                        const lineTax = row.original.taxAmount ?? round2(row.original.amount * lineRate / 100);
                        const lineGrand = row.original.amountWithTax ?? round2(row.original.amount + lineTax);
                        return /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right", fontWeight: 600, color: "#1D4ED8" }, children: formatCurrency(lineGrand, currency) });
                      }
                    },
                    {
                      id: "deliveryProgress",
                      header: "收货进度",
                      enableSorting: false,
                      cell: ({ row }) => {
                        const progress = row.original.orderedQuantity > 0 ? Math.round(row.original.deliveredQuantity / row.original.orderedQuantity * 100) : 0;
                        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5 }, children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            LinearProgress,
                            {
                              variant: "determinate",
                              value: progress,
                              color: progress === 100 ? "success" : "primary",
                              sx: { flex: 1, height: 6, borderRadius: 3 }
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { minWidth: 32, textAlign: "right" }, children: [
                            progress,
                            "%"
                          ] })
                        ] });
                      }
                    }
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { px: 2, py: 1, display: "flex", justifyContent: "flex-end" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 0.25, sx: { textAlign: "right" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                  "未税总额：",
                  formatCurrency(orderNetTotal, currency)
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                  "税额合计：",
                  formatCurrency(orderTaxTotal, currency)
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 600, "data-testid": "po-detail-grand-total", children: [
                  "价税合计：",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#1D4ED8", fontSize: "1.05rem" }, children: formatCurrency(orderGrandTotal, currency) })
                ] })
              ] }) })
            ] })
          },
          {
            id: "logs",
            title: "操作历史",
            content: /* @__PURE__ */ jsxRuntimeExports.jsx(OperationTimeline, { events: operationLogs })
          }
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        open: deleteDialog,
        title: "确认删除订单",
        content: creditOutstanding > 0 ? `确定要删除采购订单 "${order.orderNo}" 吗？删除后将释放供应商已占用的信用额度 ${formatCurrency(creditOutstanding, currency)}。此操作不可逆。` : `确定要删除采购订单 "${order.orderNo}" 吗？此操作不可逆。`,
        onConfirm: () => {
          if (creditOutstanding > 0) {
            applyVendorCreditDelta(order.vendorId, -creditOutstanding);
          }
          deletePurchaseOrder(order.id);
          setDeleteDialog(false);
          navigate("/purchase/orders");
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
        autoHideDuration: 2e3,
        onClose: () => setSnackbar(false),
        message: "订单信息已复制到剪贴板"
      }
    )
  ] });
};
export {
  OrderDetail as default
};
