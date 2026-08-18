import { j as jsxRuntimeExports, B as Box, h as Typography, aP as Paper, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, aL as Chip, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody } from "./vendor-DGU5TO-x.js";
import "./index-DeeqqmHA.js";
import "./customerStore-D75PJy1n.js";
import "./priceStore-CduvTkzQ.js";
import "./salesPriceStore-C1lbTZ_V.js";
import "./bomStore-CxaOFNQN.js";
import "./productionStore-Bdmg7HTu.js";
import "./productionOperationStore-ByOb08ia.js";
import "./financeExtensionStore-DC0IEDMi.js";
import "./productionVersionStore-C21otdJB.js";
import "./subcontractStore-BexFn7Un.js";
import "./equipmentStore-CrhJcIrI.js";
import "./productionSchedulingStore-DTA-q4iJ.js";
import "./vendorPerformanceStore-GquLJMJn.js";
import "./vendorPortalStore-Cnq134KH.js";
import "./dataDictStore-CtoXLbZz.js";
import "./numberingStore-CLVDn2Au.js";
import "./warehouseMasterStore-C3VWShZa.js";
import { g as useI18nStore, t as translate, I as I18N_DICT } from "./reportPermissionStore-CXyepbWY.js";
import "./salesAdvancedStore-CXmEdniM.js";
import "./purchaseAdvancedStore-C5npzY_b.js";
import "./warehouseAdvancedStore-DXjc0JQH.js";
import "./qualityAdvancedStore-Btlaa4xT.js";
import "./materialExtensionStore-BHkusB9L.js";
import "./purchaseInfoRecordStore-C2W723zd.js";
import "./sourceListStore-BT5zvRN_.js";
import "./qualityExtensionStore-CoUA1fWj.js";
import "./analyticsStore-DJYS74NQ.js";
import "./arapStore-CxlnIECw.js";
import "./workbenchStore-DcLy2Z4C.js";
import "./conditionStore-D-IHrlNs.js";
import "./ecnStore-CzTUK1H2.js";
import "./rebateStore-DO7GHeV5.js";
import "./fmeaStore-B4RTvukf.js";
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
