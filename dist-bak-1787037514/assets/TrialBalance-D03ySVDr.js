import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { m as Box, T as Typography, bm as Button, eF as default_1, bl as Alert, aS as Paper, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aO as Chip } from "./vendor-mui-UhJuRAfR.js";
import { f as useFinanceStore } from "./index-hTLNcGoC.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
const DEBIT_NORMAL = ["asset", "expense"];
function computeTrialBalance(accountEntries, chartOfAccounts) {
  const rows = /* @__PURE__ */ new Map();
  for (const acc of chartOfAccounts) {
    rows.set(acc.code, {
      code: acc.code,
      name: acc.name,
      type: acc.type,
      debit: 0,
      credit: 0,
      balance: 0
    });
  }
  const codeByName = /* @__PURE__ */ new Map();
  for (const acc of chartOfAccounts) codeByName.set(acc.name, acc.code);
  for (const e of accountEntries) {
    if (e.debitAccount) {
      const code = codeByName.get(e.debitAccount);
      const row = code ? rows.get(code) : void 0;
      if (row) row.debit += e.amount;
    }
    if (e.creditAccount) {
      const code = codeByName.get(e.creditAccount);
      const row = code ? rows.get(code) : void 0;
      if (row) row.credit += e.amount;
    }
  }
  let totalDebit = 0;
  let totalCredit = 0;
  const resultRows = [];
  for (const row of rows.values()) {
    row.balance = DEBIT_NORMAL.includes(row.type) ? row.debit - row.credit : row.credit - row.debit;
    totalDebit += row.debit;
    totalCredit += row.credit;
    resultRows.push(row);
  }
  resultRows.sort((a, b) => a.code.localeCompare(b.code));
  return { rows: resultRows, totalDebit, totalCredit };
}
const TYPE_LABEL = {
  asset: { label: "资产", color: "info" },
  liability: { label: "负债", color: "error" },
  equity: { label: "权益", color: "success" },
  revenue: { label: "收入", color: "success" },
  expense: { label: "费用", color: "default" }
};
function TrialBalance() {
  const { accountEntries, chartOfAccounts } = useFinanceStore();
  const [nonce, setNonce] = reactExports.useState(0);
  const result = reactExports.useMemo(
    () => computeTrialBalance(accountEntries, chartOfAccounts),
    [accountEntries, chartOfAccounts, nonce]
  );
  const balanced = Math.abs(result.totalDebit - result.totalCredit) < 5e-3;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "科目余额表" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "outlined",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}),
          size: "small",
          "data-testid": "tb-refresh",
          onClick: () => setNonce((n) => n + 1),
          children: "刷新"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Alert,
      {
        severity: balanced ? "success" : "warning",
        sx: { mb: 2 },
        "data-testid": "tb-balance-alert",
        children: balanced ? `借贷平衡：借方合计 ¥${result.totalDebit.toLocaleString()} = 贷方合计 ¥${result.totalCredit.toLocaleString()}` : `借贷不平衡：借方 ¥${result.totalDebit.toLocaleString()} / 贷方 ¥${result.totalCredit.toLocaleString()}`
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "科目编码" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "科目名称" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "科目类型" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "借方发生额" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "贷方发生额" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "余额" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
        result.rows.map((row) => {
          const tc = TYPE_LABEL[row.type];
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, "data-testid": "tb-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: row.code }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: row.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: tc.label, size: "small", color: tc.color, variant: "outlined" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: row.debit > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 500, children: [
              "¥",
              row.debit.toLocaleString()
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.disabled", children: "—" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: row.credit > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 500, children: [
              "¥",
              row.credit.toLocaleString()
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.disabled", children: "—" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Typography,
              {
                variant: "body2",
                fontWeight: 600,
                color: row.balance < 0 ? "error.main" : "text.primary",
                children: [
                  row.balance > 0 ? "借 " : row.balance < 0 ? "贷 " : "",
                  "¥",
                  Math.abs(row.balance).toLocaleString()
                ]
              }
            ) })
          ] }, row.code);
        }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.100" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 3, sx: { fontWeight: 700 }, children: "合计" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", sx: { fontWeight: 700 }, "data-testid": "tb-total-debit", children: [
            "¥",
            result.totalDebit.toLocaleString()
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", sx: { fontWeight: 700 }, "data-testid": "tb-total-credit", children: [
            "¥",
            result.totalCredit.toLocaleString()
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 700 } })
        ] })
      ] })
    ] }) }) })
  ] });
}
export {
  TrialBalance as default
};
