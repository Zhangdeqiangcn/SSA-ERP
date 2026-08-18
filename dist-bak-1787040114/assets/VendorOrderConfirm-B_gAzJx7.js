import { aG as useNavigate, r as reactExports, j as jsxRuntimeExports, h as Typography, bK as Stack, B as Box, aL as Chip, bX as Grid, aP as Paper, aQ as Search, bk as Button, d3 as Clear, E as ExpandLess, s as ExpandMore, bt as TextField, bP as InputAdornment, d9 as QrCode, aO as MenuItem, t as Collapse, bj as Alert, cU as Snackbar, b7 as Dialog, b8 as DialogTitle, i as Divider, ba as DialogContent, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, bC as DialogActions, bV as CheckCircle } from "./vendor-DGU5TO-x.js";
import { m as useFlowStore, j as useSettingsStore, b as usePurchaseStore } from "./index-DeeqqmHA.js";
import { D as DataTable } from "./DataTable-ct0NJFvm.js";
import { F as FlowTracker } from "./FlowTracker-CCA6kX6w.js";
import { a as formatDate, f as formatCurrency } from "./format-DnEevvSX.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import { g as getVendorPortalIdentity } from "./vendorPortalIdentity-tcmgVxZu.js";
import "./StatusBadge-DeJuhK-R.js";
const nowStr = () => {
  const d = /* @__PURE__ */ new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const statusMap = {
  pending: { label: "待确认", color: "warning" },
  confirmed: { label: "已确认", color: "success" },
  modified: { label: "部分确认", color: "info" },
  rejected: { label: "已拒绝", color: "error" }
};
const ConfirmOrderDialog = ({ open, order, autoHours, onClose }) => {
  var _a, _b, _c, _d;
  const { updateVendorOrderConfirm } = useFlowStore();
  const [items, setItems] = reactExports.useState(order ? order.confirmedItems.map((i) => ({ ...i })) : []);
  const [remark, setRemark] = reactExports.useState((order == null ? void 0 : order.vendorRemark) || "");
  if (!order) return null;
  const autoConfirmAt = (() => {
    const base = new Date(String(order.createdAt).replace(/-/g, "/"));
    if (isNaN(base.getTime())) return "";
    base.setHours(base.getHours() + autoHours);
    const p = (n) => String(n).padStart(2, "0");
    return `${base.getFullYear()}-${p(base.getMonth() + 1)}-${p(base.getDate())} ${p(base.getHours())}:${p(base.getMinutes())}`;
  })();
  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };
  const totalAmount = items.reduce((sum, i) => sum + i.confirmedQty * i.unitPrice, 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose, maxWidth: "lg", fullWidth: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { sx: { fontWeight: 600, display: "flex", alignItems: "center", gap: 2 }, children: [
      "订单确认 — ",
      order.purchaseOrderNo,
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: (_a = statusMap[order.status]) == null ? void 0 : _a.label,
          size: "small",
          color: (_b = statusMap[order.status]) == null ? void 0 : _b.color
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 2, fontSize: "0.8125rem" }, children: [
        "请核对订单明细并填写确认交期。如有部分品项无法按量交货，请在备注中说明。",
        order.status === "pending" && autoConfirmAt && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { component: "span", sx: { display: "block", mt: 0.5, color: "#B45309" }, children: [
          "系统默认确认时限为 ",
          autoHours,
          " 小时，若未处理将于 ",
          autoConfirmAt,
          " 自动确认。"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { variant: "outlined", sx: { p: 2, mb: 2, borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 3, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "确认单号" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: order.confirmNo })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 3, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "供应商" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: order.vendorName })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 3, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "确认状态" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: (_c = statusMap[order.status]) == null ? void 0 : _c.label, size: "small", color: (_d = statusMap[order.status]) == null ? void 0 : _d.color })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 3, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "合计金额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 700, color: "#3B82F6", children: formatCurrency(totalAmount) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, elevation: 0, sx: { border: "1px solid rgba(226,232,240,.8)", borderRadius: 2, mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料编码" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料名称" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "采购数量" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "确认数量" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "单价" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "小计" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "可交付日期" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "备注" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: items.map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: item.materialCode,
              size: "small",
              sx: { bgcolor: "#EFF6FF", color: "#1D4ED8", fontFamily: "monospace", fontSize: "0.75rem" }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 500 }, children: item.materialName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: item.orderedQty }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              size: "small",
              type: "number",
              value: item.confirmedQty,
              onChange: (e) => updateItem(idx, "confirmedQty", Number(e.target.value)),
              sx: { width: 90 },
              inputProps: { min: 0 }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(item.unitPrice) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600, color: "#3B82F6" }, children: formatCurrency(item.confirmedQty * item.unitPrice) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              size: "small",
              type: "date",
              value: item.canDeliverDate,
              onChange: (e) => updateItem(idx, "canDeliverDate", e.target.value),
              sx: { width: 140 },
              InputLabelProps: { shrink: true }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              size: "small",
              value: item.remark || "",
              onChange: (e) => updateItem(idx, "remark", e.target.value),
              sx: { width: 140 },
              placeholder: "可选"
            }
          ) })
        ] }, item.itemId)) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          fullWidth: true,
          size: "small",
          label: "整体说明",
          multiline: true,
          rows: 2,
          value: remark,
          onChange: (e) => setRemark(e.target.value),
          placeholder: "如有分批交货、价格异议等，请在此说明"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onClose, children: "取消" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", onClick: () => {
        updateVendorOrderConfirm(order.id, { vendorRemark: remark, confirmedItems: items });
        onClose();
      }, children: "暂存" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", color: "error", onClick: () => {
        updateVendorOrderConfirm(order.id, { status: "rejected", vendorRemark: remark });
        onClose();
      }, children: "拒绝订单" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", color: "success", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}), onClick: () => {
        updateVendorOrderConfirm(order.id, { status: "confirmed", vendorRemark: remark, confirmedItems: items, confirmedAt: nowStr(), confirmedBy: order.vendorName });
        usePurchaseStore.getState().confirmOrderByVendor(order.purchaseOrderId, { vendorId: order.vendorId, operator: order.vendorName, note: remark });
        onClose();
      }, children: "确认订单" })
    ] })
  ] });
};
const VendorOrderConfirmList = () => {
  const { vendorOrderConfirms, updateVendorOrderConfirm } = useFlowStore();
  const { vendorPortalConfig } = useSettingsStore();
  const identity = getVendorPortalIdentity();
  const autoHours = vendorPortalConfig.vendorOrderAutoConfirmHours || 24;
  useNavigate();
  const [searchParams, setSearchParams] = reactExports.useState({
    purchaseOrderNo: "",
    confirmNo: "",
    materialCode: "",
    materialName: "",
    vendorName: "",
    status: "",
    dateFrom: "",
    dateTo: "",
    amountMin: "",
    amountMax: ""
  });
  const [showAdvanced, setShowAdvanced] = reactExports.useState(false);
  const [selectedOrder, setSelectedOrder] = reactExports.useState(null);
  const [snackbar, setSnackbar] = reactExports.useState({ open: false, msg: "" });
  reactExports.useEffect(() => {
    const tick = () => {
      const now = Date.now();
      vendorOrderConfirms.filter((o) => !identity || o.vendorId === identity.vendorId).forEach((o) => {
        if (o.status !== "pending" || !o.createdAt) return;
        const created = new Date(String(o.createdAt).replace(/-/g, "/")).getTime();
        if (isNaN(created)) return;
        if (now - created > autoHours * 3600 * 1e3) {
          updateVendorOrderConfirm(o.id, { status: "confirmed", confirmedAt: nowStr(), confirmedBy: o.vendorName || "系统自动" });
          usePurchaseStore.getState().confirmOrderByVendor(o.purchaseOrderId, { vendorId: o.vendorId, operator: o.vendorName || "系统自动" });
          setSnackbar({ open: true, msg: `订单 ${o.purchaseOrderNo} 已超过 ${autoHours}h 确认时限，系统已自动确认` });
        }
      });
    };
    const timer = setInterval(tick, 3e4);
    return () => clearInterval(timer);
  }, [autoHours, vendorOrderConfirms, updateVendorOrderConfirm]);
  const updateParam = (key, value) => {
    setSearchParams((prev) => ({ ...prev, [key]: value }));
  };
  const clearAll = () => {
    setSearchParams({
      purchaseOrderNo: "",
      confirmNo: "",
      materialCode: "",
      materialName: "",
      vendorName: "",
      status: "",
      dateFrom: "",
      dateTo: "",
      amountMin: "",
      amountMax: ""
    });
    setShowAdvanced(false);
  };
  const hasActiveFilter = Object.values(searchParams).some((v) => v !== "");
  const columns = reactExports.useMemo(() => [
    {
      accessorKey: "confirmNo",
      header: "确认单号",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#3B82F6", fontWeight: 500, fontFamily: "monospace" }, children: row.original.confirmNo })
    },
    {
      accessorKey: "purchaseOrderNo",
      header: "采购订单号",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontFamily: "monospace", fontSize: "0.8rem", color: "#64748B" }, children: row.original.purchaseOrderNo })
    },
    { accessorKey: "vendorName", header: "供应商" },
    {
      accessorKey: "confirmedItems",
      header: "物料明细",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 0.3, children: [
        row.original.confirmedItems.slice(0, 2).map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: item.materialCode,
              size: "small",
              sx: { bgcolor: "#EFF6FF", color: "#1D4ED8", fontFamily: "monospace", fontSize: "0.7rem" }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: item.materialName })
        ] }, item.itemId)),
        row.original.confirmedItems.length > 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
          "+",
          row.original.confirmedItems.length - 2,
          " 更多"
        ] })
      ] })
    },
    {
      accessorKey: "confirmedDeliveryDate",
      header: "确认交期",
      cell: ({ row }) => row.original.confirmedDeliveryDate ? formatDate(row.original.confirmedDeliveryDate) : /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "待确认", size: "small", color: "warning" })
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const s = statusMap[row.original.status];
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: s == null ? void 0 : s.label, size: "small", color: (s == null ? void 0 : s.color) || "default" });
      }
    },
    {
      accessorKey: "confirmedAt",
      header: "确认时间",
      cell: ({ row }) => row.original.confirmedAt ? formatDate(row.original.confirmedAt) : "-"
    }
  ], []);
  const filteredData = reactExports.useMemo(() => {
    let data = [...vendorOrderConfirms].filter((d) => !identity || d.vendorId === identity.vendorId);
    if (searchParams.purchaseOrderNo) {
      data = data.filter((d) => d.purchaseOrderNo.toLowerCase().includes(searchParams.purchaseOrderNo.toLowerCase()));
    }
    if (searchParams.confirmNo) {
      data = data.filter((d) => d.confirmNo.toLowerCase().includes(searchParams.confirmNo.toLowerCase()));
    }
    if (searchParams.materialCode) {
      data = data.filter(
        (d) => d.confirmedItems.some(
          (item) => item.materialCode.toLowerCase().includes(searchParams.materialCode.toLowerCase())
        )
      );
    }
    if (searchParams.materialName) {
      data = data.filter(
        (d) => d.confirmedItems.some(
          (item) => item.materialName.toLowerCase().includes(searchParams.materialName.toLowerCase())
        )
      );
    }
    if (searchParams.vendorName) {
      data = data.filter((d) => d.vendorName.toLowerCase().includes(searchParams.vendorName.toLowerCase()));
    }
    if (searchParams.status) {
      data = data.filter((d) => d.status === searchParams.status);
    }
    if (searchParams.dateFrom) {
      data = data.filter((d) => d.confirmedAt && d.confirmedAt >= searchParams.dateFrom);
    }
    if (searchParams.dateTo) {
      data = data.filter((d) => d.confirmedAt && d.confirmedAt <= searchParams.dateTo + " 23:59:59");
    }
    if (searchParams.amountMin) {
      const min = Number(searchParams.amountMin);
      if (!isNaN(min)) {
        data = data.filter((d) => {
          const total = d.confirmedItems.reduce((s, i) => s + i.confirmedQty * i.unitPrice, 0);
          return total >= min;
        });
      }
    }
    if (searchParams.amountMax) {
      const max = Number(searchParams.amountMax);
      if (!isNaN(max)) {
        data = data.filter((d) => {
          const total = d.confirmedItems.reduce((s, i) => s + i.confirmedQty * i.unitPrice, 0);
          return total <= max;
        });
      }
    }
    return data;
  }, [searchParams]);
  const stats = reactExports.useMemo(() => {
    const pending = vendorOrderConfirms.filter((d) => d.status === "pending").length;
    const total = vendorOrderConfirms.length;
    const confirmedTotal = vendorOrderConfirms.filter((d) => d.status === "confirmed" || d.status === "modified").length;
    return { pending, total, confirmedTotal, result: filteredData.length };
  }, [filteredData]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "供应商订单确认", actions: /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "vendor-order", currentStatus: "vo_confirmed" }), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 2 }, children: [
      { label: "全部订单", count: stats.total, color: "#64748B" },
      { label: "待确认", count: stats.pending, color: "#F59E0B" },
      { label: "已确认", count: stats.confirmedTotal, color: "#10B981" },
      { label: "当前筛选结果", count: stats.result, color: "#3B82F6" }
    ].map(({ label, count, color }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2, borderRadius: 2, textAlign: "center", borderColor: `${color}30` }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, sx: { color }, children: count })
    ] }) }, label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, mb: 2, borderRadius: 2, border: "1px solid #E2E8F0" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", sx: { mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, sx: { display: "flex", alignItems: "center", gap: 0.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { fontSize: "small" }),
          " 查询条件"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
          hasActiveFilter && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Clear, {}), onClick: clearAll, sx: { fontSize: "0.75rem" }, children: "清除条件" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              icon: showAdvanced ? /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandLess, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandMore, {}),
              label: showAdvanced ? "收起高级筛选" : "展开高级筛选",
              size: "small",
              variant: "outlined",
              onClick: () => setShowAdvanced(!showAdvanced),
              sx: { cursor: "pointer" }
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 1.5, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "采购订单号",
            value: searchParams.purchaseOrderNo,
            onChange: (e) => updateParam("purchaseOrderNo", e.target.value),
            placeholder: "如 PO20240506001",
            InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(InputAdornment, { position: "start", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { sx: { fontSize: 18, color: "#94A3B8" } }) }) }
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "确认单号",
            value: searchParams.confirmNo,
            onChange: (e) => updateParam("confirmNo", e.target.value),
            placeholder: "如 VOC20240507001",
            InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(InputAdornment, { position: "start", children: /* @__PURE__ */ jsxRuntimeExports.jsx(QrCode, { sx: { fontSize: 18, color: "#94A3B8" } }) }) }
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "物料编码",
            value: searchParams.materialCode,
            onChange: (e) => updateParam("materialCode", e.target.value),
            placeholder: "如 MAT202405010001"
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "状态",
            select: true,
            value: searchParams.status,
            onChange: (e) => updateParam("status", e.target.value),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "全部" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "pending", children: "待确认" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "confirmed", children: "已确认" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "modified", children: "部分确认" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "rejected", children: "已拒绝" })
            ]
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Collapse, { in: showAdvanced, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 1.5, sx: { mt: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "物料名称",
            value: searchParams.materialName,
            onChange: (e) => updateParam("materialName", e.target.value),
            placeholder: "如 钢板"
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "供应商",
            value: searchParams.vendorName,
            onChange: (e) => updateParam("vendorName", e.target.value)
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 3, md: 1.5, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "确认日期从",
            type: "date",
            value: searchParams.dateFrom,
            onChange: (e) => updateParam("dateFrom", e.target.value),
            InputLabelProps: { shrink: true }
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 3, md: 1.5, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "至",
            type: "date",
            value: searchParams.dateTo,
            onChange: (e) => updateParam("dateTo", e.target.value),
            InputLabelProps: { shrink: true }
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 3, md: 1.5, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "金额≥",
            type: "number",
            value: searchParams.amountMin,
            onChange: (e) => updateParam("amountMin", e.target.value),
            InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(InputAdornment, { position: "start", children: "¥" }) }
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 3, md: 1.5, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "金额≤",
            type: "number",
            value: searchParams.amountMax,
            onChange: (e) => updateParam("amountMax", e.target.value),
            InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(InputAdornment, { position: "start", children: "¥" }) }
          }
        ) })
      ] }) }),
      hasActiveFilter && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mt: 1.5, py: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", children: [
        "找到 ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: filteredData.length }),
        " 条匹配记录（共 ",
        vendorOrderConfirms.length,
        " 条）"
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DataTable,
      {
        data: filteredData,
        columns,
        enableRowSelection: true,
        enablePagination: true,
        enableExport: true,
        onView: (row) => setSelectedOrder(row),
        onEdit: (row) => setSelectedOrder(row)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmOrderDialog,
      {
        open: Boolean(selectedOrder),
        order: selectedOrder,
        autoHours,
        onClose: () => setSelectedOrder(null)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Snackbar,
      {
        open: snackbar.open,
        autoHideDuration: 4e3,
        onClose: () => setSnackbar({ open: false, msg: "" }),
        message: snackbar.msg
      }
    )
  ] });
};
export {
  VendorOrderConfirmList as default
};
