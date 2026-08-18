import { cJ as useParams, aG as useNavigate, r as reactExports, j as jsxRuntimeExports, bj as Alert, B as Box, h as Typography, dr as LinkOutlined, aP as Paper, aL as Chip, bt as TextField, bK as Stack, bk as Button, d7 as Cancel, bV as CheckCircle, bu as Send, bg as Edit, bc as Delete, c_ as Share, bY as ArrowBack, cU as Snackbar, O as OpenInNew } from "./vendor-DGU5TO-x.js";
import { b as usePurchaseStore } from "./index-DeeqqmHA.js";
import { D as DataTable } from "./DataTable-ct0NJFvm.js";
import { D as DetailSection, O as OperationTimeline } from "./OperationTimeline-D4JWfy3I.js";
import { S as StatusBadge } from "./StatusBadge-DeJuhK-R.js";
import { C as ConfirmDialog } from "./ConfirmDialog-DFiLXnKl.js";
import { A as ApprovalFlow } from "./ApprovalFlow-COmiS74n.js";
import { F as FlowTracker } from "./FlowTracker-CCA6kX6w.js";
import { a as formatDate, f as formatCurrency } from "./format-DnEevvSX.js";
import { P as PrintPreviewButton } from "./PrintPreviewButton-DI_LQm8R.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import { O as ObjectPage } from "./ObjectPage-R9WHJvce.js";
import "./PrintPreview-cCBr3GzP.js";
const buildApprovalNodes = (status) => [
  { id: "n1", role: "申请人提交", approver: "王晓明", status: "approved", time: "2024-05-10 09:15", comment: "正常采购申请" },
  { id: "n2", role: "部门主管审核", approver: "李经理", status: "approved", time: "2024-05-10 11:30", comment: "同意，符合季度采购计划" },
  {
    id: "n3",
    role: "采购部审批",
    approver: "张采购",
    status: status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending",
    time: status === "approved" ? "2024-05-10 14:20" : void 0,
    comment: status === "approved" ? "已确认供应商，可执行" : void 0
  },
  {
    id: "n4",
    role: "财务确认",
    approver: "陈财务",
    status: status === "approved" ? "approved" : status === "rejected" ? "skipped" : "waiting",
    time: status === "approved" ? "2024-05-10 16:00" : void 0
  },
  { id: "n5", role: "完成", approver: void 0, status: status === "approved" ? "approved" : "waiting" }
];
const FlowLinks = ({ requestId, status }) => {
  const navigate = useNavigate();
  const links = [
    { label: "采购订单", icon: "📋", path: "/purchase/orders", active: ["approved", "ordered"].includes(status), count: status === "ordered" ? 1 : 0 },
    { label: "价格比较", icon: "📊", path: `/purchase/compare/${requestId}`, active: true, count: 2 }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 1, flexWrap: "wrap" }, children: links.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    Chip,
    {
      label: `${l.icon} ${l.label}${l.count ? ` (${l.count})` : ""}`,
      size: "small",
      variant: l.active ? "filled" : "outlined",
      color: l.active ? "primary" : "default",
      onClick: () => l.active && navigate(l.path),
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(OpenInNew, { sx: { fontSize: "14px !important" } }),
      sx: { cursor: l.active ? "pointer" : "default", fontSize: "0.8rem" }
    },
    l.label
  )) });
};
const PurchaseDetail = () => {
  var _a;
  const { id } = useParams();
  const navigate = useNavigate();
  const { purchaseRequests, deletePurchaseRequest } = usePurchaseStore();
  const request = purchaseRequests.find((r) => r.id === id);
  const [approveDialog, setApproveDialog] = reactExports.useState(false);
  const [rejectDialog, setRejectDialog] = reactExports.useState(false);
  const [comment, setComment] = reactExports.useState("");
  const [deleteDialog, setDeleteDialog] = reactExports.useState(false);
  const [snackbar, setSnackbar] = reactExports.useState(false);
  const statusToFlowNode = {
    draft: "pr_draft",
    pending: "pr_submitted",
    approved: "pr_completed",
    rejected: "pr_completed",
    ordered: "pr_ordered"
  };
  if (!request) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "采购申请详情", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", children: "采购申请不存在，请返回列表重新选择。" }) });
  }
  const approvalNodes = buildApprovalNodes(request.status);
  const isPending = request.status === "pending";
  const basicFields = [
    { label: "申请单号", value: request.requestNo },
    { label: "标题", value: request.title },
    { label: "申请人", value: request.applicant },
    { label: "部门", value: request.department },
    { label: "申请类型", value: request.type === "material" ? "物料采购" : "服务采购" },
    { label: "优先级", value: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: request.priority }) },
    { label: "期望日期", value: formatDate(request.expectedDate) },
    { label: "状态", value: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: request.status }) },
    { label: "申请原因", value: request.reason },
    { label: "创建时间", value: formatDate(request.createdAt) }
  ];
  const operationLogs = ((_a = request.approvalRecords) == null ? void 0 : _a.map((record) => ({
    id: record.id,
    action: record.action,
    operator: record.approver,
    time: record.operatedAt,
    description: `${record.action === "approve" ? "审批通过" : "审批拒绝"}：${record.comments || ""}`
  }))) || [];
  const handleShare = () => {
    const text = `采购申请 ${request.requestNo}
标题：${request.title}
金额：${formatCurrency(request.totalAmount)}`;
    navigator.clipboard.writeText(text).then(() => setSnackbar(true));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ObjectPage,
      {
        title: request.requestNo,
        subtitle: request.title,
        breadcrumbs: [{ label: "采购申请", path: "/purchase/requests" }],
        status: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: request.status }),
        headerFields: [
          { label: "申请人", value: request.applicant },
          { label: "部门", value: request.department },
          { label: "优先级", value: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: request.priority }) },
          { label: "期望日期", value: formatDate(request.expectedDate) },
          { label: "预估金额", value: formatCurrency(request.totalAmount) }
        ],
        actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, flexWrap: "wrap", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "purchase-request", currentStatus: statusToFlowNode[request.status] || "pr_draft", documentNo: request.requestNo }),
          isPending && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "outlined",
                color: "error",
                startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Cancel, {}),
                onClick: () => setRejectDialog(true),
                children: "拒绝"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "contained",
                color: "success",
                startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}),
                onClick: () => setApproveDialog(true),
                children: "审批通过"
              }
            )
          ] }),
          request.status === "draft" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", color: "primary", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, {}), children: "提交审批" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "outlined",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, {}),
              onClick: () => navigate(`/purchase/${id}/edit`),
              children: "编辑"
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
              onClick: () => handleShare,
              children: "分享"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "outlined",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}),
              onClick: () => navigate("/purchase/requests"),
              children: "返回"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            PrintPreviewButton,
            {
              entity: "purchaseRequest",
              record: {
                ...request,
                items: request.items.map((i) => ({
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
        sections: [
          {
            id: "links",
            title: "单据流转关联",
            content: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2, bgcolor: "#F0F9FF", borderRadius: 2, border: "1px solid #BAE6FD" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { color: "#0369A1", fontWeight: 600, display: "block", mb: 1 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(LinkOutlined, { sx: { fontSize: 14, mr: 0.5, verticalAlign: "middle" } }),
                "单据流转关联"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FlowLinks, { requestId: request.id, status: request.status })
            ] })
          },
          { id: "approval", title: "审批流程", content: /* @__PURE__ */ jsxRuntimeExports.jsx(ApprovalFlow, { nodes: approvalNodes }) },
          { id: "basic", title: "基本信息", content: /* @__PURE__ */ jsxRuntimeExports.jsx(DetailSection, { fields: basicFields }) },
          {
            id: "items",
            title: "物料明细",
            content: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { elevation: 0, sx: { border: "1px solid", borderColor: "divider", borderRadius: 2 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "申请物料明细" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                  "预估总金额：",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: formatCurrency(request.totalAmount) })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                DataTable,
                {
                  data: request.items,
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
                      id: "quantity",
                      header: "申请数量",
                      accessorKey: "quantity",
                      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right", fontWeight: 500 }, children: row.original.quantity.toLocaleString() })
                    },
                    {
                      id: "estimatedPrice",
                      header: "预估单价",
                      accessorKey: "estimatedPrice",
                      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: formatCurrency(row.original.estimatedPrice) })
                    },
                    {
                      id: "estimatedAmount",
                      header: "预估金额",
                      accessorKey: "estimatedAmount",
                      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right", fontWeight: 600, color: "#1D4ED8" }, children: formatCurrency(row.original.estimatedAmount) })
                    }
                  ]
                }
              )
            ] })
          },
          ...isPending ? [{
            id: "approval-form",
            title: "审批意见",
            content: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { elevation: 0, sx: { p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, sx: { mb: 1.5 }, children: "审批意见" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  fullWidth: true,
                  multiline: true,
                  rows: 3,
                  placeholder: "请输入审批意见（可选）...",
                  value: comment,
                  onChange: (e) => setComment(e.target.value),
                  size: "small"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, sx: { mt: 1.5, justifyContent: "flex-end" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "outlined", color: "error", onClick: () => setRejectDialog(true), startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Cancel, {}), children: "拒绝" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "contained", color: "success", onClick: () => setApproveDialog(true), startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}), children: "审批通过" })
              ] })
            ] })
          }] : [],
          ...operationLogs.length > 0 ? [{
            id: "logs",
            title: "操作历史",
            content: /* @__PURE__ */ jsxRuntimeExports.jsx(OperationTimeline, { events: operationLogs })
          }] : []
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        open: approveDialog,
        title: "确认审批通过",
        content: `确定审批通过"${request.title}"吗？${comment ? `
审批意见：${comment}` : ""}`,
        onConfirm: () => {
          setApproveDialog(false);
        },
        onCancel: () => setApproveDialog(false),
        confirmText: "审批通过",
        confirmColor: "success"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        open: rejectDialog,
        title: "确认拒绝申请",
        content: `确定拒绝"${request.title}"吗？${comment ? `
拒绝原因：${comment}` : ""}`,
        onConfirm: () => {
          setRejectDialog(false);
        },
        onCancel: () => setRejectDialog(false),
        confirmText: "确认拒绝",
        confirmColor: "error"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        open: deleteDialog,
        title: "确认删除",
        content: `确定删除"${request.title}"吗？此操作不可撤销。`,
        onConfirm: () => {
          deletePurchaseRequest(request.id);
          setDeleteDialog(false);
          navigate("/purchase/requests");
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
};
export {
  PurchaseDetail as default
};
