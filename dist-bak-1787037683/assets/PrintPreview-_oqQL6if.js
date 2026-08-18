import { r as reactExports, j as jsxRuntimeExports, B as Box, bk as Button, bd as Print, aS as CloseIcon, h as Typography } from "./vendor-46QZWBd3.js";
import { k as useCustomFieldStore, P as PRINT_FIELD_CATALOG } from "./index-CcOZBoQL.js";
import { f as formatCurrency } from "./format-Rp8---CI.js";
const PRINT_STYLE_ID = "ssa-print-style";
const PrintPreview = ({ template, record, onClose }) => {
  const customDefs = useCustomFieldStore((s) => s.fields[template.entity] || []);
  reactExports.useEffect(() => {
    if (document.getElementById(PRINT_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = PRINT_STYLE_ID;
    style.innerHTML = `
@media print {
  body * { visibility: hidden !important; }
  .ssa-print-area, .ssa-print-area * { visibility: visible !important; }
  .ssa-print-area {
    position: absolute !important; left: 0; top: 0; width: 100% !important;
    box-shadow: none !important; margin: 0 !important; padding: 0 !important;
  }
  .no-print { display: none !important; }
}`;
    document.head.appendChild(style);
  }, []);
  const catalog = PRINT_FIELD_CATALOG[template.entity];
  const paperWidth = template.paperSize === "A4" ? 794 : 559;
  const now = (/* @__PURE__ */ new Date()).toLocaleString("zh-CN");
  const formatValue = (key, type, value) => {
    if (value === void 0 || value === null || value === "") return "—";
    if (type === "money") return formatCurrency(Number(value));
    if (key === "materialType") {
      const map = { raw: "原材料", semi: "半成品", finished: "成品", purchased: "外购件", service: "服务" };
      return map[value] || value;
    }
    return String(value);
  };
  const renderItems = () => {
    const items = record.items || [];
    if (items.length === 0) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { fontSize: 12, color: "#64748B", mt: 1 }, children: "无明细" });
    }
    const labelMap = {
      materialCode: "物料编码",
      materialName: "物料名称",
      name: "名称",
      code: "编码",
      specification: "规格",
      unit: "单位",
      quantity: "数量",
      orderedQuantity: "数量",
      unitPrice: "单价",
      amount: "金额",
      price: "单价",
      deliveryDate: "交期",
      remark: "备注",
      requirementQty: "需求数量"
    };
    const moneyKeys = /* @__PURE__ */ new Set(["unitPrice", "amount", "price", "totalAmount", "subtotal", "grandTotal"]);
    const baseKeys = Object.keys(items[0]).filter((k) => k !== "id" && k !== "materialId");
    const ordered = [
      "materialCode",
      "materialName",
      "name",
      "code",
      "specification",
      "unit",
      "quantity",
      "orderedQuantity",
      "unitPrice",
      "amount",
      "deliveryDate",
      "remark"
    ].filter((k) => baseKeys.includes(k));
    const rest = baseKeys.filter((k) => !ordered.includes(k));
    const cols = [...ordered, ...rest];
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse", marginTop: 8, fontSize: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#F1F5F9" }, children: cols.map((k) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: th, children: labelMap[k] || k }, k)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: items.map((it, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: cols.map((k) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: td, children: moneyKeys.has(k) ? formatCurrency(Number(it[k]) || 0) : it[k] ?? "" }, k)) }, i)) })
    ] });
  };
  const th = {
    border: "1px solid #E2E8F0",
    padding: "6px 8px",
    textAlign: "left",
    fontWeight: 600
  };
  const td = { border: "1px solid #E2E8F0", padding: "6px 8px" };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { className: "no-print", sx: { display: "flex", gap: 1, justifyContent: "flex-end", mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Print, {}), onClick: () => window.print(), children: "打印" }),
      onClose && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, {}), onClick: onClose, children: "关闭" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Box,
      {
        className: "ssa-print-area",
        sx: {
          width: paperWidth,
          maxWidth: "100%",
          mx: "auto",
          bgcolor: "#fff",
          color: "#111",
          p: 4,
          boxShadow: 3,
          fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif'
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", align: "center", sx: { fontWeight: 700, mb: 1 }, children: template.title }),
          template.headerText && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { whiteSpace: "pre-line", textAlign: "center", color: "#475569", mb: 3, fontSize: 13 }, children: template.headerText }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Box,
            {
              sx: {
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px 24px",
                mb: 2,
                fontSize: 13
              },
              children: template.fieldKeys.filter((k) => k !== "items").map((key) => {
                const cat = catalog.find((c) => c.key === key);
                const label = (cat == null ? void 0 : cat.label) || key;
                const value = formatValue(key, cat == null ? void 0 : cat.type, record[key]);
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", borderBottom: "1px dotted #E2E8F0", py: 0.5 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { width: 110, color: "#64748B", flexShrink: 0 }, children: [
                    label,
                    "："
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { flex: 1, fontWeight: 500 }, children: value })
                ] }, key);
              })
            }
          ),
          template.fieldKeys.includes("items") && renderItems(),
          customDefs.length > 0 && record.customFields && Object.keys(record.customFields).length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 3 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { fontWeight: 600, mb: 1, fontSize: 13 }, children: "自定义字段" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px", fontSize: 13 }, children: customDefs.map((def) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", borderBottom: "1px dotted #E2E8F0", py: 0.5 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { width: 110, color: "#64748B", flexShrink: 0 }, children: [
                def.label,
                "："
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { flex: 1, fontWeight: 500 }, children: String(record.customFields[def.key] ?? "—") })
            ] }, def.key)) })
          ] }),
          template.footerText && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { whiteSpace: "pre-line", textAlign: "center", color: "#475569", mt: 4, pt: 2, borderTop: "1px solid #E2E8F0", fontSize: 12 }, children: template.footerText.replace("{now}", now) })
        ]
      }
    )
  ] });
};
export {
  PrintPreview as P
};
