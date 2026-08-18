import { cJ as useParams, aG as useNavigate, r as reactExports, j as jsxRuntimeExports, B as Box, aL as Chip, bK as Stack, cl as LinearProgress, bj as Alert, h as Typography, aU as Link, c_ as Share, cU as Snackbar } from "./vendor-DGU5TO-x.js";
import { e as useSalesStore } from "./index-DeeqqmHA.js";
import { S as StatusBadge } from "./StatusBadge-DeJuhK-R.js";
import { D as DetailSection, O as OperationTimeline } from "./OperationTimeline-D4JWfy3I.js";
import { C as ConfirmDialog } from "./ConfirmDialog-DFiLXnKl.js";
import { f as formatCurrency } from "./format-DnEevvSX.js";
import { D as DetailActions } from "./DetailActions-BM4l2p_l.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import { O as ObjectPage } from "./ObjectPage-R9WHJvce.js";
import { u as useCustomerStore } from "./customerStore-D75PJy1n.js";
import { d as CUSTOMER_TYPE_OPTIONS, e as CUSTOMER_STATUS_OPTIONS } from "./options-BINuI5Gr.js";
import "./PrintPreviewButton-DI_LQm8R.js";
import "./PrintPreview-cCBr3GzP.js";
const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const customer = useCustomerStore((s) => s.customers.find((c) => c.id === id));
  const deleteCustomer = useCustomerStore((s) => s.deleteCustomer);
  const salesOrders = useSalesStore((s) => s.salesOrders);
  const [deleteDialog, setDeleteDialog] = reactExports.useState(false);
  const [snackbar, setSnackbar] = reactExports.useState(false);
  const linkedOrders = reactExports.useMemo(
    () => customer ? salesOrders.filter((o) => o.customerId === customer.id) : [],
    [salesOrders, customer]
  );
  const linkedAmount = reactExports.useMemo(
    () => linkedOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0),
    [linkedOrders]
  );
  if (!customer) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "客户详情", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: "客户不存在" }) });
  }
  const limit = customer.creditLimit;
  const used = customer.usedCredit || 0;
  const available = limit != null ? Math.max(0, limit - used) : void 0;
  const ratio = limit != null && limit > 0 ? used / limit : 0;
  const over = limit != null && (used > limit || ratio >= 0.9);
  const typeMap = Object.fromEntries(CUSTOMER_TYPE_OPTIONS.map((o) => [o.value, o.label]));
  Object.fromEntries(CUSTOMER_STATUS_OPTIONS.map((o) => [o.value, o.label]));
  const basicFields = [
    { label: "客户编码", value: customer.code },
    { label: "客户名称", value: customer.name },
    { label: "简称", value: customer.shortName || "-" },
    { label: "类型", value: typeMap[customer.type] },
    { label: "状态", value: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: customer.status }) },
    { label: "信用等级", value: customer.creditLevel || "-" },
    { label: "账期", value: customer.settlementTermDays != null ? `${customer.settlementTermDays} 天` : "-" },
    { label: "联系人", value: customer.contactName || "-" },
    { label: "联系电话", value: customer.contactPhone || "-" },
    { label: "邮箱", value: customer.contactEmail || "-" },
    { label: "地址", value: customer.address || "-" },
    { label: "默认币种", value: customer.defaultCurrency || "-" },
    { label: "默认税率", value: customer.defaultTaxRate != null ? `${customer.defaultTaxRate}%` : "-" },
    { label: "备注", value: customer.remarks || "-" }
  ];
  const invoiceFields = [
    { label: "纳税人识别号", value: customer.taxId || "-" },
    { label: "发票抬头", value: customer.invoiceTitle || "-" },
    { label: "开票地址", value: customer.invoiceAddress || "-" },
    { label: "开票电话", value: customer.invoicePhone || "-" },
    { label: "开户银行", value: customer.bankName || "-" },
    { label: "开户名称", value: customer.bankAccountName || "-" },
    { label: "银行账号", value: customer.bankAccount || "-" }
  ];
  const orgFields = [
    { label: "销售组织", value: customer.salesOrg || "-" },
    { label: "统驭科目", value: customer.reconciliationAccount || "-" },
    { label: "税码", value: customer.taxCode || "-" }
  ];
  const creditBlock = /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DetailSection,
      {
        fields: [
          { label: "授信额度", value: limit != null ? formatCurrency(limit) : "未授信" },
          { label: "已用信用", value: formatCurrency(used) },
          { label: "可用信用", value: available != null ? formatCurrency(available) : "-" }
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { "data-testid": "credit-status", sx: { mt: 2 }, children: limit == null || limit <= 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: "未授信", variant: "outlined", color: "default" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        LinearProgress,
        {
          variant: "determinate",
          value: Math.min(100, Math.round(ratio * 100)),
          sx: {
            width: 200,
            height: 8,
            borderRadius: 3,
            "& .MuiLinearProgress-bar": { bgcolor: over ? "#EF4444" : "#10B981" }
          }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: over ? "信用超额" : "信用正常", color: over ? "error" : "success" })
    ] }) })
  ] });
  const linkedOrdersBlock = /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: linkedOrders.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", children: "暂无关联销售订单。在「销售订单」中通过选择客户即可建立关联。" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 1, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
      "共 ",
      linkedOrders.length,
      " 笔订单，价税合计 ",
      formatCurrency(linkedAmount)
    ] }),
    linkedOrders.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Link,
      {
        component: "button",
        variant: "body2",
        onClick: () => navigate(`/sales/orders/${o.id}`),
        sx: { textAlign: "left" },
        children: [
          o.orderNo,
          " · ",
          o.customerName,
          " · ",
          formatCurrency(o.grandTotal),
          " · ",
          o.status
        ]
      },
      o.id
    ))
  ] }) });
  const operationLogs = [
    { id: "1", action: "create", operator: customer.createdBy || "系统", time: customer.createdAt, description: "创建客户主数据" },
    { id: "2", action: "update", operator: customer.updatedBy || "系统", time: customer.updatedAt, description: "最近更新" }
  ];
  const handleShare = () => {
    const text = `客户 ${customer.name}
编码：${customer.code}
联系人：${customer.contactName || "-"}
电话：${customer.contactPhone || "-"}`;
    navigator.clipboard.writeText(text).then(() => setSnackbar(true));
  };
  const handleDelete = () => {
    if (linkedOrders.length > 0) {
      setDeleteDialog(false);
      setSnackbar(false);
      return;
    }
    deleteCustomer(customer.id);
    setDeleteDialog(false);
    navigate("/sales/customers");
  };
  const sections = [
    { id: "basic", title: "基本信息", content: /* @__PURE__ */ jsxRuntimeExports.jsx(DetailSection, { fields: basicFields, columns: 2 }) },
    { id: "credit", title: "信用状态", content: creditBlock },
    { id: "invoice", title: "开票信息", content: /* @__PURE__ */ jsxRuntimeExports.jsx(DetailSection, { fields: invoiceFields, columns: 2 }) },
    { id: "org", title: "组织与会计", content: /* @__PURE__ */ jsxRuntimeExports.jsx(DetailSection, { fields: orgFields, columns: 2 }) },
    { id: "orders", title: "关联销售订单", content: linkedOrdersBlock },
    { id: "logs", title: "操作日志", content: /* @__PURE__ */ jsxRuntimeExports.jsx(OperationTimeline, { title: "操作日志", events: operationLogs }) }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ObjectPage,
      {
        title: customer.code,
        subtitle: customer.name,
        breadcrumbs: [{ label: "客户列表", path: "/sales/customers" }],
        status: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: customer.status }),
        headerFields: [
          { label: "类型", value: typeMap[customer.type] },
          { label: "联系人", value: customer.contactName || "-" },
          { label: "电话", value: customer.contactPhone || "-" },
          { label: "信用等级", value: customer.creditLevel || "-" },
          { label: "可用信用", value: available != null ? formatCurrency(available) : "未授信" }
        ],
        actions: /* @__PURE__ */ jsxRuntimeExports.jsx(
          DetailActions,
          {
            entity: "customer",
            record: customer,
            onBack: () => navigate("/sales/customers"),
            onEdit: () => navigate(`/sales/customers/${customer.id}/edit`),
            onDelete: () => setDeleteDialog(true),
            extra: [
              { key: "share", label: "分享", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Share, {}), onClick: handleShare }
            ]
          }
        ),
        sections
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        open: deleteDialog,
        title: "确认删除",
        content: `确定删除客户"${customer.name}"吗？此操作不可撤销。`,
        onConfirm: handleDelete,
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
};
export {
  CustomerDetail as default
};
