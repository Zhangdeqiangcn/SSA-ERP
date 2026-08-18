import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { m as Box, T as Typography, bm as Button, dG as default_1, bY as Grid, bs as Card, bt as CardContent, bv as TextField, bQ as InputAdornment, cq as default_1$1, aS as Paper, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, b9 as Dialog, ba as DialogTitle, bc as DialogContent, aR as MenuItem, bE as DialogActions, bl as Alert } from "./vendor-mui-DsZGB15g.js";
import "./index-CU2cqxc8.js";
import { F as FlowTracker } from "./FlowTracker-B5McqHb_.js";
import "./vendor-date-DI3D_gXa.js";
import { u as useFinanceExtensionStore, B as BASE_CURRENCY_CODE } from "./financeExtensionStore-DxSjHPMg.js";
import { u as useDataDictStore } from "./dataDictStore-66NejlLO.js";
import "./vendor-t9csHBDX.js";
import "./options-BINuI5Gr.js";
function parseCurrencyOptions(raw) {
  return raw.map((s) => {
    const m = s.match(/^(.*?)\s*\(([^)]+)\)$/);
    if (m) return { code: m[2].trim(), label: s };
    return { code: s.trim(), label: s.trim() };
  }).filter((o) => o.code && o.code.toUpperCase() !== BASE_CURRENCY_CODE);
}
function ExchangeRate() {
  const { exchangeRates, addExchangeRate, updateExchangeRate, removeExchangeRate } = useFinanceExtensionStore();
  const { currencies } = useDataDictStore();
  const currencyOptions = parseCurrencyOptions(currencies);
  const [search, setSearch] = reactExports.useState("");
  const [editOpen, setEditOpen] = reactExports.useState(false);
  const [editId, setEditId] = reactExports.useState(null);
  const [form, setForm] = reactExports.useState({
    currency: "USD",
    currencyName: "美元",
    rate: 7.18,
    effectiveDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    note: ""
  });
  const [msg, setMsg] = reactExports.useState(null);
  const filtered = exchangeRates.filter(
    (r) => !search || r.currency.includes(search.toUpperCase()) || r.currencyName.includes(search)
  );
  const openCreate = () => {
    setEditId(null);
    setForm({ currency: "USD", currencyName: "美元", rate: 7.18, effectiveDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0], note: "" });
    setMsg(null);
    setEditOpen(true);
  };
  const openEdit = (id) => {
    const r = exchangeRates.find((x) => x.id === id);
    if (!r) return;
    setEditId(id);
    setForm({ currency: r.currency, currencyName: r.currencyName, rate: r.rate, effectiveDate: r.effectiveDate, note: r.note || "" });
    setMsg(null);
    setEditOpen(true);
  };
  const handleSave = () => {
    if (editId) {
      updateExchangeRate(editId, { ...form });
      setMsg("汇率已更新");
    } else {
      addExchangeRate({ ...form });
      setMsg("汇率已新增");
    }
    setEditOpen(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "汇率管理" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "finance", currentStatus: "fin_base" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), size: "small", onClick: openCreate, children: "新增汇率" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [
      { label: "本位币", value: BASE_CURRENCY_CODE, color: "#1976d2" },
      { label: "维护币种数", value: `${exchangeRates.length} 种`, color: "#388e3c" },
      { label: "1 USD =", value: `¥${getRate("USD").toFixed(4)}`, color: "#f57c00" },
      { label: "1 EUR =", value: `¥${getRate("EUR").toFixed(4)}`, color: "#d32f2f" }
    ].map((kpi) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 2, "&:last-child": { pb: 2 } }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: kpi.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, sx: { color: kpi.color }, children: kpi.value })
    ] }) }) }, kpi.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 2, mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      TextField,
      {
        size: "small",
        placeholder: "搜索币种代码/名称",
        value: search,
        onChange: (e) => setSearch(e.target.value),
        InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(InputAdornment, { position: "start", children: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, { fontSize: "small" }) }) },
        sx: { width: 280 }
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "币种代码" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "币种名称" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", sx: { fontWeight: 600 }, children: [
          "汇率（1 外币 = ? ",
          BASE_CURRENCY_CODE,
          "）"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "生效日期" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "备注" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: filtered.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: r.currency }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.currencyName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { fontWeight: 600, children: [
          "¥",
          r.rate.toLocaleString()
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.effectiveDate }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.note || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", onClick: () => openEdit(r.id), children: "编辑" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", color: "error", onClick: () => removeExchangeRate(r.id), children: "删除" })
        ] })
      ] }, r.id)) })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: editOpen, onClose: () => setEditOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: editId ? "编辑汇率" : "新增汇率" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { dividers: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { pt: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            select: true,
            fullWidth: true,
            size: "small",
            label: "币种",
            value: form.currency,
            onChange: (e) => {
              const opt = currencyOptions.find((o) => o.code === e.target.value);
              setForm({ ...form, currency: e.target.value, currencyName: (opt == null ? void 0 : opt.label) || e.target.value });
            },
            children: currencyOptions.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o.code, children: o.label }, o.code))
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "币种名称",
            value: form.currencyName,
            onChange: (e) => setForm({ ...form, currencyName: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: `汇率（1 ${form.currency} = ? ${BASE_CURRENCY_CODE}）`,
            type: "number",
            value: form.rate,
            onChange: (e) => setForm({ ...form, rate: Number(e.target.value) })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "生效日期",
            type: "date",
            InputLabelProps: { shrink: true },
            value: form.effectiveDate,
            onChange: (e) => setForm({ ...form, effectiveDate: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "备注",
            value: form.note,
            onChange: (e) => setForm({ ...form, note: e.target.value })
          }
        ) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        msg && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "success", sx: { mr: "auto" }, "data-testid": "fx-msg", children: msg }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setEditOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "fx-save", onClick: handleSave, children: "保存" })
      ] })
    ] })
  ] });
  function getRate(code) {
    const r = exchangeRates.find((x) => x.currency === code);
    return r ? r.rate : 1;
  }
}
export {
  ExchangeRate as default
};
