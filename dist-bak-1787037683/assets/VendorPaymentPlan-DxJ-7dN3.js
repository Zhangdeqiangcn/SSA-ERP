import { aG as useNavigate, r as reactExports, j as jsxRuntimeExports, bX as Grid, bO as Payment, a4 as Schedule, Y as AttachMoney, dd as AccessAlarm, aP as Paper, B as Box, h as Typography, bj as Alert, bK as Stack, de as FilterList, bk as Button, d3 as Clear, aL as Chip, E as ExpandLess, s as ExpandMore, bt as TextField, bP as InputAdornment, aQ as Search, aO as MenuItem, d6 as CalendarToday, t as Collapse, ac as ReceiptIcon, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, cl as LinearProgress, k as Tooltip } from "./vendor-46QZWBd3.js";
import { f as useFinanceStore } from "./index-CcOZBoQL.js";
import { f as formatCurrency } from "./format-Rp8---CI.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
const STATUS_CONFIG = {
  pending: { label: "待支付", color: "warning" },
  partial: { label: "部分付款", color: "info" },
  paid: { label: "已付清", color: "success" },
  overdue: { label: "已逾期", color: "error" }
};
const VendorPaymentPlan = () => {
  const navigate = useNavigate();
  const paymentPlans = useFinanceStore((s) => s.paymentPlans);
  const [search, setSearch] = reactExports.useState("");
  const [statusFilter, setStatusFilter] = reactExports.useState("");
  const [showAdvanced, setShowAdvanced] = reactExports.useState(false);
  const [dateFrom, setDateFrom] = reactExports.useState("");
  const [dateTo, setDateTo] = reactExports.useState("");
  const [vendorCode, setVendorCode] = reactExports.useState("V001");
  reactExports.useEffect(() => {
    const stored = sessionStorage.getItem("vendorPortalUser");
    if (!stored) {
      navigate("/vendor-portal/login");
      return;
    }
    const user = JSON.parse(stored);
    setVendorCode(user.code || "V001");
  }, [navigate]);
  const vendorFiltered = reactExports.useMemo(() => {
    return paymentPlans.filter((p) => p.vendorName.includes(vendorCode) || // 模拟：按供应商代码关联（实际应根据vendorCode字段过滤）
    ["上海宝钢钢铁贸易有限公司"].some((name) => p.vendorName.includes("宝钢") || p.vendorName.includes("钢铁")));
  }, [vendorCode]);
  const filtered = reactExports.useMemo(() => {
    let data = [...vendorFiltered];
    if (search) {
      const kw = search.toLowerCase();
      data = data.filter(
        (p) => p.planNo.toLowerCase().includes(kw) || p.invoiceNo.toLowerCase().includes(kw) || p.vendorName.toLowerCase().includes(kw)
      );
    }
    if (statusFilter) {
      data = data.filter((p) => p.status === statusFilter);
    }
    if (dateFrom) {
      data = data.filter((p) => p.dueDate >= dateFrom);
    }
    if (dateTo) {
      data = data.filter((p) => p.dueDate <= dateTo);
    }
    return data;
  }, [vendorFiltered, search, statusFilter, dateFrom, dateTo]);
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setShowAdvanced(false);
  };
  const hasActiveFilter = search || statusFilter || dateFrom || dateTo;
  const stats = reactExports.useMemo(() => {
    const total = vendorFiltered.length;
    const overdue = vendorFiltered.filter((p) => p.status === "overdue").length;
    const pending = vendorFiltered.filter((p) => p.status === "pending").length;
    const totalAmount = vendorFiltered.reduce((s, p) => s + p.totalAmount, 0);
    const unpaidAmount = vendorFiltered.filter((p) => p.status !== "paid").reduce((s, p) => s + (p.totalAmount - p.paidAmount), 0);
    return { total, overdue, pending, totalAmount, unpaidAmount };
  }, [vendorFiltered]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "付款计划查询", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 2.5 }, children: [
      { label: "计划总数", value: `${stats.total} 笔`, color: "#3B82F6", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Payment, {}) },
      { label: "未付金额", value: formatCurrency(stats.unpaidAmount), color: "#F59E0B", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Schedule, {}) },
      { label: "应付总额", value: formatCurrency(stats.totalAmount), color: "#6366F1", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AttachMoney, {}) },
      { label: "待支付", value: `${stats.pending} 笔`, color: "#EF4444", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AccessAlarm, {}) }
    ].map(({ label, value, color, icon }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2, borderRadius: 2, textAlign: "center", borderColor: `${color}30` }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color, display: "flex", justifyContent: "center", mb: 0.5 }, children: icon }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, sx: { color }, children: value }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: label })
    ] }) }, label)) }),
    stats.overdue > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "error", sx: { mb: 2, fontSize: "0.8125rem" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("b", { children: [
        stats.overdue,
        " 笔"
      ] }),
      "付款计划已逾期，未付金额合计",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: formatCurrency(vendorFiltered.filter((p) => p.status === "overdue").reduce((s, p) => s + (p.totalAmount - p.paidAmount), 0)) }),
      "， 请关注并提供支持"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2, borderRadius: 2, border: "1px solid #E2E8F0" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", sx: { mb: 1.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, sx: { display: "flex", alignItems: "center", gap: 0.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FilterList, { fontSize: "small" }),
          " 查询条件"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
          hasActiveFilter && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Clear, {}), onClick: clearFilters, sx: { fontSize: "0.75rem" }, children: "清除条件" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              icon: showAdvanced ? /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandLess, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandMore, {}),
              label: showAdvanced ? "收起" : "更多筛选",
              size: "small",
              variant: "outlined",
              onClick: () => setShowAdvanced(!showAdvanced),
              sx: { cursor: "pointer" }
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 1.5, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 5, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            placeholder: "搜索计划号/发票号",
            value: search,
            onChange: (e) => setSearch(e.target.value),
            InputProps: {
              startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(InputAdornment, { position: "start", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { fontSize: "small", sx: { color: "#94A3B8" } }) })
            }
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "状态",
            select: true,
            value: statusFilter,
            onChange: (e) => setStatusFilter(e.target.value),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "全部" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "pending", children: "待支付" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "partial", children: "部分付款" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "paid", children: "已付清" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "overdue", children: "已逾期" })
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { display: "flex", alignItems: "center", gap: 0.5, height: "100%" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarToday, { sx: { fontSize: 14 } }),
          "当前显示 ",
          vendorCode,
          " 的付款计划（共 ",
          vendorFiltered.length,
          " 笔）"
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Collapse, { in: showAdvanced, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 1.5, sx: { mt: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "到期日从",
            type: "date",
            value: dateFrom,
            onChange: (e) => setDateFrom(e.target.value),
            InputLabelProps: { shrink: true }
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "至",
            type: "date",
            value: dateTo,
            onChange: (e) => setDateTo(e.target.value),
            InputLabelProps: { shrink: true }
          }
        ) })
      ] }) }),
      hasActiveFilter && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mt: 1, py: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", children: [
        "找到 ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: filtered.length }),
        " 条匹配记录"
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3, overflow: "hidden" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { px: 2.5, py: 2, borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptIcon, { sx: { color: "#3B82F6" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 700, children: "付款计划列表" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `${filtered.length} / ${vendorFiltered.length} 条`, size: "small", color: "primary", variant: "outlined" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "计划号" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "关联发票" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "付款方式" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "应付金额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "已付金额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "未付金额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "付款进度" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "到期日" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "状态" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: filtered.map((p) => {
          const sc = STATUS_CONFIG[p.status];
          const paidPct = p.totalAmount > 0 ? Math.round(p.paidAmount / p.totalAmount * 100) : 0;
          const unpaid = p.totalAmount - p.paidAmount;
          const isOverdue = p.status === "overdue";
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, sx: isOverdue ? { bgcolor: "#FFF5F5" } : {}, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", sx: { color: "#3B82F6", fontWeight: 500 }, children: p.planNo }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", sx: { fontSize: "0.8rem", color: "#64748B" }, children: p.invoiceNo }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: p.paymentMethod || "-",
                size: "small",
                variant: "outlined",
                sx: { fontSize: "0.7rem" }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: formatCurrency(p.totalAmount) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "success.main", children: formatCurrency(p.paidAmount) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, color: unpaid > 0 ? "error.main" : "text.primary", children: formatCurrency(unpaid) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { width: 130 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                LinearProgress,
                {
                  variant: "determinate",
                  value: paidPct,
                  sx: { flex: 1, height: 6, borderRadius: 3 },
                  color: isOverdue ? "error" : paidPct >= 100 ? "success" : "primary"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", fontWeight: 600, children: [
                paidPct,
                "%"
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: isOverdue ? "已逾期！" : "", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Typography,
              {
                variant: "body2",
                color: isOverdue ? "error.main" : "text.primary",
                fontWeight: isOverdue ? 600 : 400,
                sx: { display: "flex", alignItems: "center", gap: 0.3 },
                children: [
                  isOverdue && /* @__PURE__ */ jsxRuntimeExports.jsx(AccessAlarm, { sx: { fontSize: 14 } }),
                  p.dueDate
                ]
              }
            ) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: sc.label,
                color: sc.color,
                size: "small",
                variant: p.status === "paid" ? "outlined" : "filled",
                sx: { fontWeight: 500 }
              }
            ) })
          ] }, p.id);
        }) })
      ] }) }),
      filtered.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { py: 6, textAlign: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Schedule, { sx: { color: "#CBD5E1", fontSize: 48, mb: 1 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { color: "text.secondary", children: "暂无匹配的付款计划" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mt: 2, fontSize: "0.8125rem" }, children: [
      "以上付款计划信息由采购方系统自动同步。如有疑问请联系采购方财务部门。",
      stats.overdue > 0 && " 逾期款项请及时与采购方沟通处理。"
    ] })
  ] });
};
export {
  VendorPaymentPlan as default
};
