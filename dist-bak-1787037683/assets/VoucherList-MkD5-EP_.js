import { r as reactExports, j as jsxRuntimeExports, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bX as Grid, bt as TextField, aO as MenuItem, cO as TableContainer, aP as Paper, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, cN as Autocomplete, aJ as IconButton, ff as default_1, B as Box, bk as Button, e1 as default_1$1, k as Tooltip, fu as default_1$2, h as Typography, bj as Alert, bC as DialogActions, cU as Snackbar, bq as Card, br as CardContent, dG as DialogContentText, aL as Chip } from "./vendor-46QZWBd3.js";
import { D as DataTable } from "./DataTable-vc5G5ARo.js";
import { f as useFinanceStore, X as emptyVoucherItem, Y as calcVoucherTotals, Z as validateVoucher, $ as round2, a0 as nextVoucherNo, a1 as VOUCHER_STATUS_COLOR, a2 as VOUCHER_STATUS_LABEL } from "./index-CcOZBoQL.js";
import "./StatusBadge-Db1uY4YU.js";
const VOUCHER_TYPES = ["记", "收", "付", "转"];
function VoucherForm({ open, onClose, voucher, onSaved }) {
  const { chartOfAccounts, createVoucher, updateVoucher, vouchers } = useFinanceStore();
  const [date, setDate] = reactExports.useState((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
  const [voucherType, setVoucherType] = reactExports.useState("记");
  const [attachmentCount, setAttachmentCount] = reactExports.useState(0);
  const [remark, setRemark] = reactExports.useState("");
  const [items, setItems] = reactExports.useState([]);
  const [submitted, setSubmitted] = reactExports.useState(false);
  const [snackbar, setSnackbar] = reactExports.useState({ open: false, message: "" });
  reactExports.useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    if (voucher) {
      setDate(voucher.date);
      setVoucherType(voucher.voucherType || "记");
      setAttachmentCount(voucher.attachmentCount || 0);
      setRemark(voucher.remark || "");
      setItems(voucher.items.map((it) => ({ ...it })));
    } else {
      setDate((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
      setVoucherType("记");
      setAttachmentCount(0);
      setRemark("");
      setItems([emptyVoucherItem(1), emptyVoucherItem(2)]);
    }
  }, [open, voucher]);
  const totals = reactExports.useMemo(() => calcVoucherTotals(items), [items]);
  const validation = reactExports.useMemo(() => validateVoucher({ date, items }), [date, items]);
  const balanced = Math.abs(totals.difference) < 5e-3 && totals.totalDebit > 0;
  const patchItem = (idx, patch) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };
  const addLine = () => setItems((prev) => [...prev, emptyVoucherItem(prev.length + 1)]);
  const removeLine = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, lineNo: i + 1 })));
  const autoBalance = () => {
    const diff = round2(totals.difference);
    if (Math.abs(diff) < 5e-3) return;
    setItems((prev) => {
      if (prev.length === 0) return prev;
      const last = prev.length - 1;
      const target = prev[last];
      const hasAmount = (Number(target.debit) || 0) > 0 || (Number(target.credit) || 0) > 0;
      if (hasAmount) {
        const extra = emptyVoucherItem(prev.length + 1);
        return [
          ...prev,
          diff > 0 ? { ...extra, summary: "自动补平", credit: Math.abs(diff) } : { ...extra, summary: "自动补平", debit: Math.abs(diff) }
        ];
      }
      const patched = diff > 0 ? { ...target, credit: Math.abs(diff), debit: 0 } : { ...target, debit: Math.abs(diff), credit: 0 };
      return prev.map((it, i) => i === last ? patched : it);
    });
  };
  const handleSave = () => {
    setSubmitted(true);
    if (!validation.valid) {
      onSaved == null ? void 0 : onSaved(validation.errors[0], false);
      return;
    }
    if (!voucher) {
      const predictedNo = nextVoucherNo(vouchers, date, voucherType);
      const duplicate = vouchers.some((v) => v.voucherNo === predictedNo);
      if (duplicate) {
        setSnackbar({ open: true, message: `凭证号 ${predictedNo} 已存在，请修改` });
        return;
      }
    }
    const res = voucher ? updateVoucher(voucher.id, { date, voucherType, attachmentCount, remark, items }) : createVoucher({ date, voucherType, attachmentCount, remark, items, createdBy: "当前用户" });
    onSaved == null ? void 0 : onSaved(res.message, res.ok);
    if (res.ok) onClose();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose, maxWidth: "lg", fullWidth: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: voucher ? `编辑凭证 ${voucher.voucherNo}` : "新增记账凭证" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { dividers: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mb: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            select: true,
            fullWidth: true,
            size: "small",
            label: "凭证字",
            value: voucherType,
            "data-testid": "voucher-form-type",
            onChange: (e) => setVoucherType(e.target.value),
            children: VOUCHER_TYPES.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: t, children: t }, t))
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "记账日期",
            type: "date",
            InputLabelProps: { shrink: true },
            "data-testid": "voucher-form-date",
            value: date,
            onChange: (e) => setDate(e.target.value)
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "附单据数",
            type: "number",
            "data-testid": "voucher-form-attach",
            value: attachmentCount,
            onChange: (e) => setAttachmentCount(Number(e.target.value) || 0)
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 5, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "凭证备注",
            value: remark,
            "data-testid": "voucher-form-remark",
            onChange: (e) => setRemark(e.target.value)
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { "& th": { fontWeight: 600, whiteSpace: "nowrap" } }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { width: 48, children: "行号" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { width: 220, children: "摘要" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { width: 260, children: "会计科目" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { width: 140, align: "right", children: "借方金额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { width: 140, align: "right", children: "贷方金额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { width: 160, children: "成本中心/项目" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { width: 48 })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
          items.map((it, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "voucher-item-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: idx + 1 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                variant: "standard",
                placeholder: "摘要",
                "data-testid": `vi-summary-${idx}`,
                value: it.summary,
                onChange: (e) => patchItem(idx, { summary: e.target.value })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Autocomplete,
              {
                size: "small",
                options: chartOfAccounts,
                getOptionLabel: (o) => `${o.code} ${o.name}`,
                value: chartOfAccounts.find((c) => c.name === it.accountName) || null,
                onChange: (_, v) => patchItem(idx, { accountCode: (v == null ? void 0 : v.code) || "", accountName: (v == null ? void 0 : v.name) || "" }),
                renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TextField,
                  {
                    ...params,
                    variant: "standard",
                    placeholder: "选择科目",
                    "data-testid": `vi-account-${idx}`,
                    error: submitted && !it.accountName
                  }
                )
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                variant: "standard",
                type: "number",
                "data-testid": `vi-debit-${idx}`,
                inputProps: { style: { textAlign: "right" } },
                value: it.debit || "",
                onChange: (e) => {
                  const v = Number(e.target.value) || 0;
                  patchItem(idx, { debit: v, credit: v > 0 ? 0 : it.credit });
                }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                variant: "standard",
                type: "number",
                "data-testid": `vi-credit-${idx}`,
                inputProps: { style: { textAlign: "right" } },
                value: it.credit || "",
                onChange: (e) => {
                  const v = Number(e.target.value) || 0;
                  patchItem(idx, { credit: v, debit: v > 0 ? 0 : it.debit });
                }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                variant: "standard",
                placeholder: "辅助核算",
                "data-testid": `vi-aux-${idx}`,
                value: it.costCenterName || "",
                onChange: (e) => patchItem(idx, { costCenterName: e.target.value })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => removeLine(idx), disabled: items.length <= 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, { fontSize: "small" }) }) })
          ] }, it.id)),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "action.hover" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 3, sx: { fontWeight: 700 }, children: "合计" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", sx: { fontWeight: 700 }, "data-testid": "voucher-total-debit", children: [
              "¥",
              totals.totalDebit.toLocaleString("zh-CN", { minimumFractionDigits: 2 })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", sx: { fontWeight: 700 }, "data-testid": "voucher-total-credit", children: [
              "¥",
              totals.totalCredit.toLocaleString("zh-CN", { minimumFractionDigits: 2 })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 2 })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mt: 1.5, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, {}), onClick: addLine, "data-testid": "voucher-add-line", children: "添加分录行" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "把借贷差额自动补到最后一行", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "small",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$2, {}),
            onClick: autoBalance,
            disabled: balanced,
            "data-testid": "voucher-autofill",
            children: "一键补平"
          }
        ) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Typography,
          {
            variant: "body2",
            "data-testid": "voucher-diff",
            color: balanced ? "success.main" : "error.main",
            fontWeight: 700,
            children: balanced ? "借贷平衡 ✓" : `差额 ¥${totals.difference.toFixed(2)}`
          }
        )
      ] }),
      !balanced && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "warning", sx: { mt: 1.5 }, "data-testid": "voucher-balance-tip", children: [
        "借贷不平衡，无法保存：借方合计 ¥",
        totals.totalDebit.toFixed(2),
        "，贷方合计 ¥",
        totals.totalCredit.toFixed(2),
        "， 差额 ¥",
        totals.difference.toFixed(2)
      ] }),
      submitted && !validation.valid && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "error", sx: { mt: 1.5 }, "data-testid": "voucher-form-errors", children: validation.errors.slice(0, 3).map((e) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: e }, e)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onClose, children: "取消" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "contained",
          onClick: handleSave,
          disabled: !validation.valid,
          "data-testid": "voucher-save",
          children: "保存凭证"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Snackbar,
      {
        open: snackbar.open,
        autoHideDuration: 4e3,
        onClose: () => setSnackbar({ open: false, message: "" }),
        message: snackbar.message,
        anchorOrigin: { vertical: "top", horizontal: "center" }
      }
    )
  ] });
}
const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "draft", label: "制单" },
  { value: "reviewed", label: "已审核" },
  { value: "posted", label: "已过账" },
  { value: "reversed", label: "已冲销" }
];
function VoucherList() {
  const {
    vouchers,
    createVoucher,
    reviewVoucher,
    unreviewVoucher,
    postVoucher,
    reverseVoucher,
    deleteVoucher
  } = useFinanceStore();
  const [status, setStatus] = reactExports.useState("all");
  const [period, setPeriod] = reactExports.useState("");
  const [keyword, setKeyword] = reactExports.useState("");
  const [formOpen, setFormOpen] = reactExports.useState(false);
  const [editing, setEditing] = reactExports.useState(null);
  const [msg, setMsg] = reactExports.useState(null);
  const [reverseTarget, setReverseTarget] = reactExports.useState(null);
  const periods = reactExports.useMemo(
    () => Array.from(new Set(vouchers.map((v) => v.period).filter(Boolean))).sort().reverse(),
    [vouchers]
  );
  const filtered = reactExports.useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return vouchers.filter((v) => {
      if (status !== "all" && v.status !== status) return false;
      if (period && v.period !== period) return false;
      if (kw) {
        const hay = `${v.voucherNo} ${v.remark || ""} ${v.items.map((i) => `${i.summary}${i.accountName}`).join(" ")}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [vouchers, status, period, keyword]);
  const totalLines = vouchers.reduce((s, v) => s + v.items.length, 0);
  const stat = (s) => vouchers.filter((v) => v.status === s).length;
  const unbalanced = vouchers.filter((v) => Math.abs(v.totalDebit - v.totalCredit) >= 5e-3).length;
  const run = (fn) => {
    const r = fn();
    setMsg({ text: r.message, ok: r.ok });
  };
  const handleImportVouchers = (rows, headers) => {
    const pick = (r, zh, en) => {
      const key = headers.find(
        (h) => h === zh || h.toLowerCase() === en.toLowerCase() || h.toLowerCase().replace(/\s/g, "") === en.toLowerCase()
      );
      return key ? (r[key] ?? "").trim() : "";
    };
    const num = (v) => {
      const n = Number(String(v).replace(/[^0-9.-]/g, ""));
      return Number.isFinite(n) ? n : 0;
    };
    const groups = /* @__PURE__ */ new Map();
    rows.forEach((r) => {
      const no = pick(r, "凭证号", "voucherNo");
      const key = no || `single-${Math.random().toString(36).slice(2, 8)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    let okCount = 0;
    let failCount = 0;
    groups.forEach((lines) => {
      const first = lines[0];
      const date = pick(first, "日期", "date") || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const voucherType = pick(first, "凭证字", "voucherType") || "记";
      const remark = pick(first, "备注", "remark");
      const attachmentCount = Math.round(num(pick(first, "附单据", "attachmentCount")));
      const items = lines.map((r, idx) => ({
        id: `vi-imp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        lineNo: idx + 1,
        summary: pick(r, "摘要", "summary"),
        accountCode: pick(r, "科目编码", "accountCode"),
        accountName: pick(r, "科目名称", "accountName"),
        debit: num(pick(r, "借方", "debit")),
        credit: num(pick(r, "贷方", "credit"))
      }));
      const res = createVoucher({ date, voucherType, items, attachmentCount, remark, createdBy: "导入" });
      if (res.ok) okCount += 1;
      else failCount += 1;
    });
    setMsg({
      text: `凭证导入完成：成功 ${okCount} 张，失败 ${failCount} 张${failCount > 0 ? "（失败多为借贷不平或已结账期间）" : ""}`,
      ok: failCount === 0
    });
  };
  const cards = [
    { label: "凭证总数", value: vouchers.length, color: "text.primary" },
    { label: "制单", value: stat("draft"), color: "text.secondary" },
    { label: "已审核", value: stat("reviewed"), color: "info.main" },
    { label: "已过账", value: stat("posted"), color: "success.main" },
    { label: "已冲销", value: stat("reversed"), color: "error.main" },
    { label: "借贷不平", value: unbalanced, color: unbalanced ? "error.main" : "success.main" }
  ];
  const columns = [
    {
      id: "voucherNo",
      header: "凭证号",
      accessorFn: (r) => r.voucherNo,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 700, fontFamily: "monospace", children: row.original.voucherNo })
    },
    {
      id: "status",
      header: "状态",
      accessorFn: (r) => r.status,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: VOUCHER_STATUS_LABEL[row.original.status], color: VOUCHER_STATUS_COLOR[row.original.status] })
    },
    {
      id: "date",
      header: "日期",
      accessorFn: (r) => r.date,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: row.original.date })
    },
    {
      id: "lines",
      header: "分录",
      accessorFn: (r) => r.items.length,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", variant: "outlined", label: `${row.original.items.length} 行` })
    },
    {
      id: "attachment",
      header: "附单据",
      accessorFn: (r) => r.attachmentCount,
      cell: ({ row }) => row.original.attachmentCount > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", variant: "outlined", label: `附单据 ${row.original.attachmentCount}` }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.disabled", children: "—" })
    },
    {
      id: "amount",
      header: "借 / 贷",
      accessorFn: (r) => r.totalDebit,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 700, children: [
        "借 ¥",
        row.original.totalDebit.toLocaleString(),
        " / 贷 ¥",
        row.original.totalCredit.toLocaleString()
      ] })
    },
    {
      id: "balanced",
      header: "平衡",
      accessorFn: (r) => Math.abs(r.totalDebit - r.totalCredit),
      cell: ({ row }) => {
        const diff = Math.round((row.original.totalDebit - row.original.totalCredit) * 100) / 100;
        return Math.abs(diff) >= 5e-3 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "error", label: `不平 ${diff.toFixed(2)}` }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "success", variant: "outlined", label: "平衡" });
      }
    },
    {
      id: "reversal",
      header: "冲销关系",
      accessorFn: (r) => r.originalVoucherNo || r.reversalVoucherNo || "",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 0.5, flexWrap: "wrap" }, children: [
        row.original.originalVoucherNo && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "error", variant: "outlined", label: `红冲 ${row.original.originalVoucherNo}` }),
        row.original.reversalVoucherNo && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "warning", variant: "outlined", label: `已由 ${row.original.reversalVoucherNo} 冲销` })
      ] })
    },
    {
      id: "actions",
      header: "操作",
      enableSorting: false,
      cell: ({ row }) => {
        const v = row.original;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 0.5, flexWrap: "wrap" }, children: [
          v.status === "draft" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", onClick: (e) => {
              e.stopPropagation();
              setEditing(v);
              setFormOpen(true);
            }, children: "修改" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "small",
                variant: "outlined",
                onClick: (e) => {
                  e.stopPropagation();
                  run(() => reviewVoucher(v.id, "当前用户"));
                },
                children: "审核"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "small",
                color: "error",
                onClick: (e) => {
                  e.stopPropagation();
                  run(() => deleteVoucher(v.id));
                },
                children: "删除"
              }
            )
          ] }),
          v.status === "reviewed" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "small",
                onClick: (e) => {
                  e.stopPropagation();
                  run(() => unreviewVoucher(v.id));
                },
                children: "反审核"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "small",
                variant: "contained",
                onClick: (e) => {
                  e.stopPropagation();
                  run(() => postVoucher(v.id, "当前用户"));
                },
                children: "过账"
              }
            )
          ] }),
          v.status === "posted" && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "small",
              color: "error",
              variant: "outlined",
              onClick: (e) => {
                e.stopPropagation();
                setReverseTarget(v);
              },
              children: "冲销"
            }
          ),
          v.status === "reversed" && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "error.main", children: "已冲销，不可再操作" })
        ] });
      }
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 2, gap: 1, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "记账凭证" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", "data-testid": "voucher-count", children: [
        "共 ",
        vouchers.length,
        " 张凭证 / ",
        totalLines,
        " 条分录"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "contained",
          size: "small",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, {}),
          "data-testid": "voucher-new-btn",
          onClick: () => {
            setEditing(null);
            setFormOpen(true);
          },
          children: "新增凭证"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 1.5, sx: { mb: 2 }, children: cards.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 4, md: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { py: 1.5, "&:last-child": { pb: 1.5 } }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: c.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 700, color: c.color, children: c.value })
    ] }) }) }, c.label)) }),
    msg && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Alert,
      {
        severity: msg.ok ? "success" : "error",
        sx: { mb: 2 },
        "data-testid": "voucher-op-msg",
        onClose: () => setMsg(null),
        children: msg.text
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { variant: "outlined", sx: { p: 2, mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          select: true,
          fullWidth: true,
          size: "small",
          label: "状态",
          value: status,
          "data-testid": "voucher-filter-status",
          onChange: (e) => setStatus(e.target.value),
          children: STATUS_OPTIONS.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o.value, children: o.label }, o.value))
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        TextField,
        {
          select: true,
          fullWidth: true,
          size: "small",
          label: "会计期间",
          value: period,
          "data-testid": "voucher-filter-period",
          onChange: (e) => setPeriod(e.target.value),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "全部期间" }),
            periods.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: p, children: p }, p))
          ]
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          fullWidth: true,
          size: "small",
          label: "搜索凭证号 / 摘要 / 科目",
          value: keyword,
          "data-testid": "voucher-filter-kw",
          onChange: (e) => setKeyword(e.target.value)
        }
      ) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DataTable,
      {
        data: filtered,
        columns,
        enableRowSelection: false,
        enablePagination: true,
        enableSorting: true,
        enableColumnFilter: true,
        enableBlockSelect: true,
        enableExport: true,
        exportFormat: "xlsx",
        enableImport: true,
        onImport: handleImportVouchers,
        columnConfigKey: "voucher-list"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "凭证状态流转：制单 → 审核 → 过账 → 冲销。仅「已过账」凭证进入总账明细并被三大报表取数；保存前强制校验 Σ借 = Σ贷。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Dialog,
      {
        open: !!reverseTarget,
        onClose: () => setReverseTarget(null),
        "data-testid": "voucher-reverse-dialog",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "确认冲销凭证" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContentText, { children: [
            "确认冲销凭证 ",
            reverseTarget == null ? void 0 : reverseTarget.voucherNo,
            "？将生成红字冲销凭证。"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setReverseTarget(null), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                "data-testid": "voucher-reverse-confirm",
                color: "error",
                variant: "contained",
                onClick: () => {
                  if (!reverseTarget) return;
                  run(() => reverseVoucher(reverseTarget.id, "当前用户"));
                  setReverseTarget(null);
                },
                children: "确认冲销"
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      VoucherForm,
      {
        open: formOpen,
        voucher: editing,
        onClose: () => setFormOpen(false),
        onSaved: (text, ok) => setMsg({ text, ok })
      }
    )
  ] });
}
export {
  VoucherList as default
};
