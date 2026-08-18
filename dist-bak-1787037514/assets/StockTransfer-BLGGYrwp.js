import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { m as Box, T as Typography, bl as Alert, bm as Button, dG as default_1, cD as TableContainer, aS as Paper, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aO as Chip, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bv as TextField, aR as MenuItem, bE as DialogActions } from "./vendor-mui-UhJuRAfR.js";
import { u as useWarehouseAdvancedStore } from "./warehouseAdvancedStore-DGJOwep4.js";
import { u as useWarehouseMasterStore } from "./warehouseMasterStore-Lmmy-9XL.js";
import { u as useMaterialStore, g as useOrgStore } from "./index-hTLNcGoC.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
const STATUS_LABEL = {
  draft: "草稿",
  shipped: "已发出",
  received: "已收货",
  completed: "已完成",
  cancelled: "已取消"
};
function StockTransferPage() {
  const { stockTransfers, addStockTransfer, confirmTransfer } = useWarehouseAdvancedStore();
  const { warehouses } = useWarehouseMasterStore();
  const { materials } = useMaterialStore();
  const { organizations } = useOrgStore();
  const [open, setOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({
    fromWarehouseId: "wh-001",
    toWarehouseId: "wh-002",
    transferDate: "2026-07-15",
    materialId: "",
    quantity: 500
  });
  const fromWh = warehouses.find((w) => w.id === form.fromWarehouseId);
  const toWh = warehouses.find((w) => w.id === form.toWarehouseId);
  const selMat = reactExports.useMemo(() => materials.find((m) => m.id === form.materialId), [materials, form.materialId]);
  const whName = (id) => {
    var _a;
    return ((_a = warehouses.find((w) => w.id === id)) == null ? void 0 : _a.name) ?? id;
  };
  const orgIdOf = (whId) => {
    var _a;
    return (_a = warehouses.find((w) => w.id === whId)) == null ? void 0 : _a.orgId;
  };
  const handleAdd = () => {
    if (!selMat) return;
    const t = {
      id: `st-${Date.now()}`,
      transferNo: `ST-2026-${Date.now()}`,
      fromWarehouseId: form.fromWarehouseId,
      fromWarehouseName: whName(form.fromWarehouseId),
      toWarehouseId: form.toWarehouseId,
      toWarehouseName: whName(form.toWarehouseId),
      fromOrgId: orgIdOf(form.fromWarehouseId),
      toOrgId: orgIdOf(form.toWarehouseId),
      status: "draft",
      transferDate: form.transferDate,
      items: [{
        id: `sti-${Date.now()}`,
        materialId: selMat.id,
        materialCode: selMat.code,
        materialName: selMat.name,
        unit: selMat.unit,
        quantity: Number(form.quantity)
      }],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: "当前用户",
      updatedBy: "当前用户"
    };
    addStockTransfer(t);
    setOpen(false);
    setForm({ ...form, materialId: "", quantity: 500 });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "stock-transfer", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "跨组织转储" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "转储确认后自动在调出方出库、调入方入库（双边过账），并携带组织维度。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "st-add", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), onClick: () => setOpen(true), sx: { mb: 2 }, children: "新增转储单" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "转储单号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "调出仓库" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "调入仓库" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "数量" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: stockTransfers.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "st-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: t.transferNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
          t.fromWarehouseName,
          "（",
          t.fromOrgId,
          "）"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
          t.toWarehouseName,
          "（",
          t.toOrgId,
          "）"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: t.items.reduce((s, i) => s + i.quantity, 0) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: STATUS_LABEL[t.status], color: t.status === "completed" ? "success" : "default" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: t.status === "draft" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", "data-testid": "st-confirm", onClick: () => confirmTransfer(t.id), children: "确认转储" }) })
      ] }, t.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增跨组织转储" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            select: true,
            label: "调出仓库",
            value: form.fromWarehouseId,
            onChange: (e) => setForm({ ...form, fromWarehouseId: e.target.value }),
            children: warehouses.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: w.id, children: [
              w.name,
              "（",
              w.orgId,
              "）"
            ] }, w.id))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            select: true,
            label: "调入仓库",
            value: form.toWarehouseId,
            onChange: (e) => setForm({ ...form, toWarehouseId: e.target.value }),
            children: warehouses.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: w.id, children: [
              w.name,
              "（",
              w.orgId,
              "）"
            ] }, w.id))
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
            label: "转储日期",
            type: "date",
            value: form.transferDate,
            onChange: (e) => setForm({ ...form, transferDate: e.target.value }),
            InputLabelProps: { shrink: true }
          }
        ),
        fromWh && toWh && fromWh.orgId !== toWh.orgId && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "warning", sx: { mt: 1 }, children: [
          "跨组织转储：",
          fromWh.orgId,
          " → ",
          toWh.orgId
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "st-add-confirm", onClick: handleAdd, children: "保存" })
      ] })
    ] })
  ] });
}
export {
  StockTransferPage as default
};
