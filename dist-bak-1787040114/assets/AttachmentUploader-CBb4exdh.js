import { j as jsxRuntimeExports, aP as Paper, B as Box, eQ as default_1, h as Typography } from "./vendor-DGU5TO-x.js";
import { F as FileUpload } from "./FileUpload-CMrbNP90.js";
const AttachmentUploader = ({
  label = "附件上传",
  value = [],
  onChange,
  multiple = true,
  maxFiles = 10,
  accept,
  hint = "支持上传合同、技术协议、图纸等；可上传多个文件，点击删除可移除。"
}) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5, mb: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, { fontSize: "small", color: "primary" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: label }),
      value.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
        "（",
        value.length,
        " 个文件）"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      FileUpload,
      {
        value,
        onChange,
        multiple,
        maxFiles,
        accept
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: hint })
  ] });
};
export {
  AttachmentUploader as A
};
