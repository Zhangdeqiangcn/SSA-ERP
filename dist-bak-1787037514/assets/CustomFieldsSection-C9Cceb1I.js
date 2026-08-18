import { j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { w as useCustomFields } from "./index-hTLNcGoC.js";
import { m as Box, n as Divider, T as Typography, bY as Grid, bv as TextField, cM as FormControlLabel, cN as Switch, aR as MenuItem } from "./vendor-mui-UhJuRAfR.js";
const CustomFieldsSection = ({
  entity,
  value = {},
  onChange,
  validate = false,
  onError
}) => {
  const defs = useCustomFields(entity);
  if (defs.length === 0) return null;
  const setVal = (key, v) => {
    onChange({ ...value, [key]: v });
  };
  let requiredError = null;
  if (validate) {
    for (const def of defs) {
      if (def.required) {
        const v = value[def.key];
        const empty = v === void 0 || v === null || v === "" || def.type === "checkbox" && v === false;
        if (empty) {
          requiredError = `「${def.label}」为必填项`;
          break;
        }
      }
    }
  }
  if (onError) onError(requiredError);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "自定义字段" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, children: defs.map((def) => {
      const v = value[def.key];
      switch (def.type) {
        case "number":
          return /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              type: "number",
              label: def.label,
              placeholder: def.placeholder,
              value: v ?? "",
              onChange: (e) => setVal(def.key, Number(e.target.value)),
              required: def.required
            }
          ) }, def.key);
        case "date":
          return /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              type: "date",
              label: def.label,
              InputLabelProps: { shrink: true },
              value: v ?? "",
              onChange: (e) => setVal(def.key, e.target.value),
              required: def.required
            }
          ) }, def.key);
        case "textarea":
          return /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              multiline: true,
              rows: 3,
              label: def.label,
              placeholder: def.placeholder,
              value: v ?? "",
              onChange: (e) => setVal(def.key, e.target.value),
              required: def.required
            }
          ) }, def.key);
        case "select":
          return /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              select: true,
              label: def.label,
              value: v ?? "",
              onChange: (e) => setVal(def.key, e.target.value),
              required: def.required,
              children: (def.options || []).map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: opt, children: opt }, opt))
            }
          ) }, def.key);
        case "checkbox":
          return /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            FormControlLabel,
            {
              control: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Switch,
                {
                  checked: !!v,
                  onChange: (e) => setVal(def.key, e.target.checked)
                }
              ),
              label: def.label
            }
          ) }, def.key);
        case "text":
        default:
          return /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              label: def.label,
              placeholder: def.placeholder,
              value: v ?? "",
              onChange: (e) => setVal(def.key, e.target.value),
              required: def.required
            }
          ) }, def.key);
      }
    }) })
  ] });
};
export {
  CustomFieldsSection as C
};
