import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bj as Alert, bk as Button, e1 as default_1, cO as TableContainer, aP as Paper, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bt as TextField, aO as MenuItem, bC as DialogActions } from "./vendor-DGU5TO-x.js";
import { u as useWarehouseAdvancedStore } from "./warehouseAdvancedStore-DXjc0JQH.js";
import { c as useWarehouseStore, u as useMaterialStore } from "./index-DeeqqmHA.js";
import { u as useWarehouseMasterStore } from "./warehouseMasterStore-C3VWShZa.js";
const STATUS_LABEL = {
  draft: "草稿",
  posted: "已过账",
  cancelled: "已取消"
};
function InventoryAdjustmentPage() {
  const { inventoryAdjustments, addInventoryAdjustment, postAdjustment } = useWarehouseAdvancedStore();
  const { inventoryRecords } = useWarehouseStore();
  const { materials } = useMaterialStore();
  const { warehouses } = useWarehouseMasterStore();
  const [open, setOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({ warehouseId: "wh-001", materialId: "", actualQty: 0, reason: "盘点差异调整" });
  const bookQty = reactExports.useMemo(() => {
    if (!form.materialId) return 0;
    return inventoryRecords.filter((r) => r.materialId === form.materialId && r.warehouseId === form.warehouseId).reduce((s, r) => s + r.quantity, 0);
  }, [inventoryRecords, form.materialId, form.warehouseId]);
  const handleAdd = () => {
    if (!form.materialId) return;
    const actual = Number(form.actualQty);
    const delta = actual - bookQty;
    const mat = materials.find((m) => m.id === form.materialId);
    const wh = warehouses.find((w) => w.id === form.warehouseId);
    const adj = {
      id: `ia-${Date.now()}`,
      adjustmentNo: `ADJ-2026-${Date.now()}`,
      warehouseId: form.warehouseId,
      warehouseName: wh == null ? void 0 : wh.name,
      status: "draft",
      reason: form.reason,
      date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      items: [{
        id: `iai-${Date.now()}`,
        materialId: form.materialId,
        materialCode: mat == null ? void 0 : mat.code,
        materialName: mat == null ? void 0 : mat.name,
        unit: mat == null ? void 0 : mat.unit,
        bookQty,
        actualQty: actual,
        deltaQty: delta,
        reason: form.reason
      }],
      totalDeltaQty: delta,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: "当前用户",
      updatedBy: "当前用户"
    };
    addInventoryAdjustment(adj);
    setOpen(false);
    setForm({ warehouseId: "wh-001", materialId: "", actualQty: 0, reason: "盘点差异调整" });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "inv-adjustment", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "库存调整单" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "调整过账自动修正库存数量并生成存货凭证（借/贷 库存商品）。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "ia-add", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), onClick: () => setOpen(true), sx: { mb: 2 }, children: "新增调整单" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "调整单号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "仓库" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "差异量" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "凭证" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: inventoryAdjustments.map((adj) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "ia-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: adj.adjustmentNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: adj.warehouseName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: adj.items.map((i) => i.materialName).join("、") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: adj.totalDeltaQty }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: STATUS_LABEL[adj.status], color: adj.status === "posted" ? "success" : "default" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: adj.voucherNo || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: adj.status === "draft" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", "data-testid": "ia-post", onClick: () => postAdjustment(adj.id), children: "过账" }) })
      ] }, adj.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增库存调整单" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            select: true,
            label: "仓库",
            value: form.warehouseId,
            onChange: (e) => setForm({ ...form, warehouseId: e.target.value }),
            children: warehouses.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: w.id, children: w.name }, w.id))
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
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { my: 1 }, children: [
          "当前账面库存：",
          bookQty
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "实际数量",
            type: "number",
            value: form.actualQty,
            onChange: (e) => setForm({ ...form, actualQty: Number(e.target.value) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "调整原因",
            value: form.reason,
            onChange: (e) => setForm({ ...form, reason: e.target.value })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "ia-add-confirm", onClick: handleAdd, children: "保存" })
      ] })
    ] })
  ] });
}
export {
  InventoryAdjustmentPage as default
};
