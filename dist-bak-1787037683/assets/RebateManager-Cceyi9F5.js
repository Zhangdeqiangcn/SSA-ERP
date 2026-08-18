import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, c1 as Tabs, c2 as Tab, bk as Button, bf as Add, cO as TableContainer, aP as Paper, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip, d1 as Switch, k as Tooltip, aJ as IconButton, bg as Edit, bc as Delete, es as Calculate, bO as Payment, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bX as Grid, bt as TextField, aO as MenuItem, bC as DialogActions } from "./vendor-46QZWBd3.js";
import { u as useRebateStore } from "./rebateStore-C8MR-wRT.js";
import { e as useSalesStore } from "./index-CcOZBoQL.js";
const TabPanel = ({ children, value, index }) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { role: "tabpanel", hidden: value !== index, children: value === index && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { pt: 2 }, children }) });
const RebateManager = () => {
  const [tab, setTab] = reactExports.useState(0);
  const { rules, addRule, updateRule, deleteRule, settlements, addSettlement, updateSettlement, calculateRebate } = useRebateStore();
  const salesOrders = useSalesStore((s) => s.salesOrders);
  const [ruleDialog, setRuleDialog] = reactExports.useState(false);
  const [editingRule, setEditingRule] = reactExports.useState(null);
  const [ruleForm, setRuleForm] = reactExports.useState({});
  const openRuleCreate = () => {
    setEditingRule(null);
    setRuleForm({ type: "percent", rate: 0, enabled: true });
    setRuleDialog(true);
  };
  const openRuleEdit = (rule) => {
    setEditingRule(rule);
    setRuleForm({ ...rule });
    setRuleDialog(true);
  };
  const handleRuleSave = () => {
    if (!ruleForm.name) return;
    if (editingRule) {
      updateRule(editingRule.id, ruleForm);
    } else {
      addRule(ruleForm);
    }
    setRuleDialog(false);
  };
  const [settlementDialog, setSettlementDialog] = reactExports.useState(false);
  const [settlementForm, setSettlementForm] = reactExports.useState({
    ruleId: "",
    period: "",
    baseAmount: 0,
    customerId: "",
    customerName: ""
  });
  const computedRebate = reactExports.useMemo(() => {
    if (!settlementForm.ruleId || !settlementForm.baseAmount) return 0;
    return calculateRebate(settlementForm.ruleId, settlementForm.baseAmount);
  }, [settlementForm.ruleId, settlementForm.baseAmount, calculateRebate]);
  const customerSalesSummary = reactExports.useMemo(() => {
    const map = {};
    for (const order of salesOrders) {
      if (order.status === "cancelled") continue;
      const key = order.customerName;
      if (!map[key]) map[key] = { customerName: key, total: 0 };
      map[key].total += order.totalAmount;
    }
    return Object.values(map);
  }, [salesOrders]);
  const handleSettlementCreate = () => {
    const rule = rules.find((r) => r.id === settlementForm.ruleId);
    if (!rule) return;
    addSettlement({
      ruleId: rule.id,
      ruleName: rule.name,
      customerId: settlementForm.customerId,
      customerName: settlementForm.customerName,
      period: settlementForm.period,
      baseAmount: settlementForm.baseAmount,
      rebateAmount: computedRebate,
      status: "pending"
    });
    setSettlementDialog(false);
    setSettlementForm({ ruleId: "", period: "", baseAmount: 0, customerId: "", customerName: "" });
  };
  const handleQuickSettle = (row) => {
    updateSettlement(row.id, {
      status: "settled",
      settledAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
    });
  };
  const statusChip = (status) => {
    const map = {
      pending: { label: "待结算", color: "default" },
      settled: { label: "已结算", color: "success" },
      cancelled: { label: "已取消", color: "error" }
    };
    const item = map[status];
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: item.label, size: "small", color: item.color });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { maxWidth: 1200, mx: "auto" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "返利管理" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tab, onChange: (_, v) => setTab(v), sx: { mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "返利规则" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "返利结算" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(TabPanel, { value: tab, index: 0, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: openRuleCreate, children: "新增规则" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "名称" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "客户" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "类型" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "费率" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "有效期" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "启用" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: rules.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 8, align: "center", children: "暂无返利规则" }) }) : rules.map((rule) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: rule.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: rule.customerName || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: rule.materialName || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: rule.type === "percent" ? "百分比" : "固定金额", size: "small", variant: "outlined" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: rule.type === "percent" ? `${rule.rate}%` : `¥${rule.rate}` }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
            rule.validFrom || "-",
            " ~ ",
            rule.validTo || "-"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { size: "small", checked: rule.enabled, onChange: () => updateRule(rule.id, { enabled: !rule.enabled }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "编辑", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => openRuleEdit(rule), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "删除", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => deleteRule(rule.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) })
          ] })
        ] }, rule.id)) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(TabPanel, { value: tab, index: 1, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mb: 2, display: "flex", gap: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Calculate, {}), onClick: () => setSettlementDialog(true), children: "新增结算" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 3 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "客户销售额汇总" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, variant: "outlined", sx: { maxHeight: 200 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "客户" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "销售总额" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: customerSalesSummary.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.customerName }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
              "¥",
              item.total.toLocaleString()
            ] })
          ] }, item.customerName)) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "规则名称" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "客户" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "周期" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "基数金额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "返利金额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: settlements.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 7, align: "center", children: "暂未结算记录" }) }) : settlements.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.ruleName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.customerName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.period }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
            "¥",
            item.baseAmount.toLocaleString()
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
            "¥",
            item.rebateAmount.toLocaleString()
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: statusChip(item.status) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.status === "pending" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "一键结算", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "success", onClick: () => handleQuickSettle(item), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Payment, { fontSize: "small" }) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "删除", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => updateSettlement(item.id, { status: "cancelled" }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) })
          ] }) })
        ] }, item.id)) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: ruleDialog, onClose: () => setRuleDialog(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: editingRule ? "编辑返利规则" : "新增返利规则" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mt: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "规则名称", value: ruleForm.name || "", onChange: (e) => setRuleForm({ ...ruleForm, name: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "客户名称", value: ruleForm.customerName || "", onChange: (e) => setRuleForm({ ...ruleForm, customerName: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "物料名称", value: ruleForm.materialName || "", onChange: (e) => setRuleForm({ ...ruleForm, materialName: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TextField, { fullWidth: true, size: "small", select: true, label: "类型", value: ruleForm.type || "percent", onChange: (e) => setRuleForm({ ...ruleForm, type: e.target.value }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "percent", children: "百分比" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "fixed", children: "固定金额" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: ruleForm.type === "percent" ? "费率(%)" : "固定金额(元)", type: "number", value: ruleForm.rate || 0, onChange: (e) => setRuleForm({ ...ruleForm, rate: Number(e.target.value) }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "最小金额", type: "number", value: ruleForm.minAmount || "", onChange: (e) => setRuleForm({ ...ruleForm, minAmount: Number(e.target.value) }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "生效日期", type: "date", value: ruleForm.validFrom || "", onChange: (e) => setRuleForm({ ...ruleForm, validFrom: e.target.value }), InputLabelProps: { shrink: true } }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "失效日期", type: "date", value: ruleForm.validTo || "", onChange: (e) => setRuleForm({ ...ruleForm, validTo: e.target.value }), InputLabelProps: { shrink: true } }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setRuleDialog(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleRuleSave, children: "保存" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: settlementDialog, onClose: () => setSettlementDialog(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增返利结算" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mt: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", select: true, label: "返利规则", value: settlementForm.ruleId, onChange: (e) => {
          const rule = rules.find((r) => r.id === e.target.value);
          setSettlementForm({ ...settlementForm, ruleId: e.target.value, customerId: (rule == null ? void 0 : rule.customerId) || "", customerName: (rule == null ? void 0 : rule.customerName) || "" });
        }, children: rules.filter((r) => r.enabled).map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: r.id, children: [
          r.name,
          " (",
          r.type === "percent" ? `${r.rate}%` : `¥${r.rate}`,
          ")"
        ] }, r.id)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "客户", value: settlementForm.customerName, InputProps: { readOnly: true } }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "结算周期", placeholder: "如 2026-Q3", value: settlementForm.period, onChange: (e) => setSettlementForm({ ...settlementForm, period: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "基数金额", type: "number", value: settlementForm.baseAmount, onChange: (e) => setSettlementForm({ ...settlementForm, baseAmount: Number(e.target.value) }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { pt: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "计算结果" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "h6", color: "primary", children: [
            "¥",
            computedRebate.toLocaleString()
          ] })
        ] }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setSettlementDialog(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleSettlementCreate, disabled: !settlementForm.ruleId || !settlementForm.period || !settlementForm.baseAmount, children: "创建结算" })
      ] })
    ] })
  ] });
};
export {
  RebateManager as default
};
