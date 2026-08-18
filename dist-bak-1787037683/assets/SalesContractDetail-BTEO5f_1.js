import { cJ as useParams, aG as useNavigate, r as reactExports, j as jsxRuntimeExports, bj as Alert, aL as Chip, aP as Paper, h as Typography, B as Box, i as Divider, cl as LinearProgress, cU as Snackbar, bK as Stack, bk as Button, bg as Edit, bf as Add, bc as Delete, c_ as Share, bY as ArrowBack } from "./vendor-46QZWBd3.js";
import { e as useSalesStore } from "./index-CcOZBoQL.js";
import { D as DataTable } from "./DataTable-vc5G5ARo.js";
import { D as DetailSection, O as OperationTimeline } from "./OperationTimeline-Dp-GS67R.js";
import { S as StatusBadge } from "./StatusBadge-Db1uY4YU.js";
import { C as ConfirmDialog } from "./ConfirmDialog-BMZp8iYJ.js";
import { f as formatCurrency, a as formatDate } from "./format-Rp8---CI.js";
import { P as PrintPreviewButton } from "./PrintPreviewButton-BHY-fDRo.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import { u as useSalesContractStore } from "./salesContractStore-CAyjSw7v.js";
import "./PrintPreview-_oqQL6if.js";
const STATUS_LABELS = {
  draft: "草稿",
  active: "执行中",
  suspended: "已暂停",
  completed: "已完成",
  terminated: "已终止"
};
const SalesContractDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const contracts = useSalesContractStore((s) => s.contracts);
  const deleteContract = useSalesContractStore((s) => s.deleteContract);
  const salesOrders = useSalesStore((s) => s.salesOrders);
  const addSalesOrder = useSalesStore((s) => s.addSalesOrder);
  const contract = contracts.find((c) => c.id === id);
  const [deleteDialog, setDeleteDialog] = reactExports.useState(false);
  const [snackbar, setSnackbar] = reactExports.useState(false);
  if (!contract) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "销售合同详情", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", children: "合同不存在，请返回列表重新选择。" }) });
  }
  const handleShare = () => {
    const text = `销售合同 ${contract.contractNo}
名称：${contract.name}
客户：${contract.customerName}
金额：${formatCurrency(contract.amount)}
状态：${STATUS_LABELS[contract.status]}`;
    navigator.clipboard.writeText(text).then(() => setSnackbar(true));
  };
  const handleGenerateOrder = () => {
    const existing = salesOrders.find((o) => o.contractId === contract.id);
    if (existing) {
      alert(`已存在该合同生成的销售订单（${existing.orderNo}），将跳转到该订单。`);
      navigate(`/sales/orders/${existing.id}`);
      return;
    }
    if (!contract.items || contract.items.length === 0) {
      alert("该合同没有物料明细，无法生成销售订单。");
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const orderDate = now.slice(0, 10);
    const subtotal = contract.items.reduce((sum, i) => sum + (i.amount || 0), 0);
    const taxRate = 13;
    const taxAmount = subtotal * taxRate / 100;
    const grandTotal = subtotal + taxAmount;
    const orderId = `so-${Date.now()}`;
    const orderNo = `SO-${Date.now()}`;
    const items = contract.items.map((it, idx) => ({
      id: `soi-gen-${idx}`,
      materialId: it.materialId || "",
      materialCode: it.materialCode || "",
      materialName: it.materialName || "",
      specification: it.specification || "",
      unit: it.unit || "件",
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      amount: it.amount,
      deliveryDate: it.deliveryDate || ""
    }));
    addSalesOrder({
      id: orderId,
      orderNo,
      type: "standard",
      status: "draft",
      customerId: contract.customerId,
      customerName: contract.customerName,
      customerCode: contract.customerCode,
      salesPerson: contract.salesPerson || "陈伟",
      items,
      totalAmount: subtotal,
      taxRate,
      taxAmount,
      grandTotal,
      orderDate,
      expectedDeliveryDate: contract.endDate || "",
      paymentTerms: "",
      deliveryAddress: "",
      linkedWorkOrders: [],
      contractId: contract.id,
      contractNo: contract.contractNo,
      createdAt: now,
      updatedAt: now,
      createdBy: "合同下推",
      updatedBy: "合同下推",
      creditOccupied: false,
      creditAmount: 0
    });
    navigate(`/sales/orders/${orderId}`);
  };
  const totalReceived = contract.paymentSchedule.reduce((sum, p) => sum + (p.received ? p.amount : 0), 0);
  const totalPayments = contract.paymentSchedule.reduce((sum, p) => sum + p.amount, 0);
  const receivedRatio = totalPayments > 0 ? totalReceived / totalPayments * 100 : 0;
  const basicFields = [
    { label: "合同编号", value: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: contract.contractNo, size: "small", sx: { fontFamily: "monospace", bgcolor: "#F0FDF4", color: "#16A34A" } }) },
    { label: "合同名称", value: contract.name },
    { label: "客户", value: contract.customerName },
    { label: "客户编码", value: contract.customerCode || "-" },
    { label: "销售员", value: contract.salesPerson || "-" },
    { label: "合同状态", value: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: contract.status }) },
    { label: "合同金额", value: formatCurrency(contract.amount) },
    { label: "开始日期", value: formatDate(contract.startDate) },
    { label: "结束日期", value: formatDate(contract.endDate) },
    { label: "主要条款", value: contract.terms || "-" },
    { label: "备注", value: contract.remarks || "-" },
    { label: "创建时间", value: formatDate(contract.createdAt) },
    { label: "更新时间", value: formatDate(contract.updatedAt) }
  ];
  const operationLogs = [
    { id: "op-1", action: "info", operator: "系统", time: contract.createdAt, description: `创建合同（状态：${STATUS_LABELS[contract.status]}）` },
    ...contract.status !== "draft" ? [{ id: "op-2", action: "approve", operator: contract.salesPerson || "销售员", time: contract.updatedAt, description: `合同${contract.status === "active" ? "生效" : contract.status === "suspended" ? "暂停" : contract.status === "completed" ? "完成" : "终止"}` }] : []
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: `合同详情 - ${contract.contractNo}`,
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outlined",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, {}),
            onClick: () => navigate(`/sales/contracts/${id}/edit`),
            children: "编辑"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            color: "primary",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}),
            onClick: handleGenerateOrder,
            children: "生成销售订单"
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
            onClick: () => navigate("/sales/contracts"),
            children: "返回"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          PrintPreviewButton,
          {
            entity: "salesContract",
            record: {
              ...contract,
              items: contract.items.map((i) => ({
                materialCode: i.materialCode,
                materialName: i.materialName,
                specification: i.specification,
                unit: i.unit,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                amount: i.amount,
                deliveryDate: i.deliveryDate
              }))
            },
            showBoth: true
          }
        )
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "合同基本信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DetailSection, { fields: basicFields })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "合同物料明细" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
              "共 ",
              contract.items.length,
              " 项"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            DataTable,
            {
              data: contract.items,
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
                      label: row.original.materialCode || "-",
                      size: "small",
                      sx: { fontSize: "0.75rem", bgcolor: "#F0FDF4", color: "#16A34A", fontFamily: "monospace" }
                    }
                  )
                },
                {
                  id: "materialName",
                  header: "物料名称",
                  accessorKey: "materialName",
                  cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { fontWeight: 500 }, children: row.original.materialName || "-" })
                },
                {
                  id: "specification",
                  header: "规格型号",
                  accessorKey: "specification",
                  cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color: "#64748B", fontSize: "0.8125rem" }, children: row.original.specification || "-" })
                },
                {
                  id: "unit",
                  header: "单位",
                  accessorKey: "unit",
                  cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "center" }, children: row.original.unit || "-" })
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
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 1 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", justifyContent: "flex-end" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 700, children: [
            "合同总金额：",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#16A34A", fontSize: "1.05rem" }, children: formatCurrency(contract.amount) })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "收款进度" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 2 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", mb: 0.5 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                "已收：",
                formatCurrency(totalReceived)
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                "未收：",
                formatCurrency(totalPayments - totalReceived)
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(LinearProgress, { variant: "determinate", value: receivedRatio, sx: { height: 8, borderRadius: 4 } }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { display: "block", textAlign: "right", mt: 0.5 }, children: [
              receivedRatio.toFixed(1),
              "% 已收款"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            DataTable,
            {
              data: contract.paymentSchedule,
              enablePagination: false,
              enableRowSelection: false,
              sapStyle: true,
              columns: [
                {
                  id: "stage",
                  header: "里程碑",
                  accessorKey: "stage",
                  cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { fontWeight: 500 }, children: row.original.stage })
                },
                {
                  id: "percentage",
                  header: "比例(%)",
                  accessorKey: "percentage",
                  cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { textAlign: "right" }, children: [
                    row.original.percentage,
                    "%"
                  ] })
                },
                {
                  id: "amount",
                  header: "金额",
                  accessorKey: "amount",
                  cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: formatCurrency(row.original.amount) })
                },
                {
                  id: "dueDate",
                  header: "计划收款日",
                  accessorKey: "dueDate",
                  cell: ({ row }) => row.original.dueDate ? formatDate(row.original.dueDate) : "-"
                },
                {
                  id: "receivedDate",
                  header: "实际收款日",
                  accessorKey: "receivedDate",
                  cell: ({ row }) => row.original.receivedDate ? formatDate(row.original.receivedDate) : "-"
                },
                {
                  id: "received",
                  header: "收款状态",
                  accessorKey: "received",
                  cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Chip,
                    {
                      label: row.original.received ? "已收款" : "未收款",
                      size: "small",
                      sx: {
                        bgcolor: row.original.received ? "#F0FDF4" : "#FEF3C7",
                        color: row.original.received ? "#16A34A" : "#D97706",
                        fontWeight: 500
                      }
                    }
                  )
                }
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "操作历史" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(OperationTimeline, { events: operationLogs })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConfirmDialog,
          {
            open: deleteDialog,
            title: "确认删除合同",
            content: `确定要删除合同 "${contract.contractNo} - ${contract.name}" 吗？此操作不可逆。`,
            onConfirm: () => {
              deleteContract(contract.id);
              navigate("/sales/contracts");
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
            message: "合同信息已复制到剪贴板"
          }
        )
      ]
    }
  );
};
export {
  SalesContractDetail as default
};
