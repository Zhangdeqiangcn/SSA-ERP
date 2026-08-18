import { j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
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
import { g as useI18nStore, t as translate, I as I18N_DICT } from "./reportPermissionStore-BsrP4O9H.js";
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
import { m as Box, T as Typography, aS as Paper, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, aO as Chip, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
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
