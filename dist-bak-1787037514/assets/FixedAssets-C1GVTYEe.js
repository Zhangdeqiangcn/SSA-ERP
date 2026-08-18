import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { m as Box, T as Typography, aO as Chip, bm as Button, f6 as default_1, dG as default_1$1, cD as TableContainer, aS as Paper, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bl as Alert, bY as Grid, bv as TextField, bE as DialogActions, cJ as Snackbar } from "./vendor-mui-UhJuRAfR.js";
import { a3 as useFinanceLedgerStore, f as useFinanceStore } from "./index-hTLNcGoC.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
const fmt = (n) => "¥" + Number(n).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const STATUS_LABEL = {
  in_use: { label: "在用", color: "success" },
  idle: { label: "闲置", color: "default" },
  scrapped: { label: "已报废", color: "error" }
};
function FixedAssets() {
  const { fixedAssets, addFixedAsset, scrapFixedAsset, deprecateAll } = useFinanceLedgerStore();
  const [open, setOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({
    assetCode: "",
    assetName: "",
    category: "生产设备",
    originalValue: "",
    residualRate: "0.05",
    usefulLifeMonths: "120",
    startDate: "2026-01-01"
  });
  const [error, setError] = reactExports.useState("");
  const [snack, setSnack] = reactExports.useState("");
  const totalMonthly = fixedAssets.filter((a) => a.status === "in_use").reduce((s, a) => s + a.monthlyDepreciation, 0);
  const handleAdd = () => {
    const originalValue = Number(form.originalValue);
    const residualRate = Number(form.residualRate);
    const usefulLifeMonths = Number(form.usefulLifeMonths);
    if (!form.assetCode || !form.assetName || !originalValue || !usefulLifeMonths) {
      setError("资产编码/名称/原值/使用年限为必填");
      return;
    }
    const monthlyDepreciation = Number((originalValue * (1 - residualRate) / usefulLifeMonths).toFixed(2));
    const asset = {
      id: `fa-${Date.now()}`,
      assetCode: form.assetCode,
      assetName: form.assetName,
      category: form.category,
      originalValue,
      residualRate,
      usefulLifeMonths,
      startDate: form.startDate,
      monthlyDepreciation,
      accumulatedDepreciation: 0,
      netValue: originalValue,
      status: "in_use",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: "当前用户",
      updatedBy: "当前用户"
    };
    addFixedAsset(asset);
    setOpen(false);
    setForm({ assetCode: "", assetName: "", category: "生产设备", originalValue: "", residualRate: "0.05", usefulLifeMonths: "120", startDate: "2026-01-01" });
    setError("");
    setSnack("固定资产已新增");
  };
  const handleDeprecate = () => {
    const total = deprecateAll();
    if (total <= 0) {
      setSnack("当前无在用资产可计提折旧");
      return;
    }
    const stamp = Date.now();
    const voucherNo = `V-DEPR-AUTO-${stamp}`;
    const entries = [
      {
        id: `ae-fa-${stamp}-1`,
        entryNo: `JEF${stamp}1`,
        date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        description: `计提固定资产折旧 ${voucherNo}`,
        debitAccount: "管理费用",
        creditAccount: "",
        amount: total,
        currency: "CNY",
        voucherNo,
        createdBy: "当前用户",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: `ae-fa-${stamp}-2`,
        entryNo: `JEF${stamp}2`,
        date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        description: `累计折旧 ${voucherNo}`,
        debitAccount: "",
        creditAccount: "累计折旧",
        amount: total,
        currency: "CNY",
        voucherNo,
        createdBy: "当前用户",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
    useFinanceStore.getState().addAccountEntry(entries[0]);
    useFinanceStore.getState().addAccountEntry(entries[1]);
    setSnack(`已计提折旧 ${fmt(total)} 并生成凭证 ${voucherNo}`);
  };
  const handleScrap = (id) => {
    scrapFixedAsset(id, (/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
    setSnack("资产已报废");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, "data-testid": "fixed-assets", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "固定资产" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `在用月折旧合计 ${fmt(totalMonthly)}`, color: "info", variant: "outlined" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "contained",
          color: "secondary",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}),
          size: "small",
          "data-testid": "fa-deprecate",
          onClick: handleDeprecate,
          children: "计提折旧"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, {}), size: "small", "data-testid": "fa-add", onClick: () => setOpen(true), children: "新增资产" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "资产编码" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "名称" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "类别" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "原值" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "累计折旧" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "净值" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "月折旧" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: fixedAssets.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, "data-testid": "fa-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: a.assetCode }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: a.assetName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: a.category }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: fmt(a.originalValue) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: fmt(a.accumulatedDepreciation) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { fontWeight: 600, children: fmt(a.netValue) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: fmt(a.monthlyDepreciation) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: STATUS_LABEL[a.status].label, size: "small", color: STATUS_LABEL[a.status].color, variant: "outlined" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
          a.status === "in_use" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", color: "warning", onClick: () => handleScrap(a.id), children: "报废" }),
          a.status !== "in_use" && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.disabled", children: a.scrapDate || "—" })
        ] })
      ] }, a.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增固定资产" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { dividers: true, children: [
        error && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "error", sx: { mb: 2 }, children: error }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { pt: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "资产编码", value: form.assetCode, onChange: (e) => setForm({ ...form, assetCode: e.target.value }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "资产名称", value: form.assetName, onChange: (e) => setForm({ ...form, assetName: e.target.value }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "类别", value: form.category, onChange: (e) => setForm({ ...form, category: e.target.value }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "入账日期", type: "date", InputLabelProps: { shrink: true }, value: form.startDate, onChange: (e) => setForm({ ...form, startDate: e.target.value }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "原值", type: "number", value: form.originalValue, onChange: (e) => setForm({ ...form, originalValue: e.target.value }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "残值率", type: "number", value: form.residualRate, onChange: (e) => setForm({ ...form, residualRate: e.target.value }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "使用年限(月)", type: "number", value: form.usefulLifeMonths, onChange: (e) => setForm({ ...form, usefulLifeMonths: e.target.value }) }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleAdd, children: "保存" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Snackbar, { open: !!snack, autoHideDuration: 3e3, onClose: () => setSnack(""), message: snack })
  ] });
}
export {
  FixedAssets as default
};
