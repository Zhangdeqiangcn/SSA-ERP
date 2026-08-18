import { j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { m as Box, bL as Stack, bm as Button, bh as Add } from "./vendor-mui-UhJuRAfR.js";
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
