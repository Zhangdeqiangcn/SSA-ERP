import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { m as Box, T as Typography, bl as Alert, bm as Button, dG as default_1, cD as TableContainer, aS as Paper, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aO as Chip, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bv as TextField, aR as MenuItem, bE as DialogActions } from "./vendor-mui-DsZGB15g.js";
import { u as usePurchaseAdvancedStore } from "./purchaseAdvancedStore-X5oSWK-7.js";
import { b as usePurchaseStore } from "./index-CU2cqxc8.js";
import "./vendor-t9csHBDX.js";
import "./vendor-date-DI3D_gXa.js";
const STATUS_LABEL = {
  draft: "草稿",
  approved: "已审批",
  completed: "已完成",
  cancelled: "已作废"
};
function PurchaseReturnPage() {
  const { purchaseReturns, addReturn, completeReturn } = usePurchaseAdvancedStore();
  const { purchaseOrders } = usePurchaseStore();
  const [open, setOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({ purchaseOrderNo: "", returnDate: "2026-07-20", reason: "质量不合格" });
  const selectedPO = reactExports.useMemo(
    () => purchaseOrders.find((o) => o.orderNo === form.purchaseOrderNo),
    [purchaseOrders, form.purchaseOrderNo]
  );
  const handleAdd = () => {
    if (!selectedPO) return;
    const items = selectedPO.items.map((it) => ({
      id: `pri-${it.id}`,
      materialId: it.materialId,
      materialCode: it.materialCode,
      materialName: it.materialName,
      unit: it.unit,
      quantity: it.orderedQuantity - (it.deliveredQuantity || 0),
      unitPrice: it.unitPrice,
      amount: (it.orderedQuantity - (it.deliveredQuantity || 0)) * it.unitPrice,
      reason: form.reason
    }));
    const total = items.reduce((s, i) => s + i.amount, 0);
    const r = {
      id: `pr-${Date.now()}`,
      returnNo: `PR-2026-${Date.now()}`,
      purchaseOrderNo: selectedPO.orderNo,
      vendorId: selectedPO.vendorId,
      vendorName: selectedPO.vendorName || "",
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
    setForm({ purchaseOrderNo: "", returnDate: "2026-07-20", reason: "质量不合格" });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "purchase-return", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "采购退货" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "退货完成自动生成红字出库（退回供应商）+ 应付冲销(AP)凭证。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "pr-add", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), onClick: () => setOpen(true), sx: { mb: 2 }, children: "新增退货单" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "退货单号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "采购订单" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "供应商" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "金额" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: purchaseReturns.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "pr-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.returnNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.purchaseOrderNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.vendorName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.totalAmount.toLocaleString() }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: STATUS_LABEL[r.status], color: r.status === "completed" ? "success" : "default" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.status === "draft" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", "data-testid": "pr-complete", onClick: () => completeReturn(r.id), children: "完成退货" }) })
      ] }, r.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增采购退货单" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            select: true,
            label: "采购订单",
            value: form.purchaseOrderNo,
            onChange: (e) => setForm({ ...form, purchaseOrderNo: e.target.value }),
            children: purchaseOrders.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: o.orderNo, children: [
              o.orderNo,
              " ",
              o.vendorName
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
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "pr-add-confirm", onClick: handleAdd, children: "保存" })
      ] })
    ] })
  ] });
}
export {
  PurchaseReturnPage as default
};
