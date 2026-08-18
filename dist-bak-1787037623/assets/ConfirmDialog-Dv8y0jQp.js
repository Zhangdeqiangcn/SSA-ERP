import { j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { b9 as Dialog, ba as DialogTitle, bc as DialogContent, dj as DialogContentText, bE as DialogActions, bm as Button, dk as Help, d1 as Info, dl as Error, bO as Warning } from "./vendor-mui-DsZGB15g.js";
const typeConfig = {
  warning: {
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, { color: "warning" }),
    confirmColor: "warning"
  },
  danger: {
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Error, { color: "error" }),
    confirmColor: "error"
  },
  info: {
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { color: "info" }),
    confirmColor: "primary"
  },
  confirm: {
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Help, { color: "primary" }),
    confirmColor: "primary"
  }
};
const ConfirmDialog = ({
  open,
  title = "确认操作",
  content,
  confirmText = "确定",
  cancelText = "取消",
  type = "confirm",
  onConfirm,
  onCancel,
  loading = false
}) => {
  const config = typeConfig[type];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Dialog,
    {
      open,
      onClose: onCancel,
      maxWidth: "sm",
      fullWidth: true,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
          config.icon,
          title
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContentText, { children: content }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onCancel, disabled: loading, children: cancelText }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              onClick: onConfirm,
              variant: "contained",
              color: config.confirmColor,
              disabled: loading,
              children: confirmText
            }
          )
        ] })
      ]
    }
  );
};
export {
  ConfirmDialog as C
};
