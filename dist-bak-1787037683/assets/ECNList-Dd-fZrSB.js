import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bj as Alert, bk as Button, e1 as default_1, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bt as TextField, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, bC as DialogActions, aL as Chip } from "./vendor-46QZWBd3.js";
import { D as DataTable } from "./DataTable-vc5G5ARo.js";
import { u as useMaterialStore } from "./index-CcOZBoQL.js";
import { u as useECNStore } from "./ecnStore-DIX7gpta.js";
import "./StatusBadge-Db1uY4YU.js";
const CHANGE_TYPE_LABELS = {
  material: "物料",
  bom: "BOM",
  routing: "工艺路线"
};
const STATUS_LABELS = {
  draft: "草稿",
  approved: "已批准",
  implemented: "已执行",
  cancelled: "已取消"
};
const STATUS_COLORS = {
  draft: "#F59E0B",
  approved: "#3B82F6",
  implemented: "#10B981",
  cancelled: "#94A3B8"
};
function ECNList() {
  const { ecns, addECN, updateECN } = useECNStore();
  const materials = useMaterialStore((s) => s.materials);
  const [open, setOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({
    changeNo: "",
    title: "",
    materialId: "",
    changeType: "material",
    oldValue: "",
    newValue: "",
    effectiveDate: "",
    fromVersion: "V1.0",
    toVersion: "V2.0"
  });
  const rows = reactExports.useMemo(() => ecns, [ecns]);
  const handleAdd = () => {
    const selectedMaterial = materials.find((m) => m.id === form.materialId);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const changeNo = form.changeNo || `ECN-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const e = {
      id: `ecn-${Date.now()}`,
      changeNo,
      title: form.title || "工程变更",
      materialId: form.materialId,
      materialName: selectedMaterial == null ? void 0 : selectedMaterial.name,
      fromVersion: form.fromVersion,
      toVersion: form.toVersion,
      changeType: form.changeType,
      oldValue: form.oldValue,
      newValue: form.newValue,
      effectiveDate: form.effectiveDate,
      status: "draft",
      createdAt: now,
      updatedAt: now
    };
    addECN(e);
    setOpen(false);
    setForm({
      changeNo: "",
      title: "",
      materialId: "",
      changeType: "material",
      oldValue: "",
      newValue: "",
      effectiveDate: "",
      fromVersion: "V1.0",
      toVersion: "V2.0"
    });
  };
  const handleApprove = (id) => {
    updateECN(id, { status: "approved", approvedBy: "当前用户" });
  };
  const handleImplement = (id) => {
    updateECN(id, { status: "implemented" });
  };
  const handleCancel = (id) => {
    updateECN(id, { status: "cancelled" });
  };
  const mapImportRow = (r, _headers) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const typeMap = { 物料: "material", BOM: "bom", 工艺路线: "routing" };
    const statusMap = { 草稿: "draft", 已批准: "approved", 已执行: "implemented", 已取消: "cancelled" };
    return {
      id: `ecn-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      changeNo: r["变更编号"] || `ECN-IMP-${Date.now()}`,
      title: r["标题"] || "工程变更",
      materialId: r["物料ID"] || "",
      materialName: r["物料"] || "",
      fromVersion: r["变更前版本"] || "V1.0",
      toVersion: r["变更后版本"] || "V2.0",
      changeType: typeMap[r["变更类型"]] || "material",
      oldValue: r["旧值"],
      newValue: r["新值"],
      effectiveDate: r["生效日期"] || "",
      status: statusMap[r["状态"]] || "draft",
      createdAt: now,
      updatedAt: now
    };
  };
  const columns = [
    {
      id: "changeNo",
      header: "变更编号",
      accessorFn: (row) => row.changeNo,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontFamily: "monospace", color: "#3B82F6" }, children: row.original.changeNo })
    },
    {
      id: "title",
      header: "标题",
      accessorFn: (row) => row.title,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.title })
    },
    {
      id: "material",
      header: "物料",
      accessorFn: (row) => row.materialName || row.materialId,
      cell: ({ row }) => {
        const mat = materials.find((m) => m.id === row.original.materialId);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.materialName || (mat == null ? void 0 : mat.name) || row.original.materialId }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#94A3B8" }, children: mat == null ? void 0 : mat.code })
        ] });
      }
    },
    {
      id: "changeType",
      header: "变更类型",
      accessorFn: (row) => row.changeType,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          size: "small",
          label: CHANGE_TYPE_LABELS[row.original.changeType],
          sx: { bgcolor: "#EFF6FF", color: "#3B82F6", fontSize: "0.6875rem" }
        }
      )
    },
    {
      id: "value",
      header: "旧值→新值",
      accessorFn: (row) => `${row.original.oldValue || row.original.fromVersion || ""} → ${row.original.newValue || row.original.toVersion || ""}`,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
        row.original.oldValue || row.original.fromVersion || "-",
        " → ",
        row.original.newValue || row.original.toVersion || "-"
      ] })
    },
    {
      id: "effectiveDate",
      header: "生效日期",
      accessorFn: (row) => row.effectiveDate,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.effectiveDate })
    },
    {
      id: "status",
      header: "状态",
      accessorFn: (row) => row.status,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          size: "small",
          label: STATUS_LABELS[row.original.status],
          sx: {
            bgcolor: STATUS_COLORS[row.original.status] + "15",
            color: STATUS_COLORS[row.original.status],
            fontWeight: 500,
            fontSize: "0.6875rem"
          }
        }
      )
    },
    {
      id: "actions",
      header: "操作",
      enableSorting: false,
      cell: ({ row }) => {
        const e = row.original;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 0.5, justifyContent: "flex-end" }, children: [
          e.status === "draft" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "outlined", color: "primary", onClick: () => handleApprove(e.id), children: "批准" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "outlined", color: "error", onClick: () => handleCancel(e.id), children: "取消" })
          ] }),
          e.status === "approved" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "outlined", color: "success", onClick: () => handleImplement(e.id), children: "执行" }),
          (e.status === "implemented" || e.status === "cancelled") && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: e.status === "implemented" ? "已完成" : "已取消", color: e.status === "implemented" ? "success" : "default" })
        ] });
      }
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "ecn-list", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "工程变更单 ECM" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "工程变更单（ECM）用于管理物料/BOM/工艺路线的变更流程，包括版本切换和值变更跟踪。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        variant: "contained",
        startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}),
        onClick: () => setOpen(true),
        sx: { mb: 2 },
        children: "新增 ECM"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DataTable,
      {
        data: rows,
        columns,
        enableRowSelection: false,
        enablePagination: true,
        enableSorting: true,
        enableColumnFilter: true,
        enableBlockSelect: true,
        enableExport: true,
        exportFormat: "xlsx",
        enableImport: true,
        onImport: (rs, headers) => rs.forEach((r) => addECN(mapImportRow(r))),
        columnConfigKey: "material-ecn-list"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增工程变更单" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "变更编号",
            value: form.changeNo,
            onChange: (e) => setForm({ ...form, changeNo: e.target.value }),
            helperText: "留空自动生成",
            "data-testid": "ecn-change-no"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "标题",
            value: form.title,
            onChange: (e) => setForm({ ...form, title: e.target.value }),
            required: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, margin: "dense", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "物料" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              value: form.materialId,
              label: "物料",
              onChange: (e) => setForm({ ...form, materialId: e.target.value }),
              "data-testid": "ecn-material",
              children: materials.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: m.id, children: [
                m.name,
                " (",
                m.code,
                ")"
              ] }, m.id))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          TextField,
          {
            select: true,
            fullWidth: true,
            margin: "dense",
            label: "变更类型",
            value: form.changeType,
            onChange: (e) => setForm({ ...form, changeType: e.target.value }),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "material", children: "物料" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "bom", children: "BOM" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "routing", children: "工艺路线" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "旧值",
            value: form.oldValue,
            onChange: (e) => setForm({ ...form, oldValue: e.target.value }),
            placeholder: "变更前的值"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "新值",
            value: form.newValue,
            onChange: (e) => setForm({ ...form, newValue: e.target.value }),
            placeholder: "变更后的值"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "变更前版本",
            value: form.fromVersion,
            onChange: (e) => setForm({ ...form, fromVersion: e.target.value })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "变更后版本",
            value: form.toVersion,
            onChange: (e) => setForm({ ...form, toVersion: e.target.value })
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
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "ecn-submit", onClick: handleAdd, children: "保存" })
      ] })
    ] })
  ] });
}
export {
  ECNList as default
};
