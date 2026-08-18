import { aG as useNavigate, r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bk as Button, bf as Add, aP as Paper, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip, aJ as IconButton, bR as Visibility, bg as Edit, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bt as TextField, d0 as FormControlLabel, d1 as Switch, bC as DialogActions, cU as Snackbar } from "./vendor-46QZWBd3.js";
import { d as useQualityStore } from "./index-CcOZBoQL.js";
const InspectionStandard = () => {
  const { inspectionStandards, addInspectionStandard } = useQualityStore();
  useNavigate();
  const [dialog, setDialog] = reactExports.useState(false);
  const [snackbar, setSnackbar] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({
    standardNo: "",
    name: "",
    materialCategory: "",
    version: "V1.0",
    description: "",
    status: "active"
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: "#1E293B" }, children: "检验标准管理" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => setDialog(true), children: "新建检验标准" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "标准编号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "标准名称" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "适用分类" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "版本" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "检验项目数" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "关键项目数" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: inspectionStandards.map((std) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 500, fontFamily: "monospace", color: "#3B82F6" }, children: std.standardNo }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 500 }, children: std.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#94A3B8" }, children: std.description })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: std.materialCategory, size: "small", sx: { bgcolor: "#EFF6FF", color: "#3B82F6" } }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: std.version, size: "small", sx: { bgcolor: "#F8FAFC", color: "#475569" } }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
          std.inspectionItems.length,
          " 项"
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { color: "#EF4444", fontWeight: 500 }, children: [
          std.inspectionItems.filter((i) => i.isCritical).length,
          " 项"
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            label: std.status === "active" ? "启用" : "停用",
            size: "small",
            sx: {
              bgcolor: std.status === "active" ? "#ECFDF5" : "#F8FAFC",
              color: std.status === "active" ? "#10B981" : "#94A3B8",
              fontWeight: 500
            }
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Visibility, { fontSize: "small" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) })
        ] })
      ] }, std.id)) })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: dialog, onClose: () => setDialog(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: "新建检验标准" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { sx: { pt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: "column", gap: 2, pt: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "标准编号",
            fullWidth: true,
            placeholder: "如：IQC-STD-004",
            value: form.standardNo,
            onChange: (e) => setForm((f) => ({ ...f, standardNo: e.target.value }))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "标准名称",
            fullWidth: true,
            value: form.name,
            onChange: (e) => setForm((f) => ({ ...f, name: e.target.value }))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "适用物料分类",
            fullWidth: true,
            value: form.materialCategory,
            onChange: (e) => setForm((f) => ({ ...f, materialCategory: e.target.value }))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "版本号",
            fullWidth: true,
            value: form.version,
            onChange: (e) => setForm((f) => ({ ...f, version: e.target.value }))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "说明",
            multiline: true,
            rows: 2,
            fullWidth: true,
            value: form.description,
            onChange: (e) => setForm((f) => ({ ...f, description: e.target.value }))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormControlLabel,
          {
            control: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Switch,
              {
                checked: form.status === "active",
                onChange: (e) => setForm((f) => ({ ...f, status: e.target.checked ? "active" : "inactive" }))
              }
            ),
            label: "启用"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDialog(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            onClick: () => {
              addInspectionStandard({
                id: `std-${Date.now()}`,
                standardNo: form.standardNo || `STD-${Date.now()}`,
                name: form.name || "未命名标准",
                materialCategory: form.materialCategory || "通用",
                version: form.version,
                status: form.status,
                inspectionItems: [],
                description: form.description,
                createdAt: (/* @__PURE__ */ new Date()).toISOString(),
                updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
                createdBy: "admin",
                updatedBy: "admin"
              });
              setDialog(false);
              setSnackbar(true);
              setForm({ standardNo: "", name: "", materialCategory: "", version: "V1.0", description: "", status: "active" });
            },
            children: "创建"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Snackbar, { open: snackbar, autoHideDuration: 2500, onClose: () => setSnackbar(false), message: "检验标准已创建" })
  ] });
};
export {
  InspectionStandard as default
};
