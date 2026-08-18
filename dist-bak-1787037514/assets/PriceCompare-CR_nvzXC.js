import { n as useParams, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { b as usePurchaseStore } from "./index-hTLNcGoC.js";
import { f as formatCurrency } from "./format-BXPn3erM.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { m as Box, T as Typography, aS as Paper, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
const PriceCompare = () => {
  const { id } = useParams();
  const { vendorQuotes, purchaseRequests } = usePurchaseStore();
  const request = purchaseRequests.find((r) => r.id === id);
  const quotes = vendorQuotes.filter((q) => q.requestId === id);
  if (!request) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "供应商比价", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: "采购申请不存在" }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: `供应商比价 - ${request.requestNo}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", children: request.title }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
            "申请人：",
            request.applicant,
            " | 部门：",
            request.department
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 2 }, children: "供应商报价对比" }),
        quotes.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 4, textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { color: "text.secondary", children: "暂无供应商报价" }) }) : quotes.map((quote) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", children: quote.vendorName }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                "报价时间：",
                quote.submittedAt
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { textAlign: "right" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", color: "primary", children: formatCurrency(quote.totalAmount) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                "有效期至：",
                quote.validUntil
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料名称" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "数量" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "单价" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "金额" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: quote.items.map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.materialName }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.quantity }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: formatCurrency(item.unitPrice) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: formatCurrency(item.amount) })
            ] }, i)) })
          ] }) }),
          quote.remarks && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { p: 2, bgcolor: "background.default" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
            "备注：",
            quote.remarks
          ] }) })
        ] }, quote.id))
      ]
    }
  );
};
export {
  PriceCompare as default
};
