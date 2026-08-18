import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bk as Button, e1 as default_1, aP as Paper, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bj as Alert, bX as Grid, bt as TextField, aO as MenuItem, bC as DialogActions } from "./vendor-DGU5TO-x.js";
import { f as useFinanceStore } from "./index-DeeqqmHA.js";
const TYPE_LABEL = {
  asset: { label: "资产", color: "info" },
  liability: { label: "负债", color: "error" },
  equity: { label: "权益", color: "success" },
  revenue: { label: "收入", color: "warning" },
  expense: { label: "费用", color: "default" }
};
function ChartOfAccounts() {
  const { chartOfAccounts, addChartAccount } = useFinanceStore();
  const [open, setOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({
    code: "",
    name: "",
    type: "asset",
    parentCode: ""
  });
  const [error, setError] = reactExports.useState("");
  const handleAdd = () => {
    if (!form.code || !form.name) {
      setError("科目编码与名称为必填");
      return;
    }
    if (chartOfAccounts.some((a) => a.code === form.code)) {
      setError("科目编码已存在");
      return;
    }
    const acc = {
      id: `coa-${form.code}-${Date.now()}`,
      code: form.code,
      name: form.name,
      type: form.type,
      parentCode: form.parentCode || void 0,
      isLeaf: true,
      balance: 0
    };
    addChartAccount(acc);
    setOpen(false);
    setForm({ code: "", name: "", type: "asset", parentCode: "" });
    setError("");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "会计科目表" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), size: "small", onClick: () => setOpen(true), children: "新增科目" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "科目编码" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "科目名称" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "类别" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "上级科目" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "是否末级" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "余额" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: chartOfAccounts.map((acc) => {
        const tc = TYPE_LABEL[acc.type];
        const parent = chartOfAccounts.find((a) => a.code === acc.parentCode);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, "data-testid": "coa-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: acc.code }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: acc.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: tc.label, size: "small", color: tc.color, variant: "outlined" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: parent ? `${parent.code} ${parent.name}` : "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: acc.isLeaf ? "末级" : "非末级", size: "small", variant: "outlined" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 500, children: [
            "¥",
            acc.balance.toLocaleString()
          ] }) })
        ] }, acc.id);
      }) })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增会计科目" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { dividers: true, children: [
        error && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "error", sx: { mb: 2 }, children: error }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { pt: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              size: "small",
              label: "科目编码",
              value: form.code,
              onChange: (e) => setForm({ ...form, code: e.target.value })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              size: "small",
              label: "科目名称",
              value: form.name,
              onChange: (e) => setForm({ ...form, name: e.target.value })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              select: true,
              fullWidth: true,
              size: "small",
              label: "科目类别",
              value: form.type,
              onChange: (e) => setForm({ ...form, type: e.target.value }),
              children: Object.keys(TYPE_LABEL).map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: t, children: TYPE_LABEL[t].label }, t))
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            TextField,
            {
              select: true,
              fullWidth: true,
              size: "small",
              label: "上级科目（可选）",
              value: form.parentCode,
              onChange: (e) => setForm({ ...form, parentCode: e.target.value }),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "无（一级科目）" }),
                chartOfAccounts.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: a.code, children: [
                  a.code,
                  " ",
                  a.name
                ] }, a.id))
              ]
            }
          ) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleAdd, children: "保存" })
      ] })
    ] })
  ] });
}
export {
  ChartOfAccounts as default
};
