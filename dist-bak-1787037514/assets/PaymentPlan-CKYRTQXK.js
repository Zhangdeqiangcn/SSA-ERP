import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { m as Box, T as Typography, bm as Button, f1 as default_1, bl as Alert, bY as Grid, eE as default_1$1, f2 as default_1$2, bs as Card, bt as CardContent, bv as TextField, bQ as InputAdornment, cq as default_1$3, aS as Paper, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, ch as LinearProgress, p as Tooltip, aO as Chip, b9 as Dialog, ba as DialogTitle, bc as DialogContent, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, bE as DialogActions } from "./vendor-mui-UhJuRAfR.js";
import { f as useFinanceStore } from "./index-hTLNcGoC.js";
import { F as FlowTracker } from "./FlowTracker-BvV1jEfP.js";
import "./vendor-date-DpsB6iVy.js";
import { u as useFinanceExtensionStore, B as BASE_CURRENCY_CODE, c as convertCurrency } from "./financeExtensionStore-mnFIWL7o.js";
import "./vendor-C0Ken1ns.js";
const STATUS_CONFIG = {
  pending: { label: "待支付", color: "warning" },
  partial: { label: "部分付款", color: "info" },
  paid: { label: "已付清", color: "success" },
  overdue: { label: "已逾期", color: "error" }
};
function PaymentPlan() {
  const { paymentPlans, financeStats, addPaymentPlan, generateVoucherFromPayment } = useFinanceStore();
  const { exchangeRates } = useFinanceExtensionStore();
  const [search, setSearch] = reactExports.useState("");
  const [createOpen, setCreateOpen] = reactExports.useState(false);
  const [detailOpen, setDetailOpen] = reactExports.useState(false);
  const [selectedPlan, setSelectedPlan] = reactExports.useState(null);
  const [voucherMsg, setVoucherMsg] = reactExports.useState(null);
  const [form, setForm] = reactExports.useState({
    vendorName: "",
    purchaseOrderNo: "",
    invoiceNo: "",
    totalAmount: 0,
    dueDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    paymentMethod: "电汇(T/T)"
  });
  const handleViewDetail = (p) => {
    setSelectedPlan(p);
    setVoucherMsg(null);
    setDetailOpen(true);
  };
  const handleGenVoucher = () => {
    if (!selectedPlan) return;
    const v = generateVoucherFromPayment(selectedPlan.id);
    setVoucherMsg(v ? `凭证已生成，凭证号：${v}` : "该付款已生成过凭证（无需重复生成）");
  };
  const filtered = paymentPlans.filter(
    (p) => !search || p.vendorName.includes(search) || p.planNo.includes(search) || p.invoiceNo.includes(search)
  );
  const overdueCount = paymentPlans.filter((p) => p.status === "overdue").length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "付款计划" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "payment-plan", currentStatus: "pp_review" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), size: "small", onClick: () => setCreateOpen(true), children: "申请付款" })
    ] }),
    overdueCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "error", sx: { mb: 2 }, children: [
      "存在 ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: overdueCount }),
      " 笔逾期未付款，共计 ",
      /* @__PURE__ */ jsxRuntimeExports.jsxs("b", { children: [
        "¥",
        financeStats.overdueAmount.toLocaleString()
      ] }),
      "，请及时处理！"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [
      { label: "应付账款总额", value: `¥${financeStats.totalPayable.toLocaleString()}`, color: "#1976d2", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}) },
      { label: "本月已付", value: `¥${financeStats.thisMonthPaid.toLocaleString()}`, color: "#388e3c", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, {}) },
      { label: "逾期金额", value: `¥${financeStats.overdueAmount.toLocaleString()}`, color: "#d32f2f", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$2, {}) },
      { label: "计划总数", value: `${paymentPlans.length} 笔`, color: "#7b1fa2", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}) }
    ].map((kpi) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 2, "&:last-child": { pb: 2 } }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color: kpi.color }, children: kpi.icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: kpi.label })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, sx: { color: kpi.color }, children: kpi.value })
    ] }) }) }, kpi.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      TextField,
      {
        size: "small",
        placeholder: "搜索计划号/供应商/发票号",
        value: search,
        onChange: (e) => setSearch(e.target.value),
        InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(InputAdornment, { position: "start", children: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$3, { fontSize: "small" }) }) },
        sx: { width: 300 }
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "计划号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "供应商" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "关联发票" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "付款方式" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "应付总额" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { sx: { fontWeight: 600 }, children: [
          "币种 / 折合",
          BASE_CURRENCY_CODE
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "已付金额" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "付款进度" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "到期日" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: filtered.map((p) => {
        const sc = STATUS_CONFIG[p.status];
        const paidPct = p.totalAmount > 0 ? Math.round(p.paidAmount / p.totalAmount * 100) : 0;
        const isOverdue = p.status === "overdue";
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, sx: { bgcolor: isOverdue ? "error.50" : "inherit" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: p.planNo }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: p.vendorName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: p.invoiceNo }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: p.paymentMethod || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
            "¥",
            p.totalAmount.toLocaleString()
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: p.currency || BASE_CURRENCY_CODE }),
            p.currency && p.currency.toUpperCase() !== BASE_CURRENCY_CODE && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
              "折合 ¥",
              convertCurrency(p.totalAmount, p.currency, exchangeRates).toLocaleString(void 0, { maximumFractionDigits: 2 })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
            "¥",
            p.paidAmount.toLocaleString()
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { width: 120 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              LinearProgress,
              {
                variant: "determinate",
                value: paidPct,
                sx: { flex: 1, height: 6, borderRadius: 3 },
                color: isOverdue ? "error" : "primary"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", children: [
              paidPct,
              "%"
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: isOverdue ? "已逾期！" : "", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: isOverdue ? "error.main" : "text.primary", fontWeight: isOverdue ? 600 : 400, children: p.dueDate }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: sc.label, color: sc.color, size: "small" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", onClick: () => handleViewDetail(p), children: "详情" }),
            p.status !== "paid" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), color: "primary", children: "付款" })
          ] })
        ] }, p.id);
      }) })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: createOpen, onClose: () => setCreateOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "申请付款" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { dividers: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { pt: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "供应商",
            value: form.vendorName,
            onChange: (e) => setForm({ ...form, vendorName: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "关联采购单",
            value: form.purchaseOrderNo,
            onChange: (e) => setForm({ ...form, purchaseOrderNo: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "关联发票",
            value: form.invoiceNo,
            onChange: (e) => setForm({ ...form, invoiceNo: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "付款金额",
            type: "number",
            value: form.totalAmount,
            onChange: (e) => setForm({ ...form, totalAmount: Number(e.target.value) })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "到期日",
            type: "date",
            InputLabelProps: { shrink: true },
            value: form.dueDate,
            onChange: (e) => setForm({ ...form, dueDate: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "付款方式" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              label: "付款方式",
              value: form.paymentMethod,
              onChange: (e) => setForm({ ...form, paymentMethod: e.target.value }),
              children: ["电汇(T/T)", "银行承兑汇票", "商业承兑汇票", "信用证(L/C)", "支票", "现金"].map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: m, children: m }, m))
            }
          )
        ] }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setCreateOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: () => {
          addPaymentPlan({
            id: `pp-${Date.now()}`,
            planNo: `PP${Date.now()}`,
            vendorName: form.vendorName,
            purchaseOrderNo: form.purchaseOrderNo,
            invoiceNo: form.invoiceNo,
            totalAmount: form.totalAmount,
            paidAmount: 0,
            status: "pending",
            dueDate: form.dueDate,
            paymentMethod: form.paymentMethod,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
          setCreateOpen(false);
        }, children: "创建" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: detailOpen, onClose: () => setDetailOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
        "付款详情 — ",
        selectedPlan == null ? void 0 : selectedPlan.planNo
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { dividers: true, children: selectedPlan && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, children: [
        { label: "供应商", value: selectedPlan.vendorName },
        { label: "关联采购单", value: selectedPlan.purchaseOrderNo },
        { label: "关联发票", value: selectedPlan.invoiceNo },
        { label: "付款方式", value: selectedPlan.paymentMethod || "-" },
        { label: "应付总额", value: `¥${selectedPlan.totalAmount.toLocaleString()}` },
        { label: "已付金额", value: `¥${selectedPlan.paidAmount.toLocaleString()}` },
        { label: "到期日", value: selectedPlan.dueDate },
        { label: "状态", value: STATUS_CONFIG[selectedPlan.status].label }
      ].map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: row.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: row.value })
      ] }, row.label)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        voucherMsg && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "success", sx: { mr: "auto" }, "data-testid": "voucher-msg", children: voucherMsg }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            "data-testid": "gen-voucher",
            disabled: selectedPlan == null ? void 0 : selectedPlan.voucherGenerated,
            onClick: handleGenVoucher,
            children: "生成凭证"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDetailOpen(false), children: "关闭" })
      ] })
    ] })
  ] });
}
export {
  PaymentPlan as default
};
