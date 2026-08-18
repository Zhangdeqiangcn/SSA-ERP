import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { m as Box, T as Typography, bm as Button, eF as default_1, aS as Paper, bL as Stack, bv as TextField, bl as Alert, bs as Card, bt as CardContent, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aO as Chip } from "./vendor-mui-UhJuRAfR.js";
import { f as useFinanceStore, b as usePurchaseStore, c as useWarehouseStore, z as calcTaxTotals } from "./index-hTLNcGoC.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
const norm = (s) => (s || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
function ThreeWayMatch() {
  const invoices = useFinanceStore((s) => s.invoices);
  const purchaseOrders = usePurchaseStore((s) => s.purchaseOrders);
  const inboundOrders = useWarehouseStore((s) => s.inboundOrders);
  const [nonce, setNonce] = reactExports.useState(0);
  const [warnThreshold, setWarnThreshold] = reactExports.useState(5);
  const [errorThreshold, setErrorThreshold] = reactExports.useState(10);
  const rows = reactExports.useMemo(() => {
    return invoices.map((inv) => {
      const po = purchaseOrders.find(
        (o) => norm(o.orderNo) === norm(inv.purchaseOrderNo)
      );
      const poMatched = !!po;
      const poGrandTotal = po ? po.grandTotal ?? calcTaxTotals(po.items).grandTotal : 0;
      const poAmount = po ? po.totalAmount : 0;
      const invoiceTotal = inv.totalAmount;
      const amountMatched = poMatched && Math.abs(invoiceTotal - poGrandTotal) < 0.01;
      const poQty = po ? po.items.reduce((sum, item) => sum + (item.orderedQuantity || 0), 0) : 0;
      const grOrders = inboundOrders.filter(
        (o) => o.type === "purchase" && norm(o.sourceNo) === norm(inv.purchaseOrderNo)
      );
      const grQty = grOrders.reduce(
        (sum, o) => sum + o.items.reduce((s, item) => s + (item.actualQuantity || 0), 0),
        0
      );
      const qtyDiff = grQty - poQty;
      const invoiceUnitPrice = poQty > 0 ? inv.amount / poQty : 0;
      const poUnitPrice = poQty > 0 ? poAmount / poQty : 0;
      const priceDiff = invoiceUnitPrice - poUnitPrice;
      const amountDiff = inv.amount - poAmount;
      const receiptMatched = inboundOrders.some(
        (o) => o.type === "purchase" && norm(o.sourceNo) === norm(inv.purchaseOrderNo)
      );
      return {
        invoiceId: inv.id,
        invoiceNo: inv.invoiceNo,
        vendorName: inv.vendorName,
        purchaseOrderNo: inv.purchaseOrderNo,
        amount: invoiceTotal,
        poGrandTotal,
        poAmount,
        poQty,
        grQty,
        qtyDiff,
        invoiceUnitPrice,
        poUnitPrice,
        priceDiff,
        amountDiff,
        status: inv.status,
        poMatched,
        receiptMatched,
        amountMatched,
        fullyMatched: poMatched && receiptMatched
      };
    });
  }, [invoices, purchaseOrders, inboundOrders, nonce]);
  const matchedCount = rows.filter((r) => r.fullyMatched).length;
  const amountMatchedCount = rows.filter((r) => r.amountMatched).length;
  const rowsWithPo = rows.filter((r) => r.poMatched);
  const qtyDiffCount = rowsWithPo.filter((r) => Math.abs(r.qtyDiff) > 5e-3).length;
  const priceDiffCount = rowsWithPo.filter((r) => Math.abs(r.priceDiff) > 5e-3).length;
  const amountDiffCount = rowsWithPo.filter((r) => Math.abs(r.amountDiff) > 0.01).length;
  const getRowStyle = (r) => {
    if (!r.poMatched) return {};
    const qtyPct = r.poQty > 0 ? Math.abs(r.qtyDiff) / r.poQty * 100 : 0;
    const pricePct = r.poUnitPrice > 0 ? Math.abs(r.priceDiff) / r.poUnitPrice * 100 : 0;
    const amountPct = r.poAmount > 0 ? Math.abs(r.amountDiff) / r.poAmount * 100 : 0;
    const maxPct = Math.max(qtyPct, pricePct, amountPct);
    if (maxPct > errorThreshold) return { backgroundColor: "#ffebee" };
    if (maxPct > warnThreshold) return { backgroundColor: "#fff8e1" };
    return {};
  };
  const getDiffColor = (value, baseValue) => {
    if (baseValue === 0) return void 0;
    const pct = Math.abs(value) / Math.abs(baseValue) * 100;
    if (pct > errorThreshold) return "error";
    if (pct > warnThreshold && Math.abs(value) > 1e-3) return "warning";
    return void 0;
  };
  const fmtDiff = (value, decimals = 2) => {
    const sign = value > 0 ? "+" : "";
    const fixed = value.toFixed(decimals);
    return `${sign}${fixed}`;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "三单匹配" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "outlined",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}),
          size: "small",
          "data-testid": "twm-refresh",
          onClick: () => setNonce((n) => n + 1),
          children: "刷新匹配"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", gutterBottom: true, fontWeight: 600, children: "差异阈值配置" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 3, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "警告阈值 (%)",
            type: "number",
            size: "small",
            value: warnThreshold,
            onChange: (e) => setWarnThreshold(Number(e.target.value) || 0),
            inputProps: { min: 0, max: 100, step: 1, "data-testid": "twm-warn-threshold" },
            sx: { width: 140 }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "错误阈值 (%)",
            type: "number",
            size: "small",
            value: errorThreshold,
            onChange: (e) => setErrorThreshold(Number(e.target.value) || 0),
            inputProps: { min: 0, max: 100, step: 1, "data-testid": "twm-error-threshold" },
            sx: { width: 140 }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1, display: "flex", alignItems: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "差异百分比超过警告阈值显示黄色，超过错误阈值显示红色" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 2 }, "data-testid": "twm-summary", children: [
      "共 ",
      rows.length,
      " 张发票，其中 ",
      matchedCount,
      " 张完成「采购单 + 收货单」三单匹配，",
      amountMatchedCount,
      " 张发票含税金额与采购单价税合计一致。"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, sx: { mb: 2 }, "data-testid": "twm-diff-summary", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { sx: { flex: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 1.5, "&:last-child": { pb: 1.5 } }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "匹配总行数" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, "data-testid": "twm-match-total", children: rowsWithPo.length })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { sx: { flex: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 1.5, "&:last-child": { pb: 1.5 } }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "数量差异行数" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Typography,
          {
            variant: "h5",
            fontWeight: 700,
            color: qtyDiffCount > 0 ? "error" : void 0,
            "data-testid": "twm-qty-diff-count",
            children: qtyDiffCount
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { sx: { flex: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 1.5, "&:last-child": { pb: 1.5 } }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "价格差异行数" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Typography,
          {
            variant: "h5",
            fontWeight: 700,
            color: priceDiffCount > 0 ? "error" : void 0,
            "data-testid": "twm-price-diff-count",
            children: priceDiffCount
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { sx: { flex: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 1.5, "&:last-child": { pb: 1.5 } }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "金额差异行数" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Typography,
          {
            variant: "h5",
            fontWeight: 700,
            color: amountDiffCount > 0 ? "error" : void 0,
            "data-testid": "twm-amount-diff-count",
            children: amountDiffCount
          }
        )
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "发票号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "供应商" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "关联采购单" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "发票价税合计" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "采购单价税合计" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "数量差异" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "价格差异" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "金额差异" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", sx: { fontWeight: 600 }, children: "金额匹配" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "发票状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "采购单" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "收货单" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "匹配结果" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: rows.map((r) => {
        const qtyColor = getDiffColor(r.qtyDiff, r.poQty);
        const priceColor = getDiffColor(r.priceDiff, r.poUnitPrice);
        const amountColor = getDiffColor(r.amountDiff, r.poAmount);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, sx: getRowStyle(r), "data-testid": "three-way-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: r.invoiceNo }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.vendorName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: r.purchaseOrderNo }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
            "¥",
            r.amount.toLocaleString()
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", "data-testid": "twm-po-grand", children: r.poMatched ? `¥${r.poGrandTotal.toLocaleString()}` : "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", "data-testid": "twm-qty-diff", children: r.poMatched ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            Typography,
            {
              variant: "body2",
              color: qtyColor === "error" ? "error" : qtyColor === "warning" ? "#f57c00" : void 0,
              fontWeight: qtyColor ? 600 : void 0,
              children: fmtDiff(r.qtyDiff, 2)
            }
          ) : "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", "data-testid": "twm-price-diff", children: r.poMatched ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Typography,
            {
              variant: "body2",
              color: priceColor === "error" ? "error" : priceColor === "warning" ? "#f57c00" : void 0,
              fontWeight: priceColor ? 600 : void 0,
              children: [
                "¥",
                fmtDiff(r.priceDiff, 2)
              ]
            }
          ) : "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", "data-testid": "twm-amount-diff", children: r.poMatched ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Typography,
            {
              variant: "body2",
              color: amountColor === "error" ? "error" : amountColor === "warning" ? "#f57c00" : void 0,
              fontWeight: amountColor ? 600 : void 0,
              children: [
                "¥",
                fmtDiff(r.amountDiff, 2)
              ]
            }
          ) : "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: r.amountMatched ? "一致" : r.poMatched ? "不符" : "—",
              size: "small",
              color: r.amountMatched ? "success" : r.poMatched ? "error" : "default",
              "data-testid": "twm-amount-match"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: r.status, size: "small", variant: "outlined" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: r.poMatched ? "已匹配" : "未匹配",
              size: "small",
              color: r.poMatched ? "success" : "default"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: r.receiptMatched ? "已匹配" : "未匹配",
              size: "small",
              color: r.receiptMatched ? "success" : "default"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 1, alignItems: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: r.fullyMatched ? "三单匹配" : "不匹配",
              size: "small",
              color: r.fullyMatched ? "success" : "warning",
              "data-testid": r.fullyMatched ? "twm-ok" : "twm-no"
            }
          ) }) })
        ] }, r.invoiceId);
      }) })
    ] }) }) })
  ] });
}
export {
  ThreeWayMatch as default
};
