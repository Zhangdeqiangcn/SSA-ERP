import { r as reactExports, j as jsxRuntimeExports, B as Box, aP as Paper, h as Typography, bK as Stack, bt as TextField, aQ as Search, aO as MenuItem, bj as Alert, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip, k as Tooltip, aJ as IconButton, bg as Edit, bc as Delete, b7 as Dialog, b8 as DialogTitle, aS as CloseIcon, ba as DialogContent, bX as Grid, bC as DialogActions, bk as Button, bf as Add } from "./vendor-46QZWBd3.js";
import { c as useWarehouseStore, u as useMaterialStore, g as useOrgStore } from "./index-CcOZBoQL.js";
import { C as ConfirmDialog } from "./ConfirmDialog-BMZp8iYJ.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import { u as useWarehouseMasterStore, s as selectWarehousesByOrg } from "./warehouseMasterStore-Ct1rrWsm.js";
import { m as matchOrg } from "./org-sXHLpR-x.js";
const STATUS_CONFIG = {
  normal: { label: "正常", color: "#10B981" },
  expiring: { label: "临期", color: "#F59E0B" },
  expired: { label: "已过期", color: "#EF4444" },
  locked: { label: "锁定", color: "#64748B" }
};
const EXPIRING_WINDOW_DAYS = 60;
const computeStatus = (b, refDate) => {
  if (b.locked) return "locked";
  if (b.expiryDate) {
    const exp = new Date(b.expiryDate).getTime();
    const ref = new Date(refDate).getTime();
    if (isNaN(exp)) return "normal";
    if (exp < ref) return "expired";
    if (exp - ref <= EXPIRING_WINDOW_DAYS * 864e5) return "expiring";
  }
  return "normal";
};
const BatchManage = () => {
  var _a, _b, _c;
  const { batchRecords, addBatchRecord, updateBatchRecord, deleteBatchRecord } = useWarehouseStore();
  const materials = useMaterialStore((s) => s.materials);
  const warehouses = useWarehouseMasterStore((s) => s.warehouses);
  const currentOrgId = useOrgStore((s) => s.currentOrgId);
  const visibleWarehouses = warehouses.filter(selectWarehousesByOrg(currentOrgId));
  const orgBatches = batchRecords.filter((b) => matchOrg(b, currentOrgId));
  const [search, setSearch] = reactExports.useState("");
  const [statusFilter, setStatusFilter] = reactExports.useState("");
  const [dialogOpen, setDialogOpen] = reactExports.useState(false);
  const [editing, setEditing] = reactExports.useState(null);
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const [form, setForm] = reactExports.useState({
    batchNo: "",
    materialCode: "",
    materialName: "",
    warehouseId: ((_a = visibleWarehouses[0]) == null ? void 0 : _a.id) || "wh-001",
    warehouseName: ((_b = visibleWarehouses[0]) == null ? void 0 : _b.name) || "主仓库",
    quantity: 0,
    productionDate: "",
    expiryDate: "",
    inboundNo: "",
    inboundDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
    supplierName: "",
    status: "normal"
  });
  const refDate = reactExports.useMemo(() => {
    const dates = batchRecords.map((b) => b.inboundDate).filter(Boolean);
    return dates.length ? dates.sort().slice(-1)[0] : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  }, [batchRecords]);
  const filtered = orgBatches.filter((b) => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (search && !`${b.batchNo}${b.materialName}${b.supplierName}`.includes(search)) return false;
    return true;
  });
  const stats = [
    { label: "批次总数", count: orgBatches.length, color: "#3B82F6" },
    { label: "正常", count: orgBatches.filter((b) => b.status === "normal").length, color: "#10B981" },
    { label: "临期", count: orgBatches.filter((b) => b.status === "expiring").length, color: "#F59E0B" },
    { label: "已过期", count: orgBatches.filter((b) => b.status === "expired").length, color: "#EF4444" },
    { label: "锁定", count: orgBatches.filter((b) => b.status === "locked").length, color: "#64748B" }
  ];
  const openCreate = () => {
    var _a2, _b2;
    setEditing(null);
    setForm({
      batchNo: "",
      materialCode: "",
      materialName: "",
      warehouseId: ((_a2 = visibleWarehouses[0]) == null ? void 0 : _a2.id) || "wh-001",
      warehouseName: ((_b2 = visibleWarehouses[0]) == null ? void 0 : _b2.name) || "主仓库",
      quantity: 0,
      productionDate: "",
      expiryDate: "",
      inboundNo: "",
      inboundDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      supplierName: "",
      status: "normal"
    });
    setDialogOpen(true);
  };
  const openEdit = (b) => {
    setEditing(b);
    setForm({ ...b });
    setDialogOpen(true);
  };
  const handleMaterialPick = (code) => {
    const m = materials.find((x) => x.code === code);
    if (m) setForm((f) => ({ ...f, materialCode: m.code, materialName: m.name }));
  };
  const handleSave = () => {
    if (!form.batchNo || !form.materialName) return;
    const status = computeStatus(form, refDate);
    if (editing) {
      updateBatchRecord(editing.id, { ...form, status });
    } else {
      addBatchRecord({ ...form, id: `bat-${Date.now()}`, status });
    }
    setDialogOpen(false);
  };
  const materialOptions = materials.map((m) => ({ code: m.code, name: m.name }));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "批次管理",
      subtitle: "批次/序列号追踪与效期预警（对标 SAP / 用友 / 金蝶）",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: openCreate, children: "新增批次" }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }, children: stats.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: {
          px: 2.5,
          py: 2,
          borderRadius: 3,
          flex: 1,
          minWidth: 120,
          border: `1px solid ${s.color}20`,
          bgcolor: s.color + "08"
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, color: s.color, children: s.count }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: s.label })
        ] }, s.label)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2, mb: 2, borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", flexWrap: "wrap", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              size: "small",
              placeholder: "搜索批次号/物料/供应商",
              value: search,
              onChange: (e) => setSearch(e.target.value),
              InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { sx: { color: "#94A3B8", mr: 0.5, fontSize: 18 } }) },
              sx: { width: 280 }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TextField, { select: true, size: "small", label: "状态", value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), sx: { width: 140 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "全部" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "normal", children: "正常" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "expiring", children: "临期" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "expired", children: "已过期" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "locked", children: "锁定" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { py: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", children: [
            "数据基准日：",
            refDate,
            "（用于效期计算）"
          ] }) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "批次号" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "仓库" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "数量" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "生产日期" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "效期" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "入库日期" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "供应商" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "状态" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "操作" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
            filtered.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", color: "#3B82F6", children: b.batchNo }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: b.materialName }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: b.materialCode })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: b.warehouseName || b.warehouseId }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: b.quantity }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: b.productionDate || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: b.expiryDate || "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: b.inboundDate }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: b.supplierName || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  label: STATUS_CONFIG[b.status].label,
                  size: "small",
                  sx: { bgcolor: STATUS_CONFIG[b.status].color + "15", color: STATUS_CONFIG[b.status].color, fontWeight: 500 }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "编辑", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => openEdit(b), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "删除", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => setDeleteTarget(b), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) })
              ] })
            ] }, b.id)),
            filtered.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 10, align: "center", sx: { py: 4, color: "#94A3B8" }, children: "暂无批次数据" }) })
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: dialogOpen, onClose: () => setDialogOpen(false), maxWidth: "sm", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [
            editing ? "编辑批次" : "新增批次",
            /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { onClick: () => setDialogOpen(false), size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, {}) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mt: 0.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "批次号",
                value: form.batchNo || "",
                onChange: (e) => setForm((f) => ({ ...f, batchNo: e.target.value })),
                required: true
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                select: true,
                fullWidth: true,
                size: "small",
                label: "仓库",
                value: form.warehouseId || ((_c = visibleWarehouses[0]) == null ? void 0 : _c.id) || "wh-001",
                onChange: (e) => {
                  const w = visibleWarehouses.find((x) => x.id === e.target.value);
                  setForm((f) => ({ ...f, warehouseId: e.target.value, warehouseName: w == null ? void 0 : w.name }));
                },
                children: visibleWarehouses.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: w.id, children: w.name }, w.id))
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                select: true,
                label: "物料",
                value: form.materialCode || "",
                onChange: (e) => handleMaterialPick(e.target.value),
                SelectProps: { native: false },
                InputLabelProps: { shrink: true },
                children: materialOptions.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: m.code, children: [
                  m.name,
                  "（",
                  m.code,
                  "）"
                ] }, m.code))
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                type: "number",
                label: "数量",
                value: form.quantity ?? 0,
                onChange: (e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "供应商",
                value: form.supplierName || "",
                onChange: (e) => setForm((f) => ({ ...f, supplierName: e.target.value }))
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "生产日期",
                type: "date",
                value: form.productionDate || "",
                onChange: (e) => setForm((f) => ({ ...f, productionDate: e.target.value })),
                InputLabelProps: { shrink: true }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "效期",
                type: "date",
                value: form.expiryDate || "",
                onChange: (e) => setForm((f) => ({ ...f, expiryDate: e.target.value })),
                InputLabelProps: { shrink: true }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "入库单号",
                value: form.inboundNo || "",
                onChange: (e) => setForm((f) => ({ ...f, inboundNo: e.target.value }))
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "入库日期",
                type: "date",
                value: form.inboundDate || "",
                onChange: (e) => setForm((f) => ({ ...f, inboundDate: e.target.value })),
                InputLabelProps: { shrink: true }
              }
            ) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDialogOpen(false), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleSave, children: "保存" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConfirmDialog,
          {
            open: !!deleteTarget,
            title: "确认删除批次",
            content: `确定删除批次 "${deleteTarget == null ? void 0 : deleteTarget.batchNo}" 吗？此操作不可逆。`,
            confirmText: "确认删除",
            confirmColor: "error",
            onConfirm: () => {
              if (deleteTarget) deleteBatchRecord(deleteTarget.id);
              setDeleteTarget(null);
            },
            onCancel: () => setDeleteTarget(null)
          }
        )
      ]
    }
  );
};
export {
  BatchManage as default
};
