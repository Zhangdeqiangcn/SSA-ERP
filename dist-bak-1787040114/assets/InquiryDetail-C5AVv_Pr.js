import { cJ as useParams, aG as useNavigate, r as reactExports, j as jsxRuntimeExports, bj as Alert, aL as Chip, aP as Paper, h as Typography, B as Box, bK as Stack, cU as Snackbar, bk as Button, X as CompareArrows, e2 as PlayArrow, bg as Edit, bc as Delete, c_ as Share, bY as ArrowBack } from "./vendor-DGU5TO-x.js";
import { b as usePurchaseStore } from "./index-DeeqqmHA.js";
import { D as DataTable } from "./DataTable-ct0NJFvm.js";
import { D as DetailSection, O as OperationTimeline } from "./OperationTimeline-D4JWfy3I.js";
import { C as ConfirmDialog } from "./ConfirmDialog-DFiLXnKl.js";
import { F as FlowTracker } from "./FlowTracker-CCA6kX6w.js";
import { a as formatDate, f as formatCurrency } from "./format-DnEevvSX.js";
import { P as PrintPreviewButton } from "./PrintPreviewButton-DI_LQm8R.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import { u as usePriceStore } from "./priceStore-CduvTkzQ.js";
import "./StatusBadge-DeJuhK-R.js";
import "./PrintPreview-cCBr3GzP.js";
const STATUS_MAP = {
  draft: { label: "草稿", color: "default" },
  published: { label: "已发布", color: "info" },
  closed: { label: "已截止", color: "warning" },
  quotation_received: { label: "已收到报价", color: "primary" },
  compared: { label: "已比价", color: "success" }
};
const InquiryDetail = () => {
  var _a, _b;
  const { priceInquiries, vendorQuotations } = usePriceStore();
  const { id } = useParams();
  const navigate = useNavigate();
  const [confirmDialog, setConfirmDialog] = reactExports.useState(false);
  const [deleteDialog, setDeleteDialog] = reactExports.useState(false);
  const [snackbar, setSnackbar] = reactExports.useState(false);
  const inquiry = priceInquiries.find((i) => i.id === id);
  usePurchaseStore((s) => s.purchaseRequests);
  if (!inquiry) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "询价单详情", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", children: "询价单不存在" }) });
  }
  const relatedQuotations = vendorQuotations.filter((q) => q.inquiryId === inquiry.id);
  const basicFields = [
    { label: "询价单号", value: inquiry.inquiryNo },
    { label: "标题", value: inquiry.title },
    {
      label: "状态",
      value: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: (_a = STATUS_MAP[inquiry.status]) == null ? void 0 : _a.label,
          size: "small",
          color: ((_b = STATUS_MAP[inquiry.status]) == null ? void 0 : _b.color) || "default"
        }
      )
    },
    { label: "询价人", value: `${inquiry.inquirer}（${inquiry.department}）` },
    { label: "询价日期", value: formatDate(inquiry.inquiryDate) },
    { label: "报价截止日期", value: formatDate(inquiry.deadline) },
    { label: "币种", value: inquiry.currency === "CNY" ? "人民币 CNY" : inquiry.currency },
    { label: "目标供应商", value: inquiry.targetVendorNames.join("、") },
    { label: "预估总金额", value: formatCurrency(inquiry.totalEstimatedAmount) },
    { label: "备注", value: inquiry.remarks || "-" }
  ];
  const handleGenerateComparison = () => {
    navigate(`/price/comparison/${inquiry.id}`);
  };
  const handleShare = () => {
    const shareText = `询价单 ${inquiry.inquiryNo}
标题：${inquiry.title}
目标供应商：${inquiry.targetVendorNames.join("、")}
预估金额：${formatCurrency(inquiry.totalEstimatedAmount)}`;
    navigator.clipboard.writeText(shareText).then(() => setSnackbar(true));
  };
  [...new Set(inquiry.items.map((i) => i.sourceRequestNo).filter(Boolean))];
  const operationLogs = [
    { time: inquiry.createdAt, operator: inquiry.createdBy, action: "创建询价单", detail: `标题：${inquiry.title}` },
    ...inquiry.status !== "draft" ? [
      { time: inquiry.updatedAt, operator: inquiry.updatedBy, action: "发布询价单", detail: `目标供应商：${inquiry.targetVendorNames.join("、")}` }
    ] : [],
    ...relatedQuotations.length > 0 ? relatedQuotations.map((q) => ({
      time: q.submittedAt || q.createdAt,
      operator: q.vendorName,
      action: "供应商报价",
      detail: `报价总额：${formatCurrency(q.totalAmount)}，报价单号：${q.quotationNo}`
    })) : []
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "询价单详情",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "price-inquiry", currentStatus: inquiry.status, documentNo: inquiry.inquiryNo }),
        (inquiry.status === "published" || inquiry.status === "closed" || inquiry.status === "quotation_received") && relatedQuotations.length >= 2 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            color: "primary",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(CompareArrows, {}),
            onClick: handleGenerateComparison,
            children: "生成比价单"
          }
        ),
        inquiry.status === "draft" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(PlayArrow, {}),
            onClick: () => {
              alert("询价单已发布！（演示模式）");
            },
            children: "发布询价"
          }
        ),
        inquiry.status === "draft" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outlined",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, {}),
            onClick: () => navigate(`/price/inquiry/${id}/edit`),
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
            onClick: () => navigate("/price/inquiry"),
            children: "返回列表"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          PrintPreviewButton,
          {
            entity: "inquiry",
            record: {
              ...inquiry,
              items: inquiry.items.map((i) => ({
                materialCode: i.materialCode,
                materialName: i.materialName,
                specification: i.specification,
                unit: i.unit,
                quantity: i.quantity,
                unitPrice: i.estimatedPrice,
                amount: i.estimatedAmount
              }))
            },
            showBoth: true
          }
        )
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DetailSection, { title: "基本信息", fields: basicFields }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 1, children: "物料明细" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            DataTable,
            {
              data: inquiry.items,
              enablePagination: false,
              enableRowSelection: false,
              sapStyle: true,
              columns: [
                { id: "materialCode", header: "物料编码", accessorKey: "materialCode" },
                { id: "materialName", header: "物料名称", accessorKey: "materialName" },
                {
                  id: "specification",
                  header: "规格",
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
                  id: "estimatedPrice",
                  header: "预估单价",
                  cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: row.original.estimatedPrice ? formatCurrency(row.original.estimatedPrice) : "-" })
                },
                {
                  id: "estimatedAmount",
                  header: "预估金额",
                  cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: formatCurrency(row.original.estimatedAmount || row.original.quantity * (row.original.estimatedPrice || 0)) })
                },
                {
                  id: "requiredDate",
                  header: "需求日期",
                  accessorKey: "requiredDate",
                  cell: ({ row }) => formatDate(row.original.requiredDate)
                },
                {
                  id: "sourceRequestNo",
                  header: "来源申请",
                  cell: ({ row }) => row.original.sourceRequestNo ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Chip,
                    {
                      label: row.original.sourceRequestNo,
                      size: "small",
                      variant: "outlined",
                      sx: { fontSize: "0.65rem", height: 20 }
                    }
                  ) : "-"
                },
                {
                  id: "remarks",
                  header: "备注",
                  accessorKey: "remarks",
                  cell: ({ row }) => row.original.remarks || "-"
                }
              ]
            }
          )
        ] }),
        relatedQuotations.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, mb: 1, children: [
            "供应商报价情况（",
            relatedQuotations.length,
            " 家）"
          ] }),
          relatedQuotations.map((q) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2, mb: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", mb: 1, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", children: q.vendorName }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: q.quotationNo, size: "small", variant: "outlined" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                  "报价日期：",
                  formatDate(q.quotationDate)
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                  "有效期至：",
                  formatDate(q.validUntil)
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              DataTable,
              {
                data: q.items,
                enablePagination: false,
                enableRowSelection: false,
                sapStyle: true,
                columns: [
                  { id: "materialName", header: "物料", accessorKey: "materialName" },
                  {
                    id: "specification",
                    header: "规格",
                    accessorKey: "specification",
                    cell: ({ row }) => row.original.specification || "-"
                  },
                  {
                    id: "quantity",
                    header: "数量",
                    accessorKey: "quantity",
                    cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: row.original.quantity })
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
                    cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: formatCurrency(row.original.amount) })
                  },
                  {
                    id: "deliveryDays",
                    header: "交期(天)",
                    accessorKey: "deliveryDays",
                    cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "center" }, children: row.original.deliveryDays })
                  },
                  {
                    id: "deliveryDate",
                    header: "预计交期",
                    accessorKey: "deliveryDate",
                    cell: ({ row }) => row.original.deliveryDate ? formatDate(row.original.deliveryDate) : "-"
                  }
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 3, mt: 1, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                "报价总额：",
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: formatCurrency(q.totalAmount) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                "付款条件：",
                q.paymentTerms || "-"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                "备注：",
                q.remarks || "-"
              ] })
            ] })
          ] }, q.id))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(OperationTimeline, { events: operationLogs }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConfirmDialog,
          {
            open: deleteDialog,
            title: "确认删除询价单",
            content: `确定要删除询价单 "${inquiry.inquiryNo}" 吗？此操作不可逆。`,
            onConfirm: () => setDeleteDialog(false),
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
            message: "分享内容已复制到剪贴板"
          }
        )
      ]
    }
  );
};
export {
  InquiryDetail as default
};
