import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { f as useFinanceStore } from "./index-hTLNcGoC.js";
import { u as useAnalyticsStore } from "./analyticsStore-Ci4UuBPH.js";
import { m as Box, bL as Stack, ag as ReceiptIcon, T as Typography, aO as Chip, bY as Grid, bs as Card, bt as CardContent, bv as TextField, bm as Button, fa as ScanIcon, bl as Alert, dF as AweIcon, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, cJ as Snackbar } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
const SAMPLE_INVOICE = `增值税专用发票
发票号码：24417000000123456789
开票日期：2026-06-18
购买方：上海智造科技有限公司
销售方：苏州精密零件制造厂
金额：10000.00
税率：13%
税额：1300.00
价税合计：11700.00`;
function parseInvoice(text) {
  const pick = (label) => {
    const m = text.match(new RegExp(`${label}[：:]\\s*([^\\n]+)`));
    return m ? m[1].trim() : "";
  };
  const num = (label) => {
    const v = pick(label).replace(/[, ¥￥]/g, "");
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };
  return {
    invoiceNo: pick("发票号码"),
    invoiceDate: pick("开票日期"),
    buyer: pick("购买方"),
    seller: pick("销售方"),
    amount: num("金额"),
    taxRate: pick("税率"),
    taxAmount: num("税额"),
    total: num("价税合计")
  };
}
function InvoiceOcr() {
  const addAccountEntry = useFinanceStore((s) => s.addAccountEntry);
  const addOcrHistory = useAnalyticsStore((s) => s.addOcrHistory);
  const history = useAnalyticsStore((s) => s.ocrHistory);
  const [text, setText] = reactExports.useState(SAMPLE_INVOICE);
  const [parsed, setParsed] = reactExports.useState(null);
  const [snack, setSnack] = reactExports.useState("");
  const handleRecognize = () => {
    setParsed(parseInvoice(text));
  };
  const handleGenerate = () => {
    if (!parsed || !parsed.invoiceNo) {
      setSnack("请先 OCR 识别并确认发票信息");
      return;
    }
    const voucherNo = `V-OCR-${Date.now()}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const base = {
      date: parsed.invoiceDate || now.slice(0, 10),
      description: `采购发票${parsed.invoiceNo}入账（AI识别）`,
      currency: "CNY",
      voucherNo,
      createdBy: "智能分析",
      createdAt: now,
      updatedAt: now
    };
    const entries = [
      { ...base, id: `JE-OCR-${Date.now()}-1`, entryNo: `JE-OCR-1`, debitAccount: "原材料", creditAccount: "", amount: parsed.amount },
      { ...base, id: `JE-OCR-${Date.now()}-2`, entryNo: `JE-OCR-2`, debitAccount: "应交税费-应交增值税", creditAccount: "", amount: parsed.taxAmount },
      { ...base, id: `JE-OCR-${Date.now()}-3`, entryNo: `JE-OCR-3`, debitAccount: "", creditAccount: "应付账款", amount: parsed.total }
    ];
    entries.forEach((e) => addAccountEntry(e));
    addOcrHistory({
      id: `OCR-${Date.now()}`,
      invoiceNo: parsed.invoiceNo,
      invoiceDate: parsed.invoiceDate,
      seller: parsed.seller,
      buyer: parsed.buyer,
      amount: parsed.amount,
      taxAmount: parsed.taxAmount,
      total: parsed.total,
      voucherNo,
      createdAt: now
    });
    setSnack(`已生成凭证 ${voucherNo}`);
  };
  const setField = (key, value) => {
    if (!parsed) return;
    setParsed({ ...parsed, [key]: key === "amount" || key === "taxAmount" || key === "total" ? Number(value) : value });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, "data-testid": "ocr", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptIcon, { color: "primary" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "发票 OCR 与智能凭证" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: "模拟AI识别→一键生成凭证", color: "primary", variant: "outlined" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { mb: 1 }, children: "发票原文（可粘贴 / 编辑）" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            multiline: true,
            minRows: 9,
            value: text,
            onChange: (e) => setText(e.target.value),
            "data-testid": "ocr-input",
            sx: { fontFamily: "monospace", mb: 2 }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ScanIcon, {}), onClick: () => setText(SAMPLE_INVOICE), "data-testid": "ocr-sample", children: "加载示例" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ScanIcon, {}), onClick: handleRecognize, "data-testid": "ocr-recognize", children: "OCR 识别" })
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { mb: 1 }, children: "识别结果（可校正）" }),
        !parsed ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", children: "点击「OCR 识别」解析发票字段" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 1.5, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { label: "发票号码", value: parsed.invoiceNo, onChange: (e) => setField("invoiceNo", e.target.value), "data-testid": "ocr-invoice-no" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { label: "开票日期", value: parsed.invoiceDate, onChange: (e) => setField("invoiceDate", e.target.value), "data-testid": "ocr-invoice-date" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { label: "购买方", value: parsed.buyer, onChange: (e) => setField("buyer", e.target.value), "data-testid": "ocr-buyer" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { label: "销售方", value: parsed.seller, onChange: (e) => setField("seller", e.target.value), "data-testid": "ocr-seller" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { label: "金额(不含税)", type: "number", value: parsed.amount, onChange: (e) => setField("amount", e.target.value), "data-testid": "ocr-amount" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { label: "税额", type: "number", value: parsed.taxAmount, onChange: (e) => setField("taxAmount", e.target.value), "data-testid": "ocr-tax" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { label: "价税合计", type: "number", value: parsed.total, onChange: (e) => setField("total", e.target.value), "data-testid": "ocr-total" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", color: "success", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(AweIcon, {}), onClick: handleGenerate, "data-testid": "ocr-generate", children: "一键生成凭证" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "success", sx: { mt: 1 }, children: "凭证分录：借 原材料 / 应交税费-应交增值税；贷 应付账款" })
        ] })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { sx: { mt: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 1 }, children: "识别与生成凭证历史" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "发票号码" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "开票日期" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "销售方" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "不含税" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "税额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "价税合计" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "凭证号" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: history.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 7, align: "center", children: "暂无记录" }) }) : history.map((h) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "ocr-history-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: h.invoiceNo }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: h.invoiceDate }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: h.seller }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: h.amount }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: h.taxAmount }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: h.total }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: h.voucherNo })
        ] }, h.id)) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Snackbar, { open: !!snack, autoHideDuration: 4e3, onClose: () => setSnack(""), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "success", onClose: () => setSnack(""), children: snack }) })
  ] });
}
export {
  InvoiceOcr as default
};
