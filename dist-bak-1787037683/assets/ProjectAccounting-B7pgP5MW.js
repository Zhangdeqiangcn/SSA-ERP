import { r as reactExports, j as jsxRuntimeExports, B as Box, aP as Paper, h as Typography, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip, bk as Button, bR as Visibility, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bK as Stack, bX as Grid, bC as DialogActions } from "./vendor-46QZWBd3.js";
import { f as useFinanceStore } from "./index-CcOZBoQL.js";
import { f as formatCurrency } from "./format-Rp8---CI.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
const CATEGORY_LABELS = {
  material: "材料",
  labor: "人工",
  equipment: "设备",
  outsource: "外协",
  overhead: "制造费用",
  other: "其他"
};
const ProjectAccounting = () => {
  const { projectAccounts } = useFinanceStore();
  const [detailOpen, setDetailOpen] = reactExports.useState(false);
  const [selectedAccount, setSelectedAccount] = reactExports.useState(null);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "项目核算", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 2, mb: 3 }, children: [
      { label: "核算项目数", value: projectAccounts.length + " 个", color: "#6366F1" },
      { label: "项目总预算", value: formatCurrency(projectAccounts.reduce((s, a) => s + a.totalBudget, 0)), color: "#3B82F6" },
      { label: "项目总收入", value: formatCurrency(projectAccounts.reduce((s, a) => s + a.revenue, 0)), color: "#10B981" },
      { label: "总毛利", value: formatCurrency(projectAccounts.reduce((s, a) => s + a.grossProfit, 0)), color: "#8B5CF6" }
    ].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { px: 2.5, py: 2, borderRadius: 3, flex: 1, border: `1px solid ${s.color}20` }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, color: s.color, children: s.value }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: s.label })
    ] }, s.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "核算单号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "项目编号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "项目名称" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "客户" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "核算期间" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "总预算" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "实际成本" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "偏差" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "收入" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "毛利" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "毛利率" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: projectAccounts.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", color: "#3B82F6", fontWeight: 500, children: a.accountNo }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: a.projectNo }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: a.projectName }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: a.customerName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: a.period }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(a.totalBudget) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(a.totalActual) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            label: `${a.totalVariance >= 0 ? "+" : ""}${formatCurrency(a.totalVariance)}`,
            size: "small",
            color: a.totalVariance >= 0 ? "error" : "success",
            variant: "outlined"
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, color: "#10B981", children: formatCurrency(a.revenue) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: formatCurrency(a.grossProfit) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: a.grossMargin > 20 ? "#10B981" : a.grossMargin > 0 ? "#F59E0B" : "#EF4444", children: [
          a.grossMargin,
          "%"
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            label: a.status === "draft" ? "草稿" : a.status === "submitted" ? "已提交" : "已审批",
            size: "small",
            color: a.status === "approved" ? "success" : "default"
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "small",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Visibility, {}),
            onClick: () => {
              setSelectedAccount(a);
              setDetailOpen(true);
            },
            children: "明细"
          }
        ) })
      ] }, a.id)) })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: detailOpen, onClose: () => setDetailOpen(false), maxWidth: "md", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
        "成本明细 — ",
        selectedAccount == null ? void 0 : selectedAccount.projectName,
        "（",
        selectedAccount == null ? void 0 : selectedAccount.projectNo,
        "）"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: selectedAccount && /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, mt: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, children: [
          { label: "总预算", value: formatCurrency(selectedAccount.totalBudget) },
          { label: "实际成本", value: formatCurrency(selectedAccount.totalActual) },
          { label: "收入", value: formatCurrency(selectedAccount.revenue) },
          { label: "毛利", value: `${formatCurrency(selectedAccount.grossProfit)}（${selectedAccount.grossMargin}%）` }
        ].map((kpi) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 1.5, bgcolor: "#F8FAFC", textAlign: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: kpi.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body1", fontWeight: 600, children: kpi.value })
        ] }) }, kpi.label)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "费用明细" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "类别" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "描述" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "预算" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "实际" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "偏差" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "偏差率" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: selectedAccount.costItems.map((ci) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: CATEGORY_LABELS[ci.category] || ci.category, size: "small" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: ci.description }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(ci.budgetAmount) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(ci.actualAmount) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: ci.variance >= 0 ? "#EF4444" : "#10B981", children: [
              ci.variance >= 0 ? "+" : "",
              formatCurrency(ci.variance)
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: `${ci.variancePercent >= 0 ? "+" : ""}${ci.variancePercent}%`,
                size: "small",
                color: ci.variancePercent >= 0 ? "error" : "success",
                variant: "outlined"
              }
            ) })
          ] }, ci.id)) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogActions, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDetailOpen(false), children: "关闭" }) })
    ] })
  ] });
};
export {
  ProjectAccounting as default
};
