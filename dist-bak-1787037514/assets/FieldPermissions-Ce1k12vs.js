import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import "./index-hTLNcGoC.js";
import "./customerStore-BnoPAbgi.js";
import "./priceStore-D4MzJqWs.js";
import "./salesPriceStore-BQbM-EvA.js";
import "./bomStore-CeDOOVVk.js";
import "./productionStore-B8YnWPVr.js";
import "./productionOperationStore-CgIZnQhb.js";
import "./financeExtensionStore-mnFIWL7o.js";
import "./productionVersionStore-DVtUQpzp.js";
import "./subcontractStore-1iUXGTXR.js";
import "./equipmentStore-CosVhg2a.js";
import "./productionSchedulingStore-Bp1AedW2.js";
import "./vendorPerformanceStore-C5Wb2oBo.js";
import "./vendorPortalStore-9Kht_MGK.js";
import "./dataDictStore-RUHQ7-st.js";
import "./numberingStore-BLNwdXfi.js";
import "./warehouseMasterStore-Lmmy-9XL.js";
import { f as useFieldPermissionStore } from "./reportPermissionStore-BsrP4O9H.js";
import "./salesAdvancedStore-I173FqHq.js";
import "./purchaseAdvancedStore-j0gpV4PI.js";
import "./warehouseAdvancedStore-DGJOwep4.js";
import "./qualityAdvancedStore-DzVT3ddD.js";
import "./materialExtensionStore-L3lHbzSm.js";
import "./purchaseInfoRecordStore-BlIKCtxc.js";
import "./sourceListStore-Z5_JkzNu.js";
import "./qualityExtensionStore-CpmmvoMW.js";
import "./analyticsStore-Ci4UuBPH.js";
import "./arapStore-BN8EGkkl.js";
import "./workbenchStore-vCZX2zeS.js";
import "./conditionStore-DfnsSgER.js";
import "./ecnStore-JtBcJJ-e.js";
import "./rebateStore-CMmNfEnQ.js";
import "./fmeaStore-DSfTzw2E.js";
import { F as FIELD_MODE_LABELS } from "./platform-CGjfMiXI.js";
import { m as Box, T as Typography, aS as Paper, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, cN as Switch, aO as Chip } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
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
