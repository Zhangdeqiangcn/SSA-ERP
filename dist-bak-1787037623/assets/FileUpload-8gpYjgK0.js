import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { m as Box, bm as Button, dn as CloudUpload, T as Typography, ch as LinearProgress, L as List, q as ListItem, t as ListItemIcon, dp as InsertDriveFile, w as ListItemText, aM as IconButton, d0 as Download, be as Delete } from "./vendor-mui-DsZGB15g.js";
const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
const FileUpload = ({
  value = [],
  onChange,
  multiple = true,
  maxFiles = 10,
  accept
}) => {
  const [uploading, setUploading] = reactExports.useState(false);
  const [progress, setProgress] = reactExports.useState(0);
  const [files, setFiles] = reactExports.useState(value);
  const handleFileChange = reactExports.useCallback(
    async (event) => {
      const selectedFiles = event.target.files;
      if (!selectedFiles) return;
      const newFiles = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        newFiles.push({
          id: `file-${Date.now()}-${i}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file)
        });
      }
      setUploading(true);
      setProgress(0);
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setProgress(i);
      }
      const updatedFiles = multiple ? [...files, ...newFiles] : newFiles;
      setFiles(updatedFiles);
      onChange == null ? void 0 : onChange(updatedFiles);
      setUploading(false);
      event.target.value = "";
    },
    [files, multiple, onChange]
  );
  const handleDelete = (fileId) => {
    const updatedFiles = files.filter((f) => f.id !== fileId);
    setFiles(updatedFiles);
    onChange == null ? void 0 : onChange(updatedFiles);
  };
  const handleDownload = (file) => {
    if (file.url) {
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.name;
      link.click();
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Box,
      {
        sx: {
          border: "2px dashed",
          borderColor: "divider",
          borderRadius: 1,
          p: 3,
          textAlign: "center",
          bgcolor: "background.default",
          mb: 2
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "file",
              id: "file-upload",
              multiple,
              accept,
              onChange: handleFileChange,
              style: { display: "none" },
              disabled: uploading || multiple && files.length >= maxFiles
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "file-upload", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              component: "span",
              variant: "outlined",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(CloudUpload, {}),
              disabled: uploading || multiple && files.length >= maxFiles,
              children: "选择文件"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 1 }, children: multiple ? `最多上传 ${maxFiles} 个文件` : "只能上传一个文件" }),
          uploading && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 2 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LinearProgress, { variant: "determinate", value: progress }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
              "上传中... ",
              progress,
              "%"
            ] })
          ] })
        ]
      }
    ),
    files.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(List, { dense: true, children: files.map((file) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      ListItem,
      {
        secondaryAction: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            IconButton,
            {
              size: "small",
              onClick: () => handleDownload(file),
              disabled: !file.url,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { fontSize: "small" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            IconButton,
            {
              size: "small",
              onClick: () => handleDelete(file.id),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" })
            }
          )
        ] }),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ListItemIcon, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(InsertDriveFile, { color: "primary" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            ListItemText,
            {
              primary: file.name,
              secondary: formatFileSize(file.size)
            }
          )
        ]
      },
      file.id
    )) })
  ] });
};
export {
  FileUpload as F
};
