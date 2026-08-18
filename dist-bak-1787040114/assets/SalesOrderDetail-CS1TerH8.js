import { cJ as useParams, aG as useNavigate, r as reactExports, j as jsxRuntimeExports, bj as Alert, B as Box, aL as Chip, k as Tooltip, dx as ContentCopy, h as Typography, dr as LinkOutlined, O as OpenInNew, aP as Paper, i as Divider, bk as Button, bK as Stack, bg as Edit, a7 as AccountTree, bc as Delete, c_ as Share, bY as ArrowBack, cU as Snackbar } from "./vendor-DGU5TO-x.js";
import { e as useSalesStore } from "./index-DeeqqmHA.js";
import { D as DataTable } from "./DataTable-ct0NJFvm.js";
import { D as DetailSection, O as OperationTimeline } from "./OperationTimeline-D4JWfy3I.js";
import { S as StatusBadge } from "./StatusBadge-DeJuhK-R.js";
import { C as ConfirmDialog } from "./ConfirmDialog-DFiLXnKl.js";
import { A as ApprovalFlow } from "./ApprovalFlow-COmiS74n.js";
import { F as FlowTracker } from "./FlowTracker-CCA6kX6w.js";
import { a as formatDate, f as formatCurrency } from "./format-DnEevvSX.js";
import { A as AttachmentUploader } from "./AttachmentUploader-CBb4exdh.js";
import { P as PrintPreviewButton } from "./PrintPreviewButton-DI_LQm8R.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import { O as ObjectPage } from "./ObjectPage-R9WHJvce.js";
import { u as useCustomerStore } from "./customerStore-D75PJy1n.js";
import { u as useBOMStore } from "./bomStore-CxaOFNQN.js";
import "./FileUpload-CMrbNP90.js";
import "./PrintPreview-cCBr3GzP.js";
const statusToFlowNode = {
  draft: "so_draft",
  confirmed: "so_confirmed",
  in_production: "so_production",
  partial_shipped: "so_shipping",
  fully_shipped: "so_shipped",
  completed: "so_completed",
  cancelled: "so_completed"
};
const buildApprovalNodes = (status) => [
  { id: "n1", role: "销售员提交", approver: "陈伟", status: "approved", time: "2024-06-10 09:00" },
  { id: "n2", role: "销售总监审批", approver: "李明", status: ["confirmed", "in_production", "partial_shipped", "fully_shipped", "completed"].includes(status) ? "approved" : "pending", time: ["confirmed", "in_production", "partial_shipped", "fully_shipped", "completed"].includes(status) ? "2024-06-10 14:00" : void 0, comment: "确认合同条款，同意" },
  { id: "n3", role: "财务确认", approver: "财务部", status: ["in_production", "partial_shipped", "fully_shipped", "completed"].includes(status) ? "approved" : "waiting", time: ["in_production", "partial_shipped", "fully_shipped", "completed"].includes(status) ? "2024-06-11 10:00" : void 0 },
  { id: "n4", role: "生产排期", approver: "生产部", status: ["partial_shipped", "fully_shipped", "completed"].includes(status) ? "approved" : status === "in_production" ? "pending" : "waiting" },
  { id: "n5", role: "完成", approver: void 0, status: status === "completed" ? "approved" : "waiting" }
];
const SalesOrderDetail = () => {
  var _a, _b, _c;
  const { id } = useParams();
  const navigate = useNavigate();
  const salesOrders = useSalesStore((s) => s.salesOrders);
  const { bomList, addBOM } = useBOMStore();
  const { deleteSalesOrder } = useSalesStore();
  const order = salesOrders.find((o) => o.id === id);
  const customer = useCustomerStore((s) => (order == null ? void 0 : order.customerId) ? s.customers.find((c) => c.id === order.customerId) : void 0);
  const applyCreditDelta = useCustomerStore((s) => s.applyCreditDelta);
  const [deleteDialog, setDeleteDialog] = reactExports.useState(false);
  const [snackbar, setSnackbar] = reactExports.useState(false);
  if (!order) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "销售订单详情", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", children: "销售订单不存在，请返回列表重新选择。" }) });
  }
  const soCreditOutstanding = order.creditOccupied ? order.creditAmount ?? order.grandTotal ?? 0 : order.status !== "draft" && order.status !== "cancelled" && order.customerId ? order.grandTotal ?? 0 : 0;
  const canEdit = ["draft"].includes(order.status);
  const canShip = ["in_production", "partial_shipped", "fully_shipped", "completed"].includes(order.status);
  const handleShare = () => {
    const shareText = `销售订单 ${order.orderNo}
客户：${order.customerName}
金额：${formatCurrency(order.grandTotal)}
状态：${order.status}`;
    navigator.clipboard.writeText(shareText).then(() => setSnackbar(true));
  };
  const handleCreateBOM = () => {
    var _a2;
    const existingBOM = bomList.find((b) => b.sourceOrderNo === order.orderNo);
    if (existingBOM) {
      alert(`已存在BOM（${existingBOM.bomNo}），将跳转到编辑页面`);
      navigate(`/bom/${existingBOM.id}/edit`);
      return;
    }
    const firstItem = (_a2 = order.items) == null ? void 0 : _a2[0];
    if (!firstItem) {
      alert("销售订单中没有物料明细，无法创建BOM");
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const seq = String(Date.now()).slice(-6);
    const bomId = `bom-so-${Date.now()}`;
    const bomNo = `BOM-${seq}`;
    const productName = firstItem.materialName || order.customerName + "产品";
    const productCode = firstItem.materialCode || `PRD-${seq}`;
    addBOM({
      id: bomId,
      bomNo,
      name: `${productName} EBOM`,
      type: "EBOM",
      status: "draft",
      productId: firstItem.materialId,
      productCode,
      productName,
      version: "V1.0",
      effectiveDate: now.split("T")[0],
      currency: "CNY",
      description: `从销售订单 ${order.orderNo} 创建`,
      sourceOrderNo: order.orderNo,
      createdAt: now,
      updatedAt: now,
      items: [{
        id: `bomi-so-0`,
        bomId,
        level: 0,
        sequence: 1,
        materialId: firstItem.materialId,
        materialCode: productCode,
        materialName: productName,
        materialSpec: firstItem.specification || "",
        unit: firstItem.unit || "件",
        quantity: 1,
        scrapRate: 0,
        unitCost: firstItem.unitPrice || 0,
        totalCost: firstItem.amount || 0,
        leadTime: 7,
        source: "manufacture",
        isCritical: true
      }]
    });
    navigate(`/bom/${bomId}/edit`);
  };
  const basicFields = [
    {
      label: "订单号",
      value: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: order.orderNo, size: "small", sx: { fontFamily: "monospace", bgcolor: "#F0FDF4", color: "#16A34A" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "复制", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ContentCopy, { sx: { fontSize: 14, color: "#94A3B8", cursor: "pointer" }, onClick: () => navigator.clipboard.writeText(order.orderNo) }) })
      ] })
    },
    { label: "订单类型", value: { standard: "标准订单", sample: "样品订单", maintenance: "维修订单" }[order.type] },
    { label: "状态", value: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: order.status }) },
    { label: "客户名称", value: customer ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Typography,
      {
        component: "button",
        variant: "body2",
        onClick: () => navigate(`/sales/customers/${customer.id}`),
        sx: { background: "none", border: "none", color: "#3B82F6", cursor: "pointer", p: 0, textAlign: "left" },
        children: [
          order.customerName,
          " ↗"
        ]
      }
    ) : order.customerName },
    { label: "客户代码", value: order.customerCode || "-" },
    { label: "联系人", value: order.contactName || "-" },
    { label: "联系电话", value: order.contactPhone || "-" },
    { label: "关联项目", value: order.projectName ? `${order.projectNo} - ${order.projectName}` : "-" },
    { label: "关联合同", value: order.contractNo ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Typography,
      {
        component: "button",
        variant: "body2",
        onClick: () => navigate(`/sales/contracts/${order.contractId}`),
        sx: { background: "none", border: "none", color: "#3B82F6", cursor: "pointer", p: 0, textAlign: "left" },
        children: [
          order.contractNo,
          " ↗"
        ]
      }
    ) : "-" },
    { label: "销售员", value: order.salesPerson },
    { label: "下单日期", value: formatDate(order.orderDate) },
    { label: "预计交货", value: formatDate(order.expectedDeliveryDate) },
    { label: "实际交货", value: order.actualDeliveryDate ? formatDate(order.actualDeliveryDate) : "-" },
    { label: "付款条款", value: order.paymentTerms || "-" },
    { label: "贸易条款", value: order.tradeTerms || "-" },
    { label: "质量标准", value: order.qualityStandard || "-" },
    { label: "收货地址", value: order.deliveryAddress || "-" },
    { label: "发货方式", value: (() => {
      if (order.shippingMode === "direct_ship") return `直接发运（${order.directShipVendorName || order.directShipVendorId || "—"}）`;
      if (order.shippingMode === "third_party") return `三方销售（${order.thirdPartyCompanyName || "—"}）`;
      return order.shippingMode === "standard" ? "标准发货" : order.shippingMode || "标准发货";
    })() },
    { label: "送达方地址", value: order.shipToAddress || "-" },
    { label: "备注", value: order.remarks || "-" },
    { label: "创建时间", value: formatDate(order.createdAt) }
  ];
  const approvalNodes = buildApprovalNodes(order.status);
  const operationLogs = [
    { id: "op-1", action: "info", operator: order.createdBy, time: order.createdAt, description: "创建销售订单" },
    ...((_a = order.approvalRecords) == null ? void 0 : _a.map((r, i) => ({
      id: `op-apr-${i}`,
      action: r.action === "approve" ? "approve" : "reject",
      operator: r.approver,
      time: r.operatedAt,
      description: `${r.nodeName}：${r.action === "approve" ? "审批通过" : "拒绝"}${r.comments ? " - " + r.comments : ""}`
    }))) || []
  ];
  const linksBlock = /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2, bgcolor: "#F0FDF4", borderRadius: 2, border: "1px solid #86EFAC" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { color: "#15803D", fontWeight: 600, display: "block", mb: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LinkOutlined, { sx: { fontSize: 14, mr: 0.5 } }),
      "单据流转关联"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 1, flexWrap: "wrap" }, children: [
      (_b = order.linkedWorkOrders) == null ? void 0 : _b.map((wo) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: `🏭 生产工单 (${wo.workOrderNo})`,
          size: "small",
          variant: "filled",
          color: "primary",
          onClick: () => navigate(`/production/orders/${wo.workOrderId}`),
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(OpenInNew, { sx: { fontSize: "14px !important" } }),
          sx: { cursor: "pointer", fontSize: "0.8rem" }
        },
        wo.workOrderId
      )),
      order.contractId && /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: `📄 销售合同 (${order.contractNo})`,
          size: "small",
          variant: "outlined",
          color: "secondary",
          onClick: () => navigate(`/sales/contracts/${order.contractId}`),
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(OpenInNew, { sx: { fontSize: "14px !important" } }),
          sx: { cursor: "pointer", fontSize: "0.8rem" }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: `🚚 物流发货`,
          size: "small",
          variant: canShip ? "filled" : "outlined",
          color: canShip ? "success" : "default",
          onClick: () => navigate("/sales/logistics"),
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(OpenInNew, { sx: { fontSize: "14px !important" } }),
          sx: { cursor: "pointer", fontSize: "0.8rem" }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: `💰 开票结算`,
          size: "small",
          variant: "outlined",
          onClick: () => navigate("/finance/invoices"),
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(OpenInNew, { sx: { fontSize: "14px !important" } }),
          sx: { cursor: "pointer", fontSize: "0.8rem" }
        }
      )
    ] })
  ] });
  const amountBlock = /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { elevation: 0, sx: { border: "1px solid rgba(226,232,240,.8)", borderRadius: 2, p: 2 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, sx: { mb: 1.5 }, children: "金额汇总" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 4 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "货款合计" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 700, color: "primary", children: formatCurrency(order.totalAmount) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
          "税额 (",
          order.taxRate,
          "%)"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 700, color: "warning.main", children: formatCurrency(order.taxAmount) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "价税合计" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 700, color: "success.main", children: formatCurrency(order.grandTotal) })
      ] })
    ] })
  ] });
  const attachmentsBlock = /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { elevation: 0, sx: { border: "1px solid rgba(226,232,240,.8)", borderRadius: 2, p: 2 }, children: order.attachments && order.attachments.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    AttachmentUploader,
    {
      label: "附件（合同 / 技术协议 / 图纸）",
      value: order.attachments,
      onChange: () => {
      },
      hint: "详情页仅展示附件，编辑请点击「修改」进入表单。"
    }
  ) : /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "暂无附件" }) });
  const itemsBlock = /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { elevation: 0, sx: { border: "1px solid rgba(226,232,240,.8)", borderRadius: 2 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { px: 2, py: 1.5, borderBottom: "1px solid rgba(226,232,240,.6)", display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "订单物料明细" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
        "共 ",
        order.items.length,
        " 项（支持排序/筛选/Ctrl+Y 块选复制）"
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
                sx: { fontSize: "0.75rem", bgcolor: "#F0FDF4", color: "#16A34A", fontFamily: "monospace" }
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
            id: "quantity",
            header: "数量",
            accessorKey: "quantity",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right", fontWeight: 500 }, children: row.original.quantity.toLocaleString() })
          },
          {
            id: "unitPrice",
            header: "单价",
            accessorKey: "unitPrice",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: formatCurrency(row.original.unitPrice) })
          },
          {
            id: "amount",
            header: "金额",
            accessorKey: "amount",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right", fontWeight: 600, color: "#16A34A" }, children: formatCurrency(row.original.amount) })
          },
          {
            id: "deliveryDate",
            header: "交货日期",
            accessorKey: "deliveryDate",
            cell: ({ row }) => row.original.deliveryDate ? formatDate(row.original.deliveryDate) : "-"
          }
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { px: 2, py: 1, display: "flex", justifyContent: "flex-end", gap: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
        "货款：",
        formatCurrency(order.totalAmount)
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
        "税额：",
        formatCurrency(order.taxAmount)
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 700, children: [
        "价税合计：",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#16A34A", fontSize: "1.05rem" }, children: formatCurrency(order.grandTotal) })
      ] })
    ] })
  ] });
  const workordersBlock = ((_c = order.linkedWorkOrders) == null ? void 0 : _c.length) > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { elevation: 0, sx: { border: "1px solid rgba(226,232,240,.8)", borderRadius: 2 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { px: 2, py: 1.5, borderBottom: "1px solid rgba(226,232,240,.6)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "关联生产工单" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DataTable,
      {
        data: order.linkedWorkOrders.map((wo) => ({ ...wo, id: wo.workOrderId })),
        enablePagination: false,
        enableRowSelection: false,
        sapStyle: true,
        columns: [
          {
            id: "workOrderNo",
            header: "工单号",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: row.original.workOrderNo,
                size: "small",
                sx: { fontFamily: "monospace", bgcolor: "#EFF6FF", color: "#1D4ED8" }
              }
            )
          },
          { id: "productName", header: "产品名称", accessorKey: "productName" },
          {
            id: "quantity",
            header: "数量",
            accessorKey: "quantity",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: row.original.quantity })
          },
          {
            id: "status",
            header: "状态",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: row.original.status })
          },
          {
            id: "actions",
            header: "操作",
            enableSorting: false,
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "small",
                variant: "text",
                startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(OpenInNew, {}),
                onClick: () => navigate(`/production/orders/${row.original.workOrderId}`),
                children: "查看工单"
              }
            )
          }
        ]
      }
    )
  ] }) : null;
  const logsBlock = operationLogs.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, sx: { mb: 1 }, children: "操作历史" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(OperationTimeline, { events: operationLogs })
  ] }) : null;
  const customerBlock = customer ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "客户主数据" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size: "small",
          variant: "text",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(OpenInNew, {}),
          onClick: () => navigate(`/sales/customers/${customer.id}`),
          children: "查看客户档案"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DetailSection,
      {
        fields: [
          { label: "客户编码", value: customer.code },
          { label: "信用等级", value: customer.creditLevel || "-" },
          { label: "授信额度", value: customer.creditLimit != null ? formatCurrency(customer.creditLimit) : "未授信" },
          { label: "已用信用", value: formatCurrency(customer.usedCredit || 0) },
          { label: "可用信用", value: customer.creditLimit != null ? formatCurrency(Math.max(0, (customer.creditLimit || 0) - (customer.usedCredit || 0))) : "-" },
          { label: "账期", value: customer.settlementTermDays != null ? `${customer.settlementTermDays} 天` : "-" },
          { label: "纳税人识别号", value: customer.taxId || "-" },
          { label: "发票抬头", value: customer.invoiceTitle || "-" },
          { label: "开户银行", value: customer.bankName || "-" },
          { label: "银行账号", value: customer.bankAccount || "-" }
        ],
        columns: 2
      }
    )
  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", children: "本订单尚未关联客户主数据（历史订单）。新建/编辑订单并选择客户即可建立关联。" });
  const sections = [
    { id: "links", title: "单据流转", content: linksBlock },
    { id: "approval", title: "审批流程", content: /* @__PURE__ */ jsxRuntimeExports.jsx(ApprovalFlow, { nodes: approvalNodes }) },
    { id: "basic", title: "基本信息", content: /* @__PURE__ */ jsxRuntimeExports.jsx(DetailSection, { fields: basicFields }) },
    { id: "customer", title: "客户主数据", content: customerBlock },
    { id: "amount", title: "金额汇总", content: amountBlock },
    { id: "items", title: "物料明细", content: itemsBlock },
    { id: "attachments", title: "附件", content: attachmentsBlock },
    ...workordersBlock ? [{ id: "workorders", title: "关联生产工单", content: workordersBlock }] : [],
    ...logsBlock ? [{ id: "logs", title: "操作历史", content: logsBlock }] : []
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ObjectPage,
      {
        title: order.orderNo,
        subtitle: order.customerName,
        breadcrumbs: [{ label: "销售订单列表", path: "/sales/orders" }],
        status: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: order.status }),
        headerFields: [
          { label: "客户", value: order.customerName },
          { label: "价税合计", value: formatCurrency(order.grandTotal) },
          { label: "下单日期", value: formatDate(order.orderDate) },
          { label: "预计交货", value: formatDate(order.expectedDeliveryDate) },
          { label: "销售员", value: order.salesPerson }
        ],
        actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "sales-order", currentStatus: statusToFlowNode[order.status] || "so_draft", documentNo: order.orderNo }),
          canEdit && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "outlined",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, {}),
              onClick: () => navigate(`/sales/orders/${id}/edit`),
              children: "修改"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "contained",
              color: "primary",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(AccountTree, {}),
              onClick: handleCreateBOM,
              children: "创建BOM"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            PrintPreviewButton,
            {
              entity: "salesOrder",
              record: {
                orderNo: order.orderNo,
                customerName: order.customerName,
                customerCode: order.customerCode,
                orderDate: order.orderDate,
                expectedDeliveryDate: order.expectedDeliveryDate,
                paymentTerms: order.paymentTerms,
                tradeTerms: order.tradeTerms,
                qualityStandard: order.qualityStandard,
                salesPerson: order.salesPerson,
                projectName: order.projectName,
                grandTotal: order.grandTotal,
                remarks: order.remarks,
                items: (order.items || []).map((it) => ({
                  materialCode: it.materialCode,
                  materialName: it.materialName,
                  specification: it.specification,
                  unit: it.unit,
                  quantity: it.quantity,
                  unitPrice: it.unitPrice,
                  amount: it.amount,
                  deliveryDate: it.deliveryDate
                }))
              },
              showBoth: true
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
              onClick: () => navigate("/sales/orders"),
              children: "返回"
            }
          )
        ] }),
        sections
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        open: deleteDialog,
        title: "确认删除订单",
        content: soCreditOutstanding > 0 ? `确定要删除销售订单 "${order.orderNo}" 吗？删除后将释放客户已占用的信用额度 ${formatCurrency(soCreditOutstanding)}。此操作不可逆。` : `确定要删除销售订单 "${order.orderNo}" 吗？此操作不可逆。`,
        onConfirm: () => {
          if (soCreditOutstanding > 0 && order.customerId) {
            applyCreditDelta(order.customerId, -soCreditOutstanding);
          }
          deleteSalesOrder(order.id);
          navigate("/sales/orders");
          setDeleteDialog(false);
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
  SalesOrderDetail as default
};
