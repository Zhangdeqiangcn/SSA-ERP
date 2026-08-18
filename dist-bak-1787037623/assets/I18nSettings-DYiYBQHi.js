import { j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
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
import { g as useI18nStore, t as translate, I as I18N_DICT } from "./reportPermissionStore-dkLqyfDv.js";
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
import { m as Box, T as Typography, aS as Paper, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, aO as Chip, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./vendor-date-DI3D_gXa.js";
import "./options-BINuI5Gr.js";
import "./vendorRating-DKHWnbxs.js";
const I18nSettings = () => {
  const { locale, setLocale } = useI18nStore();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, "data-testid": "i18n", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", sx: { mb: 2, fontWeight: 700 }, children: "多语言 (i18n)" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2, mb: 2, maxWidth: 320 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "界面语言" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Select,
        {
          "data-testid": "i18n-locale",
          value: locale,
          label: "界面语言",
          onChange: (e) => setLocale(e.target.value),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "zh-CN", children: "简体中文" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "en-US", children: "English (US)" })
          ]
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#64748B" }, children: "实时翻译预览（导航·OA流程定制）" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { "data-testid": "i18n-demo", variant: "h6", sx: { mt: 1 }, children: translate("nav.platform") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", sx: { mt: 1 }, label: `当前语言：${locale}`, color: "primary" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", sx: { mb: 1 }, children: "字典预览" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "Key" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "简体中文" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "English" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: Object.keys(I18N_DICT).map((k) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "i18n-dict-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: k }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: I18N_DICT[k]["zh-CN"] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: I18N_DICT[k]["en-US"] })
      ] }, k)) })
    ] })
  ] });
};
export {
  I18nSettings as default
};
