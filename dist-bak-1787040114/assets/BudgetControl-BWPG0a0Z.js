import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bk as Button, e1 as default_1, bX as Grid, f6 as default_1$1, bq as Card, br as CardContent, bj as Alert, aP as Paper, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip, cl as LinearProgress, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bt as TextField, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, bC as DialogActions } from "./vendor-DGU5TO-x.js";
import { f as useFinanceStore } from "./index-DeeqqmHA.js";
import { F as FlowTracker } from "./FlowTracker-CCA6kX6w.js";
import { u as useFinanceExtensionStore, B as BASE_CURRENCY_CODE } from "./financeExtensionStore-DC0IEDMi.js";
const DIM_LABEL = {
  costCenter: "成本中心",
  account: "科目",
  project: "项目"
};
function BudgetControl() {
  const { accountEntries } = useFinanceStore();
  const { budgets, costCenters, addBudget, updateBudget, removeBudget } = useFinanceExtensionStore();
  const [editOpen, setEditOpen] = reactExports.useState(false);
  const [editId, setEditId] = reactExports.useState(null);
  const [form, setForm] = reactExports.useState({ period: "2026-07", dimension: "costCenter", refId: "", refName: "", amount: 0, note: "" });
  const [msg, setMsg] = reactExports.useState(null);
  const rows = reactExports.useMemo(() => {
    return budgets.map((b) => {
      let actual = 0;
      if (b.dimension === "costCenter") {
        actual = accountEntries.filter((e) => e.costCenterId === b.refId).reduce((s, e) => s + e.amount, 0);
      } else if (b.dimension === "account") {
        actual = accountEntries.filter((e) => e.debitAccount === b.refName || e.creditAccount === b.refName).reduce((s, e) => s + e.amount, 0);
      } else if (b.dimension === "project") {
        actual = accountEntries.filter((e) => e.projectId === b.refId).reduce((s, e) => s + e.amount, 0);
      }
      const variance = +(b.amount - actual).toFixed(2);
      const rate = b.amount > 0 ? Math.round(actual / b.amount * 100) : 0;
      return { ...b, actual, variance, rate };
    });
  }, [budgets, accountEntries]);
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);
  const overCount = rows.filter((r) => r.rate > 100).length;
  const ccOptions = costCenters.map((c) => ({ id: c.id, name: c.name }));
  const resetForm = () => {
    var _a, _b;
    setForm({ period: "2026-07", dimension: "costCenter", refId: ((_a = ccOptions[0]) == null ? void 0 : _a.id) || "", refName: ((_b = ccOptions[0]) == null ? void 0 : _b.name) || "", amount: 0, note: "" });
  };
  const openCreate = () => {
    setEditId(null);
    resetForm();
    setMsg(null);
    setEditOpen(true);
  };
  const openEdit = (id) => {
    const b = budgets.find((x) => x.id === id);
    if (!b) return;
    setEditId(id);
    setForm({ period: b.period, dimension: b.dimension, refId: b.refId, refName: b.refName, amount: b.amount, note: b.note || "" });
    setMsg(null);
    setEditOpen(true);
  };
  const handleSave = () => {
    if (editId) {
      updateBudget(editId, { ...form });
      setMsg("预算已更新");
    } else {
      addBudget({ ...form });
      setMsg("预算已新增");
    }
    setEditOpen(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "预算控制" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "finance", currentStatus: "fin_budget" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), size: "small", onClick: openCreate, children: "新增预算" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [
      { label: "预算总额", value: `¥${totalBudget.toLocaleString(void 0, { maximumFractionDigits: 0 })}`, color: "#1976d2", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}) },
      { label: "实际发生", value: `¥${totalActual.toLocaleString(void 0, { maximumFractionDigits: 0 })}`, color: "#388e3c", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}) },
      { label: "超预算项", value: `${overCount} 项`, color: overCount > 0 ? "#d32f2f" : "#388e3c", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, {}) },
      { label: "预算项数", value: `${budgets.length} 项`, color: "#7b1fa2", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}) }
    ].map((kpi) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 2, "&:last-child": { pb: 2 } }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color: kpi.color }, children: kpi.icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: kpi.label })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, sx: { color: kpi.color }, children: kpi.value })
    ] }) }) }, kpi.label)) }),
    overCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "error", sx: { mb: 2 }, children: [
      "有 ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: overCount }),
      " 项预算执行率超过 100%，已构成超预算，请关注！"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "期间" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "维度" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "对象" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "预算" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "实际" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "结余" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "执行率" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.period }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: DIM_LABEL[r.dimension], size: "small", variant: "outlined" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.refName }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
          "¥",
          r.amount.toLocaleString(void 0, { maximumFractionDigits: 0 })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
          "¥",
          r.actual.toLocaleString(void 0, { maximumFractionDigits: 0 })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", sx: { color: r.variance < 0 ? "error.main" : "success.main", fontWeight: 600 }, children: [
          "¥",
          r.variance.toLocaleString(void 0, { maximumFractionDigits: 0 })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { width: 160 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LinearProgress, { variant: "determinate", value: Math.min(r.rate, 100), color: r.rate > 100 ? "error" : "primary", sx: { flex: 1, height: 6, borderRadius: 3 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: r.rate > 100 ? "error.main" : "text.secondary", children: [
            r.rate,
            "%"
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.rate > 100 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "超预算", color: "error", size: "small" }) : r.rate > 80 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "临界", color: "warning", size: "small" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "正常", color: "success", size: "small" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", onClick: () => openEdit(r.id), children: "编辑" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", color: "error", onClick: () => removeBudget(r.id), children: "删除" })
        ] })
      ] }, r.id)) })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { display: "block", mt: 1 }, children: [
      "实际发生额取自财务凭证（accountEntries）：成本中心预算按 costCenterId 归集，科目预算按科目名称匹配借贷方，项目预算按 projectId 归集。本位币：",
      BASE_CURRENCY_CODE,
      "。"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: editOpen, onClose: () => setEditOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: editId ? "编辑预算" : "新增预算" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { dividers: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { pt: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "预算期间", value: form.period, onChange: (e) => setForm({ ...form, period: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "维度" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { label: "维度", value: form.dimension, onChange: (e) => {
            const dim = e.target.value;
            setForm({ ...form, dimension: dim, refId: "", refName: "" });
          }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "costCenter", children: "成本中心" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "account", children: "科目" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "project", children: "项目" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: form.dimension === "costCenter" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "成本中心" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { label: "成本中心", value: form.refId, onChange: (e) => {
            const cc = costCenters.find((c) => c.id === e.target.value);
            setForm({ ...form, refId: e.target.value, refName: (cc == null ? void 0 : cc.name) || "" });
          }, children: ccOptions.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: c.id, children: c.name }, c.id)) })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: form.dimension === "account" ? "科目名称（如 管理费用）" : "项目ID",
            value: form.refName,
            onChange: (e) => setForm({ ...form, refName: e.target.value, refId: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "预算金额", type: "number", value: form.amount, onChange: (e) => setForm({ ...form, amount: Number(e.target.value) }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "备注", value: form.note, onChange: (e) => setForm({ ...form, note: e.target.value }) }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        msg && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: msg, color: "success", sx: { mr: "auto" }, "data-testid": "budget-msg" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setEditOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "budget-save", onClick: handleSave, children: "保存" })
      ] })
    ] })
  ] });
}
export {
  BudgetControl as default
};
