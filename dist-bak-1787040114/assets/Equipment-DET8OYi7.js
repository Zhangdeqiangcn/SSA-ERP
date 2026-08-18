import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bj as Alert, c2 as Tabs, c3 as Tab, bk as Button, e1 as default_1, cO as TableContainer, aP as Paper, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bt as TextField, aO as MenuItem, bC as DialogActions } from "./vendor-DGU5TO-x.js";
import { u as useEquipmentStore } from "./equipmentStore-CrhJcIrI.js";
import { u as useProductionOperationStore } from "./productionOperationStore-ByOb08ia.js";
import "./index-DeeqqmHA.js";
const CAT_LABEL = { machine: "设备", tool: "工装", mold: "模具" };
const STATUS_LABEL = { in_use: "在用", idle: "闲置", scrapped: "报废" };
function EquipmentPage() {
  const { equipments, maintenanceOrders, addEquipment, addMaintenance, deleteEquipment } = useEquipmentStore();
  const { workCenters } = useProductionOperationStore();
  const [tab, setTab] = reactExports.useState(0);
  const [openEq, setOpenEq] = reactExports.useState(false);
  const [openMo, setOpenMo] = reactExports.useState(false);
  const [eqForm, setEqForm] = reactExports.useState({
    code: "",
    name: "",
    category: "machine",
    workCenterId: "",
    status: "in_use",
    nextMaintenanceDate: "2026-08-01"
  });
  const [moForm, setMoForm] = reactExports.useState({ equipmentId: "", type: "日常保养", date: "2026-07-20", cost: 0 });
  const eqRows = reactExports.useMemo(() => equipments, [equipments]);
  const moRows = reactExports.useMemo(() => maintenanceOrders, [maintenanceOrders]);
  const handleAddEq = () => {
    var _a;
    const e = {
      id: `eq-${Date.now()}`,
      code: eqForm.code || `EQ-${Date.now()}`,
      name: eqForm.name || "新设备",
      category: eqForm.category,
      workCenterId: eqForm.workCenterId || void 0,
      workCenterName: (_a = workCenters.find((w) => w.id === eqForm.workCenterId)) == null ? void 0 : _a.name,
      status: eqForm.status,
      nextMaintenanceDate: eqForm.nextMaintenanceDate,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    addEquipment(e);
    setOpenEq(false);
    setEqForm({ code: "", name: "", category: "machine", workCenterId: "", status: "in_use", nextMaintenanceDate: "2026-08-01" });
  };
  const handleAddMo = () => {
    const eq = equipments.find((e) => e.id === moForm.equipmentId);
    const m = {
      id: `mo-${Date.now()}`,
      equipmentId: moForm.equipmentId,
      equipmentName: (eq == null ? void 0 : eq.name) ?? "",
      equipmentCode: (eq == null ? void 0 : eq.code) ?? "",
      type: moForm.type,
      date: moForm.date,
      cost: moForm.cost,
      status: "done",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    addMaintenance(m);
    setOpenMo(false);
    setMoForm({ equipmentId: "", type: "日常保养", date: "2026-07-20", cost: 0 });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "equipment", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "设备 / 工装 / 模具 主数据" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "设备主数据 + 保养工单（对标 SAP PM / 金蝶 设备档案）。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tab, onChange: (_, v) => setTab(v), sx: { mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "设备工装" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "保养工单" })
    ] }),
    tab === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "eq-add", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), onClick: () => setOpenEq(true), sx: { mb: 2 }, children: "新增设备/工装" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "编号" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "名称" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "类别" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "工作中心" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "下次保养" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: eqRows.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "eq-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: e.code }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: e.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: CAT_LABEL[e.category] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: e.workCenterName ?? "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: STATUS_LABEL[e.status], color: e.status === "in_use" ? "success" : "default" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: e.nextMaintenanceDate ?? "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", color: "error", onClick: () => deleteEquipment(e.id), children: "删除" }) })
        ] }, e.id)) })
      ] }) })
    ] }),
    tab === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "mo-add", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), onClick: () => setOpenMo(true), sx: { mb: 2 }, children: "新增保养工单" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "设备" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "类型" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "日期" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "费用" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: moRows.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "mo-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
            m.equipmentName,
            "（",
            m.equipmentCode,
            "）"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: m.type }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: m.date }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
            "¥",
            m.cost.toLocaleString("zh-CN")
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: m.status === "done" ? "已完成" : "计划中", color: m.status === "done" ? "success" : "warning" }) })
        ] }, m.id)) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: openEq, onClose: () => setOpenEq(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增设备 / 工装" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, margin: "dense", label: "编号", value: eqForm.code, onChange: (e) => setEqForm({ ...eqForm, code: e.target.value }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, margin: "dense", label: "名称", value: eqForm.name, onChange: (e) => setEqForm({ ...eqForm, name: e.target.value }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TextField, { fullWidth: true, margin: "dense", select: true, label: "类别", value: eqForm.category, onChange: (e) => setEqForm({ ...eqForm, category: e.target.value }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "machine", children: "设备" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "tool", children: "工装" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "mold", children: "模具" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TextField, { fullWidth: true, margin: "dense", select: true, label: "工作中心", value: eqForm.workCenterId, onChange: (e) => setEqForm({ ...eqForm, workCenterId: e.target.value }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "—" }),
          workCenters.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: w.id, children: w.name }, w.id))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TextField, { fullWidth: true, margin: "dense", select: true, label: "状态", value: eqForm.status, onChange: (e) => setEqForm({ ...eqForm, status: e.target.value }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "in_use", children: "在用" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "idle", children: "闲置" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "scrapped", children: "报废" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, margin: "dense", label: "下次保养日期", type: "date", value: eqForm.nextMaintenanceDate, onChange: (e) => setEqForm({ ...eqForm, nextMaintenanceDate: e.target.value }), InputLabelProps: { shrink: true } })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpenEq(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "eq-add-confirm", onClick: handleAddEq, children: "保存" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: openMo, onClose: () => setOpenMo(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增保养工单" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, margin: "dense", select: true, label: "设备", value: moForm.equipmentId, onChange: (e) => setMoForm({ ...moForm, equipmentId: e.target.value }), children: equipments.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: e.id, children: [
          e.name,
          "（",
          e.code,
          "）"
        ] }, e.id)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, margin: "dense", label: "保养类型", value: moForm.type, onChange: (e) => setMoForm({ ...moForm, type: e.target.value }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, margin: "dense", label: "日期", type: "date", value: moForm.date, onChange: (e) => setMoForm({ ...moForm, date: e.target.value }), InputLabelProps: { shrink: true } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, margin: "dense", label: "费用", type: "number", value: moForm.cost, onChange: (e) => setMoForm({ ...moForm, cost: Number(e.target.value) }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpenMo(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "mo-add-confirm", onClick: handleAddMo, children: "保存" })
      ] })
    ] })
  ] });
}
export {
  EquipmentPage as default
};
