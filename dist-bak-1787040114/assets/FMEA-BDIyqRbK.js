import { r as reactExports, j as jsxRuntimeExports, B as Box, bk as Button, bf as Add, aL as Chip, cO as TableContainer, aP as Paper, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, h as Typography, aJ as IconButton, bg as Edit, bc as Delete, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bX as Grid, bt as TextField, aO as MenuItem, bj as Alert, bC as DialogActions } from "./vendor-DGU5TO-x.js";
import "./index-DeeqqmHA.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import { u as useFMEAStore } from "./fmeaStore-B4RTvukf.js";
const STATUS_LABEL = {
  draft: { label: "草稿", color: "default" },
  reviewed: { label: "已评审", color: "warning" },
  approved: { label: "已批准", color: "success" }
};
const RPN_COLOR = (rpn) => {
  if (rpn >= 200) return "#EF4444";
  if (rpn >= 100) return "#F59E0B";
  return "#10B981";
};
const uid = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
const now = () => (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 19);
const emptyForm = {
  item: "",
  function: "",
  failureMode: "",
  effect: "",
  severity: 5,
  cause: "",
  occurrence: 5,
  currentControl: "",
  detection: 5
};
const FMEAPage = () => {
  const { items, addItem, updateItem, deleteItem } = useFMEAStore();
  const [dialogOpen, setDialogOpen] = reactExports.useState(false);
  const [editingId, setEditingId] = reactExports.useState(null);
  const [form, setForm] = reactExports.useState({ ...emptyForm });
  const [feedback, setFeedback] = reactExports.useState("");
  const rpn = reactExports.useMemo(() => {
    const s = form.severity ?? 5;
    const o = form.occurrence ?? 5;
    const d = form.detection ?? 5;
    return s * o * d;
  }, [form.severity, form.occurrence, form.detection]);
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
    setFeedback("");
  };
  const openEdit = (fmea) => {
    setEditingId(fmea.id);
    setForm({
      item: fmea.item,
      function: fmea.function,
      failureMode: fmea.failureMode,
      effect: fmea.effect,
      severity: fmea.severity,
      cause: fmea.cause,
      occurrence: fmea.occurrence,
      currentControl: fmea.currentControl,
      detection: fmea.detection,
      recommendedAction: fmea.recommendedAction
    });
    setDialogOpen(true);
    setFeedback("");
  };
  const handleSubmit = () => {
    if (!form.item || !form.failureMode) {
      setFeedback("请填写项目和失效模式。");
      return;
    }
    if (editingId) {
      const existing = items.find((x) => x.id === editingId);
      if (existing) {
        updateItem(editingId, {
          ...form,
          severity: form.severity ?? 5,
          occurrence: form.occurrence ?? 5,
          detection: form.detection ?? 5,
          rpn
        });
      }
    } else {
      const newItem = {
        id: uid("fmea"),
        number: `FMEA-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(items.length + 1).padStart(3, "0")}`,
        item: form.item ?? "",
        function: form.function ?? "",
        failureMode: form.failureMode ?? "",
        effect: form.effect ?? "",
        severity: form.severity ?? 5,
        cause: form.cause ?? "",
        occurrence: form.occurrence ?? 5,
        currentControl: form.currentControl ?? "",
        detection: form.detection ?? 5,
        rpn,
        recommendedAction: form.recommendedAction,
        status: "draft",
        createdAt: now(),
        updatedAt: now(),
        createdBy: "当前用户",
        updatedBy: "当前用户"
      };
      addItem(newItem);
    }
    setDialogOpen(false);
    setFeedback("");
  };
  const handleStatusChange = (id, status) => {
    updateItem(id, { status });
  };
  const sortedItems = reactExports.useMemo(() => [...items].sort((a, b) => b.rpn - a.rpn), [items]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "FMEA 失效模式与影响分析", subtitle: "潜在失效模式分析：严重度(S) × 频度(O) × 探测度(D) = RPN", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 2, display: "flex", gap: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: openCreate, "data-testid": "fmea-add", children: "新增FMEA" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `共 ${items.length} 条`, variant: "outlined" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, sx: { borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "编号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "项目" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "功能" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "失效模式" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "影响(S)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "原因(O)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "现行控制(D)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "RPN" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
        sortedItems.map((fmea) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", color: "#3B82F6", children: fmea.number }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmea.item }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { maxWidth: 150 }, noWrap: true, children: fmea.function }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, color: "error.main", children: fmea.failureMode }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              size: "small",
              label: `${fmea.severity}`,
              "data-testid": `fmea-severity`,
              sx: {
                fontWeight: 700,
                bgcolor: fmea.severity >= 8 ? "#EF4444" : fmea.severity >= 5 ? "#F59E0B" : "#10B981",
                color: "#fff",
                minWidth: 36
              }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { fontWeight: 500, children: fmea.occurrence }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { fontWeight: 500, children: fmea.detection }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              size: "small",
              label: fmea.rpn,
              "data-testid": "fmea-rpn",
              sx: {
                fontWeight: 700,
                bgcolor: RPN_COLOR(fmea.rpn),
                color: "#fff",
                minWidth: 50
              }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              size: "small",
              label: STATUS_LABEL[fmea.status].label,
              color: STATUS_LABEL[fmea.status].color,
              onClick: () => {
                const next = fmea.status === "draft" ? "reviewed" : fmea.status === "reviewed" ? "approved" : "draft";
                handleStatusChange(fmea.id, next);
              },
              sx: { cursor: "pointer" }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => openEdit(fmea), "data-testid": "fmea-edit", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => deleteItem(fmea.id), "data-testid": "fmea-delete", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) })
          ] })
        ] }, fmea.id)),
        sortedItems.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 10, align: "center", sx: { py: 4, color: "#94A3B8" }, children: '暂无FMEA记录，点击"新增FMEA"创建' }) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: dialogOpen, onClose: () => setDialogOpen(false), maxWidth: "md", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: editingId ? "编辑 FMEA" : "新增 FMEA" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mt: 0.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              label: "项目",
              value: form.item ?? "",
              onChange: (e) => setForm({ ...form, item: e.target.value }),
              "data-testid": "fmea-item"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              label: "功能",
              value: form.function ?? "",
              onChange: (e) => setForm({ ...form, function: e.target.value })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              label: "失效模式",
              value: form.failureMode ?? "",
              onChange: (e) => setForm({ ...form, failureMode: e.target.value })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              label: "失效影响",
              value: form.effect ?? "",
              onChange: (e) => setForm({ ...form, effect: e.target.value }),
              multiline: true,
              rows: 2
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              select: true,
              label: "严重度 S (1-10)",
              value: form.severity ?? 5,
              onChange: (e) => setForm({ ...form, severity: Number(e.target.value) }),
              "data-testid": "fmea-severity-input",
              children: Array.from({ length: 10 }, (_, i) => i + 1).map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: v, children: v }, v))
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              label: "失效原因",
              value: form.cause ?? "",
              onChange: (e) => setForm({ ...form, cause: e.target.value }),
              multiline: true,
              rows: 2
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              select: true,
              label: "频度 O (1-10)",
              value: form.occurrence ?? 5,
              onChange: (e) => setForm({ ...form, occurrence: Number(e.target.value) }),
              children: Array.from({ length: 10 }, (_, i) => i + 1).map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: v, children: v }, v))
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              label: "现行控制措施",
              value: form.currentControl ?? "",
              onChange: (e) => setForm({ ...form, currentControl: e.target.value }),
              multiline: true,
              rows: 2
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              select: true,
              label: "探测度 D (1-10)",
              value: form.detection ?? 5,
              onChange: (e) => setForm({ ...form, detection: Number(e.target.value) }),
              children: Array.from({ length: 10 }, (_, i) => i + 1).map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: v, children: v }, v))
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2, bgcolor: "#F8FAFC", borderRadius: 2, textAlign: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
              "S(",
              form.severity,
              ") × O(",
              form.occurrence,
              ") × D(",
              form.detection,
              ")"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Typography,
              {
                variant: "h4",
                sx: { fontWeight: 700, color: RPN_COLOR(rpn) },
                "data-testid": "fmea-rpn-calc",
                children: [
                  "RPN = ",
                  rpn
                ]
              }
            )
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              label: "建议措施（可选）",
              value: form.recommendedAction ?? "",
              onChange: (e) => setForm({ ...form, recommendedAction: e.target.value }),
              multiline: true,
              rows: 2
            }
          ) })
        ] }),
        feedback && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "error", sx: { mt: 2 }, onClose: () => setFeedback(""), children: feedback })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDialogOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleSubmit, "data-testid": "fmea-submit", children: editingId ? "保存修改" : "创建" })
      ] })
    ] })
  ] });
};
export {
  FMEAPage as default
};
