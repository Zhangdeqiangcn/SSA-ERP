import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { m as Box, T as Typography, bm as Button, dG as default_1, bY as Grid, bs as Card, bt as CardContent, aS as Paper, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, n as Divider, f5 as default_1$1, bv as TextField, aR as MenuItem, aO as Chip, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bE as DialogActions } from "./vendor-mui-DsZGB15g.js";
import { f as useFinanceStore } from "./index-CU2cqxc8.js";
import { F as FlowTracker } from "./FlowTracker-B5McqHb_.js";
import "./vendor-date-DI3D_gXa.js";
import { u as useFinanceExtensionStore, B as BASE_CURRENCY_CODE } from "./financeExtensionStore-DxSjHPMg.js";
import "./vendor-t9csHBDX.js";
function AuxiliaryAccounting() {
  const { accountEntries } = useFinanceStore();
  const { costCenters, addCostCenter, updateCostCenter, removeCostCenter } = useFinanceExtensionStore();
  const [filterCC, setFilterCC] = reactExports.useState("all");
  const [editOpen, setEditOpen] = reactExports.useState(false);
  const [editId, setEditId] = reactExports.useState(null);
  const [form, setForm] = reactExports.useState({ code: "", name: "", dept: "", manager: "", note: "" });
  const [msg, setMsg] = reactExports.useState(null);
  const filteredEntries = reactExports.useMemo(() => {
    return accountEntries.filter((e) => {
      if (filterCC !== "all") {
        if (e.costCenterId !== filterCC && e.projectId !== filterCC) return false;
      }
      return true;
    });
  }, [accountEntries, filterCC]);
  const ccSummary = reactExports.useMemo(() => {
    const map = {};
    accountEntries.forEach((e) => {
      if (e.costCenterId) {
        const cc = costCenters.find((c) => c.id === e.costCenterId);
        const key = e.costCenterId;
        if (!map[key]) map[key] = { name: (cc == null ? void 0 : cc.name) || e.costCenterName || key, amount: 0 };
        map[key].amount += e.amount;
      }
    });
    return map;
  }, [accountEntries, costCenters]);
  const openCreate = () => {
    setEditId(null);
    setForm({ code: `CC-${String(costCenters.length + 1).padStart(3, "0")}`, name: "", dept: "", manager: "", note: "" });
    setMsg(null);
    setEditOpen(true);
  };
  const openEdit = (id) => {
    const c = costCenters.find((x) => x.id === id);
    if (!c) return;
    setEditId(id);
    setForm({ code: c.code, name: c.name, dept: c.dept, manager: c.manager, note: c.note || "" });
    setMsg(null);
    setEditOpen(true);
  };
  const handleSave = () => {
    if (editId) {
      updateCostCenter(editId, { ...form });
      setMsg("成本中心已更新");
    } else {
      addCostCenter({ ...form });
      setMsg("成本中心已新增");
    }
    setEditOpen(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "辅助核算（成本中心 / 项目）" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "finance", currentStatus: "fin_aux" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), size: "small", onClick: openCreate, children: "新增成本中心" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 2, "&:last-child": { pb: 2 } }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "成本中心数" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: costCenters.length })
      ] }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 2, "&:last-child": { pb: 2 } }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "已挂辅助核算凭证" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: accountEntries.filter((e) => e.costCenterId || e.projectId).length })
      ] }) }) }),
      Object.entries(ccSummary).slice(0, 2).map(([id, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 2, "&:last-child": { pb: 2 } }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
          v.name,
          " 发生额"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "h5", fontWeight: 700, children: [
          "¥",
          v.amount.toLocaleString(void 0, { maximumFractionDigits: 0 })
        ] })
      ] }) }) }, id))
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 1 }, children: "成本中心主数据" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { mb: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "编码" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "名称" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "所属部门" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "负责人" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "备注" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: costCenters.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: c.code }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: c.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: c.dept }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: c.manager }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: c.note || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", onClick: () => openEdit(c.id), children: "编辑" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", color: "error", onClick: () => removeCostCenter(c.id), children: "删除" })
        ] })
      ] }, c.id)) })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 2 } }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 2, mb: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "凭证辅助核算查询" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, { fontSize: "small", color: "action" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TextField, { select: true, size: "small", label: "维度筛选", value: filterCC, onChange: (e) => setFilterCC(e.target.value), sx: { width: 240 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "all", children: "全部凭证" }),
        costCenters.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: c.id, children: [
          c.name,
          "（成本中心）"
        ] }, c.id))
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "凭证号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "日期" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "摘要" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "借方科目" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "贷方科目" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "金额" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "成本中心" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "项目" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
        filteredEntries.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 8, align: "center", sx: { py: 4, color: "text.secondary" }, children: "暂无符合条件凭证" }) }),
        filteredEntries.map((e) => {
          const cc = costCenters.find((c) => c.id === e.costCenterId);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: e.voucherNo }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: e.date }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: e.description }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: e.debitAccount || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: e.creditAccount || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { fontWeight: 600, children: [
              "¥",
              e.amount.toLocaleString()
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: cc ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: cc.name, size: "small" }) : e.costCenterName || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: e.projectName || e.projectId || "—" })
          ] }, e.id);
        })
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { display: "block", mt: 1 }, children: [
      "提示：自动/手工生成凭证时可填写成本中心或项目维度（AccountEntry.costCenterId / projectId），此处即按维度归集。本位币：",
      BASE_CURRENCY_CODE,
      "。"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: editOpen, onClose: () => setEditOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: editId ? "编辑成本中心" : "新增成本中心" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { dividers: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { pt: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "编码", value: form.code, onChange: (e) => setForm({ ...form, code: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "名称", value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "所属部门", value: form.dept, onChange: (e) => setForm({ ...form, dept: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "负责人", value: form.manager, onChange: (e) => setForm({ ...form, manager: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "备注", value: form.note, onChange: (e) => setForm({ ...form, note: e.target.value }) }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        msg && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: msg, color: "success", sx: { mr: "auto" }, "data-testid": "cc-msg" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setEditOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "cc-save", onClick: handleSave, children: "保存" })
      ] })
    ] })
  ] });
}
export {
  AuxiliaryAccounting as default
};
