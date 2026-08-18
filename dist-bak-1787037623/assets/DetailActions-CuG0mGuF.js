import { j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { P as PrintPreviewButton } from "./PrintPreviewButton-DAktPrxC.js";
import { bL as Stack, bm as Button, bZ as ArrowBack, bi as Edit, be as Delete } from "./vendor-mui-DsZGB15g.js";
const DetailActions = ({
  entity,
  record,
  onBack,
  backText = "返回",
  onEdit,
  onDelete,
  extra = [],
  printable = true,
  printOnlyOne = false,
  size = "small",
  variant = "outlined",
  sx,
  spacing = 1
}) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing, sx, "data-testid": "detail-actions", "data-entity": entity, children: [
    onBack && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        variant,
        size,
        startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}),
        onClick: onBack,
        "data-testid": `detail-action-back-${entity}`,
        children: backText
      }
    ),
    onEdit && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        variant,
        size,
        startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, {}),
        onClick: onEdit,
        "data-testid": `detail-action-edit-${entity}`,
        children: "编辑"
      }
    ),
    extra.map((act) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        variant,
        size,
        startIcon: act.icon,
        onClick: act.onClick,
        color: act.color ?? "inherit",
        disabled: act.disabled,
        "data-testid": `detail-action-${act.key}-${entity}`,
        children: act.label
      },
      act.key
    )),
    onDelete && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        variant,
        size,
        color: "error",
        startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, {}),
        onClick: onDelete,
        "data-testid": `detail-action-delete-${entity}`,
        children: "删除"
      }
    ),
    printable && /* @__PURE__ */ jsxRuntimeExports.jsx(
      PrintPreviewButton,
      {
        entity,
        record,
        showBoth: !printOnlyOne,
        size,
        variant
      }
    )
  ] });
};
export {
  DetailActions as D
};
