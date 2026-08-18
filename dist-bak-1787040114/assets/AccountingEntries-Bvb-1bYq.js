import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bk as Button, e1 as default_1, aP as Paper, i as Divider, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bX as Grid, bt as TextField, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, bC as DialogActions } from "./vendor-DGU5TO-x.js";
import { f as useFinanceStore } from "./index-DeeqqmHA.js";
function AccountingEntries() {
  const { accountEntries, addAccountEntry } = useFinanceStore();
  const [createOpen, setCreateOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({
    entryNo: "",
    date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    description: "",
    debitAccount: "",
    creditAccount: "",
    amount: 0,
    currency: "CNY",
    voucherNo: "",
    createdBy: "当前用户"
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "会计分录" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), size: "small", onClick: () => setCreateOpen(true), children: "新建分录" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { p: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", color: "text.secondary", children: [
        "共 ",
        accountEntries.length,
        " 条分录"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "分录号" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "日期" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "摘要" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "借方科目" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "贷方科目" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "金额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "凭证号" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "录入人" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: accountEntries.map((entry) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: entry.entryNo }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: entry.date }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: entry.description }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: entry.debitAccount, size: "small", color: "error", variant: "outlined" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: entry.creditAccount, size: "small", color: "success", variant: "outlined" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { fontWeight: 600, children: [
            "¥",
            entry.amount.toLocaleString()
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", fontFamily: "monospace", children: entry.voucherNo }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: entry.createdBy })
        ] }, entry.id)) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: createOpen, onClose: () => setCreateOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新建会计分录" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { dividers: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { pt: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "分录号",
            value: form.entryNo,
            onChange: (e) => setForm({ ...form, entryNo: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "日期",
            type: "date",
            InputLabelProps: { shrink: true },
            value: form.date,
            onChange: (e) => setForm({ ...form, date: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "摘要",
            value: form.description,
            onChange: (e) => setForm({ ...form, description: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "借方科目",
            value: form.debitAccount,
            onChange: (e) => setForm({ ...form, debitAccount: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "贷方科目",
            value: form.creditAccount,
            onChange: (e) => setForm({ ...form, creditAccount: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "金额",
            type: "number",
            value: form.amount,
            onChange: (e) => setForm({ ...form, amount: Number(e.target.value) })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "币种" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              label: "币种",
              value: form.currency,
              onChange: (e) => setForm({ ...form, currency: e.target.value }),
              children: ["CNY", "USD", "EUR", "JPY", "HKD"].map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: c, children: c }, c))
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "凭证号",
            value: form.voucherNo,
            onChange: (e) => setForm({ ...form, voucherNo: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "录入人",
            value: form.createdBy,
            onChange: (e) => setForm({ ...form, createdBy: e.target.value })
          }
        ) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setCreateOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: () => {
          addAccountEntry({
            id: `ae-${Date.now()}`,
            entryNo: form.entryNo || `JE${Date.now()}`,
            date: form.date,
            description: form.description,
            debitAccount: form.debitAccount,
            creditAccount: form.creditAccount,
            amount: form.amount,
            currency: form.currency,
            voucherNo: form.voucherNo || `V${Date.now()}`,
            createdBy: form.createdBy,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
          setCreateOpen(false);
        }, children: "创建" })
      ] })
    ] })
  ] });
}
export {
  AccountingEntries as default
};
