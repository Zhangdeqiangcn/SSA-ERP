import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bj as Alert, bk as Button, e1 as default_1, cO as TableContainer, aP as Paper, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bt as TextField, aO as MenuItem, bC as DialogActions } from "./vendor-46QZWBd3.js";
import { u as useProductionVersionStore } from "./productionVersionStore-D_-Ec9Z0.js";
import "./index-CcOZBoQL.js";
import "./bomStore-VWzRK_BU.js";
const STATUS_LABEL = {
  draft: "草稿",
  active: "生效",
  obsolete: "作废"
};
function ProductionVersions() {
  const { versions, addVersion, deleteVersion } = useProductionVersionStore();
  const [open, setOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({
    materialCode: "",
    materialName: "",
    bomNo: "",
    routeNo: "",
    version: "V1.0",
    effectiveDate: "2026-01-01",
    status: "draft"
  });
  const rows = reactExports.useMemo(() => versions, [versions]);
  const handleAdd = () => {
    const v = {
      id: `pv-${Date.now()}`,
      version: form.version,
      materialId: `mat-${Date.now()}`,
      materialCode: form.materialCode || "PRD-NEW",
      materialName: form.materialName || "新产品",
      bomId: "bom-001",
      bomNo: form.bomNo || "BOM-2024-001",
      routeId: "route-001",
      routeNo: form.routeNo || "R-2024-001",
      status: form.status,
      effectiveDate: form.effectiveDate,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    addVersion(v);
    setOpen(false);
    setForm({ materialCode: "", materialName: "", bomNo: "", routeNo: "", version: "V1.0", effectiveDate: "2026-01-01", status: "draft" });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "production-versions", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "生产版本" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "生产版本 = 物料 + BOM + 工艺路线 的组合，用于按产品指定不同的制造配方（对标 SAP 生产版本 / 金蝶 生产用料清单版本）。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "pv-add", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), onClick: () => setOpen(true), sx: { mb: 2 }, children: "新增版本" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "版本" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料编码" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料名称" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "BOM" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "工艺路线" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "生效日期" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: rows.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "pv-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: v.version }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: v.materialCode }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: v.materialName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: v.bomNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: v.routeNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: v.effectiveDate }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: STATUS_LABEL[v.status], color: v.status === "active" ? "success" : "default" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", color: "error", onClick: () => deleteVersion(v.id), children: "删除" }) })
      ] }, v.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增生产版本" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "物料编码",
            value: form.materialCode,
            onChange: (e) => setForm({ ...form, materialCode: e.target.value })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "物料名称",
            value: form.materialName,
            onChange: (e) => setForm({ ...form, materialName: e.target.value })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "BOM 编号",
            value: form.bomNo,
            onChange: (e) => setForm({ ...form, bomNo: e.target.value })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "工艺路线编号",
            value: form.routeNo,
            onChange: (e) => setForm({ ...form, routeNo: e.target.value })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "版本号",
            value: form.version,
            onChange: (e) => setForm({ ...form, version: e.target.value })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "生效日期",
            type: "date",
            value: form.effectiveDate,
            onChange: (e) => setForm({ ...form, effectiveDate: e.target.value }),
            InputLabelProps: { shrink: true }
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
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "draft", children: "草稿" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "active", children: "生效" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "obsolete", children: "作废" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "pv-add-confirm", onClick: handleAdd, children: "保存" })
      ] })
    ] })
  ] });
}
export {
  ProductionVersions as default
};
