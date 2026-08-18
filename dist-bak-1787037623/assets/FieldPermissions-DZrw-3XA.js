import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import "./index-CU2cqxc8.js";
import "./customerStore-BZF1KdNo.js";
import "./priceStore-DijJfeBL.js";
import "./salesPriceStore-cjxfIxIT.js";
import "./bomStore-Gzuh4wJM.js";
import "./productionStore-3WoghQIz.js";
import "./productionOperationStore-BOD4obub.js";
import "./financeExtensionStore-DxSjHPMg.js";
import "./productionVersionStore-RUhZ-sHu.js";
import "./subcontractStore-DEU0s8qw.js";
import "./equipmentStore-Be67EIyI.js";
import "./productionSchedulingStore-jeZjQvFy.js";
import "./vendorPerformanceStore-DSqs7hVk.js";
import "./vendorPortalStore-B2sPBeRr.js";
import "./dataDictStore-66NejlLO.js";
import "./numberingStore-BDs7p47y.js";
import "./warehouseMasterStore-BjZtdDuE.js";
import { f as useFieldPermissionStore } from "./reportPermissionStore-dkLqyfDv.js";
import "./salesAdvancedStore-BUVrzeLF.js";
import "./purchaseAdvancedStore-X5oSWK-7.js";
import "./warehouseAdvancedStore-D-kOSyQs.js";
import "./qualityAdvancedStore-Bdw6LGIv.js";
import "./materialExtensionStore-BnWp3IKN.js";
import "./purchaseInfoRecordStore-DLQisuuK.js";
import "./sourceListStore-DG1dXUIB.js";
import "./qualityExtensionStore-BDssWY5M.js";
import "./analyticsStore-DaEDsYjs.js";
import "./arapStore-Cccu0U7n.js";
import "./workbenchStore-COBsjc3d.js";
import "./conditionStore-DTiljowj.js";
import "./ecnStore-D8unIvA0.js";
import "./rebateStore-89dNxLDm.js";
import "./fmeaStore-CKbOOC47.js";
import { F as FIELD_MODE_LABELS } from "./platform-CGjfMiXI.js";
import { m as Box, T as Typography, aS as Paper, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, cN as Switch, aO as Chip } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./vendor-date-DI3D_gXa.js";
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
