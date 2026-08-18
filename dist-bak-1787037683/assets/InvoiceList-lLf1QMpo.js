import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bk as Button, e1 as default_1, bX as Grid, fq as default_1$1, f6 as default_1$2, bq as Card, br as CardContent, bt as TextField, bP as InputAdornment, cx as default_1$3, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bC as DialogActions, bj as Alert, aL as Chip, fr as default_1$4 } from "./vendor-46QZWBd3.js";
import { D as DataTable } from "./DataTable-vc5G5ARo.js";
import { f as useFinanceStore } from "./index-CcOZBoQL.js";
import { F as FlowTracker } from "./FlowTracker-C0aNMuXm.js";
import { u as useFinanceExtensionStore, B as BASE_CURRENCY_CODE, c as convertCurrency } from "./financeExtensionStore-DcH2weuS.js";
import "./StatusBadge-Db1uY4YU.js";
const STATUS_CONFIG = {
  draft: { label: "草稿", color: "default" },
  submitted: { label: "待验证", color: "warning" },
  verified: { label: "已验证", color: "info" },
  paid: { label: "已付款", color: "success" },
  cancelled: { label: "已作废", color: "error" }
};
const TYPE_CONFIG = {
  vat_special: "增值税专用发票",
  vat_normal: "增值税普通发票",
  receipt: "收据"
};
function InvoiceList() {
  const { invoices, financeStats, addInvoice, generateVoucherFromInvoice } = useFinanceStore();
  const { exchangeRates } = useFinanceExtensionStore();
  const [search, setSearch] = reactExports.useState("");
  const [statusFilter, setStatusFilter] = reactExports.useState("all");
  const [selectedInv, setSelectedInv] = reactExports.useState(null);
  const [detailOpen, setDetailOpen] = reactExports.useState(false);
  const [voucherMsg, setVoucherMsg] = reactExports.useState(null);
  const [createOpen, setCreateOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({
    invoiceNo: "",
    invoiceType: "vat_special",
    vendorName: "",
    vendorTaxNo: "",
    purchaseOrderNo: "",
    invoiceDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    amount: 0,
    taxRate: 13,
    status: "submitted"
  });
  const filtered = invoices.filter((inv) => {
    const matchSearch = !search || inv.invoiceNo.includes(search) || inv.vendorName.includes(search);
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const handleViewDetail = (inv) => {
    setSelectedInv(inv);
    setVoucherMsg(null);
    setDetailOpen(true);
  };
  const handleGenVoucher = () => {
    if (!selectedInv) return;
    const v = generateVoucherFromInvoice(selectedInv.id);
    setVoucherMsg(v ? `凭证已生成，凭证号：${v}` : "该发票已生成过凭证（无需重复生成）");
  };
  const columns = [
    {
      id: "invoiceNo",
      header: "发票号",
      accessorFn: (r) => r.invoiceNo,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: row.original.invoiceNo })
    },
    {
      id: "invoiceType",
      header: "发票类型",
      accessorFn: (r) => r.invoiceType,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: TYPE_CONFIG[row.original.invoiceType] })
    },
    {
      id: "vendorName",
      header: "供应商",
      accessorFn: (r) => r.vendorName,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: row.original.vendorName })
    },
    {
      id: "purchaseOrderNo",
      header: "关联采购单",
      accessorFn: (r) => r.purchaseOrderNo,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: row.original.purchaseOrderNo })
    },
    {
      id: "invoiceDate",
      header: "发票日期",
      accessorFn: (r) => r.invoiceDate,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: row.original.invoiceDate })
    },
    {
      id: "amount",
      header: "不含税金额",
      accessorFn: (r) => Number(r.amount) || 0,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { align: "right", children: [
        "¥",
        row.original.amount.toLocaleString()
      ] })
    },
    {
      id: "taxRate",
      header: "税率",
      accessorFn: (r) => Number(r.taxRate) || 0,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { align: "right", children: [
        row.original.taxRate,
        "%"
      ] })
    },
    {
      id: "totalAmount",
      header: "含税总额",
      accessorFn: (r) => Number(r.totalAmount) || 0,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { align: "right", fontWeight: 600, children: [
        "¥",
        row.original.totalAmount.toLocaleString()
      ] })
    },
    {
      id: "currency",
      header: "币种 / 折合" + BASE_CURRENCY_CODE,
      accessorFn: (r) => r.currency || BASE_CURRENCY_CODE,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.currency || BASE_CURRENCY_CODE }),
        row.original.currency && row.original.currency.toUpperCase() !== BASE_CURRENCY_CODE && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
          "折合 ¥",
          convertCurrency(row.original.totalAmount, row.original.currency, exchangeRates).toLocaleString(void 0, { maximumFractionDigits: 2 })
        ] })
      ] })
    },
    {
      id: "status",
      header: "状态",
      accessorFn: (r) => r.status,
      cell: ({ row }) => {
        const sc = STATUS_CONFIG[row.original.status];
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: sc.label, color: sc.color, size: "small" });
      }
    },
    {
      id: "actions",
      header: "操作",
      enableSorting: false,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 0.5, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", onClick: (e) => {
          e.stopPropagation();
          handleViewDetail(row.original);
        }, children: "详情" }),
        row.original.status === "submitted" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$4, {}), color: "success", children: "验证" })
      ] })
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "发票管理" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "invoice", currentStatus: "iv_received" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), size: "small", onClick: () => setCreateOpen(true), children: "新建发票" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [
      { label: "应付账款总额", value: `¥${financeStats.totalPayable.toLocaleString()}`, color: "#1976d2", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, {}) },
      { label: "本月开票金额", value: `¥${financeStats.thisMonthInvoice.toLocaleString()}`, color: "#388e3c", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, {}) },
      { label: "待验证发票", value: `${financeStats.pendingVerify} 张`, color: "#f57c00", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$2, {}) },
      { label: "逾期应付款", value: `¥${financeStats.overdueAmount.toLocaleString()}`, color: "#d32f2f", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$2, {}) }
    ].map((kpi) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 2, "&:last-child": { pb: 2 } }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color: kpi.color }, children: kpi.icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: kpi.label })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, sx: { color: kpi.color }, children: kpi.value })
    ] }) }) }, kpi.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 2, mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          size: "small",
          placeholder: "搜索发票号/供应商",
          value: search,
          onChange: (e) => setSearch(e.target.value),
          InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(InputAdornment, { position: "start", children: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$3, { fontSize: "small" }) }) },
          sx: { width: 280 }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { width: 140 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: statusFilter, label: "状态", onChange: (e) => setStatusFilter(e.target.value), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "all", children: "全部" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "draft", children: "草稿" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "submitted", children: "待验证" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "verified", children: "已验证" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "paid", children: "已付款" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "cancelled", children: "已作废" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DataTable,
      {
        data: filtered,
        columns,
        enableRowSelection: false,
        enablePagination: true,
        enableSorting: true,
        enableColumnFilter: true,
        enableBlockSelect: true,
        enableExport: true,
        exportFormat: "xlsx",
        enableImport: true,
        onImport: (rows) => {
          rows.forEach((r) => {
            const amount = Number(r["不含税金额"] || 0);
            const taxRate = Number(r["税率"] || 0);
            const totalAmount = Number(r["含税总额"] || amount * (1 + taxRate / 100));
            const now = (/* @__PURE__ */ new Date()).toISOString();
            addInvoice({
              id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              invoiceNo: r["发票号"] || `INV${Date.now()}`,
              invoiceType: r["发票类型"] || "vat_special",
              status: r["状态"] || "submitted",
              vendorName: r["供应商"] || "",
              vendorTaxNo: r["税号"] || "",
              purchaseOrderNo: r["关联采购单"] || "",
              invoiceDate: r["发票日期"] || now.slice(0, 10),
              receivedDate: r["收票日期"] || r["发票日期"] || now.slice(0, 10),
              amount,
              taxRate,
              taxAmount: +(amount * taxRate / 100).toFixed(2),
              totalAmount,
              currency: r["币种"] || BASE_CURRENCY_CODE,
              createdAt: now,
              updatedAt: now,
              createdBy: "导入",
              updatedBy: "导入"
            });
          });
        },
        columnConfigKey: "invoice-list"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: detailOpen, onClose: () => setDetailOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
        "发票详情 — ",
        selectedInv == null ? void 0 : selectedInv.invoiceNo
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { dividers: true, children: selectedInv && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, children: [
        { label: "供应商", value: selectedInv.vendorName },
        { label: "税号", value: selectedInv.vendorTaxNo },
        { label: "发票类型", value: TYPE_CONFIG[selectedInv.invoiceType] },
        { label: "状态", value: STATUS_CONFIG[selectedInv.status].label },
        { label: "关联采购单", value: selectedInv.purchaseOrderNo },
        { label: "发票日期", value: selectedInv.invoiceDate },
        { label: "收票日期", value: selectedInv.receivedDate },
        { label: "不含税金额", value: `¥${selectedInv.amount.toLocaleString()}` },
        { label: "税率", value: `${selectedInv.taxRate}%` },
        { label: "税额", value: `¥${selectedInv.taxAmount.toLocaleString()}` },
        { label: "含税总额", value: `¥${selectedInv.totalAmount.toLocaleString()}` },
        ...selectedInv.verifiedBy ? [{ label: "验证人", value: selectedInv.verifiedBy }] : []
      ].map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: row.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: row.value })
      ] }, row.label)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        voucherMsg && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "success", sx: { mr: "auto" }, "data-testid": "voucher-msg", children: voucherMsg }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            "data-testid": "gen-voucher",
            disabled: selectedInv == null ? void 0 : selectedInv.voucherGenerated,
            onClick: handleGenVoucher,
            children: "生成凭证"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDetailOpen(false), children: "关闭" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: createOpen, onClose: () => setCreateOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新建发票" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { dividers: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { pt: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "发票号",
            value: form.invoiceNo,
            onChange: (e) => setForm({ ...form, invoiceNo: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "发票类型" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              label: "发票类型",
              value: form.invoiceType,
              onChange: (e) => setForm({ ...form, invoiceType: e.target.value }),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "vat_special", children: "增值税专用发票" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "vat_normal", children: "增值税普通发票" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "receipt", children: "收据" })
              ]
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "供应商",
            value: form.vendorName,
            onChange: (e) => setForm({ ...form, vendorName: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "税号",
            value: form.vendorTaxNo,
            onChange: (e) => setForm({ ...form, vendorTaxNo: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "关联采购单",
            value: form.purchaseOrderNo,
            onChange: (e) => setForm({ ...form, purchaseOrderNo: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "发票日期",
            type: "date",
            InputLabelProps: { shrink: true },
            value: form.invoiceDate,
            onChange: (e) => setForm({ ...form, invoiceDate: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "不含税金额",
            type: "number",
            value: form.amount,
            onChange: (e) => setForm({ ...form, amount: Number(e.target.value) })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "税率%",
            type: "number",
            value: form.taxRate,
            onChange: (e) => setForm({ ...form, taxRate: Number(e.target.value) })
          }
        ) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setCreateOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: () => {
          const taxAmount = +(form.amount * form.taxRate / 100).toFixed(2);
          addInvoice({
            id: `inv-${Date.now()}`,
            invoiceNo: form.invoiceNo || `INV${Date.now()}`,
            invoiceType: form.invoiceType,
            status: form.status,
            vendorName: form.vendorName,
            vendorTaxNo: form.vendorTaxNo,
            purchaseOrderNo: form.purchaseOrderNo,
            invoiceDate: form.invoiceDate,
            receivedDate: form.invoiceDate,
            amount: form.amount,
            taxRate: form.taxRate,
            taxAmount,
            totalAmount: +(form.amount + taxAmount).toFixed(2),
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            createdBy: "当前用户",
            updatedBy: "当前用户"
          });
          setCreateOpen(false);
        }, children: "创建" })
      ] })
    ] })
  ] });
}
export {
  InvoiceList as default
};
