import { j as jsxRuntimeExports, B as Box, bK as Stack, bk as Button, bf as Add } from "./vendor-DGU5TO-x.js";
const ActionBar = ({
  primary,
  secondaries = [],
  children
}) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
      primary && /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "contained",
          startIcon: primary.icon || /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}),
          onClick: primary.onClick,
          children: primary.label
        }
      ),
      secondaries.map((action, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: action.variant || "outlined",
          onClick: action.onClick,
          children: action.label
        },
        index
      ))
    ] }),
    children
  ] });
};
export {
  ActionBar as A
};
