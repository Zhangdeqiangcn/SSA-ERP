import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bj as Alert, bk as Button, e1 as default_1, cO as TableContainer, aP as Paper, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bt as TextField, aO as MenuItem, bC as DialogActions } from "./vendor-46QZWBd3.js";
import { u as useSalesAdvancedStore } from "./salesAdvancedStore-CA71PkD6.js";
import { e as useSalesStore } from "./index-CcOZBoQL.js";
const STATUS_LABEL = {
  draft: "草稿",
  approved: "已审批",
  completed: "已完成",
  cancelled: "已作废"
};
function SalesReturnPage() {
  const { salesReturns, addReturn, completeReturn } = useSalesAdvancedStore();
  const { salesOrders } = useSalesStore();
  const [open, setOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({ salesOrderNo: "", returnDate: "2026-07-20", reason: "质量异议" });
  const selectedSO = reactExports.useMemo(
    () => salesOrders.find((o) => o.orderNo === form.salesOrderNo),
    [salesOrders, form.salesOrderNo]
  );
  const handleAdd = () => {
    if (!selectedSO) return;
    const items = selectedSO.items.map((it) => ({
      id: `sri-${it.id}`,
      materialId: it.materialId,
      materialCode: it.materialCode,
      materialName: it.materialName,
      unit: it.unit,
      quantity: it.quantity - (it.deliveredQuantity || 0),
      unitPrice: it.unitPrice,
      amount: (it.quantity - (it.deliveredQuantity || 0)) * it.unitPrice,
      reason: form.reason
    }));
    const total = items.reduce((s, i) => s + i.amount, 0);
    const r = {
      id: `sr-${Date.now()}`,
      returnNo: `SR-2026-${Date.now()}`,
      salesOrderNo: selectedSO.orderNo,
      customerName: selectedSO.customerName,
      status: "draft",
      returnDate: form.returnDate,
      reason: form.reason,
      items,
      totalAmount: total,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: "当前用户",
      updatedBy: "当前用户"
    };
    addReturn(r);
    setOpen(false);
    setForm({ salesOrderNo: "", returnDate: "2026-07-20", reason: "质量异议" });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "sales-return", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "销售退货" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "退货完成自动生成红字入库（退回库存）+ 红冲应收(AR)凭证 + 红字发票。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "return-add", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), onClick: () => setOpen(true), sx: { mb: 2 }, children: "新增退货单" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "退货单号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "销售订单" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "客户" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "金额" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "红字发票" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: salesReturns.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "return-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.returnNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.salesOrderNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.customerName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.totalAmount.toLocaleString() }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: STATUS_LABEL[r.status], color: r.status === "completed" ? "success" : "default" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.creditNoteNo || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.status === "draft" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", "data-testid": "return-complete", onClick: () => completeReturn(r.id), children: "完成退货" }) })
      ] }, r.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增销售退货单" }),
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
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "退货日期",
            type: "date",
            value: form.returnDate,
            onChange: (e) => setForm({ ...form, returnDate: e.target.value }),
            InputLabelProps: { shrink: true }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "退货原因",
            value: form.reason,
            onChange: (e) => setForm({ ...form, reason: e.target.value })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "return-add-confirm", onClick: handleAdd, children: "保存" })
      ] })
    ] })
  ] });
}
export {
  SalesReturnPage as default
};
