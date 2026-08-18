import { h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { u as useProductionStore } from "./productionStore-B8YnWPVr.js";
import { m as Box, T as Typography, bm as Button, bh as Add, aS as Paper, aO as Chip, p as Tooltip, aM as IconButton, bS as Visibility, bi as Edit, dH as PlayArrow, b9 as Dialog, ba as DialogTitle, bL as Stack, aV as CloseIcon, bc as DialogContent, bv as TextField, aR as MenuItem, be as Delete, bE as DialogActions } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./index-hTLNcGoC.js";
import "./vendor-date-DpsB6iVy.js";
const STATUS_LABELS = {
  draft: "草稿",
  active: "启用",
  obsolete: "废弃"
};
const STATUS_COLORS = {
  draft: "#F59E0B",
  active: "#10B981",
  obsolete: "#94A3B8"
};
const emptyOp = { operationName: "", workCenter: "", runTime: "0" };
const genRouteNo = () => {
  const d = /* @__PURE__ */ new Date();
  const ymd = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9e3 + 1e3);
  return `RT${ymd}${rand}`;
};
const nowStr = () => {
  const d = /* @__PURE__ */ new Date();
  const p = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const ProcessRouteList = () => {
  const { processRoutes, addProcessRoute, updateProcessRoute } = useProductionStore();
  useNavigate();
  const [open, setOpen] = reactExports.useState(false);
  const [editingId, setEditingId] = reactExports.useState(null);
  const [routeNo, setRouteNo] = reactExports.useState("");
  const [name, setName] = reactExports.useState("");
  const [productCode, setProductCode] = reactExports.useState("");
  const [productName, setProductName] = reactExports.useState("");
  const [version, setVersion] = reactExports.useState("V1.0");
  const [status, setStatus] = reactExports.useState("draft");
  const [totalLeadTime, setTotalLeadTime] = reactExports.useState("0");
  const [ops, setOps] = reactExports.useState([{ ...emptyOp }]);
  const openCreate = () => {
    setEditingId(null);
    setRouteNo(genRouteNo());
    setName("");
    setProductCode("");
    setProductName("");
    setVersion("V1.0");
    setStatus("draft");
    setTotalLeadTime("0");
    setOps([{ ...emptyOp }]);
    setOpen(true);
  };
  const openEdit = (route) => {
    setEditingId(route.id);
    setRouteNo(route.routeNo);
    setName(route.name);
    setProductCode(route.productCode);
    setProductName(route.productName);
    setVersion(route.version);
    setStatus(route.status);
    setTotalLeadTime(String(route.totalLeadTime));
    setOps(route.operations.length ? route.operations.map((o) => ({ operationName: o.operationName, workCenter: o.workCenter, runTime: String(o.runTime) })) : [{ ...emptyOp }]);
    setOpen(true);
  };
  const setOp = (i, k, v) => setOps((prev) => prev.map((o, idx) => idx === i ? { ...o, [k]: v } : o));
  const addOp = () => setOps((prev) => [...prev, { ...emptyOp }]);
  const removeOp = (i) => setOps((prev) => prev.filter((_, idx) => idx !== i));
  const handleSave = () => {
    const ts = nowStr();
    const operations = ops.filter((o) => o.operationName.trim()).map((o, i) => ({
      id: `op-${Date.now()}-${i}`,
      sequence: (i + 1) * 10,
      operationCode: `OP${(i + 1) * 10}`,
      operationName: o.operationName,
      workCenter: o.workCenter,
      setupTime: 0,
      runTime: Number(o.runTime) || 0,
      waitTime: 0
    }));
    if (editingId) {
      updateProcessRoute(editingId, { routeNo, name, productCode, productName, version, status, totalLeadTime: Number(totalLeadTime) || 0, operations });
    } else {
      addProcessRoute({
        id: `rt-${Date.now()}`,
        routeNo,
        name,
        productCode,
        productName,
        version,
        status,
        totalLeadTime: Number(totalLeadTime) || 0,
        operations,
        createdAt: ts,
        updatedAt: ts,
        createdBy: "系统",
        updatedBy: "系统"
      });
    }
    setOpen(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: "#1E293B" }, children: "工艺路线" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: openCreate, children: "新建工艺路线" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", flexDirection: "column", gap: 2 }, children: processRoutes.map((route) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 1.5, alignItems: "center", mb: 0.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontFamily: "monospace", color: "#94A3B8", fontWeight: 600 }, children: route.routeNo }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: route.version, size: "small", sx: { bgcolor: "#F8FAFC", color: "#475569" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: STATUS_LABELS[route.status],
                size: "small",
                sx: { bgcolor: STATUS_COLORS[route.status] + "15", color: STATUS_COLORS[route.status], fontWeight: 500 }
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600, color: "#1E293B" }, children: route.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { color: "#64748B" }, children: [
            route.productName,
            " · 标准工时 ",
            route.totalLeadTime,
            "h"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 0.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "查看详情", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => openEdit(route), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Visibility, { fontSize: "small" }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "编辑", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => openEdit(route), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 0, overflowX: "auto", pb: 1 }, children: route.operations.map((op, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Box,
          {
            sx: {
              minWidth: 120,
              p: 1.5,
              borderRadius: 2,
              bgcolor: "#F8FAFC",
              border: "1px solid rgba(226,232,240,0.8)",
              textAlign: "center",
              "&:hover": { bgcolor: "#EFF6FF", borderColor: "#3B82F6" }
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: {
                width: 22,
                height: 22,
                borderRadius: "50%",
                bgcolor: "#3B82F6",
                color: "#fff",
                fontSize: "0.6875rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 0.5
              }, children: op.sequence / 10 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { fontWeight: 600, color: "#1E293B", display: "block" }, children: op.operationName }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#94A3B8", display: "block" }, children: op.workCenter }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { color: "#64748B" }, children: [
                op.runTime,
                "分/件"
              ] })
            ]
          }
        ),
        idx < route.operations.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", alignItems: "center", px: 0.5, color: "#CBD5E1" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(PlayArrow, { sx: { fontSize: 18 } }) })
      ] }, op.id)) })
    ] }, route.id)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "md", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [
        editingId ? "编辑工艺路线" : "新建工艺路线",
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { onClick: () => setOpen(false), size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, {}) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, sx: { mt: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "路线编号", value: routeNo, onChange: (e) => setRouteNo(e.target.value), "data-testid": "route-no" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "路线名称", value: name, onChange: (e) => setName(e.target.value), "data-testid": "route-name" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "产品编码", value: productCode, onChange: (e) => setProductCode(e.target.value) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "产品名称", value: productName, onChange: (e) => setProductName(e.target.value), "data-testid": "route-product" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "版本", value: version, onChange: (e) => setVersion(e.target.value) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { select: true, fullWidth: true, label: "状态", value: status, onChange: (e) => setStatus(e.target.value), children: Object.entries(STATUS_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: k, children: v }, k)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "标准工时(h)", type: "number", value: totalLeadTime, onChange: (e) => setTotalLeadTime(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { color: "#475569" }, children: "工序列表" }),
        ops.map((op, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              label: "工序名称",
              value: op.operationName,
              onChange: (e) => setOp(i, "operationName", e.target.value),
              sx: { flex: 2 }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              label: "工作中心",
              value: op.workCenter,
              onChange: (e) => setOp(i, "workCenter", e.target.value),
              sx: { flex: 2 }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              label: "工时(分/件)",
              type: "number",
              value: op.runTime,
              onChange: (e) => setOp(i, "runTime", e.target.value),
              sx: { flex: 1 }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { onClick: () => removeOp(i), disabled: ops.length === 1, size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) })
        ] }, i)),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: addOp, sx: { alignSelf: "flex-start" }, children: "添加工序" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            onClick: handleSave,
            disabled: !name.trim() || !productName.trim(),
            "data-testid": "route-save",
            children: "保存"
          }
        )
      ] })
    ] })
  ] });
};
export {
  ProcessRouteList as default
};
