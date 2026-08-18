import { r as reactExports, j as jsxRuntimeExports, B as Box, aL as Chip, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, cN as Autocomplete, bt as TextField, d0 as FormControlLabel, d1 as Switch, aO as MenuItem, bC as DialogActions, bk as Button, cU as Snackbar, bj as Alert } from "./vendor-DGU5TO-x.js";
import { a as useVendorStore, u as useMaterialStore } from "./index-DeeqqmHA.js";
import { D as DataTable } from "./DataTable-ct0NJFvm.js";
import { F as FilterBar } from "./FilterBar-s9qV5iff.js";
import { A as ActionBar } from "./ActionBar-DmR-0fx0.js";
import { S as StatusBadge } from "./StatusBadge-DeJuhK-R.js";
import { C as ConfirmDialog } from "./ConfirmDialog-DFiLXnKl.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import { u as useSourceListStore } from "./sourceListStore-BT5zvRN_.js";
const STATUS_OPTIONS = [
  { value: "", label: "全部" },
  { value: "active", label: "生效中" },
  { value: "inactive", label: "已失效" }
];
const SourceListPage = () => {
  const { items, addItem, updateItem, deleteItem } = useSourceListStore();
  const { vendors } = useVendorStore();
  const { materials } = useMaterialStore();
  const [filterData, setFilterData] = reactExports.useState({});
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const [open, setOpen] = reactExports.useState(false);
  const [editingId, setEditingId] = reactExports.useState(null);
  const emptyForm = {
    vendorId: "",
    vendorName: "",
    vendorCode: "",
    materialId: "",
    materialCode: "",
    materialName: "",
    priority: 1,
    validFrom: "",
    validTo: "",
    fixedVendor: false,
    quotaPercentage: 0,
    status: "active",
    remarks: ""
  };
  const [form, setForm] = reactExports.useState(emptyForm);
  const [snackbar, setSnackbar] = reactExports.useState({
    open: false,
    message: "",
    severity: "info"
  });
  const columns = reactExports.useMemo(() => [
    { accessorKey: "materialName", header: "物料名称" },
    {
      accessorKey: "materialCode",
      header: "物料编码",
      size: 130,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { component: "span", sx: { fontFamily: "monospace", color: "text.secondary" }, children: row.original.materialCode || "-" })
    },
    { accessorKey: "vendorName", header: "供应商名称" },
    { accessorKey: "priority", header: "优先级" },
    { accessorKey: "validFrom", header: "有效起", size: 110 },
    { accessorKey: "validTo", header: "有效止", size: 110 },
    {
      accessorKey: "fixedVendor",
      header: "固定货源",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: row.original.fixedVendor ? "是" : "否",
          size: "small",
          color: row.original.fixedVendor ? "primary" : "default",
          variant: row.original.fixedVendor ? "filled" : "outlined"
        }
      )
    },
    {
      accessorKey: "quotaPercentage",
      header: "配额%",
      cell: ({ row }) => row.original.quotaPercentage != null ? `${row.original.quotaPercentage}%` : "-"
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: row.original.status })
    }
  ], []);
  const filterFields = [
    { name: "keyword", label: "关键词（物料名称/物料编码/供应商）", type: "text" },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: STATUS_OPTIONS
    }
  ];
  const filteredData = reactExports.useMemo(() => {
    let data = [...items];
    if (filterData.keyword) {
      const kw = filterData.keyword.toLowerCase();
      data = data.filter(
        (r) => {
          var _a, _b, _c, _d;
          return ((_a = r.vendorName) == null ? void 0 : _a.toLowerCase().includes(kw)) || ((_b = r.materialName) == null ? void 0 : _b.toLowerCase().includes(kw)) || ((_c = r.vendorCode) == null ? void 0 : _c.toLowerCase().includes(kw)) || ((_d = r.materialCode) == null ? void 0 : _d.toLowerCase().includes(kw));
        }
      );
    }
    if (filterData.status) {
      data = data.filter((r) => r.status === filterData.status);
    }
    return data;
  }, [items, filterData]);
  const handleAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };
  const handleEdit = (row) => {
    setEditingId(row.id);
    setForm({
      vendorId: row.vendorId,
      vendorName: row.vendorName,
      vendorCode: row.vendorCode || "",
      materialId: row.materialId,
      materialCode: row.materialCode || "",
      materialName: row.materialName || "",
      priority: row.priority,
      validFrom: row.validFrom || "",
      validTo: row.validTo || "",
      fixedVendor: row.fixedVendor,
      quotaPercentage: row.quotaPercentage ?? 0,
      status: row.status,
      remarks: row.remarks || ""
    });
    setOpen(true);
  };
  const handleDelete = (row) => {
    setDeleteTarget(row);
  };
  const confirmDelete = () => {
    if (deleteTarget) {
      deleteItem(deleteTarget.id);
      setSnackbar({ open: true, message: `已删除货源清单`, severity: "success" });
      setDeleteTarget(null);
    }
  };
  const handleSubmit = () => {
    if (!form.vendorId || !form.materialId) {
      setSnackbar({ open: true, message: "请选择供应商和物料", severity: "error" });
      return;
    }
    if (form.quotaPercentage < 0 || form.quotaPercentage > 100) {
      setSnackbar({ open: true, message: "配额百分比应在 0-100 之间", severity: "error" });
      return;
    }
    if (editingId) {
      updateItem(editingId, form);
      setSnackbar({ open: true, message: "已更新货源清单", severity: "success" });
    } else {
      const newItem = {
        id: `sl-${Date.now()}`,
        ...form
      };
      addItem(newItem);
      setSnackbar({ open: true, message: "已新增货源清单", severity: "success" });
    }
    setOpen(false);
  };
  const handleVendorChange = (_, value) => {
    if (value) {
      setForm((f) => ({
        ...f,
        vendorId: value.id,
        vendorName: value.name,
        vendorCode: value.code || ""
      }));
    } else {
      setForm((f) => ({ ...f, vendorId: "", vendorName: "", vendorCode: "" }));
    }
  };
  const handleMaterialChange = (_, value) => {
    if (value) {
      setForm((f) => ({
        ...f,
        materialId: value.id,
        materialCode: value.code || "",
        materialName: value.name
      }));
    } else {
      setForm((f) => ({ ...f, materialId: "", materialCode: "", materialName: "" }));
    }
  };
  const vendorOptions = vendors.map((v) => ({ id: v.id, name: v.name, code: v.code }));
  const materialOptions = materials.map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name
  }));
  const selectedVendor = vendorOptions.find((v) => v.id === form.vendorId) || null;
  const selectedMaterial = materialOptions.find((m) => m.id === form.materialId) || null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "货源清单",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(
        ActionBar,
        {
          primary: { label: "新建货源", onClick: handleAdd }
        }
      ),
      "data-testid": "source-list",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: filterFields, onSearch: setFilterData, listKey: "source-list" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: filteredData,
            columns,
            enablePagination: true,
            onEdit: handleEdit,
            onDelete: handleDelete
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: editingId ? "编辑货源清单" : "新建货源清单" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 1, display: "flex", flexDirection: "column", gap: 2 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Autocomplete,
              {
                "data-testid": "sl-material",
                options: materialOptions,
                getOptionLabel: (o) => `${o.code || ""} ${o.name}`,
                value: selectedMaterial,
                onChange: handleMaterialChange,
                renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, label: "物料", fullWidth: true }),
                isOptionEqualToValue: (o, v) => o.id === v.id
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Autocomplete,
              {
                "data-testid": "sl-vendor",
                options: vendorOptions,
                getOptionLabel: (o) => `${o.name}${o.code ? ` (${o.code})` : ""}`,
                value: selectedVendor,
                onChange: handleVendorChange,
                renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, label: "供应商", fullWidth: true }),
                isOptionEqualToValue: (o, v) => o.id === v.id
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                "data-testid": "sl-priority",
                label: "优先级",
                type: "number",
                value: form.priority,
                onChange: (e) => setForm({ ...form, priority: Number(e.target.value) }),
                fullWidth: true,
                inputProps: { min: 1, max: 99 },
                helperText: "1-99，越小越优先"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "有效起",
                type: "date",
                value: form.validFrom,
                onChange: (e) => setForm({ ...form, validFrom: e.target.value }),
                fullWidth: true,
                InputLabelProps: { shrink: true }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "有效止",
                type: "date",
                value: form.validTo,
                onChange: (e) => setForm({ ...form, validTo: e.target.value }),
                fullWidth: true,
                InputLabelProps: { shrink: true }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              FormControlLabel,
              {
                control: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Switch,
                  {
                    checked: form.fixedVendor,
                    onChange: (e) => setForm({ ...form, fixedVendor: e.target.checked })
                  }
                ),
                label: "固定货源"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "配额百分比",
                type: "number",
                value: form.quotaPercentage ?? "",
                onChange: (e) => setForm({ ...form, quotaPercentage: Number(e.target.value) }),
                fullWidth: true,
                inputProps: { min: 0, max: 100 },
                helperText: "0-100"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              TextField,
              {
                select: true,
                label: "状态",
                value: form.status,
                onChange: (e) => setForm({ ...form, status: e.target.value }),
                fullWidth: true,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "active", children: "生效中" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "inactive", children: "已失效" })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "备注",
                value: form.remarks,
                onChange: (e) => setForm({ ...form, remarks: e.target.value }),
                fullWidth: true,
                multiline: true,
                rows: 2
              }
            )
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                "data-testid": "sl-submit",
                variant: "contained",
                onClick: handleSubmit,
                children: editingId ? "保存" : "新建"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConfirmDialog,
          {
            open: !!deleteTarget,
            type: "danger",
            title: "确认删除",
            content: `确定删除供应商"${deleteTarget == null ? void 0 : deleteTarget.vendorName}"对物料"${deleteTarget == null ? void 0 : deleteTarget.materialName}"的货源清单吗？此操作不可撤销。`,
            onConfirm: confirmDelete,
            onCancel: () => setDeleteTarget(null),
            confirmText: "确认删除"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Snackbar,
          {
            open: snackbar.open,
            autoHideDuration: 3e3,
            onClose: () => setSnackbar((s) => ({ ...s, open: false })),
            anchorOrigin: { vertical: "bottom", horizontal: "center" },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Alert,
              {
                onClose: () => setSnackbar((s) => ({ ...s, open: false })),
                severity: snackbar.severity,
                sx: { width: "100%" },
                children: snackbar.message
              }
            )
          }
        )
      ]
    }
  );
};
export {
  SourceListPage as default
};
