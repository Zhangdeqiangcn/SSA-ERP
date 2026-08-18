import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { m as Box, T as Typography, bY as Grid, bv as TextField, aR as MenuItem, bL as Stack, aO as Chip, bm as Button, f7 as default_1, f8 as default_1$1, eU as default_1$2, p as Tooltip, eV as default_1$3, aS as Paper, n as Divider, bl as Alert, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, cJ as Snackbar } from "./vendor-mui-DsZGB15g.js";
import { f as useFinanceStore, a3 as useFinanceLedgerStore, a4 as FISCAL_YEAR } from "./index-CU2cqxc8.js";
import { u as useFinanceExtensionStore, g as getExchangeRate } from "./financeExtensionStore-DxSjHPMg.js";
import { a as buildIncomeStatement } from "./financialStatements-BEqRnI6u.js";
import "./vendor-t9csHBDX.js";
import "./vendor-date-DI3D_gXa.js";
const STATUS_LABEL = {
  open: { label: "未结账", color: "default" },
  profit_closed: { label: "已损益结转", color: "warning" },
  closed: { label: "已结账", color: "success" }
};
function PeriodClosing() {
  const { accountEntries, chartOfAccounts } = useFinanceStore();
  const { closingPeriods, upsertClosing, getClosing, openPeriod, ensureYearPeriods } = useFinanceLedgerStore();
  const [period, setPeriod] = reactExports.useState(`${FISCAL_YEAR}-01`);
  const [snack, setSnack] = reactExports.useState("");
  reactExports.useEffect(() => {
    ensureYearPeriods(FISCAL_YEAR);
  }, []);
  const periods = reactExports.useMemo(
    () => [...closingPeriods].sort((a, b) => a.period.localeCompare(b.period)),
    [closingPeriods]
  );
  const closing = getClosing(period);
  const status = (closing == null ? void 0 : closing.status) ?? "open";
  const isClosed = status === "closed";
  const closedCount = periods.filter((p) => p.status === "closed").length;
  const is = reactExports.useMemo(() => buildIncomeStatement(accountEntries, chartOfAccounts, period), [accountEntries, chartOfAccounts, period]);
  const postEntry = (partial, stamp, idx, voucherNo) => {
    useFinanceStore.getState().addAccountEntry({
      id: `ae-pc-${stamp}-${idx}`,
      entryNo: `JEP${stamp}${idx}`,
      date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      description: `期末结转 ${voucherNo}`,
      debitAccount: "",
      creditAccount: "",
      amount: 0,
      currency: "CNY",
      voucherNo,
      createdBy: "当前用户",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...partial
    });
  };
  const handleProfitClose = () => {
    if (status !== "open") {
      setSnack(isClosed ? `期间 ${period} 已结账，请先反结账` : "该期间已完成损益结转");
      return;
    }
    const stamp = Date.now();
    const voucherNo = `V-PL-${period}-${stamp}`;
    let idx = 1;
    for (const r of is.revenue) {
      if (r.amount <= 0) continue;
      postEntry({ debitAccount: r.name, creditAccount: "本年利润", amount: r.amount }, stamp, idx++, voucherNo);
    }
    for (const e of is.expense) {
      if (e.amount <= 0) continue;
      postEntry({ debitAccount: "本年利润", creditAccount: e.name, amount: e.amount }, stamp, idx++, voucherNo);
    }
    upsertClosing(period, { status: "profit_closed", profitVoucherNo: voucherNo, closedBy: "当前用户", closedAt: (/* @__PURE__ */ new Date()).toISOString() });
    setSnack(`损益已结转，凭证 ${voucherNo}（净利润 ${is.netProfit.toFixed(2)}）`);
  };
  const handleFxClose = () => {
    if (isClosed) {
      setSnack(`期间 ${period} 已结账，请先反结账`);
      return;
    }
    const { invoices } = useFinanceStore.getState();
    const { exchangeRates } = useFinanceExtensionStore.getState();
    let total = 0;
    const lines = [];
    for (const inv of invoices) {
      if (!inv.currency || inv.currency === "CNY") continue;
      if (inv.status === "paid" || inv.status === "cancelled") continue;
      const current = getExchangeRate(inv.currency, "CNY");
      const entryRate = inv.exchangeRate || 1;
      const diff = (current - entryRate) * inv.amount;
      if (Math.abs(diff) > 1e-3) {
        total += diff;
        lines.push({ name: inv.vendorName, amount: diff });
      }
    }
    if (Math.abs(total) < 1e-3) {
      setSnack("当前无外币未结清项目，无需结转汇兑损益");
      return;
    }
    const stamp = Date.now();
    const voucherNo = `V-FX-${period}-${stamp}`;
    postEntry(
      { debitAccount: total >= 0 ? "财务费用" : "", creditAccount: total >= 0 ? "" : "财务费用", amount: Math.abs(total) },
      stamp,
      1,
      voucherNo
    );
    postEntry(
      { debitAccount: total >= 0 ? "" : "应付账款", creditAccount: total >= 0 ? "应付账款" : "", amount: Math.abs(total) },
      stamp,
      2,
      voucherNo
    );
    upsertClosing(period, { fxVoucherNo: voucherNo, closedBy: "当前用户", closedAt: (/* @__PURE__ */ new Date()).toISOString() });
    setSnack(`汇兑损益已结转 ${total.toFixed(2)}，凭证 ${voucherNo}`);
  };
  const handleClose = () => {
    if (isClosed) {
      setSnack(`期间 ${period} 已结账，无需重复操作`);
      return;
    }
    if (status === "open") {
      setSnack("请先完成损益结转");
      return;
    }
    upsertClosing(period, { status: "closed", closedBy: "当前用户", closedAt: (/* @__PURE__ */ new Date()).toISOString() });
    setSnack(`期间 ${period} 已结账，该期间凭证已锁定（禁止新增/修改/删除/过账/冲销）`);
  };
  const handleReopen = () => {
    const res = openPeriod(period, "当前用户");
    setSnack(res.message);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, "data-testid": "period-closing", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, mb: 2, children: "期末结账" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, alignItems: "center", mb: 2, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { select: true, fullWidth: true, size: "small", label: "会计期间", value: period, onChange: (e) => setPeriod(e.target.value), "data-testid": "pc-period", children: periods.map((p) => {
        var _a;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: p.period, children: [
          p.period,
          "（",
          ((_a = STATUS_LABEL[p.status]) == null ? void 0 : _a.label) ?? p.status,
          "）"
        ] }, p.period);
      }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `状态：${STATUS_LABEL[status].label}`, color: STATUS_LABEL[status].color, "data-testid": "pc-status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", variant: "outlined", label: `会计日历 ${periods.length} 期 / 已结 ${closedCount}`, "data-testid": "pc-period-count" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, justifyContent: "flex-end", flexWrap: "wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", color: "warning", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), size: "small", disabled: isClosed, "data-testid": "pc-profit-close", onClick: handleProfitClose, children: "损益结转" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", color: "info", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, {}), size: "small", disabled: isClosed, "data-testid": "pc-fx-close", onClick: handleFxClose, children: "汇兑损益结转" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", color: "success", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$2, {}), size: "small", disabled: isClosed, "data-testid": "pc-close", onClick: handleClose, children: "结账" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "把该期间打回「未结账」，解除凭证锁定", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", color: "error", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$3, {}), size: "small", disabled: status === "open", "data-testid": "pc-reopen", onClick: handleReopen, children: "反结账" }) }) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 700, gutterBottom: true, children: "本期经营成果" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 4, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { color: "text.secondary", children: "营业收入合计" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { fontWeight: 600, children: [
            "¥",
            is.totalRevenue.toFixed(2)
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 4, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { color: "text.secondary", children: "成本费用合计" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { fontWeight: 600, children: [
            "¥",
            is.totalExpense.toFixed(2)
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 4, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { color: "text.secondary", children: "净利润" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { fontWeight: 700, color: is.netProfit >= 0 ? "success.main" : "error.main", "data-testid": "pc-net-profit", children: [
            "¥",
            is.netProfit.toFixed(2)
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 2 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: isClosed ? "warning" : "info", "data-testid": "pc-lock-alert", children: isClosed ? `期间 ${period} 已结账，凭证已锁定：该期间禁止新增 / 修改 / 删除 / 过账 / 冲销凭证。如需调整请点击「反结账」。` : status === "profit_closed" ? `损益已结转至「本年利润」，可继续汇兑损益结转并结账。结账后该期间凭证将被锁定。` : `尚未结转损益。点击「损益结转」将收入/费用结转到「本年利润」并生成凭证。` })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2 }, "data-testid": "pc-calendar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 700, gutterBottom: true, children: [
        "会计日历 ",
        FISCAL_YEAR,
        "（期间主数据）"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "会计期间" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "凭证记账" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "损益结转凭证" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "汇兑结转凭证" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "结账人" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "结账时间" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: periods.map((p) => {
          var _a, _b;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, selected: p.period === period, "data-testid": `pc-cal-row-${p.period}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: p.period }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: ((_a = STATUS_LABEL[p.status]) == null ? void 0 : _a.label) ?? p.status, color: ((_b = STATUS_LABEL[p.status]) == null ? void 0 : _b.color) ?? "default" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: p.status === "closed" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "error", variant: "outlined", label: "已锁定" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "primary", variant: "outlined", label: "可记账" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: p.profitVoucherNo || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: p.fxVoucherNo || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: p.status === "open" ? "-" : p.closedBy || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: p.status === "open" ? "-" : p.closedAt ? p.closedAt.slice(0, 19).replace("T", " ") : "-" })
          ] }, p.period);
        }) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Snackbar, { open: !!snack, autoHideDuration: 3500, onClose: () => setSnack(""), message: snack })
  ] });
}
export {
  PeriodClosing as default
};
