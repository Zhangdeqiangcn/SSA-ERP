import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bj as Alert, bk as Button, e1 as default_1, cO as TableContainer, aP as Paper, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bt as TextField, aO as MenuItem, bC as DialogActions } from "./vendor-46QZWBd3.js";
import { u as useSalesAdvancedStore } from "./salesAdvancedStore-CA71PkD6.js";
import { u as useMaterialStore, e as useSalesStore } from "./index-CcOZBoQL.js";
const STATUS_LABEL = {
  draft: "草稿",
  submitted: "已提交",
  approved: "已批准",
  lost: "已丢失",
  converted: "已转订单"
};
function QuotationPage() {
  const { quotations, addQuotation, convertQuotationToSO } = useSalesAdvancedStore();
  const { materials } = useMaterialStore();
  const { salesOrders } = useSalesStore();
  const [open, setOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({
    customerName: "东风汽车零部件",
    validUntil: "2026-08-31",
    currency: "CNY",
    salesPerson: "王伟",
    materialId: "",
    quantity: 1e3,
    unitPrice: 42
  });
  const selectedMaterial = reactExports.useMemo(() => materials.find((m) => m.id === form.materialId), [materials, form.materialId]);
  const rows = quotations;
  const genNo = () => `Q-2026-${Date.now()}`;
  const handleAdd = () => {
    if (!selectedMaterial) return;
    const qty = Number(form.quantity);
    const price = Number(form.unitPrice);
    const amount = qty * price;
    const taxRate = 13;
    const taxAmount = Math.round(amount * taxRate) / 100;
    const q = {
      id: `q-${Date.now()}`,
      quotationNo: genNo(),
      customerName: form.customerName,
      status: "draft",
      validUntil: form.validUntil,
      currency: form.currency,
      items: [{
        id: `qi-${Date.now()}`,
        materialId: selectedMaterial.id,
        materialCode: selectedMaterial.code,
        materialName: selectedMaterial.name,
        specification: selectedMaterial.specification,
        unit: selectedMaterial.unit,
        quantity: qty,
        unitPrice: price,
        amount
      }],
      totalAmount: amount,
      taxRate,
      taxAmount,
      grandTotal: amount + taxAmount,
      salesPerson: form.salesPerson,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: "当前用户",
      updatedBy: "当前用户"
    };
    addQuotation(q);
    setOpen(false);
    setForm({ ...form, materialId: "", quantity: 1e3, unitPrice: 42 });
  };
  const handleConvert = (q) => {
    const soId = convertQuotationToSO(q.id);
    if (soId) {
      salesOrders.find((x) => x.id === soId);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "quotation", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "销售报价单" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "报价单可一键转为销售订单（SO），形成报价→订单→工单→发货的完整链路。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "quotation-add", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), onClick: () => setOpen(true), sx: { mb: 2 }, children: "新增报价单" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "报价单号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "客户" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "金额(含税)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "有效期" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: rows.map((q) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "quotation-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: q.quotationNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: q.customerName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: q.grandTotal.toLocaleString() }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: q.validUntil }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: STATUS_LABEL[q.status], color: q.status === "converted" ? "success" : "default" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
          q.status !== "converted" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", "data-testid": "quotation-convert", onClick: () => handleConvert(q), children: "转销售订单" }),
          q.status === "converted" && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "success", label: `SO ${q.convertedOrderNo}` })
        ] })
      ] }, q.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增报价单" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "客户名称",
            value: form.customerName,
            onChange: (e) => setForm({ ...form, customerName: e.target.value })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            select: true,
            label: "物料",
            value: form.materialId,
            onChange: (e) => setForm({ ...form, materialId: e.target.value }),
            SelectProps: { native: false },
            children: materials.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: m.id, children: [
              m.code,
              " ",
              m.name
            ] }, m.id))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "数量",
            type: "number",
            value: form.quantity,
            onChange: (e) => setForm({ ...form, quantity: Number(e.target.value) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "单价",
            type: "number",
            value: form.unitPrice,
            onChange: (e) => setForm({ ...form, unitPrice: Number(e.target.value) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "有效期至",
            type: "date",
            value: form.validUntil,
            onChange: (e) => setForm({ ...form, validUntil: e.target.value }),
            InputLabelProps: { shrink: true }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "业务员",
            value: form.salesPerson,
            onChange: (e) => setForm({ ...form, salesPerson: e.target.value })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "quotation-add-confirm", onClick: handleAdd, children: "保存" })
      ] })
    ] })
  ] });
}
export {
  QuotationPage as default
};
