import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bj as Alert, bk as Button, e1 as default_1, cO as TableContainer, aP as Paper, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bt as TextField, aO as MenuItem, bC as DialogActions } from "./vendor-DGU5TO-x.js";
import { u as useWarehouseAdvancedStore } from "./warehouseAdvancedStore-DXjc0JQH.js";
import { u as useMaterialStore } from "./index-DeeqqmHA.js";
const STATUS_LABEL = {
  in_stock: "在库",
  shipped: "已发货",
  scrapped: "已报废",
  in_transit: "在途"
};
const MOVE_LABEL = {
  inbound: "入库",
  issue: "领料",
  subcontract: "委外发出",
  delivery: "发货",
  transfer: "调拨"
};
function SerialHUPage() {
  const { serialMasters, addSerialMaster, updateSerialMaster } = useWarehouseAdvancedStore();
  const { materials } = useMaterialStore();
  const [open, setOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({
    serialNo: "",
    materialId: "",
    huId: "",
    status: "in_stock",
    warehouseId: "wh-001"
  });
  const selMat = reactExports.useMemo(() => materials.find((m) => m.id === form.materialId), [materials, form.materialId]);
  const handleAdd = () => {
    if (!selMat || !form.serialNo) return;
    addSerialMaster({
      id: `sm-${Date.now()}`,
      serialNo: form.serialNo,
      materialId: selMat.id,
      materialCode: selMat.code,
      materialName: selMat.name,
      huId: form.huId || void 0,
      warehouseId: form.warehouseId,
      status: form.status,
      inboundDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: "当前用户",
      updatedBy: "当前用户"
    });
    setOpen(false);
    setForm({ serialNo: "", materialId: "", huId: "", status: "in_stock", warehouseId: "wh-001" });
  };
  const handleShip = (s) => updateSerialMaster(s.id, { status: "shipped", outboundDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "serial-hu", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "序列号 / 处理单元（HU）主数据" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 2 }, children: [
      "对序列号管理物料进行单件追踪（HU 装箱、发货、报废）。",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "凡标记「序列号管理」的物料，入库过账时自动登记序列号为在库、出库过账时按 FIFO 自动核销" }),
      "（销售→已发货、领料→已消耗、委外发料→在途），全流程轨迹见「流转轨迹」列。"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "sm-add", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), onClick: () => setOpen(true), sx: { mb: 2 }, children: "新增序列号" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "序列号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "HU" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "仓库" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "流转轨迹" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: serialMasters.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "sm-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: s.serialNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: s.materialName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: s.huId || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: s.warehouseId }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: STATUS_LABEL[s.status], color: s.status === "in_stock" ? "success" : "default" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontSize: 12, color: "text.secondary" }, "data-testid": "sm-movements", children: (s.movements || []).length === 0 ? "—" : (s.movements || []).map((mv, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          MOVE_LABEL[mv.type] || mv.type,
          " · ",
          mv.docNo,
          " · ",
          mv.date
        ] }, `${mv.docNo}-${i}`)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: s.status === "in_stock" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", "data-testid": "sm-ship", onClick: () => handleShip(s), children: "发货" }) })
      ] }, s.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增序列号 / HU" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "序列号",
            value: form.serialNo,
            onChange: (e) => setForm({ ...form, serialNo: e.target.value })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            select: true,
            label: "物料",
            value: form.materialId,
            onChange: (e) => setForm({ ...form, materialId: e.target.value }),
            children: [
              materials.filter((m) => m.serialized).map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: m.id, children: [
                m.code,
                " ",
                m.name,
                "（序列号管理）"
              ] }, m.id)),
              materials.filter((m) => !m.serialized).map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: m.id, children: [
                m.code,
                " ",
                m.name
              ] }, m.id))
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "HU（处理单元）",
            value: form.huId,
            onChange: (e) => setForm({ ...form, huId: e.target.value })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            select: true,
            label: "状态",
            value: form.status,
            onChange: (e) => setForm({ ...form, status: e.target.value }),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "in_stock", children: "在库" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "in_transit", children: "在途" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "shipped", children: "已发货" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "scrapped", children: "已报废" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "sm-add-confirm", onClick: handleAdd, children: "保存" })
      ] })
    ] })
  ] });
}
export {
  SerialHUPage as default
};
