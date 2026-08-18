import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { bm as Button, dx as default_1, dy as default_1$1, b9 as Dialog, ba as DialogTitle, bc as DialogContent, m as Box, T as Typography } from "./vendor-mui-DsZGB15g.js";
import { x as usePrintTemplateStore } from "./index-CU2cqxc8.js";
import { P as PrintPreview } from "./PrintPreview-B9z7TG1v.js";
const PrintPreviewButton = ({
  entity,
  record,
  showBoth = true,
  size = "small",
  variant = "outlined"
}) => {
  const [open, setOpen] = reactExports.useState(false);
  const getTemplateByEntity = usePrintTemplateStore((s) => s.getTemplateByEntity);
  const template = getTemplateByEntity(entity) || buildFallback(entity, record);
  const openPreview = () => setOpen(true);
  const handlePrint = () => {
    setOpen(true);
    setTimeout(() => window.print(), 300);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    showBoth && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant, size, startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), onClick: handlePrint, "data-testid": "print-button", children: "打印" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant, size, startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, {}), onClick: openPreview, "data-testid": "print-preview-button", children: "打印预览" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "md", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "打印预览" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { dividers: true, children: template ? /* @__PURE__ */ jsxRuntimeExports.jsx(PrintPreview, { template, record, onClose: () => setOpen(false) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { p: 4, textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { color: "text.secondary", children: "暂无可用的打印模板。" }) }) })
    ] })
  ] });
};
const buildFallback = (entity, record) => {
  const rawKeys = Object.keys(record || {}).filter((k) => k !== "items" && typeof record[k] !== "object");
  return {
    id: `fallback-${entity}`,
    name: "默认模板",
    entity,
    title: entity,
    paperSize: "A4",
    orientation: "portrait",
    headerText: "",
    footerText: "打印时间：{now}",
    fieldKeys: [...rawKeys, "items"].filter((k) => k !== "items" || record.items && record.items.length)
  };
};
export {
  PrintPreviewButton as P
};
