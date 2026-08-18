import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { m as Box, T as Typography, bl as Alert, bm as Button, dG as default_1, cD as TableContainer, aS as Paper, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aO as Chip, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bv as TextField, aR as MenuItem, bE as DialogActions } from "./vendor-mui-DsZGB15g.js";
import { u as useSalesAdvancedStore } from "./salesAdvancedStore-BUVrzeLF.js";
import { e as useSalesStore } from "./index-CU2cqxc8.js";
import "./vendor-t9csHBDX.js";
import "./vendor-date-DI3D_gXa.js";
const STATUS_LABEL = {
  draft: "草稿",
  issued: "已开票",
  cancelled: "已作废"
};
function SalesInvoicePage() {
  const { salesInvoices, addInvoice, issueInvoice } = useSalesAdvancedStore();
  const { salesOrders } = useSalesStore();
  const [open, setOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({ salesOrderNo: "", invoiceDate: "2026-07-15" });
  const selectedSO = reactExports.useMemo(
    () => salesOrders.find((o) => o.orderNo === form.salesOrderNo),
    [salesOrders, form.salesOrderNo]
  );
  const handleAdd = () => {
    if (!selectedSO) return;
    const taxRate = selectedSO.taxRate || 13;
    const items = selectedSO.items.map((it) => {
      const amount2 = (it.quantity - (it.deliveredQuantity || 0)) * it.unitPrice;
      return {
        id: `ivi-${it.id}`,
        materialId: it.materialId,
        materialCode: it.materialCode,
        materialName: it.materialName,
        quantity: it.quantity - (it.deliveredQuantity || 0),
        unitPrice: it.unitPrice,
        amount: amount2,
        taxRate,
        taxAmount: Math.round(amount2 * taxRate) / 100
      };
    });
    const amount = items.reduce((s, i) => s + i.amount, 0);
    const taxAmount = items.reduce((s, i) => s + i.taxAmount, 0);
    const inv = {
      id: `inv-${Date.now()}`,
      invoiceNo: `INV-2026-${Date.now()}`,
      invoiceType: "sales",
      salesOrderNo: selectedSO.orderNo,
      customerName: selectedSO.customerName,
      status: "draft",
      invoiceDate: form.invoiceDate,
      currency: "CNY",
      items,
      amount,
      taxAmount,
      totalAmount: amount + taxAmount,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: "当前用户",
      updatedBy: "当前用户"
    };
    addInvoice(inv);
    setOpen(false);
    setForm({ salesOrderNo: "", invoiceDate: "2026-07-15" });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "sales-invoice", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "销售开票（应收）" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "基于销售订单开票，开票后自动生成应收(AR)凭证（借应收账款 / 贷主营业务收入 / 贷销项税）。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "invoice-add", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), onClick: () => setOpen(true), sx: { mb: 2 }, children: "新增开票" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "发票号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "销售订单" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "客户" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "含税金额" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "凭证" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: salesInvoices.map((inv) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "invoice-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: inv.invoiceNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: inv.salesOrderNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: inv.customerName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: inv.totalAmount.toLocaleString() }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: STATUS_LABEL[inv.status], color: inv.status === "issued" ? "success" : "default" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: inv.voucherNo || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: inv.status === "draft" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", "data-testid": "invoice-issue", onClick: () => issueInvoice(inv.id), children: "开票" }) })
      ] }, inv.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增销售开票" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            select: true,
            label: "销售订单",
            value: form.salesOrderNo,
            onChange: (e) => setForm({ ...form, salesOrderNo: e.target.value }),
            children: salesOrders.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: o.orderNo, children: [
              o.orderNo,
              " ",
              o.customerName
            ] }, o.id))
          }
        ),
        selectedSO && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mt: 1 }, children: [
          "客户：",
          selectedSO.customerName,
          "；行项目 ",
          selectedSO.items.length,
          " 项"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "开票日期",
            type: "date",
            value: form.invoiceDate,
            onChange: (e) => setForm({ ...form, invoiceDate: e.target.value }),
            InputLabelProps: { shrink: true }
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "invoice-add-confirm", onClick: handleAdd, children: "保存" })
      ] })
    ] })
  ] });
}
export {
  SalesInvoicePage as default
};
