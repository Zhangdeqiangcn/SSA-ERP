import { j as jsxRuntimeExports, B as Box, h as Typography, aP as Paper, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, aL as Chip, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody } from "./vendor-46QZWBd3.js";
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
import { g as useI18nStore, t as translate, I as I18N_DICT } from "./reportPermissionStore-BivOpSPb.js";
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
