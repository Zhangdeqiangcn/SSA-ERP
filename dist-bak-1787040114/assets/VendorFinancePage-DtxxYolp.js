import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, aL as Chip, aP as Paper, c2 as Tabs, c3 as Tab, aD as AccountBalance, ac as ReceiptIcon, bk as Button, bf as Add, bK as Stack, cU as Snackbar, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, b7 as Dialog, b8 as DialogTitle, i as Divider, ba as DialogContent, bX as Grid, bC as DialogActions, bj as Alert, L as List, l as ListItem, q as ListItemText, db as Checkbox, bt as TextField, aJ as IconButton, bc as Delete, bu as Send, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, dc as PictureAsPdf, bV as CheckCircle, _ as VerifiedUser, bd as Print } from "./vendor-DGU5TO-x.js";
import { D as DataTable } from "./DataTable-ct0NJFvm.js";
import { F as FilterBar } from "./FilterBar-s9qV5iff.js";
import { m as useFlowStore, f as useFinanceStore } from "./index-DeeqqmHA.js";
import { f as formatCurrency, a as formatDate } from "./format-DnEevvSX.js";
import { g as getVendorPortalIdentity } from "./vendorPortalIdentity-tcmgVxZu.js";
import "./StatusBadge-DeJuhK-R.js";
const identity = getVendorPortalIdentity();
const DEFAULT_VENDOR_ID = (identity == null ? void 0 : identity.vendorId) || "ven-001";
const DEFAULT_VENDOR_NAME = (identity == null ? void 0 : identity.vendorName) || "上海宝钢钢铁贸易有限公司";
const VENDOR_TAX_NO = "91310115SHBAOGANG88";
const BUYER_NAME = "SSA制造有限公司";
const BUYER_TAX_ID = "91310115XXXXXXXXXX";
const BUYER_ADDRESS = "上海市浦东新区工业园区88号";
const BUYER_BANK = "中国工商银行浦东新区支行";
const BUYER_BANK_ACCOUNT = "6222031234567890001";
const nowStr = () => {
  const d = /* @__PURE__ */ new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const todayStr = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const genId = (prefix) => `${prefix}${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
const round2 = (n) => Math.round(n * 100) / 100;
const statementStatusMap = {
  draft: { label: "草稿", color: "default" },
  submitted: { label: "待审批", color: "warning" },
  reviewing: { label: "审批中", color: "info" },
  sent: { label: "已发送", color: "info" },
  confirmed: { label: "已确认/已审批", color: "success" },
  disputed: { label: "有争议", color: "error" },
  closed: { label: "已结清", color: "success" }
};
const invoiceStatusMap = {
  draft: { label: "草稿", color: "default" },
  pending: { label: "待发起", color: "warning" },
  submitted: { label: "待客户同意", color: "info" },
  approved: { label: "客户已同意", color: "success" },
  issued: { label: "已开票", color: "success" },
  received: { label: "已收票", color: "success" },
  verified: { label: "已认证", color: "success" },
  rejected: { label: "已退回", color: "error" }
};
const invoiceTypeLabel = {
  vat_special: "增值税专用发票",
  vat_normal: "增值税普通发票",
  electronic: "电子发票",
  receipt: "收据"
};
const lineAmount = (r) => r.qty * r.unitPrice;
const lineTax = (r) => lineAmount(r) * r.taxRate / 100;
const lineTotal = (r) => lineAmount(r) + lineTax(r);
function StatementPanel() {
  const {
    vendorStatements,
    deliveryShipments,
    addVendorStatement,
    updateVendorStatement
  } = useFlowStore();
  const [filterData, setFilterData] = reactExports.useState({});
  const [detailOpen, setDetailOpen] = reactExports.useState(null);
  const [createOpen, setCreateOpen] = reactExports.useState(false);
  const [snackbarMsg, setSnackbarMsg] = reactExports.useState("");
  const [invoiceFrom, setInvoiceFrom] = reactExports.useState(null);
  const candidateShips = reactExports.useMemo(
    () => deliveryShipments.filter((s) => s.status === "signed" || s.status === "arrived"),
    [deliveryShipments]
  );
  const columns = reactExports.useMemo(() => [
    {
      accessorKey: "statementNo",
      header: "对账单号",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Typography,
        {
          variant: "body2",
          sx: { color: "#3B82F6", fontWeight: 600, fontFamily: "monospace", cursor: "pointer" },
          onClick: () => setDetailOpen(row.original),
          children: row.original.statementNo
        }
      )
    },
    { accessorKey: "vendorName", header: "供应商" },
    { accessorKey: "statementPeriod", header: "对账周期", cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.statementPeriod }) },
    {
      accessorKey: "subtotal",
      header: "金额合计",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 700, sx: { color: "#1E293B" }, children: formatCurrency(row.original.subtotal) })
    },
    {
      accessorKey: "taxTotal",
      header: "税额",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#10B981" }, children: formatCurrency(row.original.taxTotal) })
    },
    {
      accessorKey: "grandTotal",
      header: "价税合计",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, sx: { color: "#F59E0B" }, children: formatCurrency(row.original.grandTotal) })
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const s = statementStatusMap[row.original.status];
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: s == null ? void 0 : s.label, size: "small", color: (s == null ? void 0 : s.color) || "default", sx: { fontWeight: 600 } });
      }
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(StatementActions, { row: row.original, onMsg: setSnackbarMsg, onInvoice: (st) => setInvoiceFrom(st) })
    }
  ], []);
  const filteredData = reactExports.useMemo(() => {
    let data = [...vendorStatements];
    if (filterData.statementNo) data = data.filter((d) => d.statementNo.includes(filterData.statementNo));
    if (filterData.status) data = data.filter((d) => d.status === filterData.status);
    return data;
  }, [filterData, vendorStatements]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 700, children: "对账单管理" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "勾选已发货订单或空白新建发起对账单；审批通过后即可发起开票申请" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => setCreateOpen(true), children: "发起对账单" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 2, sx: { mb: 3 }, children: [
      { label: "金额合计", amount: vendorStatements.reduce((s, d) => s + d.subtotal, 0), color: "#1E293B" },
      { label: "税额", amount: vendorStatements.reduce((s, d) => s + d.taxTotal, 0), color: "#10B981" },
      { label: "价税合计", amount: vendorStatements.reduce((s, d) => s + d.grandTotal, 0), color: "#F59E0B" }
    ].map(({ label, amount, color }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { flex: 1, p: 2, borderRadius: 3, bgcolor: "#F8FAFC" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 700, sx: { color }, children: formatCurrency(amount) })
    ] }, label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: [
      { name: "statementNo", label: "对账单号", type: "text" },
      {
        name: "status",
        label: "状态",
        type: "select",
        options: [{ value: "", label: "全部" }, ...Object.entries(statementStatusMap).map(([v, { label }]) => ({ value: v, label }))]
      }
    ], onFilter: setFilterData }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DataTable, { data: filteredData, columns, enableRowSelection: true, enablePagination: true, enableExport: true }),
    detailOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(StatementDetailDialog, { statement: detailOpen, onClose: () => setDetailOpen(null) }),
    createOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      StatementCreateDialog,
      {
        candidateShips,
        onClose: () => setCreateOpen(false),
        onSubmit: (st) => {
          addVendorStatement(st);
          setCreateOpen(false);
          setSnackbarMsg("对账单已提交，自动流转至采购/财务审批");
        },
        onDraft: (st) => {
          addVendorStatement(st);
          setCreateOpen(false);
          setSnackbarMsg("对账单已存为草稿");
        }
      }
    ),
    invoiceFrom && /* @__PURE__ */ jsxRuntimeExports.jsx(InvoiceRequestCreateDialog, { initialStatement: invoiceFrom, open: true, onClose: () => setInvoiceFrom(null) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Snackbar, { open: Boolean(snackbarMsg), autoHideDuration: 3e3, onClose: () => setSnackbarMsg(""), message: snackbarMsg })
  ] });
}
function StatementActions({ row, onMsg, onInvoice }) {
  const { updateVendorStatement } = useFlowStore();
  if (row.status === "draft")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "contained", onClick: () => {
      updateVendorStatement(row.id, { status: "submitted", updatedAt: nowStr() });
      onMsg("对账单已提交，待采购/财务审批");
    }, children: "提交审批" });
  if (row.status === "submitted" || row.status === "reviewing")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "contained", color: "warning", onClick: () => {
      updateVendorStatement(row.id, { status: "confirmed", updatedAt: nowStr() });
      onMsg("已模拟采购/财务审批通过");
    }, children: "模拟审批通过" });
  if (row.status === "sent") {
    const confirmAmount = (row.items || []).reduce((s, it) => s + (it.amount || 0), 0);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "contained", color: "success", "data-testid": "vendor-statement-confirm", onClick: () => {
      updateVendorStatement(row.id, { status: "confirmed", vendorConfirmedAt: nowStr(), updatedAt: nowStr() });
      useFinanceStore.getState().confirmReconciliation({
        statementNo: row.statementNo,
        vendorId: row.vendorId,
        vendorName: row.vendorName,
        period: row.statementPeriod,
        amount: confirmAmount
      });
      onMsg("已确认对账无误");
    }, children: "确认对账" });
  }
  if (row.status === "confirmed")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "contained", color: "primary", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptIcon, {}), onClick: () => onInvoice(row), children: "发起开票" });
  if (row.status === "closed")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "已结清", size: "small", color: "success" });
  return null;
}
function StatementDetailDialog({ statement, onClose }) {
  var _a, _b, _c;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: true, maxWidth: "md", fullWidth: true, onClose, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { sx: { fontWeight: 600 }, children: [
      "对账单详情 · ",
      statement.statementNo
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 4, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "供应商" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { children: statement.vendorName })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 4, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "对账周期" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { children: statement.statementPeriod })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 4, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "状态" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: (_a = statementStatusMap[statement.status]) == null ? void 0 : _a.label, size: "small", color: ((_b = statementStatusMap[statement.status]) == null ? void 0 : _b.color) || "default" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, sx: { borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "采购订单号" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "数量" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "单价" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "金额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "税率" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "价税合计" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "入库日期" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "开票" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: (_c = statement.items) == null ? void 0 : _c.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: item.purchaseOrderNo }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 0.3, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: item.materialCode, size: "small", sx: { bgcolor: "#EFF6FF", color: "#1D4ED8", fontFamily: "monospace", fontSize: "0.7rem", width: "fit-content" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: item.materialName })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
            item.qty,
            " ",
            item.unit
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(item.unitPrice) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: formatCurrency(item.amount) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
            item.taxRate,
            "%"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(item.totalAmount) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: formatDate(item.inboundDate) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.invoiced ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "success", label: item.invoiceNo || "已开" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "default", label: "未开" }) })
        ] }, item.id)) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 2, textAlign: "right" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
          "金额合计：",
          formatCurrency(statement.subtotal),
          "　税额：",
          formatCurrency(statement.taxTotal)
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "h6", fontWeight: 700, children: [
          "价税合计：",
          formatCurrency(statement.grandTotal)
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogActions, { sx: { p: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onClose, children: "关闭" }) })
  ] });
}
function StatementCreateDialog({ candidateShips, onClose, onSubmit, onDraft }) {
  const [selectedShips, setSelectedShips] = reactExports.useState([]);
  const [rows, setRows] = reactExports.useState([]);
  const [period, setPeriod] = reactExports.useState(`${(/* @__PURE__ */ new Date()).getFullYear()}-${String((/* @__PURE__ */ new Date()).getMonth() + 1).padStart(2, "0")}`);
  const toggleShip = (ship) => {
    if (selectedShips.includes(ship.id)) {
      setSelectedShips(selectedShips.filter((id) => id !== ship.id));
      setRows(rows.filter((r) => r._shipId !== ship.id));
    } else {
      setSelectedShips([...selectedShips, ship.id]);
      const newRows = ship.items.map((it) => ({
        id: genId("vsi"),
        _shipId: ship.id,
        purchaseOrderNo: ship.purchaseOrderNo,
        inboundNo: ship.inboundOrderId || "",
        materialCode: it.materialCode,
        materialName: it.materialName,
        specification: it.specification,
        unit: it.unit,
        qty: it.shippedQty,
        unitPrice: 0,
        taxRate: 13
      }));
      setRows([...rows, ...newRows]);
    }
  };
  const updateRow = (id, patch) => setRows(rows.map((r) => r.id === id ? { ...r, ...patch } : r));
  const addBlank = () => setRows([...rows, { id: genId("vsi"), purchaseOrderNo: "", inboundNo: "", materialCode: "", materialName: "", specification: "", unit: "", qty: 1, unitPrice: 0, taxRate: 13 }]);
  const removeRow = (id) => setRows(rows.filter((r) => r.id !== id));
  const build = (status) => {
    const items = rows.map((r) => ({
      id: r.id,
      purchaseOrderNo: r.purchaseOrderNo,
      inboundNo: r.inboundNo,
      materialCode: r.materialCode,
      materialName: r.materialName,
      specification: r.specification,
      unit: r.unit,
      qty: r.qty,
      unitPrice: r.unitPrice,
      amount: round2(lineAmount(r)),
      inboundDate: todayStr(),
      taxRate: r.taxRate,
      taxAmount: round2(lineTax(r)),
      totalAmount: round2(lineTotal(r)),
      invoiced: false
    }));
    return {
      id: genId("vs"),
      statementNo: genId("VS"),
      vendorId: DEFAULT_VENDOR_ID,
      vendorName: DEFAULT_VENDOR_NAME,
      statementPeriod: period,
      items,
      subtotal: round2(items.reduce((s, i) => s + i.amount, 0)),
      taxTotal: round2(items.reduce((s, i) => s + i.taxAmount, 0)),
      grandTotal: round2(items.reduce((s, i) => s + i.totalAmount, 0)),
      status,
      createdAt: nowStr(),
      updatedAt: nowStr(),
      createdBy: DEFAULT_VENDOR_ID,
      updatedBy: DEFAULT_VENDOR_ID
    };
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: true, onClose, maxWidth: "lg", fullWidth: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { sx: { fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AccountBalance, { color: "primary" }),
      " 发起对账单"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { sx: { pt: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "勾选「已发货/已签收」订单自动带入物料行，也可手工新增空白行。提交后金额、数量、税率均可修改。" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 4, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 700, gutterBottom: true, children: "① 选择已发货订单" }),
          candidateShips.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "暂无已发货/已签收订单" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(List, { dense: true, sx: { maxHeight: 360, overflow: "auto", bgcolor: "#F8FAFC", borderRadius: 2 }, children: candidateShips.map((ship) => /* @__PURE__ */ jsxRuntimeExports.jsx(ListItem, { secondaryAction: /* @__PURE__ */ jsxRuntimeExports.jsx(Checkbox, { edge: "end", checked: selectedShips.includes(ship.id), onChange: () => toggleShip(ship) }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            ListItemText,
            {
              primary: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontFamily: "monospace", children: [
                ship.shipmentNo,
                " · ",
                ship.purchaseOrderNo
              ] }),
              secondary: `${ship.vendorName} · ${ship.items.length} 项物料`
            }
          ) }, ship.id)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 8, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", sx: { mb: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 700, children: "② 对账单明细（可编辑）" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { size: "small", label: "对账周期", value: period, onChange: (e) => setPeriod(e.target.value), sx: { width: 130 } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: addBlank, children: "空白行" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, sx: { borderRadius: 2, maxHeight: 340, overflow: "auto" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", stickyHeader: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { width: 70 }, children: "数量" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { width: 90 }, children: "单价" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { width: 60 }, children: "税率%" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { width: 90 }, children: "价税合计" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { width: 36 } })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
              rows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "请选择左侧订单或新增空白行" }) }) }),
              rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { size: "small", value: r.materialName, placeholder: "物料名称", onChange: (e) => updateRow(r.id, { materialName: e.target.value }), sx: { width: 140, mb: 0.5 } }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { size: "small", value: r.materialCode, placeholder: "物料编码", onChange: (e) => updateRow(r.id, { materialCode: e.target.value }), sx: { width: 140 } })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { size: "small", type: "number", value: r.qty, onChange: (e) => updateRow(r.id, { qty: Number(e.target.value) }), sx: { width: 64 } }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { size: "small", type: "number", value: r.unitPrice, onChange: (e) => updateRow(r.id, { unitPrice: Number(e.target.value) }), sx: { width: 80 } }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { size: "small", type: "number", value: r.taxRate, onChange: (e) => updateRow(r.id, { taxRate: Number(e.target.value) }), sx: { width: 52 } }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: formatCurrency(lineTotal(r)) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => removeRow(r.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) })
              ] }, r.id))
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mt: 1, textAlign: "right" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
            "金额合计：",
            formatCurrency(round2(rows.reduce((s, r) => s + lineAmount(r), 0))),
            "　价税合计：",
            formatCurrency(round2(rows.reduce((s, r) => s + lineTotal(r), 0)))
          ] }) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { p: 2, gap: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onClose, children: "取消" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", disabled: rows.length === 0, onClick: () => onDraft(build("draft")), children: "存为草稿" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, {}), disabled: rows.length === 0, onClick: () => onSubmit(build("submitted")), children: "提交审批" })
    ] })
  ] });
}
function InvoiceRequestPanel() {
  const {
    vendorInvoiceRequests,
    vendorStatements,
    addVendorInvoiceRequest,
    updateVendorInvoiceRequest
  } = useFlowStore();
  const { invoices } = useFinanceStore();
  const [filterData, setFilterData] = reactExports.useState({});
  const [createOpen, setCreateOpen] = reactExports.useState(false);
  const [issueOpen, setIssueOpen] = reactExports.useState(null);
  const [snackbarMsg, setSnackbarMsg] = reactExports.useState("");
  const myInvoices = reactExports.useMemo(
    () => invoices.filter((i) => i.vendorName === DEFAULT_VENDOR_NAME),
    [invoices]
  );
  const columns = reactExports.useMemo(() => [
    {
      accessorKey: "requestNo",
      header: "申请单号",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#3B82F6", fontWeight: 600, fontFamily: "monospace" }, children: row.original.requestNo })
    },
    { accessorKey: "vendorName", header: "供应商" },
    {
      accessorKey: "statementNo",
      header: "对账单号",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", color: "text.secondary", children: row.original.statementNo })
    },
    {
      accessorKey: "invoiceType",
      header: "发票类型",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: invoiceTypeLabel[row.original.invoiceType] || row.original.invoiceType, size: "small" })
    },
    {
      accessorKey: "invoiceAmount",
      header: "开票金额",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 700, children: formatCurrency(row.original.invoiceAmount) })
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const s = invoiceStatusMap[row.original.status];
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: s == null ? void 0 : s.label, size: "small", color: (s == null ? void 0 : s.color) || "default", sx: { fontWeight: 600 } });
      }
    },
    {
      accessorKey: "submittedAt",
      header: "申请时间",
      cell: ({ row }) => row.original.submittedAt ? formatDate(row.original.submittedAt) : row.original.createdAt ? formatDate(row.original.createdAt) : "-"
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(InvoiceRequestActions, { row: row.original, onMsg: setSnackbarMsg, onIssue: (r) => setIssueOpen(r) })
    }
  ], []);
  const filteredData = reactExports.useMemo(() => {
    let data = [...vendorInvoiceRequests];
    if (filterData.requestNo) data = data.filter((d) => d.requestNo.includes(filterData.requestNo));
    if (filterData.status) data = data.filter((d) => d.status === filterData.status);
    return data;
  }, [filterData, vendorInvoiceRequests]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 700, children: "开票申请" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "对账审批通过后在此发起开票申请，客户同意后即可开具发票并登记台账。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => setCreateOpen(true), children: "发起开票申请" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: [
      { name: "requestNo", label: "申请单号", type: "text" },
      {
        name: "status",
        label: "状态",
        type: "select",
        options: [{ value: "", label: "全部" }, ...Object.entries(invoiceStatusMap).map(([v, { label }]) => ({ value: v, label }))]
      }
    ], onFilter: setFilterData }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DataTable, { data: filteredData, columns, enableRowSelection: true, enablePagination: true, enableExport: true }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 700, sx: { mt: 4, mb: 1 }, children: "已开具发票（财务台账）" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, sx: { borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "发票号码" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "类型" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "不含税金额" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "税额" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "价税合计" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "开票日期" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
        myInvoices.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 7, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "暂无已开具发票" }) }) }),
        myInvoices.map((inv) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: inv.invoiceNo }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: invoiceTypeLabel[inv.invoiceType] || inv.invoiceType }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(inv.amount) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(inv.taxAmount) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: formatCurrency(inv.totalAmount) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: formatDate(inv.invoiceDate) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "success", label: "已登记" }) })
        ] }, inv.id))
      ] })
    ] }) }),
    createOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(InvoiceRequestCreateDialog, { open: true, onClose: () => setCreateOpen(false) }),
    issueOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(InvoiceIssueDialog, { request: issueOpen, open: true, onClose: () => setIssueOpen(null) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Snackbar, { open: Boolean(snackbarMsg), autoHideDuration: 3e3, onClose: () => setSnackbarMsg(""), message: snackbarMsg })
  ] });
}
function InvoiceRequestActions({ row, onMsg, onIssue }) {
  var _a, _b;
  const { updateVendorInvoiceRequest } = useFlowStore();
  if (row.status === "draft")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "contained", onClick: () => {
      updateVendorInvoiceRequest(row.id, { status: "submitted", submittedAt: nowStr(), updatedAt: nowStr() });
      onMsg("开票申请已提交，待客户同意");
    }, children: "提交" });
  if (row.status === "pending")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "contained", color: "warning", onClick: () => {
      updateVendorInvoiceRequest(row.id, { status: "submitted", submittedAt: nowStr(), updatedAt: nowStr() });
      onMsg("已立即发起开票申请");
    }, children: "立即发起" });
  if (row.status === "submitted")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "contained", color: "success", onClick: () => {
      updateVendorInvoiceRequest(row.id, { status: "approved", updatedAt: nowStr() });
      onMsg("已模拟客户同意，可开具发票");
    }, children: "模拟客户同意" });
  if (row.status === "approved")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "contained", color: "primary", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(PictureAsPdf, {}), onClick: () => onIssue(row), children: "开票" });
  if (row.status === "issued")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "success", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}), label: row.invoiceNo || "已开票" });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: ((_a = invoiceStatusMap[row.status]) == null ? void 0 : _a.label) || row.status, color: ((_b = invoiceStatusMap[row.status]) == null ? void 0 : _b.color) || "default" });
}
function InvoiceRequestCreateDialog({ initialStatement, open, onClose }) {
  const { vendorStatements, addVendorInvoiceRequest } = useFlowStore();
  const [statementId, setStatementId] = reactExports.useState("");
  const [invoiceType, setInvoiceType] = reactExports.useState("vat_special");
  const [scheduleAt, setScheduleAt] = reactExports.useState("");
  const confirmedStatements = reactExports.useMemo(
    () => vendorStatements.filter((s) => s.status === "confirmed" || s.status === "sent"),
    [vendorStatements]
  );
  const target = initialStatement || confirmedStatements.find((s) => s.id === statementId) || null;
  reactExports.useEffect(() => {
    if (initialStatement) {
      setStatementId(initialStatement.id);
    } else {
      setStatementId("");
    }
    setScheduleAt("");
    setInvoiceType("vat_special");
  }, [open, initialStatement]);
  const handleSubmit = (asSchedule) => {
    var _a;
    if (!target) return;
    const req = {
      id: genId("vir"),
      requestNo: genId("VIR"),
      vendorId: DEFAULT_VENDOR_ID,
      vendorName: DEFAULT_VENDOR_NAME,
      statementId: target.id,
      statementNo: target.statementNo,
      invoiceType,
      taxRate: ((_a = target.items[0]) == null ? void 0 : _a.taxRate) ?? 13,
      invoiceAmount: target.subtotal,
      taxAmount: target.taxTotal,
      totalAmount: target.grandTotal,
      buyerName: BUYER_NAME,
      buyerTaxId: BUYER_TAX_ID,
      buyerAddress: BUYER_ADDRESS,
      buyerBank: BUYER_BANK,
      buyerBankAccount: BUYER_BANK_ACCOUNT,
      items: target.items.map((i) => ({ description: `${i.materialName} ${i.specification}`, unit: i.unit, qty: i.qty, unitPrice: i.unitPrice, amount: i.amount })),
      status: asSchedule ? "pending" : "submitted",
      scheduledAt: asSchedule ? scheduleAt : void 0,
      createdAt: nowStr(),
      updatedAt: nowStr(),
      createdBy: DEFAULT_VENDOR_ID,
      updatedBy: DEFAULT_VENDOR_ID
    };
    addVendorInvoiceRequest(req);
    onClose();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: true, onClose, maxWidth: "sm", fullWidth: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { sx: { fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptIcon, { color: "primary" }),
      " 发起开票申请"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { sx: { pt: 2 }, children: [
      !initialStatement && confirmedStatements.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", sx: { mb: 2 }, children: "暂无已审批通过的对账单，请先在「对账单管理」发起并审批通过。" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", disabled: Boolean(initialStatement), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "关联对账单 *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: statementId, label: "关联对账单 *", onChange: (e) => setStatementId(e.target.value), children: confirmedStatements.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: s.id, children: [
            s.statementNo,
            "（",
            formatCurrency(s.grandTotal),
            "）"
          ] }, s.id)) })
        ] }) }),
        target && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", children: [
          "对账单 ",
          target.statementNo,
          "　价税合计 ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: formatCurrency(target.grandTotal) }),
          "　税额 ",
          formatCurrency(target.taxTotal)
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "发票类型 *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: invoiceType, label: "发票类型 *", onChange: (e) => setInvoiceType(e.target.value), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "vat_special", children: "增值税专用发票" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "vat_normal", children: "增值税普通发票" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "electronic", children: "电子发票" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            type: "datetime-local",
            label: "定时发起（可选）",
            value: scheduleAt,
            onChange: (e) => setScheduleAt(e.target.value),
            InputLabelProps: { shrink: true }
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "不填定时时间则立即发起；填后状态为「待发起」，可在列表中「立即发起」。" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { p: 2, gap: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onClose, children: "取消" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", disabled: !target, onClick: () => handleSubmit(true), children: "定时发起" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, {}), disabled: !target, onClick: () => handleSubmit(false), children: "立即发起" })
    ] })
  ] });
}
function InvoiceIssueDialog({ request, open, onClose }) {
  const { addInvoice } = useFinanceStore();
  const { vendorStatements, updateVendorInvoiceRequest, updateVendorStatement } = useFlowStore();
  const [snack, setSnack] = reactExports.useState("");
  const [done, setDone] = reactExports.useState(false);
  const handleIssue = (isPrint) => {
    if (done) return;
    const invoiceNo = "FP" + Date.now().toString().slice(-10);
    const invoiceCode = String(Date.now()).slice(-12);
    const inv = {
      id: genId("inv"),
      invoiceNo,
      invoiceType: request.invoiceType === "electronic" ? "vat_normal" : request.invoiceType,
      status: "submitted",
      vendorName: request.vendorName,
      vendorTaxNo: VENDOR_TAX_NO,
      purchaseOrderNo: request.statementNo,
      invoiceDate: nowStr(),
      receivedDate: "",
      amount: request.invoiceAmount,
      taxRate: request.taxRate,
      taxAmount: request.taxAmount,
      totalAmount: request.totalAmount,
      createdAt: nowStr(),
      updatedAt: nowStr(),
      createdBy: DEFAULT_VENDOR_ID,
      updatedBy: DEFAULT_VENDOR_ID,
      note: `对账单 ${request.statementNo}`
    };
    addInvoice(inv);
    updateVendorInvoiceRequest(request.id, { status: "issued", invoiceNo, invoiceCode, issuedAt: nowStr(), updatedAt: nowStr() });
    const st = vendorStatements.find((s) => s.id === request.statementId);
    if (st) {
      const newItems = st.items.map((i) => ({ ...i, invoiced: true, invoiceNo }));
      const allInvoiced = newItems.length > 0 && newItems.every((i) => i.invoiced);
      updateVendorStatement(st.id, { items: newItems, status: allInvoiced ? "closed" : st.status, updatedAt: nowStr() });
    }
    setDone(true);
    setSnack(`发票已开具并登记：${invoiceNo}`);
    if (isPrint) {
      setTimeout(() => window.print(), 300);
    }
    setTimeout(() => onClose(), 1500);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: true, onClose: done ? onClose : () => {
  }, maxWidth: "sm", fullWidth: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { sx: { fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PictureAsPdf, { color: "primary" }),
      " 发票开具预览"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { sx: { pt: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 3, borderRadius: 2, bgcolor: "#FFFDF7", borderColor: "#E2C044" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", sx: { borderBottom: "2px dashed #E2C044", pb: 1, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "h6", fontWeight: 800, sx: { color: "#B45309" }, children: [
            "增值税",
            request.invoiceType === "vat_special" ? "专用" : "普通",
            "发票"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(VerifiedUser, {}), color: "primary", label: "发票预览" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 1, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "发票代码" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: String(Date.now()).slice(-12) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "开票日期" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: formatDate(nowStr()) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "购买方（客户）" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: BUYER_NAME }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", fontFamily: "monospace", children: BUYER_TAX_ID })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "销售方（供应商）" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: request.vendorName }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", fontFamily: "monospace", children: VENDOR_TAX_NO })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { sx: { mt: 2, border: "1px solid #E2C044", borderRadius: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#FDF6E3" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "货物或应税劳务名称" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "数量" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "单价" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "金额" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "税率" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "税额" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: request.items.map((it, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: it.description }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
              it.qty,
              " ",
              it.unit
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(it.unitPrice) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(it.amount) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
              request.taxRate,
              "%"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(it.amount * request.taxRate / 100) })
          ] }, idx)) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", justifyContent: "flex-end", spacing: 3, sx: { mt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
          "价税合计：",
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: formatCurrency(request.totalAmount) })
        ] }) })
      ] }),
      snack && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "success", sx: { mt: 2 }, children: snack })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { p: 2, gap: 1 }, children: [
      !done && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Print, {}), onClick: () => handleIssue(true), children: "打印纸质发票" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(PictureAsPdf, {}), onClick: () => handleIssue(false), children: "开电子票" })
      ] }),
      done && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: onClose, children: "完成" })
    ] })
  ] });
}
const VendorFinancePage = () => {
  const [tab, setTab] = reactExports.useState(0);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1.5, mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, sx: { color: "#1E293B" }, children: "财务管理" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "primary", variant: "outlined", "data-testid": "portal-current-vendor", label: (identity == null ? void 0 : identity.vendorName) || DEFAULT_VENDOR_NAME })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { mb: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tab, onChange: (_, v) => setTab(v), sx: { px: 2, borderBottom: "1px solid #E2E8F0" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "对账单管理", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AccountBalance, { fontSize: "small" }), iconPosition: "start" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "开票申请", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptIcon, { fontSize: "small" }), iconPosition: "start" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 2 }, children: [
      tab === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(StatementPanel, {}),
      tab === 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(InvoiceRequestPanel, {})
    ] })
  ] });
};
export {
  VendorFinancePage as default
};
