import { r as reactExports, j as jsxRuntimeExports, R as React } from "./vendor-react-CdHjdSaV.js";
import { g as useOrgStore } from "./index-CU2cqxc8.js";
import { C as ConfirmDialog } from "./ConfirmDialog-Dv8y0jQp.js";
import "./vendor-date-DI3D_gXa.js";
import { P as PageWrapper } from "./PageWrapper-CjuAUfYF.js";
import { u as useWarehouseMasterStore, s as selectWarehousesByOrg, W as WAREHOUSE_TYPE_LABELS } from "./warehouseMasterStore-BjZtdDuE.js";
import { bl as Alert, aS as Paper, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aM as IconButton, E as ExpandLess, x as ExpandMore, T as Typography, m as Box, a9 as Warehouse, aO as Chip, p as Tooltip, cW as LocationOn, bi as Edit, be as Delete, y as Collapse, bL as Stack, bm as Button, bh as Add, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bY as Grid, bv as TextField, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, bE as DialogActions, ck as RestartAlt } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
const WarehouseMaster = () => {
  const { warehouses, addWarehouse, updateWarehouse, deleteWarehouse, addLocation, updateLocation, deleteLocation, resetWarehouses } = useWarehouseMasterStore();
  const { organizations, currentOrgId } = useOrgStore();
  const [expanded, setExpanded] = reactExports.useState(null);
  const [whDialog, setWhDialog] = reactExports.useState(false);
  const [editingWh, setEditingWh] = reactExports.useState(null);
  const [whForm, setWhForm] = reactExports.useState({});
  const [delWh, setDelWh] = reactExports.useState(null);
  const [locDialog, setLocDialog] = reactExports.useState(false);
  const [locWhId, setLocWhId] = reactExports.useState("");
  const [editingLoc, setEditingLoc] = reactExports.useState(null);
  const [locForm, setLocForm] = reactExports.useState({});
  const [delLoc, setDelLoc] = reactExports.useState(null);
  const visible = warehouses.filter(selectWarehousesByOrg(currentOrgId));
  const openWhCreate = () => {
    setEditingWh(null);
    setWhForm({ orgId: currentOrgId, type: "raw", status: "active" });
    setWhDialog(true);
  };
  const openWhEdit = (w) => {
    setEditingWh(w);
    setWhForm({ ...w });
    setWhDialog(true);
  };
  const saveWh = () => {
    if (!whForm.name || !whForm.code) return;
    const payload = {
      code: whForm.code,
      name: whForm.name,
      orgId: whForm.orgId || currentOrgId,
      type: whForm.type || "raw",
      address: whForm.address,
      manager: whForm.manager,
      status: whForm.status || "active",
      locations: whForm.locations || []
    };
    if (editingWh) updateWarehouse(editingWh.id, payload);
    else addWarehouse(payload);
    setWhDialog(false);
  };
  const openLocCreate = (whId) => {
    setLocWhId(whId);
    setEditingLoc(null);
    setLocForm({});
    setLocDialog(true);
  };
  const openLocEdit = (whId, l) => {
    setLocWhId(whId);
    setEditingLoc(l);
    setLocForm({ ...l });
    setLocDialog(true);
  };
  const saveLoc = () => {
    if (!locForm.name || !locForm.code) return;
    const payload = { code: locForm.code, name: locForm.name, zone: locForm.zone, remark: locForm.remark };
    if (editingLoc) updateLocation(locWhId, editingLoc.id, payload);
    else addLocation(locWhId, payload);
    setLocDialog(false);
  };
  const orgName = (id) => {
    var _a;
    return ((_a = organizations.find((o) => o.id === id)) == null ? void 0 : _a.name) || id || "-";
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "仓库主数据",
      subtitle: "统一管理仓库与库位（P2-2 多仓多库位，替代各表单硬编码仓库）",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(RestartAlt, {}), onClick: resetWarehouses, children: "重置" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: openWhCreate, children: "新增仓库" })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 2, borderRadius: 2 }, children: [
          "当前组织：",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: orgName(currentOrgId) }),
          "。仓库按所属组织隔离；切换顶栏组织可查看对应仓库与库位。"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "仓库编码" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "名称" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "类型" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "所属组织" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "负责人" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "库位数" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "状态" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "操作" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
            visible.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsxs(React.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => setExpanded(expanded === w.id ? null : w.id), children: expanded === w.id ? /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandLess, { fontSize: "small" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandMore, { fontSize: "small" }) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", color: "#3B82F6", children: w.code }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Warehouse, { fontSize: "small", sx: { color: "#64748B" } }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: w.name })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: WAREHOUSE_TYPE_LABELS[w.type], size: "small", sx: { bgcolor: "#EFF6FF", color: "#3B82F6" } }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: orgName(w.orgId) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: w.manager || "-" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: w.locations.length }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Chip,
                  {
                    label: w.status === "active" ? "启用" : "停用",
                    size: "small",
                    sx: { bgcolor: w.status === "active" ? "#10B98115" : "#64748B15", color: w.status === "active" ? "#10B981" : "#64748B" }
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "新增库位", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => openLocCreate(w.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(LocationOn, { fontSize: "small" }) }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "编辑", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => openWhEdit(w), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "删除", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => setDelWh(w), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 9, sx: { p: 0, border: "none" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Collapse, { in: expanded === w.id, timeout: "auto", unmountOnExit: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { bgcolor: "#F8FAFC", p: 2 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", sx: { mb: 1 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, children: [
                    "库位列表（",
                    w.name,
                    "）"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => openLocCreate(w.id), children: "新增库位" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, variant: "outlined", sx: { borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "库位编码" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "名称" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "库区" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "操作" })
                  ] }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
                    w.locations.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: l.code }) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: l.name }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: l.zone || "-" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => openLocEdit(w.id, l), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => setDelLoc({ whId: w.id, loc: l }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) })
                      ] })
                    ] }, l.id)),
                    w.locations.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 4, align: "center", sx: { py: 2, color: "#94A3B8" }, children: "暂无库位" }) })
                  ] })
                ] }) })
              ] }) }) }) })
            ] }, w.id)),
            visible.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 9, align: "center", sx: { py: 4, color: "#94A3B8" }, children: "当前组织下暂无仓库" }) })
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: whDialog, onClose: () => setWhDialog(false), maxWidth: "sm", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: editingWh ? "编辑仓库" : "新增仓库" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mt: 0.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "仓库编码",
                value: whForm.code || "",
                onChange: (e) => setWhForm((f) => ({ ...f, code: e.target.value })),
                required: true
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "名称",
                value: whForm.name || "",
                onChange: (e) => setWhForm((f) => ({ ...f, name: e.target.value })),
                required: true
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "所属组织" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Select,
                {
                  label: "所属组织",
                  value: whForm.orgId || currentOrgId,
                  onChange: (e) => setWhForm((f) => ({ ...f, orgId: e.target.value })),
                  children: organizations.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o.id, children: o.name }, o.id))
                }
              )
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "类型" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Select,
                {
                  label: "类型",
                  value: whForm.type || "raw",
                  onChange: (e) => setWhForm((f) => ({ ...f, type: e.target.value })),
                  children: Object.entries(WAREHOUSE_TYPE_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: k, children: v }, k))
                }
              )
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "负责人",
                value: whForm.manager || "",
                onChange: (e) => setWhForm((f) => ({ ...f, manager: e.target.value }))
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "状态" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Select,
                {
                  label: "状态",
                  value: whForm.status || "active",
                  onChange: (e) => setWhForm((f) => ({ ...f, status: e.target.value })),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "active", children: "启用" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "disabled", children: "停用" })
                  ]
                }
              )
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "地址",
                value: whForm.address || "",
                onChange: (e) => setWhForm((f) => ({ ...f, address: e.target.value }))
              }
            ) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setWhDialog(false), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: saveWh, children: "保存" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: locDialog, onClose: () => setLocDialog(false), maxWidth: "xs", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: editingLoc ? "编辑库位" : "新增库位" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mt: 0.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "库位编码",
                value: locForm.code || "",
                onChange: (e) => setLocForm((f) => ({ ...f, code: e.target.value })),
                required: true
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "名称",
                value: locForm.name || "",
                onChange: (e) => setLocForm((f) => ({ ...f, name: e.target.value })),
                required: true
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "库区",
                value: locForm.zone || "",
                onChange: (e) => setLocForm((f) => ({ ...f, zone: e.target.value }))
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "备注",
                value: locForm.remark || "",
                onChange: (e) => setLocForm((f) => ({ ...f, remark: e.target.value }))
              }
            ) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setLocDialog(false), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: saveLoc, children: "保存" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConfirmDialog,
          {
            open: !!delWh,
            title: "确认删除仓库",
            content: `确定删除仓库 "${delWh == null ? void 0 : delWh.name}" 吗？其下库位将一并删除。`,
            confirmText: "确认删除",
            confirmColor: "error",
            onConfirm: () => {
              if (delWh) deleteWarehouse(delWh.id);
              setDelWh(null);
            },
            onCancel: () => setDelWh(null)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConfirmDialog,
          {
            open: !!delLoc,
            title: "确认删除库位",
            content: `确定删除库位 "${delLoc == null ? void 0 : delLoc.loc.name}" 吗？`,
            confirmText: "确认删除",
            confirmColor: "error",
            onConfirm: () => {
              if (delLoc) deleteLocation(delLoc.whId, delLoc.loc.id);
              setDelLoc(null);
            },
            onCancel: () => setDelLoc(null)
          }
        )
      ]
    }
  );
};
export {
  WarehouseMaster as default
};
