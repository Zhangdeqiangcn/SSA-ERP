import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, aP as Paper, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, d1 as Switch, aL as Chip } from "./vendor-46QZWBd3.js";
import "./index-CcOZBoQL.js";
import "./customerStore-IdYDDJRc.js";
import "./priceStore-BUzakAdL.js";
import "./salesPriceStore-BzUxjPzH.js";
import "./bomStore-VWzRK_BU.js";
import "./productionStore-D_DSIs05.js";
import "./productionOperationStore-ZzJ7_OWX.js";
import "./financeExtensionStore-DcH2weuS.js";
import "./productionVersionStore-D_-Ec9Z0.js";
import "./subcontractStore-CQ-ex-am.js";
import "./equipmentStore-D-RvzWch.js";
import "./productionSchedulingStore-BVkrPwFf.js";
import "./vendorPerformanceStore-BxbIBs-n.js";
import "./vendorPortalStore-d2uxDrSz.js";
import "./dataDictStore-B1uh9qqV.js";
import "./numberingStore-DnRDBnD9.js";
import "./warehouseMasterStore-Ct1rrWsm.js";
import { f as useFieldPermissionStore } from "./reportPermissionStore-BivOpSPb.js";
import "./salesAdvancedStore-CA71PkD6.js";
import "./purchaseAdvancedStore-DLlH_i-t.js";
import "./warehouseAdvancedStore-BrWnd5bC.js";
import "./qualityAdvancedStore-dxrXzSTj.js";
import "./materialExtensionStore-B0eAxQzZ.js";
import "./purchaseInfoRecordStore-nI3akWE2.js";
import "./sourceListStore-BhAGJqGB.js";
import "./qualityExtensionStore-BtbaFcCN.js";
import "./analyticsStore-SaeDm71F.js";
import "./arapStore-BYvdVu0r.js";
import "./workbenchStore-DCSKoEhL.js";
import "./conditionStore-BSext3Wu.js";
import "./ecnStore-DIX7gpta.js";
import "./rebateStore-C8MR-wRT.js";
import "./fmeaStore--YKtrk44.js";
import { F as FIELD_MODE_LABELS } from "./platform-CGjfMiXI.js";
import "./options-BINuI5Gr.js";
import "./vendorRating-DKHWnbxs.js";
const MODULES = ["material", "vendor", "purchase", "sales", "warehouse", "quality", "production", "finance"];
const MODULE_LABELS = {
  material: "物料",
  vendor: "供应商",
  purchase: "采购",
  sales: "销售",
  warehouse: "仓储",
  quality: "质量",
  production: "生产",
  finance: "财务"
};
const FIELD_MODES = ["visible", "readonly", "required", "mask"];
const MODE_COLORS = {
  visible: "success",
  readonly: "info",
  required: "warning",
  mask: "secondary"
};
const FieldPermissions = () => {
  const { moduleFields, setFieldVisible, setFieldMode } = useFieldPermissionStore();
  const [module, setModule] = reactExports.useState("material");
  const fields = moduleFields[module] ?? [];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, "data-testid": "field-permissions", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", sx: { mb: 2, fontWeight: 700 }, children: "字段级权限" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { mb: 2, color: "#64748B" }, children: "支持「显示 / 只读 / 必填 / 脱敏」四种字段模式。脱敏字段在业务列表（如销售订单）中以掩码呈现。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2, mb: 2, maxWidth: 320 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "业务模块" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Select,
        {
          "data-testid": "fp-module",
          value: module,
          label: "业务模块",
          onChange: (e) => setModule(e.target.value),
          children: MODULES.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: m, children: MODULE_LABELS[m] }, m))
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "字段" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "显示名" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "可见" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "权限模式" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
        fields.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 5, align: "center", sx: { color: "#94A3B8" }, children: "该模块暂未配置字段权限" }) }),
        fields.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": `fp-field-${f.field}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: f.field }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: f.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              "data-testid": `fp-switch-${f.field}`,
              checked: f.visible,
              onChange: (e) => setFieldVisible(module, f.field, e.target.checked)
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { size: "small", sx: { minWidth: 120 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              "data-testid": `fp-mode-${f.field}`,
              value: f.mode ?? "visible",
              onChange: (e) => setFieldMode(module, f.field, e.target.value),
              children: FIELD_MODES.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: m, children: FIELD_MODE_LABELS[m] }, m))
            }
          ) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              size: "small",
              "data-testid": `fp-chip-${f.field}`,
              label: !f.visible ? "隐藏" : FIELD_MODE_LABELS[f.mode ?? "visible"],
              color: !f.visible ? "default" : MODE_COLORS[f.mode ?? "visible"]
            }
          ) })
        ] }, f.field))
      ] })
    ] })
  ] });
};
export {
  FieldPermissions as default
};
