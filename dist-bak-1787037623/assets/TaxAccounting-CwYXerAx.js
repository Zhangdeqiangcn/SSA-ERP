import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { f as useFinanceStore } from "./index-CU2cqxc8.js";
import { f as formatCurrency } from "./format-DXPckS9-.js";
import { P as PageWrapper } from "./PageWrapper-CjuAUfYF.js";
import { m as Box, aS as Paper, T as Typography, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aO as Chip, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bL as Stack, bv as TextField, aR as MenuItem, bE as DialogActions, bm as Button, bh as Add } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./vendor-date-DI3D_gXa.js";
const CATEGORY_LABELS = {
  vat: "增值税",
  corporate_income: "企业所得税",
  personal_income: "个人所得税",
  stamp: "印花税",
  property: "房产税",
  other: "其他"
};
const TaxAccounting = () => {
  const { taxRecords, addTaxRecord } = useFinanceStore();
  const [addOpen, setAddOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({
    category: "vat",
    period: "2024-07",
    periodType: "monthly",
    taxableAmount: 0,
    taxRate: 13,
    deductedAmount: 0
  });
  const totalPayable = taxRecords.reduce((s, r) => s + r.actualPayable, 0);
  const totalPaid = taxRecords.reduce((s, r) => s + r.paidAmount, 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "税务核算",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => setAddOpen(true), children: "新增税单" }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 2, mb: 3 }, children: [
          { label: "待缴税额", value: formatCurrency(totalPayable - totalPaid), color: "#EF4444" },
          { label: "已缴税额", value: formatCurrency(totalPaid), color: "#10B981" },
          { label: "税单总数", value: taxRecords.length + " 张", color: "#3B82F6" },
          { label: "待申报", value: taxRecords.filter((r) => r.status === "calculated").length + " 张", color: "#F59E0B" }
        ].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { px: 2.5, py: 2, borderRadius: 3, flex: 1, border: `1px solid ${s.color}20` }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, color: s.color, children: s.value }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: s.label })
        ] }, s.label)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "税单编号" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "期间" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "税种" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "应税金额" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "税率" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "税额" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "可抵扣" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "实缴金额" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "已缴金额" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "缴款日期" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: taxRecords.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", color: "#3B82F6", fontWeight: 500, children: r.recordNo }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.period }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: CATEGORY_LABELS[r.category], size: "small", variant: "outlined" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(r.taxableAmount) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
              r.taxRate,
              "%"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(r.taxAmount) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "#10B981", children: [
              "-",
              formatCurrency(r.deductedAmount)
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: formatCurrency(r.actualPayable) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(r.paidAmount) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.paymentDate || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: r.status === "paid" ? "已缴" : r.status === "calculated" ? "待缴" : "待申报",
                size: "small",
                color: r.status === "paid" ? "success" : r.status === "calculated" ? "warning" : "default"
              }
            ) })
          ] }, r.id)) })
        ] }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: addOpen, onClose: () => setAddOpen(false), maxWidth: "sm", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增税务核算单" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, mt: 1, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                select: true,
                fullWidth: true,
                label: "税种",
                value: form.category,
                onChange: (e) => setForm((prev) => ({ ...prev, category: e.target.value })),
                children: Object.entries(CATEGORY_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: k, children: v }, k))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              TextField,
              {
                select: true,
                fullWidth: true,
                label: "期间类型",
                value: form.periodType,
                onChange: (e) => setForm((prev) => ({ ...prev, periodType: e.target.value })),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "monthly", children: "月度" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "quarterly", children: "季度" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "annual", children: "年度" })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "核算期间",
                value: form.period,
                onChange: (e) => setForm((prev) => ({ ...prev, period: e.target.value }))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "应税金额",
                type: "number",
                value: form.taxableAmount,
                onChange: (e) => setForm((prev) => ({ ...prev, taxableAmount: Number(e.target.value) }))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "税率(%)",
                type: "number",
                value: form.taxRate,
                onChange: (e) => setForm((prev) => ({ ...prev, taxRate: Number(e.target.value) }))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "可抵扣金额",
                type: "number",
                value: form.deductedAmount,
                onChange: (e) => setForm((prev) => ({ ...prev, deductedAmount: Number(e.target.value) }))
              }
            )
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setAddOpen(false), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: () => {
              const taxAmount = Math.round(form.taxableAmount * form.taxRate / 100);
              const actualPayable = taxAmount - form.deductedAmount;
              const newRecord = {
                id: "tax-" + Date.now(),
                recordNo: "TAX" + form.period.replace("-", "") + String(taxRecords.length + 1).padStart(3, "0"),
                period: form.period,
                periodType: form.periodType,
                category: form.category,
                taxableAmount: form.taxableAmount,
                taxRate: form.taxRate,
                taxAmount,
                deductedAmount: form.deductedAmount,
                actualPayable,
                paidAmount: 0,
                status: "calculated",
                createdAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " "),
                updatedAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " "),
                createdBy: "王会计",
                updatedBy: "王会计"
              };
              addTaxRecord(newRecord);
              setAddOpen(false);
            }, children: "保存" })
          ] })
        ] })
      ]
    }
  );
};
export {
  TaxAccounting as default
};
