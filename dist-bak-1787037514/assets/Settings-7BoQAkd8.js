import { j as jsxRuntimeExports, r as reactExports, R as React, h as useNavigate } from "./vendor-react-Cc0tBtdY.js";
import { j as useSettingsStore, B as useApprovalFlowStore, q as useUserStore, C as getEffectiveSteps, E as ROLE_DEFINITIONS, F as CONDITION_FIELDS, O as OPERATOR_LABELS, a as useVendorStore, u as useMaterialStore, c as useWarehouseStore, g as useOrgStore, k as useCustomFieldStore, G as CUSTOM_FIELD_ENTITY_LABELS, H as CUSTOM_FIELD_TYPE_LABELS, I as makeFieldKey, x as usePrintTemplateStore, J as PRINT_ENTITY_LABELS, P as PRINT_FIELD_CATALOG, K as DEFAULT_MATERIAL_BUY_STEPS, L as DEFAULT_MATERIAL_MAKE_STEPS, R as ROLE_NAMES, M as useDisplayStore, N as PRIMARY_OPTIONS, Q as DENSITY_OPTIONS, S as FONT_SIZE_OPTIONS, T as useDataPermissionStore, U as useCurrentOrg, s as currentUser, V as useSessionStore, b as usePurchaseStore, e as useSalesStore, d as useQualityStore, f as useFinanceStore, h as useAuthStore } from "./index-hTLNcGoC.js";
import { u as useDataDictStore, D as DATA_DICT_LABELS } from "./dataDictStore-RUHQ7-st.js";
import { m as Box, T as Typography, bY as Grid, aS as Paper, bv as TextField, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, bl as Alert, bL as Stack, bm as Button, c8 as TrendingUp, bg as Refresh, bd as Save, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aM as IconButton, dO as KeyboardArrowUp, dP as KeyboardArrowDown, aO as Chip, cN as Switch, dH as PlayArrow, dQ as Stop, dR as ToggleButtonGroup, dS as ToggleButton, bi as Edit, b$ as ArrowForward, p as Tooltip, b9 as Dialog, ba as DialogTitle, aV as CloseIcon, bc as DialogContent, by as Accordion, bz as AccordionSummary, be as Delete, x as ExpandMore, bA as AccordionDetails, cM as FormControlLabel, ae as Person, n as Divider, aa as Rule, bh as Add, bE as DialogActions, df as ContentCopy, cC as Autocomplete, ck as RestartAlt, Z as SwapHoriz, cJ as Snackbar, dT as Sync, dU as LinkOff, a9 as Warehouse, X as LocalShipping, bW as CheckCircle, aH as AccountBalance, dV as CloudQueue, as as Hub, az as PrecisionManufacturing, Q as OpenInNew, dW as PhoneAndroid, a4 as QrCode2, L as List, q as ListItem, t as ListItemIcon, Y as Description, w as ListItemText, J as Inventory2, a6 as PlaylistAddCheck, dX as CameraAlt, dY as Bolt, dZ as Replay, r as ListItemButton, v as Badge, ab as AccountTree, d_ as ViewList, E as ExpandLess, cn as RadioButtonUnchecked, dz as ArrowUpward, dA as ArrowDownward, d$ as Tune, bf as Print, cX as Checkbox, u as useTheme, e0 as LightMode, e1 as DarkMode, b4 as Avatar, i as alpha, a8 as Schedule, bQ as InputAdornment, aG as Lock, ac as Storefront, e2 as Casino, e3 as ButtonGroup, bS as Visibility, bK as Business, e4 as OutlinedInput, e5 as Calculate, e6 as Storage, bq as History, e7 as DeleteSweep, d0 as Download, dd as Upload, br as DeleteOutline, bs as Card, bt as CardContent, dj as DialogContentText, e8 as AlertTitle, e9 as Key, ea as Http, bn as CircularProgress, b0 as ErrorOutline, aT as Search, db as ChevronRight, R as People, d2 as Security, V as Assignment, a2 as VerifiedUser, ar as Route, F as FactCheck, eb as StarRate, aN as MenuIcon, aZ as Notifications, ec as Translate, ed as Palette, _ as CartIcon, ee as Api, ef as Code, eg as Backup, aB as MenuBook, b3 as HelpOutline, d3 as PersonAdd, y as Collapse } from "./vendor-mui-UhJuRAfR.js";
import { u as useOrderTemplateStore, a as useUnitConversionStore, c as convertUnit } from "./reportPermissionStore-BsrP4O9H.js";
import { P as PrintPreview } from "./PrintPreview-Dx9G1wxr.js";
import { u as useNumberingStore, D as DOC_TYPES } from "./numberingStore-BLNwdXfi.js";
import { u as useSalesPriceStore, a as useAuditStore, A as AUDIT_ACTION_LABELS } from "./salesPriceStore-BQbM-EvA.js";
import { u as useCustomerStore } from "./customerStore-BnoPAbgi.js";
import { f as formatCurrency } from "./format-BXPn3erM.js";
import { u as useConditionStore } from "./conditionStore-DfnsSgER.js";
import { u as usePurchaseInfoRecordStore } from "./purchaseInfoRecordStore-BlIKCtxc.js";
import { u as useSourceListStore } from "./sourceListStore-Z5_JkzNu.js";
import { u as useSalesContractStore } from "./salesContractStore-Cx1nh7u6.js";
import { u as useFMEAStore } from "./fmeaStore-DSfTzw2E.js";
import "./qualityAdvancedStore-DzVT3ddD.js";
import { u as useProductionStore } from "./productionStore-B8YnWPVr.js";
import { u as useBOMStore } from "./bomStore-CeDOOVVk.js";
import { u as useArapStore } from "./arapStore-BN8EGkkl.js";
import { u as usePriceStore } from "./priceStore-D4MzJqWs.js";
import LowCodeDesigner from "./LowCodeDesigner-B5-ArEna.js";
import WorkflowEngine from "./WorkflowEngine-C_Z0K2xj.js";
import IntegrationHub from "./IntegrationHub-BGf0Xl1y.js";
import FieldPermissions from "./FieldPermissions-Ce1k12vs.js";
import I18nSettings from "./I18nSettings-CbJi_bt6.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
import "./options-BINuI5Gr.js";
import "./warehouseAdvancedStore-DGJOwep4.js";
import "./vendorRating-DKHWnbxs.js";
import "./productionOperationStore-CgIZnQhb.js";
import "./financeExtensionStore-mnFIWL7o.js";
import "./productionVersionStore-DVtUQpzp.js";
import "./subcontractStore-1iUXGTXR.js";
import "./equipmentStore-CosVhg2a.js";
import "./productionSchedulingStore-Bp1AedW2.js";
import "./vendorPerformanceStore-C5Wb2oBo.js";
import "./vendorPortalStore-9Kht_MGK.js";
import "./warehouseMasterStore-Lmmy-9XL.js";
import "./salesAdvancedStore-I173FqHq.js";
import "./purchaseAdvancedStore-j0gpV4PI.js";
import "./materialExtensionStore-L3lHbzSm.js";
import "./qualityExtensionStore-CpmmvoMW.js";
import "./analyticsStore-Ci4UuBPH.js";
import "./workbenchStore-vCZX2zeS.js";
import "./ecnStore-JtBcJJ-e.js";
import "./rebateStore-CMmNfEnQ.js";
import "./platform-CGjfMiXI.js";
const APP_VERSION = "2.56.0";
const APP_VERSION_LABEL = "V2.56";
const BasicConfigTab = () => {
  const currencies = useDataDictStore((s) => s.currencies);
  const languages = useDataDictStore((s) => s.languages);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600, color: "#1E293B", mb: 3 }, children: "基础配置" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2.5, borderRadius: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 1, children: "系统信息" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: "column", gap: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { label: "系统名称", defaultValue: "SSA ERP 企业资源管理平台", fullWidth: true, size: "small" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { label: "系统版本", value: `${APP_VERSION_LABEL}（${APP_VERSION}）`, fullWidth: true, size: "small", disabled: true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { label: "企业名称", defaultValue: "SSA Corporation", fullWidth: true, size: "small" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { label: "统一社会信用代码", defaultValue: "91110000XXXXXXXX10", fullWidth: true, size: "small" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2.5, borderRadius: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 1, children: "区域与格式" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: "column", gap: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "时区" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { defaultValue: "Asia/Shanghai", label: "时区", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "Asia/Shanghai", children: "中国标准时间 (UTC+8)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "Asia/Tokyo", children: "日本标准时间 (UTC+9)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "UTC", children: "协调世界时 (UTC)" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "默认货币" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { defaultValue: "人民币 (CNY)", label: "默认货币", children: currencies.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: c, children: c }, i)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "默认语言" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { defaultValue: "简体中文", label: "默认语言", children: languages.map((l, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: l, children: l }, i)) })
          ] })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mt: 3, borderRadius: 2 }, children: "货币、语言、计量单位、付款方式、贸易条款等下拉选项现已统一在「数据字典」中维护， 修改后各业务表单将自动同步，无需在本页重复配置。" })
  ] });
};
const defaultMenu = [
  { id: "dashboard", label: "仪表盘", group: "首页", path: "/", frequency: 156, visible: true, order: 1 },
  { id: "material-cat", label: "物料分类", group: "主数据", path: "/material/categories", frequency: 42, visible: true, order: 2 },
  { id: "material-list", label: "物料列表", group: "主数据", path: "/material/list", frequency: 89, visible: true, order: 3 },
  { id: "vendor-list", label: "供应商列表", group: "主数据", path: "/vendor/list", frequency: 67, visible: true, order: 6 },
  { id: "vendor-approval", label: "注册审批", group: "主数据", path: "/vendor/approvals", frequency: 34, visible: true, order: 7 },
  { id: "vendor-blacklist", label: "黑名单", group: "主数据", path: "/vendor/blacklist", frequency: 8, visible: true, order: 8 },
  { id: "vendor-rating", label: "评级管理", group: "主数据", path: "/vendor/rating", frequency: 19, visible: true, order: 9 },
  { id: "purchase-request", label: "采购申请", group: "供应链", path: "/purchase/requests", frequency: 112, visible: true, order: 10 },
  { id: "purchase-order", label: "采购订单", group: "供应链", path: "/purchase/orders", frequency: 98, visible: true, order: 11 },
  { id: "purchase-track", label: "交期跟踪", group: "供应链", path: "/purchase/track", frequency: 45, visible: true, order: 12 },
  { id: "price-inquiry", label: "询价单", group: "供应链", path: "/price/inquiry", frequency: 38, visible: true, order: 13 },
  { id: "price-compare", label: "比价单", group: "供应链", path: "/price/comparisons", frequency: 26, visible: true, order: 14 },
  { id: "price-approval", label: "价格审批", group: "供应链", path: "/price/approvals", frequency: 22, visible: true, order: 15 },
  { id: "price-list", label: "价目表", group: "供应链", path: "/price/list", frequency: 52, visible: true, order: 16 },
  { id: "wh-inspection", label: "报检单", group: "供应链", path: "/warehouse/inspection-notice", frequency: 41, visible: true, order: 17 },
  { id: "wh-inbound", label: "采购入库", group: "供应链", path: "/warehouse/inbound", frequency: 87, visible: true, order: 18 },
  { id: "wh-fg-inbound", label: "成品入库", group: "供应链", path: "/warehouse/fg-inbound", frequency: 63, visible: true, order: 19 },
  { id: "wh-outbound", label: "出库管理", group: "供应链", path: "/warehouse/outbound", frequency: 76, visible: true, order: 20 },
  { id: "wh-check", label: "库存盘点", group: "供应链", path: "/warehouse/check", frequency: 31, visible: true, order: 21 },
  { id: "wh-inventory", label: "库存查询", group: "供应链", path: "/warehouse/inventory", frequency: 55, visible: true, order: 22 },
  { id: "sales-prospect", label: "意向客户", group: "销售管理", path: "/sales/prospects", frequency: 44, visible: true, order: 23 },
  { id: "sales-customer", label: "客户主数据", group: "销售管理", path: "/sales/customers", frequency: 40, visible: true, order: 23.5 },
  { id: "sales-order", label: "销售订单", group: "销售管理", path: "/sales/orders", frequency: 91, visible: true, order: 24 },
  { id: "sales-logistics", label: "物流发货", group: "销售管理", path: "/sales/logistics", frequency: 37, visible: true, order: 25 },
  { id: "sales-analysis", label: "市场分析", group: "销售管理", path: "/sales/analysis", frequency: 18, visible: true, order: 26 },
  { id: "sales-project", label: "项目管理", group: "销售管理", path: "/sales/projects", frequency: 29, visible: true, order: 27 },
  { id: "quality-inspection", label: "检验任务", group: "生产与质量", path: "/quality/inspection", frequency: 78, visible: true, order: 28 },
  { id: "quality-standards", label: "检验标准", group: "生产与质量", path: "/quality/standards", frequency: 23, visible: true, order: 29 },
  { id: "quality-unqual", label: "不合格品", group: "生产与质量", path: "/quality/unqualified", frequency: 47, visible: true, order: 30 },
  { id: "quality-pdca", label: "PDCA改进", group: "生产与质量", path: "/quality/pdca", frequency: 14, visible: true, order: 31 },
  { id: "quality-report", label: "质量报表", group: "生产与质量", path: "/quality/report", frequency: 21, visible: true, order: 32 },
  { id: "bom-list", label: "BOM列表", group: "生产与质量", path: "/bom/list", frequency: 36, visible: true, order: 33 },
  { id: "bom-cost", label: "成本卷积", group: "生产与质量", path: "/bom/cost-rollup", frequency: 16, visible: true, order: 34 },
  { id: "prod-order", label: "工单管理", group: "生产与质量", path: "/production/orders", frequency: 73, visible: true, order: 35 },
  { id: "prod-route", label: "工艺路线", group: "生产与质量", path: "/production/routes", frequency: 25, visible: true, order: 36 },
  { id: "prod-mrp", label: "MRP计划", group: "生产与质量", path: "/production/mrp", frequency: 33, visible: true, order: 37 },
  { id: "prod-report", label: "生产报表", group: "生产与质量", path: "/production/report", frequency: 20, visible: true, order: 38 },
  { id: "fin-invoice", label: "发票管理", group: "财务与报表", path: "/finance/invoices", frequency: 58, visible: true, order: 39 },
  { id: "fin-payment", label: "付款计划", group: "财务与报表", path: "/finance/payments", frequency: 39, visible: true, order: 40 },
  { id: "fin-entries", label: "会计分录", group: "财务与报表", path: "/finance/entries", frequency: 27, visible: true, order: 41 },
  { id: "fin-trial", label: "科目余额表", group: "财务与报表", path: "/finance/trial-balance", frequency: 12, visible: true, order: 42 },
  { id: "fin-report", label: "财务报表", group: "财务与报表", path: "/finance/report", frequency: 24, visible: true, order: 43 },
  { id: "fin-tax", label: "税务核算", group: "财务与报表", path: "/finance/tax", frequency: 17, visible: true, order: 44 },
  { id: "fin-project", label: "项目核算", group: "财务与报表", path: "/finance/project-accounting", frequency: 13, visible: true, order: 45 },
  { id: "reports", label: "报表中心", group: "财务与报表", path: "/reports", frequency: 35, visible: true, order: 46 },
  { id: "settings", label: "系统设置", group: "系统", path: "/settings", frequency: 22, visible: true, order: 47 },
  { id: "vendor-portal", label: "供应商门户", group: "系统", path: "/vendor-portal/login", frequency: 30, visible: true, order: 48 }
];
const MenuConfigTab = () => {
  const menuConfig = useSettingsStore((s) => s.menuConfig);
  const setMenuConfig = useSettingsStore((s) => s.setMenuConfig);
  reactExports.useEffect(() => {
    if (!menuConfig.order || Object.keys(menuConfig.order).length === 0) {
      const order = {};
      const visible = {};
      defaultMenu.forEach((m, i) => {
        order[m.path] = i + 1;
        visible[m.path] = true;
      });
      setMenuConfig({ order, visible });
    }
  }, []);
  const [menu, setMenu] = reactExports.useState(() => {
    const order = menuConfig.order || {};
    const visible = menuConfig.visible || {};
    return [...defaultMenu].map((m) => ({ ...m, visible: visible[m.path] ?? m.visible })).sort((a, b) => (order[a.path] ?? a.order) - (order[b.path] ?? b.order));
  });
  const [sortByFreq, setSortByFreq] = reactExports.useState(false);
  const sortedMenu = reactExports.useMemo(() => {
    if (sortByFreq) {
      return [...menu].sort((a, b) => b.frequency - a.frequency);
    }
    return menu;
  }, [menu, sortByFreq]);
  const groups = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    sortedMenu.forEach((m) => {
      if (!map.has(m.group)) map.set(m.group, []);
      map.get(m.group).push(m);
    });
    return Array.from(map.entries());
  }, [sortedMenu]);
  const moveItem = (id, direction) => {
    setMenu((prev) => {
      const arr = [...prev];
      const idx = arr.findIndex((m) => m.id === id);
      if (idx < 0) return arr;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= arr.length) return arr;
      [arr[idx], arr[targetIdx]] = [arr[targetIdx], arr[idx]];
      return arr;
    });
  };
  const toggleVisible = (id) => {
    setMenu((prev) => prev.map((m) => m.id === id ? { ...m, visible: !m.visible } : m));
  };
  const handleSave = () => {
    const orderMap = {};
    const visibleMap = {};
    menu.forEach((m, i) => {
      orderMap[m.path] = i + 1;
      visibleMap[m.path] = m.visible;
    });
    setMenuConfig({ order: orderMap, visible: visibleMap });
  };
  const handleSortByFreq = () => {
    if (!sortByFreq) {
      setMenu((prev) => [...prev].sort((a, b) => b.frequency - a.frequency));
    }
    setSortByFreq(!sortByFreq);
  };
  const handleReset = () => {
    const orderMap = {};
    const visibleMap = {};
    defaultMenu.forEach((m, i) => {
      orderMap[m.path] = i + 1;
      visibleMap[m.path] = true;
    });
    setMenuConfig({ order: orderMap, visible: visibleMap });
    setMenu(defaultMenu);
    setSortByFreq(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600, color: "#1E293B" }, children: "菜单配置" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "small",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {}),
            variant: sortByFreq ? "contained" : "outlined",
            onClick: handleSortByFreq,
            children: sortByFreq ? "频率排序已启" : "按使用频率排序"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Refresh, {}), variant: "outlined", onClick: handleReset, children: "恢复默认" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleSave, children: "保存排序" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2, borderRadius: 2, fontSize: "0.8125rem" }, children: "拖拽调整菜单顺序：使用 ↑↓ 按钮上下移动。隐藏不需要的菜单项。点击「按使用频率排序」可自动按访问频次重排。 保存后刷新页面即可在侧边栏看到新的菜单顺序。" }),
    groups.map(([groupName, items]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { mb: 2, borderRadius: 2, overflow: "hidden" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { px: 2, py: 1, bgcolor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 700, sx: { color: "#475569" }, children: groupName }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, fontSize: "0.75rem", width: 40 }, children: "排序" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, fontSize: "0.75rem" }, children: "菜单项" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, fontSize: "0.75rem", width: 120 }, children: "路由" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, fontSize: "0.75rem", width: 80, textAlign: "center" }, children: "访问频率" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, fontSize: "0.75rem", width: 60, textAlign: "center" }, children: "可见" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: items.map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, sx: { opacity: item.visible ? 1 : 0.4 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: "column", alignItems: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              IconButton,
              {
                size: "small",
                onClick: () => moveItem(item.id, "up"),
                disabled: idx === 0 || sortByFreq,
                sx: { p: 0 },
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(KeyboardArrowUp, { fontSize: "small" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              IconButton,
              {
                size: "small",
                onClick: () => moveItem(item.id, "down"),
                disabled: idx === items.length - 1 || sortByFreq,
                sx: { p: 0 },
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(KeyboardArrowDown, { fontSize: "small" })
              }
            )
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: item.label }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { fontFamily: "monospace", fontSize: "0.7rem" }, children: item.path }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: `${item.frequency}次`,
              size: "small",
              color: item.frequency >= 80 ? "error" : item.frequency >= 40 ? "warning" : "default",
              variant: "outlined",
              sx: { fontSize: "0.7rem", height: 20 }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { size: "small", checked: item.visible, onChange: () => toggleVisible(item.id) }) })
        ] }, item.id)) })
      ] }) })
    ] }, groupName))
  ] });
};
const APPROVER_TYPES = [
  { value: "role", label: "角色" },
  { value: "position", label: "职位" },
  { value: "supervisor", label: "发起人上级" },
  { value: "dept_head", label: "部门负责人" },
  { value: "specific_user", label: "指定用户" }
];
const MODES = [
  { value: "serial", label: "串签" },
  { value: "parallel", label: "并签" },
  { value: "or", label: "或签" }
];
const NUM_OPERATORS = [">", ">=", "<", "<=", "==", "!="];
const STR_OPERATORS = ["==", "!=", "in", "not_in"];
const approverTypeLabel = (t) => {
  var _a;
  return ((_a = APPROVER_TYPES.find((x) => x.value === t)) == null ? void 0 : _a.label) ?? "角色";
};
const modeLabel = (m) => {
  var _a;
  return ((_a = MODES.find((x) => x.value === m)) == null ? void 0 : _a.label) ?? "串签";
};
const modeColor = (m) => m === "parallel" ? "primary" : m === "or" ? "success" : "default";
const summarizeGroup = (g) => {
  if (!g || g.conditions.length === 0) return "无条件";
  const joiner = g.logic === "and" ? " 且 " : " 或 ";
  return g.conditions.map((c) => {
    const meta = CONDITION_FIELDS.find((f) => f.key === c.field);
    return `${(meta == null ? void 0 : meta.label) ?? c.field}${OPERATOR_LABELS[c.operator]}${c.value}`;
  }).join(joiner);
};
const ConditionGroupEditor = ({ group, onChange, showLogic = true }) => {
  const setLogic = (logic) => onChange({ ...group, logic });
  const updateCond = (idx, cond) => onChange({ ...group, conditions: group.conditions.map((c, i) => i === idx ? cond : c) });
  const addCond = () => onChange({
    ...group,
    conditions: [...group.conditions, { field: CONDITION_FIELDS[0].key, operator: ">", value: "" }]
  });
  const removeCond = (idx) => onChange({ ...group, conditions: group.conditions.filter((_, i) => i !== idx) });
  const opsFor = (fieldKey) => {
    const meta = CONDITION_FIELDS.find((f) => f.key === fieldKey);
    return (meta == null ? void 0 : meta.type) === "number" ? NUM_OPERATORS : STR_OPERATORS;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    showLogic && group.conditions.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      ToggleButtonGroup,
      {
        size: "small",
        exclusive: true,
        value: group.logic,
        onChange: (_, v) => v && setLogic(v),
        sx: { mb: 1 },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ToggleButton, { value: "and", children: "并且 (AND)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ToggleButton, { value: "or", children: "或者 (OR)" })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 1, children: group.conditions.map((cond, idx) => {
      var _a;
      const meta = CONDITION_FIELDS.find((f) => f.key === cond.field);
      const operators = opsFor(cond.field);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { minWidth: 110 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "字段" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              label: "字段",
              value: cond.field,
              onChange: (e) => updateCond(idx, {
                field: e.target.value,
                operator: ">",
                value: ""
              }),
              children: CONDITION_FIELDS.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: f.key, children: f.label }, f.key))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { minWidth: 100 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "运算符" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              label: "运算符",
              value: cond.operator,
              onChange: (e) => updateCond(idx, { ...cond, operator: e.target.value }),
              children: operators.map((op) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: op, children: OPERATOR_LABELS[op] }, op))
            }
          )
        ] }),
        (meta == null ? void 0 : meta.type) === "enum" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { minWidth: 140 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "值" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              label: "值",
              value: String(cond.value),
              onChange: (e) => updateCond(idx, { ...cond, value: e.target.value }),
              children: (_a = meta.options) == null ? void 0 : _a.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o, children: o }, o))
            }
          )
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            size: "small",
            type: (meta == null ? void 0 : meta.type) === "number" ? "number" : "text",
            label: `值${(meta == null ? void 0 : meta.unit) ? `(${meta.unit})` : ""}`,
            value: cond.value,
            onChange: (e) => updateCond(idx, {
              ...cond,
              value: (meta == null ? void 0 : meta.type) === "number" ? e.target.value === "" ? "" : Number(e.target.value) : e.target.value
            }),
            sx: { minWidth: 120 }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => removeCond(idx), disabled: group.conditions.length === 1, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) })
      ] }, idx);
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), sx: { mt: 1 }, onClick: addCond, children: "添加条件" })
  ] });
};
const ApprovalFlowTab = () => {
  const flows = useApprovalFlowStore((s) => s.flows);
  const setFlows = useApprovalFlowStore((s) => s.setFlows);
  const resetFlows = useApprovalFlowStore((s) => s.resetFlows);
  const users = useUserStore((s) => s.users);
  const userMap = React.useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u.name])),
    [users]
  );
  const [editFlow, setEditFlow] = reactExports.useState(null);
  const [dialogOpen, setDialogOpen] = reactExports.useState(false);
  const [expanded, setExpanded] = reactExports.useState(false);
  const handleToggleFlow = (flowId) => {
    setFlows(flows.map((f) => f.id === flowId ? { ...f, enabled: !f.enabled } : f));
  };
  const handleProfileChange = (flowId, profile) => {
    setFlows(flows.map((f) => f.id === flowId ? { ...f, profile } : f));
  };
  const handleEditFlow = (flow) => {
    var _a;
    setEditFlow({ ...flow, nodes: flow.nodes.map((n) => ({ ...n })) });
    setExpanded(((_a = flow.nodes[0]) == null ? void 0 : _a.id) ?? false);
    setDialogOpen(true);
  };
  const handleSaveFlow = () => {
    if (!editFlow) return;
    setFlows(flows.map((f) => f.id === editFlow.id ? editFlow : f));
    setDialogOpen(false);
    setEditFlow(null);
  };
  const handleReset = () => {
    resetFlows();
    setEditFlow(null);
  };
  const updateNode = (nodeId, patch) => {
    if (!editFlow) return;
    setEditFlow({
      ...editFlow,
      nodes: editFlow.nodes.map((n) => n.id === nodeId ? { ...n, ...patch } : n)
    });
  };
  const handleAddNode = () => {
    if (!editFlow) return;
    const newNode = {
      id: `${editFlow.module}-${Date.now()}`,
      name: "新审批节点",
      role: "buyer",
      roleName: "采购员",
      order: editFlow.nodes.length + 1,
      approverType: "role",
      mode: "serial",
      conditions: { logic: "and", conditions: [] },
      timeout: 24
    };
    setEditFlow({ ...editFlow, nodes: [...editFlow.nodes, newNode] });
    setExpanded(newNode.id);
  };
  const handleRemoveNode = (nodeId) => {
    if (!editFlow) return;
    setEditFlow({
      ...editFlow,
      nodes: editFlow.nodes.filter((n) => n.id !== nodeId).map((n, i) => ({ ...n, order: i + 1 }))
    });
  };
  const onApproverTypeChange = (node, value) => {
    var _a, _b;
    const patch = { approverType: value };
    if (value === "role" || value === "position") {
      const role = node.role || "buyer";
      patch.approverUserIds = void 0;
      patch.role = role;
      patch.roleName = ((_a = ROLE_DEFINITIONS.find((r) => r.id === role)) == null ? void 0 : _a.name) || role;
    } else if (value === "supervisor") {
      patch.role = "supervisor";
      patch.roleName = "发起人上级";
      patch.approverUserIds = void 0;
    } else if (value === "dept_head") {
      patch.role = "dept_head";
      patch.roleName = "部门负责人";
      patch.approverUserIds = void 0;
    } else if (value === "specific_user") {
      patch.approverUserIds = node.approverUserIds && node.approverUserIds.length ? node.approverUserIds : [];
      patch.roleName = ((_b = node.approverUserIds) == null ? void 0 : _b.map((id) => userMap[id] || id).join("、")) || "";
    }
    updateNode(node.id, patch);
  };
  const onRoleChange = (nodeId, value) => {
    var _a;
    const roleName = ((_a = ROLE_DEFINITIONS.find((r) => r.id === value)) == null ? void 0 : _a.name) || value;
    updateNode(nodeId, { role: value, roleName });
  };
  const onUserIdsChange = (nodeId, ids) => {
    const roleName = ids.map((id) => userMap[id] || id).join("、");
    updateNode(nodeId, { approverUserIds: ids, roleName });
  };
  const onModeChange = (node, value) => {
    const patch = { mode: value };
    if (value === "serial") patch.approverRoles = void 0;
    updateNode(node.id, patch);
  };
  const renderApproverEditor = (node) => {
    const type = node.approverType ?? "role";
    if (type === "specific_user") {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", fullWidth: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "指定用户（可多选）" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Select,
          {
            multiple: true,
            label: "指定用户（可多选）",
            value: node.approverUserIds ?? [],
            onChange: (e) => onUserIdsChange(node.id, e.target.value),
            renderValue: (sel) => sel.map((id) => userMap[id] || id).join("、") || "未选择",
            children: users.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: u.id, children: [
              u.name,
              "（",
              u.department,
              "）"
            ] }, u.id))
          }
        )
      ] });
    }
    if (type === "supervisor" || type === "dept_head") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { fontSize: "0.75rem", py: 0.5 }, children: type === "supervisor" ? "系统自动解析发起人上级" : "系统自动解析发起人所在部门负责人" });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 1, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", fullWidth: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(InputLabel, { children: [
          "主审批",
          type === "position" ? "职位" : "角色"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Select,
          {
            label: `主审批${type === "position" ? "职位" : "角色"}`,
            value: node.role,
            onChange: (e) => onRoleChange(node.id, e.target.value),
            children: ROLE_DEFINITIONS.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: r.id, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 8, height: 8, borderRadius: "50%", bgcolor: r.color } }),
              r.name
            ] }) }, r.id))
          }
        )
      ] }),
      (node.mode === "parallel" || node.mode === "or") && /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", fullWidth: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "会签角色（可多选）" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Select,
          {
            multiple: true,
            label: "会签角色（可多选）",
            value: node.approverRoles ?? [],
            onChange: (e) => updateNode(node.id, { approverRoles: e.target.value }),
            renderValue: (sel) => sel.map((id) => {
              var _a;
              return ((_a = ROLE_DEFINITIONS.find((r) => r.id === id)) == null ? void 0 : _a.name) || id;
            }).join("、") || "无",
            children: ROLE_DEFINITIONS.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: r.id, children: r.name }, r.id))
          }
        )
      ] })
    ] });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600, color: "#1E293B" }, children: "审批流程设置" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 1, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "outlined", onClick: handleReset, children: "恢复默认" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2, borderRadius: 2, fontSize: "0.8125rem" }, children: "深度定制各业务模块审批流：审批人类型（角色/职位/上级/部门负责人/指定用户）、会签模式（串/并/或签）、 结构化条件、跳过规则、超时升级，以及模块级「标准 / 简化」开关。点击「编辑」进入流程编辑器。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 1.5, children: flows.map((flow) => {
      const effective = getEffectiveSteps(flow.module);
      const isSimplified = (flow.profile ?? "standard") === "simplified";
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { borderRadius: 2, p: 2, opacity: flow.enabled ? 1 : 0.6 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: flow.moduleLabel }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: flow.module })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                icon: flow.enabled ? /* @__PURE__ */ jsxRuntimeExports.jsx(PlayArrow, { sx: { fontSize: 14 } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Stop, { sx: { fontSize: 14 } }),
                label: flow.enabled ? "启用" : "停用",
                size: "small",
                color: flow.enabled ? "success" : "default",
                onClick: () => handleToggleFlow(flow.id),
                sx: { cursor: "pointer", fontSize: "0.7rem" }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              ToggleButtonGroup,
              {
                size: "small",
                exclusive: true,
                value: flow.profile ?? "standard",
                onChange: (_, v) => v && handleProfileChange(flow.id, v),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ToggleButton, { value: "standard", children: "标准" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ToggleButton, { value: "simplified", children: "简化" })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => handleEditFlow(flow), "data-testid": `edit-flow-${flow.module}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap", mt: 1.5 }, children: [
          effective.map((step, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(React.Fragment, { children: [
            i > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowForward, { sx: { fontSize: 16, color: "#94A3B8" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Tooltip,
              {
                title: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    "审批人类型：",
                    approverTypeLabel(step.approverType)
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    "会签模式：",
                    modeLabel(step.mode)
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    "条件：",
                    summarizeGroup(step.conditions)
                  ] }),
                  step.timeout ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    "超时：",
                    step.timeout,
                    "h"
                  ] }) : null,
                  step.optional ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "简化模式可省略" }) : null,
                  !step.active ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#FCA5A5" }, children: step.skipReason }) : null
                ] }),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Chip,
                  {
                    label: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5 }, children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: step.name }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { opacity: 0.7, fontSize: 11 }, children: [
                        "·",
                        modeLabel(step.mode),
                        step.optional ? "·可省" : ""
                      ] })
                    ] }),
                    size: "small",
                    variant: step.active ? "filled" : "outlined",
                    color: step.active ? modeColor(step.mode) : "default",
                    sx: { fontSize: "0.7rem", height: 26, opacity: step.active ? 1 : 0.5 }
                  }
                )
              }
            )
          ] }, step.id)),
          effective.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "无审批节点" })
        ] }),
        isSimplified && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "info.main", sx: { display: "block", mt: 0.5 }, children: "简化模式：可选节点（可省）在生效链中已省略。" })
      ] }, flow.id);
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: dialogOpen, onClose: () => setDialogOpen(false), maxWidth: "md", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { sx: { fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "编辑审批流程 - ",
          editFlow == null ? void 0 : editFlow.moduleLabel
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => setDialogOpen(false), children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, { fontSize: "small" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { dividers: true, sx: { pt: 2 }, children: editFlow && /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 1.5, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { fontSize: "0.75rem", py: 0.5 }, children: [
          "当前模式：",
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: editFlow.profile === "simplified" ? "简化（可选节点可省略）" : "标准" }),
          "。逐一配置节点审批人、会签模式、条件、跳过与升级规则。"
        ] }),
        editFlow.nodes.map((node) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Accordion,
          {
            expanded: expanded === node.id,
            onChange: (_, isExp) => setExpanded(isExp ? node.id : false),
            variant: "outlined",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionSummary, { expandIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandMore, {}), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, width: "100%" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: node.order, size: "small", sx: { width: 28, height: 22, fontSize: "0.7rem" } }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: node.name || "未命名节点" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: modeLabel(node.mode), color: modeColor(node.mode), sx: { fontSize: "0.65rem", height: 20 } }),
                node.optional && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: "可省", variant: "outlined", sx: { fontSize: "0.65rem", height: 20 } }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { flexGrow: 1 } }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  IconButton,
                  {
                    size: "small",
                    color: "error",
                    onClick: (e) => {
                      e.stopPropagation();
                      handleRemoveNode(node.id);
                    },
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" })
                  }
                )
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionDetails, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 2, flexWrap: "wrap" }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      size: "small",
                      label: "节点名称",
                      value: node.name,
                      onChange: (e) => updateNode(node.id, { name: e.target.value }),
                      sx: { minWidth: 200 }
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { minWidth: 140 }, "data-testid": `af-approver-type-${node.id}`, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "审批人类型" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Select,
                      {
                        label: "审批人类型",
                        value: node.approverType ?? "role",
                        onChange: (e) => onApproverTypeChange(node, e.target.value),
                        children: APPROVER_TYPES.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: t.value, children: t.label }, t.value))
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { minWidth: 120 }, "data-testid": `af-mode-${node.id}`, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "会签模式" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Select,
                      {
                        label: "会签模式",
                        value: node.mode ?? "serial",
                        onChange: (e) => onModeChange(node, e.target.value),
                        children: MODES.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: m.value, children: m.label }, m.value))
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      size: "small",
                      type: "number",
                      label: "超时(小时)",
                      value: node.timeout ?? "",
                      onChange: (e) => updateNode(node.id, { timeout: parseInt(e.target.value) || 0 }),
                      sx: { width: 130 }
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    FormControlLabel,
                    {
                      control: /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Switch,
                        {
                          checked: !!node.optional,
                          onChange: (e) => updateNode(node.id, { optional: e.target.checked })
                        }
                      ),
                      label: "简化可省略"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { display: "flex", alignItems: "center", gap: 0.5 }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Person, { fontSize: "inherit" }),
                    " 审批人"
                  ] }),
                  renderApproverEditor(node)
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }, "data-testid": `af-conditions-${node.id}`, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Rule, { fontSize: "inherit" }),
                    " 审批条件（结构化）"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    ConditionGroupEditor,
                    {
                      group: node.conditions ?? { logic: "and", conditions: [] },
                      onChange: (g) => updateNode(node.id, { conditions: g })
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    FormControlLabel,
                    {
                      "data-testid": `af-skip-${node.id}`,
                      control: /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Switch,
                        {
                          checked: !!node.skipRule,
                          onChange: (e) => updateNode(node.id, {
                            skipRule: e.target.checked ? { when: { logic: "and", conditions: [{ field: "amount", operator: ">", value: 0 }] }, action: "skip" } : void 0
                          })
                        }
                      ),
                      label: "启用跳过规则（满足条件时跳过 / 自动通过本节点）"
                    }
                  ),
                  node.skipRule && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 1, pl: 1, borderLeft: "3px solid", borderColor: "divider" }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { minWidth: 160, mb: 1 }, children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "命中动作" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Select,
                        {
                          label: "命中动作",
                          value: node.skipRule.action,
                          onChange: (e) => updateNode(node.id, {
                            skipRule: { ...node.skipRule, action: e.target.value }
                          }),
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "skip", children: "跳过本节点" }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "auto_approve", children: "自动通过" })
                          ]
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      ConditionGroupEditor,
                      {
                        group: node.skipRule.when,
                        onChange: (g) => updateNode(node.id, { skipRule: { ...node.skipRule, when: g } })
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    FormControlLabel,
                    {
                      control: /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Switch,
                        {
                          checked: !!node.escalation,
                          onChange: (e) => updateNode(node.id, {
                            escalation: e.target.checked ? { timeout: node.timeout ?? 24, escalateTo: "role", targetRole: "admin", notify: ["admin"] } : void 0
                          })
                        }
                      ),
                      label: "启用超时升级（超时后升级给指定审批人）"
                    }
                  ),
                  node.escalation && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mt: 1, pl: 1, borderLeft: "3px solid", borderColor: "divider" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, flexWrap: "wrap", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      TextField,
                      {
                        size: "small",
                        type: "number",
                        label: "升级触发(小时)",
                        value: node.escalation.timeout,
                        onChange: (e) => updateNode(node.id, {
                          escalation: { ...node.escalation, timeout: parseInt(e.target.value) || 0 }
                        }),
                        sx: { width: 150 }
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { minWidth: 140 }, children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "升级给" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Select,
                        {
                          label: "升级给",
                          value: node.escalation.escalateTo,
                          onChange: (e) => updateNode(node.id, {
                            escalation: { ...node.escalation, escalateTo: e.target.value }
                          }),
                          children: APPROVER_TYPES.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: t.value, children: t.label }, t.value))
                        }
                      )
                    ] }),
                    node.escalation.escalateTo === "role" && /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { minWidth: 140 }, children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "升级角色" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Select,
                        {
                          label: "升级角色",
                          value: node.escalation.targetRole ?? "admin",
                          onChange: (e) => updateNode(node.id, {
                            escalation: { ...node.escalation, targetRole: e.target.value }
                          }),
                          children: ROLE_DEFINITIONS.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: r.id, children: r.name }, r.id))
                        }
                      )
                    ] }),
                    node.escalation.escalateTo === "specific_user" && /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { minWidth: 160 }, children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "升级用户" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Select,
                        {
                          label: "升级用户",
                          value: node.escalation.targetUserId ?? "",
                          onChange: (e) => updateNode(node.id, {
                            escalation: { ...node.escalation, targetUserId: e.target.value }
                          }),
                          children: users.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: u.id, children: u.name }, u.id))
                        }
                      )
                    ] })
                  ] }) })
                ] })
              ] }) })
            ]
          },
          node.id
        )),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), variant: "outlined", onClick: handleAddNode, children: "添加审批节点" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, py: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDialogOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleSaveFlow, children: "保存流程" })
      ] })
    ] })
  ] });
};
const OrderTemplateTab = () => {
  var _a;
  const { vendors } = useVendorStore();
  const materials = useMaterialStore((s) => s.materials);
  const templates = useOrderTemplateStore((s) => s.templates);
  const setTemplates = useOrderTemplateStore((s) => s.setTemplates);
  const upsertTemplate = useOrderTemplateStore((s) => s.upsertTemplate);
  const removeTemplate = useOrderTemplateStore((s) => s.removeTemplate);
  const duplicateTemplate = useOrderTemplateStore((s) => s.duplicateTemplate);
  const tradeTermOptions = useDataDictStore((s) => s.tradeTerms);
  const [dialog, setDialog] = reactExports.useState({
    open: false,
    template: null
  });
  const vendorOptions = reactExports.useMemo(
    () => vendors.map((v) => ({ id: v.id, name: v.name })),
    []
  );
  const handleSave = () => {
    setTemplates([...templates]);
  };
  const handleCreate = () => {
    const newTemplate = {
      id: `tpl-${Date.now()}`,
      name: "",
      vendorId: "",
      vendorName: "",
      paymentTerms: "",
      tradeTerms: "",
      deliveryTerms: "",
      remarks: "",
      expectedDeliveryDate: "",
      items: [],
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    setDialog({ open: true, template: newTemplate });
  };
  const handleEdit = (template) => {
    setDialog({ open: true, template: { ...template, items: [...template.items] } });
  };
  const handleDelete = (id) => {
    removeTemplate(id);
  };
  const handleDialogSave = () => {
    if (!dialog.template) return;
    if (!dialog.template.name.trim()) return;
    upsertTemplate(dialog.template);
    setDialog({ open: false, template: null });
  };
  const handleAddItem = () => {
    if (!dialog.template) return;
    setDialog({
      open: true,
      template: {
        ...dialog.template,
        items: [...dialog.template.items, {
          materialId: "",
          materialCode: "",
          materialName: "",
          specification: "",
          unit: "件",
          quantity: 1,
          unitPrice: 0
        }]
      }
    });
  };
  const handleDeleteItem = (idx) => {
    if (!dialog.template) return;
    setDialog({
      open: true,
      template: {
        ...dialog.template,
        items: dialog.template.items.filter((_, i) => i !== idx)
      }
    });
  };
  const handleItemChange = (idx, field, value) => {
    if (!dialog.template) return;
    const items = [...dialog.template.items];
    items[idx] = { ...items[idx], [field]: value };
    setDialog({ open: true, template: { ...dialog.template, items } });
  };
  const handleMaterialSelect = (idx, materialId) => {
    const material = materials.find((m) => m.id === materialId);
    if (!material || !dialog.template) return;
    const items = [...dialog.template.items];
    items[idx] = {
      ...items[idx],
      materialId: material.id,
      materialCode: material.code,
      materialName: material.name,
      specification: material.specification || "",
      unit: material.unit,
      unitPrice: material.price
    };
    setDialog({ open: true, template: { ...dialog.template, items } });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600, color: "#1E293B" }, children: "订单模板管理" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "创建和管理采购订单模板，新建订单时可选择模板快速填充" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleSave, children: "保存到本地" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: handleCreate, children: "新建模板" })
      ] })
    ] }),
    templates.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { borderRadius: 2 }, children: "暂无订单模板，点击「新建模板」创建第一个模板。" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, variant: "outlined", sx: { borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, fontSize: "0.8125rem" }, children: "模板名称" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, fontSize: "0.8125rem" }, children: "供应商" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, fontSize: "0.8125rem" }, children: "付款条件" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, fontSize: "0.8125rem" }, children: "贸易条件" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, fontSize: "0.8125rem" }, align: "center", children: "物料数" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, fontSize: "0.8125rem" }, children: "备注" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, fontSize: "0.8125rem" }, align: "center", children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: templates.map((tpl) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: tpl.name }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: tpl.vendorName || "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: tpl.paymentTerms || "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: tpl.tradeTerms || "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: tpl.items.length, size: "small" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", noWrap: true, sx: { maxWidth: 150, display: "block" }, children: tpl.remarks || "-" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 0.5, justifyContent: "center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "编辑", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => handleEdit(tpl), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "复制", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => duplicateTemplate(tpl.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(ContentCopy, { fontSize: "small" }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "删除", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => handleDelete(tpl.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) })
        ] }) })
      ] }, tpl.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Dialog,
      {
        open: dialog.open,
        onClose: () => setDialog({ open: false, template: null }),
        maxWidth: "md",
        fullWidth: true,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: ((_a = dialog.template) == null ? void 0 : _a.id) && templates.find((t) => t.id === dialog.template.id) ? "编辑模板" : "新建模板" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { sx: { pt: 2 }, children: dialog.template && /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2.5, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "模板名称",
                fullWidth: true,
                value: dialog.template.name,
                onChange: (e) => setDialog({ open: true, template: { ...dialog.template, name: e.target.value } }),
                required: true
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Autocomplete,
                {
                  options: vendorOptions,
                  getOptionLabel: (o) => o.name,
                  value: vendorOptions.find((v) => v.id === dialog.template.vendorId) || null,
                  onChange: (_, newVal) => setDialog({
                    open: true,
                    template: { ...dialog.template, vendorId: (newVal == null ? void 0 : newVal.id) || "", vendorName: (newVal == null ? void 0 : newVal.name) || "" }
                  }),
                  renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, label: "默认供应商" })
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  fullWidth: true,
                  label: "付款条件",
                  value: dialog.template.paymentTerms,
                  onChange: (e) => setDialog({ open: true, template: { ...dialog.template, paymentTerms: e.target.value } })
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Autocomplete,
                {
                  options: tradeTermOptions,
                  value: dialog.template.tradeTerms || null,
                  onChange: (_, newVal) => setDialog({
                    open: true,
                    template: { ...dialog.template, tradeTerms: newVal || "" }
                  }),
                  renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, label: "贸易条件" }),
                  freeSolo: true,
                  isOptionEqualToValue: (o, v) => o === v
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  fullWidth: true,
                  label: "交付条件",
                  value: dialog.template.deliveryTerms,
                  onChange: (e) => setDialog({ open: true, template: { ...dialog.template, deliveryTerms: e.target.value } })
                }
              ) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "备注",
                value: dialog.template.remarks,
                onChange: (e) => setDialog({ open: true, template: { ...dialog.template, remarks: e.target.value } }),
                multiline: true,
                rows: 2
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", mb: 1, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "模板物料" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: handleAddItem, children: "添加物料" })
              ] }),
              dialog.template.items.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { fontSize: "0.8125rem" }, children: "暂无物料，点击「添加物料」" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, variant: "outlined", sx: { borderRadius: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontSize: "0.75rem", fontWeight: 600 }, children: "物料" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontSize: "0.75rem", fontWeight: 600 }, children: "规格" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontSize: "0.75rem", fontWeight: 600 }, children: "单位" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontSize: "0.75rem", fontWeight: 600 }, align: "right", children: "数量" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontSize: "0.75rem", fontWeight: 600 }, align: "right", children: "单价" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontSize: "0.75rem", fontWeight: 600, width: 50 } })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: dialog.template.items.map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { minWidth: 160 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Autocomplete,
                    {
                      size: "small",
                      options: materials,
                      getOptionLabel: (opt) => `${opt.name} (${opt.code})`,
                      value: materials.find((m) => m.id === item.materialId) || null,
                      onChange: (_, newVal) => {
                        if (newVal) handleMaterialSelect(idx, newVal.id);
                      },
                      renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, placeholder: "搜索物料" }),
                      isOptionEqualToValue: (o, v) => o.id === v.id
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: item.specification || "-" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.unit }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { width: 80 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      size: "small",
                      type: "number",
                      value: item.quantity,
                      onChange: (e) => handleItemChange(idx, "quantity", Number(e.target.value)),
                      inputProps: { min: 1 },
                      sx: { width: 70 }
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { width: 100 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      size: "small",
                      type: "number",
                      value: item.unitPrice,
                      onChange: (e) => handleItemChange(idx, "unitPrice", Number(e.target.value)),
                      inputProps: { min: 0, step: 0.01 },
                      sx: { width: 90 }
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => handleDeleteItem(idx), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) })
                ] }, idx)) })
              ] }) })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDialog({ open: false, template: null }), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleDialogSave, children: "保存模板" })
          ] })
        ]
      }
    )
  ] });
};
const UnitConversionTab = () => {
  const rules = useUnitConversionStore((s) => s.rules);
  const addRule = useUnitConversionStore((s) => s.addRule);
  const updateRule = useUnitConversionStore((s) => s.updateRule);
  const removeRule = useUnitConversionStore((s) => s.removeRule);
  const resetRules = useUnitConversionStore((s) => s.resetRules);
  const [dialogOpen, setDialogOpen] = reactExports.useState(false);
  const [editing, setEditing] = reactExports.useState(null);
  const [form, setForm] = reactExports.useState({ fromUnit: "", toUnit: "", factor: "1" });
  const [snackbar, setSnackbar] = reactExports.useState({ open: false, msg: "" });
  const [convValue, setConvValue] = reactExports.useState("1");
  const [convFrom, setConvFrom] = reactExports.useState("箱");
  const [convTo, setConvTo] = reactExports.useState("个");
  const inventoryRecords = useWarehouseStore((s) => s.inventoryRecords);
  const [previewRuleId, setPreviewRuleId] = reactExports.useState("u1");
  const allUnits = reactExports.useMemo(() => {
    const set = /* @__PURE__ */ new Set();
    rules.forEach((r) => {
      set.add(r.fromUnit);
      set.add(r.toUnit);
    });
    return Array.from(set);
  }, [rules]);
  const openAdd = () => {
    setEditing(null);
    setForm({ fromUnit: "", toUnit: "", factor: "1" });
    setDialogOpen(true);
  };
  const openEdit = (rule) => {
    setEditing(rule);
    setForm({ fromUnit: rule.fromUnit, toUnit: rule.toUnit, factor: String(rule.factor) });
    setDialogOpen(true);
  };
  const handleSave = () => {
    const f = Number(form.factor);
    if (!form.fromUnit || !form.toUnit || !(f > 0)) {
      setSnackbar({ open: true, msg: "请填写完整且因子大于 0" });
      return;
    }
    if (form.fromUnit === form.toUnit) {
      setSnackbar({ open: true, msg: "源单位与目标单位不能相同" });
      return;
    }
    if (editing) {
      updateRule(editing.id, { fromUnit: form.fromUnit, toUnit: form.toUnit, factor: f });
    } else {
      addRule({ fromUnit: form.fromUnit, toUnit: form.toUnit, factor: f });
    }
    setDialogOpen(false);
    setSnackbar({ open: true, msg: "换算规则已保存" });
  };
  const handleDelete = (id) => {
    removeRule(id);
    setSnackbar({ open: true, msg: "已删除换算规则" });
  };
  const handleReset = () => {
    resetRules();
    setSnackbar({ open: true, msg: "已恢复默认换算规则" });
  };
  const convResult = convertUnit(Number(convValue) || 0, convFrom, convTo, rules);
  const previewRule = rules.find((r) => r.id === previewRuleId);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2.5, borderRadius: 2, fontSize: "0.8125rem" }, children: "定义物料多单位换算规则（如 1 箱 = 12 个）。可在下方计算器中即时换算，并批量预览库存按换算单位后的数量。对应 Phase 2「多单位换算」能力。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 7, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { borderRadius: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { px: 2.5, py: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #EEF2F7" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 700, children: "换算规则" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(RestartAlt, {}), onClick: handleReset, children: "恢复默认" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: openAdd, children: "新增规则" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "源单位" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "目标单位" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "换算因子" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "操作" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
            rules.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 4, align: "center", sx: { py: 4, color: "#94A3B8" }, children: "暂无换算规则" }) }),
            rules.map((rule) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: rule.fromUnit, size: "small", variant: "outlined" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: rule.toUnit, size: "small", color: "primary", variant: "outlined" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontFamily: "monospace", children: [
                "1 ",
                rule.fromUnit,
                " = ",
                rule.factor,
                " ",
                rule.toUnit
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => openEdit(rule), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => handleDelete(rule.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) })
              ] })
            ] }, rule.id))
          ] })
        ] }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 5, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2.5, borderRadius: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 700, sx: { mb: 2, display: "flex", alignItems: "center", gap: 0.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SwapHoriz, { fontSize: "small" }),
          " 单位换算计算器"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              label: "数值",
              type: "number",
              value: convValue,
              onChange: (e) => setConvValue(e.target.value),
              fullWidth: true
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "源单位" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: convFrom, label: "源单位", onChange: (e) => setConvFrom(e.target.value), children: allUnits.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: u, children: u }, u)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "目标单位" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: convTo, label: "目标单位", onChange: (e) => setConvTo(e.target.value), children: allUnits.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: u, children: u }, u)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { elevation: 0, sx: { bgcolor: "#EFF6FF", p: 2, borderRadius: 2, textAlign: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "换算结果" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, color: "#3B82F6", sx: { fontFamily: "monospace" }, children: convResult === null ? "不支持" : `${Number(convValue) || 0} ${convFrom} = ${convResult} ${convTo}` }),
            convResult === null && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "error", children: [
              "未找到 ",
              convFrom,
              " → ",
              convTo,
              " 的换算路径"
            ] })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 2 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 2, mb: 1.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 700, children: "库存多单位预览" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { minWidth: 220 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "选择换算规则" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: previewRuleId, label: "选择换算规则", onChange: (e) => setPreviewRuleId(e.target.value), children: rules.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: r.id, children: [
              r.fromUnit,
              " → ",
              r.toUnit,
              "（×",
              r.factor,
              "）"
            ] }, r.id)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, variant: "outlined", sx: { borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料编码" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料名称" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "仓库" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "原数量" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "换算后数量" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: inventoryRecords.slice(0, 12).map((rec) => {
            const converted = previewRule && rec.unit === previewRule.fromUnit ? rec.quantity * previewRule.factor : null;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: rec.materialCode }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: rec.materialName }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: rec.warehouseName }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
                rec.quantity,
                " ",
                rec.unit
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: converted !== null ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `${converted} ${previewRule.toUnit}`, size: "small", color: "success" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "单位不匹配" }) })
            ] }, rec.id);
          }) })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: dialogOpen, onClose: () => setDialogOpen(false), maxWidth: "xs", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: editing ? "编辑换算规则" : "新增换算规则" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { sx: { pt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, sx: { mt: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "源单位（如 箱）",
            value: form.fromUnit,
            onChange: (e) => setForm((f) => ({ ...f, fromUnit: e.target.value })),
            fullWidth: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "目标单位（如 个）",
            value: form.toUnit,
            onChange: (e) => setForm((f) => ({ ...f, toUnit: e.target.value })),
            fullWidth: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "换算因子（1 源单位 = ? 目标单位）",
            type: "number",
            value: form.factor,
            onChange: (e) => setForm((f) => ({ ...f, factor: e.target.value })),
            fullWidth: true,
            helperText: "例如 1 箱 = 12 个，则填写 12"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDialogOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleSave, children: "保存" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Snackbar,
      {
        open: snackbar.open,
        autoHideDuration: 2500,
        onClose: () => setSnackbar({ open: false, msg: "" }),
        message: snackbar.msg
      }
    )
  ] });
};
const TYPE_META = {
  WMS: { label: "仓储管理系统", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Warehouse, {}), color: "#10B981" },
  TMS: { label: "运输管理系统", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(LocalShipping, {}), color: "#3B82F6" },
  MES: { label: "制造执行系统", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(PrecisionManufacturing, {}), color: "#8B5CF6" },
  PLM: { label: "产品生命周期", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Hub, {}), color: "#F97316" },
  SRM: { label: "供应商关系", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CloudQueue, {}), color: "#F59E0B" },
  FINANCE: { label: "财务系统", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AccountBalance, {}), color: "#6366F1" }
};
const STATUS_LABEL = {
  connected: { label: "已连接", color: "success" },
  disconnected: { label: "未连接", color: "default" },
  testing: { label: "连接测试中", color: "warning" }
};
const IntegrationTab = () => {
  const items = useSettingsStore((s) => s.integrations);
  const setIntegrations = useSettingsStore((s) => s.setIntegrations);
  const [dialogOpen, setDialogOpen] = reactExports.useState(false);
  const [editing, setEditing] = reactExports.useState(null);
  const [form, setForm] = reactExports.useState(
    { name: "", type: "WMS", url: "", enabled: true, frequency: "实时" }
  );
  const [snackbar, setSnackbar] = reactExports.useState({ open: false, msg: "" });
  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", type: "WMS", url: "", enabled: true, frequency: "实时" });
    setDialogOpen(true);
  };
  const openEdit = (it) => {
    setEditing(it);
    setForm({ name: it.name, type: it.type, url: it.url, enabled: it.enabled, frequency: it.frequency });
    setDialogOpen(true);
  };
  const handleSave = () => {
    if (!form.name || !form.url) {
      setSnackbar({ open: true, msg: "请填写系统名称与接口地址" });
      return;
    }
    if (editing) {
      setIntegrations(items.map((i) => i.id === editing.id ? { ...i, ...form } : i));
    } else {
      setIntegrations([...items, { id: `i-${Date.now()}`, status: "disconnected", ...form }]);
    }
    setDialogOpen(false);
    setSnackbar({ open: true, msg: "对接配置已保存" });
  };
  const handleDelete = (id) => setIntegrations(items.filter((i) => i.id !== id));
  const testConnection = (id) => {
    setIntegrations(items.map((i) => i.id === id ? { ...i, status: "testing" } : i));
    setSnackbar({ open: true, msg: "正在测试连接…" });
    setTimeout(() => {
      setIntegrations(items.map((i) => i.id === id ? { ...i, status: "connected", enabled: true } : i));
    }, 1200);
  };
  const connectedCount = items.filter((i) => i.status === "connected").length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2.5, borderRadius: 2, fontSize: "0.8125rem" }, children: "配置与外部系统的对接通道（WMS / TMS / MES / PLM / SRM / 财务）。支持启停、同步频率与「测试连接」。对应 Phase 3「WMS/TMS 对接」能力（演示环境为模拟接口）。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mb: 2.5 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2, textAlign: "center", borderRadius: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sync, { sx: { color: "#10B981" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: connectedCount }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "已连接通道" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2, textAlign: "center", borderRadius: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LinkOff, { sx: { color: "#94A3B8" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: items.length - connectedCount }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "未连接通道" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2, textAlign: "center", borderRadius: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Warehouse, { sx: { color: "#10B981" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: items.filter((i) => i.type === "WMS").length }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "WMS 通道" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2, textAlign: "center", borderRadius: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LocalShipping, { sx: { color: "#3B82F6" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: items.filter((i) => i.type === "TMS").length }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "TMS 通道" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { borderRadius: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { px: 2.5, py: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #EEF2F7" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 700, children: "对接通道列表" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: openAdd, children: "新增通道" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "系统" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "类型" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "接口地址" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "同步频率" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "状态" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "启用" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "操作" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: items.map((it) => {
          const meta = TYPE_META[it.type];
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color: meta.color, display: "flex" }, children: meta.icon }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: it.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: meta.label })
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: it.type, size: "small", variant: "outlined" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", sx: { fontSize: "0.75rem" }, children: it.url }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: it.frequency }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: STATUS_LABEL[it.status].label,
                size: "small",
                color: STATUS_LABEL[it.status].color,
                icon: it.status === "connected" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}) : void 0
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Switch,
              {
                size: "small",
                checked: it.enabled,
                onChange: (e) => setIntegrations(items.map((i) => i.id === it.id ? { ...i, enabled: e.target.checked } : i))
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", onClick: () => testConnection(it.id), disabled: it.status === "testing", children: "测试" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => openEdit(it), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => handleDelete(it.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) })
            ] })
          ] }, it.id);
        }) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: dialogOpen, onClose: () => setDialogOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: editing ? "编辑对接通道" : "新增对接通道" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { sx: { pt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, sx: { mt: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "系统名称",
            value: form.name,
            onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })),
            fullWidth: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "系统类型" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: form.type, label: "系统类型", onChange: (e) => setForm((f) => ({ ...f, type: e.target.value })), children: Object.keys(TYPE_META).map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: t, children: [
            t,
            " · ",
            TYPE_META[t].label
          ] }, t)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "接口地址 (URL)",
            value: form.url,
            onChange: (e) => setForm((f) => ({ ...f, url: e.target.value })),
            fullWidth: true,
            placeholder: "https://..."
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "同步频率" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: form.frequency, label: "同步频率", onChange: (e) => setForm((f) => ({ ...f, frequency: e.target.value })), children: ["实时", "每 5 分钟", "每 15 分钟", "每小时", "每日"].map((fr) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: fr, children: fr }, fr)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              checked: form.enabled,
              onChange: (e) => setForm((f) => ({ ...f, enabled: e.target.checked }))
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: "启用该通道" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDialogOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleSave, children: "保存" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Snackbar,
      {
        open: snackbar.open,
        autoHideDuration: 2500,
        onClose: () => setSnackbar({ open: false, msg: "" }),
        message: snackbar.msg
      }
    )
  ] });
};
function FakeQR({ seed = "ssa-erp-m" }) {
  const size = 21;
  const cells = [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = h * 31 + seed.charCodeAt(i) >>> 0;
  for (let i = 0; i < size * size; i++) {
    h = h * 1103515245 + 12345 >>> 0;
    cells.push((h >> 16) % 2 === 0);
  }
  const isFinder = (r, c) => {
    const inBox = (br, bc) => r >= br && r < br + 7 && c >= bc && c < bc + 7;
    return inBox(0, 0) || inBox(0, size - 7) || inBox(size - 7, 0);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: 140, height: 140, viewBox: `0 0 ${size} ${size}`, style: { background: "#fff", borderRadius: 8 }, children: Array.from({ length: size * size }).map((_, i) => {
    const r = Math.floor(i / size), c = i % size;
    if (isFinder(r, c)) {
      const br = r < 7 ? 0 : size - 7;
      const bc = c < 7 ? 0 : size - 7;
      const lr = r - br, lc = c - bc;
      const onBorder = lr === 0 || lr === 6 || lc === 0 || lc === 6;
      const inCore = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
      if (onBorder || inCore) return /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: c, y: r, width: 1, height: 1, fill: "#0F172A" }, i);
      return null;
    }
    if (cells[i]) return /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: c, y: r, width: 1, height: 1, fill: "#0F172A" }, i);
    return null;
  }) });
}
const FEATURES = [
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Inventory2, {}), title: "扫码入库", desc: "PDA 扫描物料/批次条码，快速确认实收数量" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(SwapHoriz, {}), title: "扫码出库", desc: "拣货下架扫描校验，防错发漏发" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(PlaylistAddCheck, {}), title: "移动盘点", desc: "按库位扫码盘点，实时上传差异" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CameraAlt, {}), title: "质检拍照", desc: "现场拍照上传不合格品，关联检验单" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(LocalShipping, {}), title: "发货确认", desc: "销售发货扫码校验，同步物流状态" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Bolt, {}), title: "即时消息", desc: "审批/预警推送到移动端，随时处理" }
];
const MobileTab = () => {
  const config = useSettingsStore((s) => s.mobileConfig);
  const setMobileConfig = useSettingsStore((s) => s.setMobileConfig);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2.5, borderRadius: 2, fontSize: "0.8125rem" }, children: "移动端 / PDA 接入说明。仓库与质检人员可通过 PDA 或手机浏览器访问移动门户，执行扫码收发、盘点、质检等现场作业。对应 Phase 3「移动端 / PDA」能力。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 5, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 3, borderRadius: 2, textAlign: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 700, sx: { mb: 2 }, children: "移动端访问" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(FakeQR, { seed: config.accessUrl }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { display: "block", mt: 1 }, children: "使用 PDA / 手机扫码或访问下方地址" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: config.accessUrl, sx: { mt: 1, fontFamily: "monospace" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              checked: config.enabled,
              onChange: (e) => setMobileConfig({ ...config, enabled: e.target.checked })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: "启用移动端访问" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(OpenInNew, {}), sx: { mt: 1 }, disabled: !config.enabled, children: "打开移动门户" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 2.5 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "PDA 操作示意" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: {
          width: 150,
          mx: "auto",
          mt: 1,
          p: 1.5,
          borderRadius: 3,
          border: "3px solid #1E293B",
          bgcolor: "#0F172A",
          color: "#E2E8F0"
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", sx: { mb: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(PhoneAndroid, { fontSize: "small" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: "SSA PDA" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Sync, { fontSize: "small" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { bgcolor: "#1E293B", color: "#E2E8F0", p: 1, borderRadius: 1, mb: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { fontSize: "0.65rem" }, children: "待办：入库单 RK-2048" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { bgcolor: "#1E293B", color: "#E2E8F0", p: 1, borderRadius: 1, mb: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { fontSize: "0.65rem" }, children: "扫码：钢板 Q235B" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 0.5, justifyContent: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(QrCode2, { sx: { color: "#3B82F6" }, fontSize: "small" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { fontSize: "0.6rem" }, children: "扫描中…" })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 7, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 700, sx: { mb: 1.5 }, children: "支持的现场作业" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, children: FEATURES.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2, borderRadius: 2, height: "100%" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1.5, alignItems: "center", sx: { mb: 0.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color: "#3B82F6", display: "flex" }, children: f.icon }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: f.title })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: f.desc })
        ] }) }, f.title)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 700, sx: { mt: 3, mb: 1 }, children: "部署说明" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(List, { dense: true, sx: { bgcolor: "#F8FAFC", borderRadius: 2, px: 1 }, children: [
          "PDA 设备需安装 SSA 移动客户端或配置 WebClip 指向移动门户地址。",
          "通过 WMS / TMS 对接通道（见「对接配置」）同步库存与单据数据。",
          "扫码作业依赖物料/批次条码（见「条码打印」）生成标签。",
          "离线作业数据在恢复网络后自动上送，避免现场断网丢失。",
          "移动端权限复用系统角色权限矩阵，敏感操作需二次确认。"
        ].map((t, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(ListItem, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ListItemIcon, { sx: { minWidth: 28 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Description, { fontSize: "small", sx: { color: "#64748B" } }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ListItemText, { primary: t, primaryTypographyProps: { variant: "body2" } })
        ] }, i)) })
      ] })
    ] })
  ] });
};
const CATEGORY_ORDER = [
  "units",
  "paymentMethods",
  "paymentTerms",
  "tradeTerms",
  "currencies",
  "languages",
  "jobRoles",
  "invoiceTypes",
  "dispositions",
  "purchaseTypes"
];
const DataDictTab = () => {
  const store = useDataDictStore();
  const [selected, setSelected] = reactExports.useState("units");
  const [dialog, setDialog] = reactExports.useState({
    open: false,
    index: -1,
    value: ""
  });
  const [resetAllOpen, setResetAllOpen] = reactExports.useState(false);
  const [snackbar, setSnackbar] = reactExports.useState({ open: false, msg: "" });
  const items = store[selected] || [];
  const openAdd = () => setDialog({ open: true, index: -1, value: "" });
  const openEdit = (index) => setDialog({ open: true, index, value: items[index] });
  const handleConfirm = () => {
    const v = dialog.value.trim();
    if (!v) return;
    if (dialog.index >= 0) store.updateItem(selected, dialog.index, v);
    else store.addItem(selected, v);
    setDialog({ open: false, index: -1, value: "" });
    setSnackbar({ open: true, msg: dialog.index >= 0 ? "已更新选项" : "已添加选项" });
  };
  const handleDelete = (index) => {
    store.removeItem(selected, index);
    setSnackbar({ open: true, msg: "已删除选项" });
  };
  const handleResetCategory = () => {
    store.resetCategory(selected);
    setSnackbar({ open: true, msg: `${DATA_DICT_LABELS[selected]} 已恢复默认值` });
  };
  const handleResetAll = () => {
    store.resetAll();
    setResetAllOpen(false);
    setSnackbar({ open: true, msg: "全部数据字典已恢复默认值" });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600, color: "#1E293B" }, children: "数据字典" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "全系统下拉选项的唯一数据源，各业务表单（物料单位、付款条件等）均从此读取" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "outlined",
          color: "warning",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Replay, {}),
          onClick: () => setResetAllOpen(true),
          children: "全部恢复默认"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 2, alignItems: "flex-start" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { width: 220, flexShrink: 0, borderRadius: 2, overflow: "hidden" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { px: 2, py: 1.5, bgcolor: "#F8FAFC", borderBottom: "1px solid rgba(226,232,240,0.8)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, color: "#475569", children: [
          "分类（",
          CATEGORY_ORDER.length,
          "）"
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(List, { disablePadding: true, children: CATEGORY_ORDER.map((cat) => {
          const count = (store[cat] || []).length;
          const active = cat === selected;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            ListItemButton,
            {
              selected: active,
              onClick: () => setSelected(cat),
              sx: {
                borderLeft: active ? "3px solid #3B82F6" : "3px solid transparent",
                bgcolor: active ? "#EFF6FF" : "transparent"
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ListItemText,
                  {
                    primary: DATA_DICT_LABELS[cat],
                    primaryTypographyProps: { fontSize: "0.875rem", fontWeight: active ? 600 : 500 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { badgeContent: count, color: "primary", sx: { ml: 1 } })
              ]
            },
            cat
          );
        }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { flex: 1, p: 2.5, borderRadius: 2, minHeight: 360 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: DATA_DICT_LABELS[selected] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "恢复该类默认", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(RestartAlt, {}), onClick: handleResetCategory, children: "重置" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: openAdd, children: "添加" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 2 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexWrap: "wrap", gap: 1 }, children: [
          items.map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: item,
              size: "small",
              onDelete: () => handleDelete(idx),
              onClick: () => openEdit(idx),
              sx: {
                bgcolor: "#F1F5F9",
                "&:hover": { bgcolor: "#E2E8F0" },
                cursor: "pointer"
              }
            },
            `${item}-${idx}`
          )),
          items.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "暂无，点击「添加」新增" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: dialog.open, onClose: () => setDialog({ open: false, index: -1, value: "" }), maxWidth: "xs", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: dialog.index >= 0 ? `编辑${DATA_DICT_LABELS[selected]}选项` : `添加${DATA_DICT_LABELS[selected]}选项` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { sx: { pt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          autoFocus: true,
          fullWidth: true,
          label: "名称",
          value: dialog.value,
          onChange: (e) => setDialog((prev) => ({ ...prev, value: e.target.value })),
          onKeyDown: (e) => e.key === "Enter" && handleConfirm()
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDialog({ open: false, index: -1, value: "" }), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleConfirm, children: "保存" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: resetAllOpen, onClose: () => setResetAllOpen(false), maxWidth: "xs", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: "确认恢复全部默认？" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { sx: { pt: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", sx: { borderRadius: 2 }, children: "此操作将把所有分类（单位、付款方式、货币等）清空并恢复为系统出厂默认值，你自定义的选项将丢失。" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setResetAllOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { color: "warning", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Replay, {}), onClick: handleResetAll, children: "确认恢复" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Snackbar,
      {
        open: snackbar.open,
        autoHideDuration: 2e3,
        onClose: () => setSnackbar({ open: false, msg: "" }),
        message: snackbar.msg
      }
    )
  ] });
};
const ORG_TYPE_LABELS = {
  company: "公司",
  plant: "工厂",
  department: "部门"
};
const OrgTab = () => {
  const { organizations, currentOrgId, addOrg, updateOrg, deleteOrg, setCurrentOrg, resetOrgs } = useOrgStore();
  const [dialog, setDialog] = reactExports.useState(false);
  const [editing, setEditing] = reactExports.useState(null);
  const [form, setForm] = reactExports.useState({});
  const [del, setDel] = reactExports.useState(null);
  const [viewMode, setViewMode] = reactExports.useState("tree");
  const [expanded, setExpanded] = reactExports.useState({});
  const toggleExpanded = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  const openCreate = () => {
    setEditing(null);
    setForm({ type: "department", status: "active", currency: "人民币 (CNY)", ledgerCode: "" });
    setDialog(true);
  };
  const openEdit = (o) => {
    setEditing(o);
    setForm({ ...o });
    setDialog(true);
  };
  const save = () => {
    if (!form.name || !form.code) return;
    const payload = {
      code: form.code,
      name: form.name,
      type: form.type || "department",
      parentOrgId: form.parentOrgId,
      parentId: form.parentOrgId || form.parentId,
      ledgerCode: form.ledgerCode || "",
      currency: form.currency || "人民币 (CNY)",
      taxNo: form.taxNo,
      address: form.address,
      contact: form.contact,
      status: form.status || "active",
      intercompanyEnabled: form.intercompanyEnabled
    };
    if (editing) updateOrg(editing.id, payload);
    else addOrg(payload);
    setDialog(false);
  };
  const rootOrgs = organizations.filter((o) => !o.parentOrgId);
  const getChildren = (parentId) => organizations.filter((o) => o.parentOrgId === parentId);
  const renderTreeRow = (org, depth = 0) => {
    var _a;
    const children = getChildren(org.id);
    const isExpanded = expanded[org.id] !== false;
    const hasChildren = children.length > 0;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(React.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { pl: 2 + depth * 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5 }, children: [
          hasChildren ? /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => toggleExpanded(org.id), children: isExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandLess, { fontSize: "small" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandMore, { fontSize: "small" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 28 } }),
          currentOrgId === org.id ? /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { sx: { color: "#10B981", fontSize: 18 } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => setCurrentOrg(org.id), title: "切换为当前组织", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RadioButtonUnchecked, { fontSize: "small", sx: { color: "#94A3B8" } }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(AccountBalance, { fontSize: "small", sx: { color: "#64748B", ml: 0.5 } })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", color: "#3B82F6", children: org.code }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: org.name }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: ORG_TYPE_LABELS[org.type], size: "small", sx: { bgcolor: "#EFF6FF", color: "#3B82F6" } }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: ((_a = organizations.find((x) => x.id === org.parentOrgId)) == null ? void 0 : _a.name) || "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: org.ledgerCode }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: org.currency }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            label: org.status === "active" ? "启用" : "停用",
            size: "small",
            sx: { bgcolor: org.status === "active" ? "#10B98115" : "#64748B15", color: org.status === "active" ? "#10B981" : "#64748B" }
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "编辑", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => openEdit(org), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "删除", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", disabled: currentOrgId === org.id, onClick: () => setDel(org), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) }) })
        ] })
      ] }),
      hasChildren && isExpanded && children.map((child) => renderTreeRow(child, depth + 1))
    ] }, org.id);
  };
  const renderListRows = () => organizations.map((o) => {
    var _a;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: currentOrgId === o.id ? /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { sx: { color: "#10B981", fontSize: 18 } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => setCurrentOrg(o.id), title: "切换为当前组织", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RadioButtonUnchecked, { fontSize: "small", sx: { color: "#94A3B8" } }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", color: "#3B82F6", children: o.code }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AccountBalance, { fontSize: "small", sx: { color: "#64748B" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: o.name })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: ORG_TYPE_LABELS[o.type], size: "small", sx: { bgcolor: "#EFF6FF", color: "#3B82F6" } }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: ((_a = organizations.find((x) => x.id === o.parentOrgId)) == null ? void 0 : _a.name) || "-" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: o.ledgerCode }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: o.currency }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: o.status === "active" ? "启用" : "停用",
          size: "small",
          sx: { bgcolor: o.status === "active" ? "#10B98115" : "#64748B15", color: o.status === "active" ? "#10B981" : "#64748B" }
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "编辑", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => openEdit(o), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "删除", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", disabled: currentOrgId === o.id, onClick: () => setDel(o), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) }) })
      ] })
    ] }, o.id);
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2, borderRadius: 2 }, children: "多组织 / 多账套（P2-2）。顶栏可切换当前组织，各业务单据自动归属当前组织；遗留数据（无组织标记）在任一组织下可见。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", sx: { mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "组织与账套" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "small",
            variant: viewMode === "tree" ? "contained" : "outlined",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(AccountTree, { fontSize: "small" }),
            onClick: () => setViewMode("tree"),
            "data-testid": "org-tree",
            children: "树形"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "small",
            variant: viewMode === "list" ? "contained" : "outlined",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ViewList, { fontSize: "small" }),
            onClick: () => setViewMode("list"),
            children: "列表"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(RestartAlt, {}), onClick: resetOrgs, children: "重置" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: openCreate, children: "新增组织" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "当前" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "编码" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "名称" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "类型" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "上级" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "账套" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "本位币" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: viewMode === "tree" ? rootOrgs.map((org) => renderTreeRow(org)) : renderListRows() })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: dialog, onClose: () => setDialog(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: editing ? "编辑组织" : "新增组织" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mt: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "组织编码",
            value: form.code || "",
            onChange: (e) => setForm((f) => ({ ...f, code: e.target.value })),
            required: true
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "名称",
            value: form.name || "",
            onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })),
            required: true
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "类型" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              label: "类型",
              value: form.type || "department",
              onChange: (e) => setForm((f) => ({ ...f, type: e.target.value })),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "company", children: "公司" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "plant", children: "工厂" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "department", children: "部门" })
              ]
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "上级组织" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              label: "上级组织",
              value: form.parentOrgId || "",
              onChange: (e) => setForm((f) => ({ ...f, parentOrgId: e.target.value || void 0, parentId: e.target.value || void 0 })),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "无" }),
                organizations.filter((o) => o.id !== (editing == null ? void 0 : editing.id)).map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o.id, children: o.name }, o.id))
              ]
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "账套编码",
            value: form.ledgerCode || "",
            onChange: (e) => setForm((f) => ({ ...f, ledgerCode: e.target.value }))
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "本位币",
            value: form.currency || "",
            onChange: (e) => setForm((f) => ({ ...f, currency: e.target.value }))
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "税号",
            value: form.taxNo || "",
            onChange: (e) => setForm((f) => ({ ...f, taxNo: e.target.value }))
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "联系人",
            value: form.contact || "",
            onChange: (e) => setForm((f) => ({ ...f, contact: e.target.value }))
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "地址",
            value: form.address || "",
            onChange: (e) => setForm((f) => ({ ...f, address: e.target.value }))
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "组织间交易" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              label: "组织间交易",
              value: form.intercompanyEnabled ? "yes" : "no",
              onChange: (e) => setForm((f) => ({ ...f, intercompanyEnabled: e.target.value === "yes" })),
              defaultValue: "no",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "yes", children: "启用" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "no", children: "禁用" })
              ]
            }
          )
        ] }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDialog(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: save, children: "保存" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDelete,
      {
        target: del,
        onCancel: () => setDel(null),
        onConfirm: () => {
          if (del) deleteOrg(del.id);
          setDel(null);
        }
      }
    )
  ] });
};
const ConfirmDelete = ({ target, onCancel, onConfirm }) => {
  const [open, setOpen] = reactExports.useState(false);
  React.useEffect(() => {
    setOpen(!!target);
  }, [target]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: onCancel, maxWidth: "xs", fullWidth: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "确认删除组织" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
      '确定删除组织 "',
      target == null ? void 0 : target.name,
      '" 吗？当前组织不可删除。'
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onCancel, children: "取消" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { color: "error", variant: "contained", onClick: onConfirm, children: "删除" })
    ] })
  ] });
};
const ENTITIES$1 = Object.keys(CUSTOM_FIELD_ENTITY_LABELS);
const CustomFieldTab = () => {
  const [entity, setEntity] = reactExports.useState("material");
  const { fields, addField, updateField, removeField, moveField, resetEntity } = useCustomFieldStore();
  const list = fields[entity] || [];
  const [dialogOpen, setDialogOpen] = reactExports.useState(false);
  const [editing, setEditing] = reactExports.useState(null);
  const [label, setLabel] = reactExports.useState("");
  const [type, setType] = reactExports.useState("text");
  const [required, setRequired] = reactExports.useState(false);
  const [placeholder, setPlaceholder] = reactExports.useState("");
  const [optionsText, setOptionsText] = reactExports.useState("");
  const [snackbar, setSnackbar] = reactExports.useState("");
  const openAdd = () => {
    setEditing(null);
    setLabel("");
    setType("text");
    setRequired(false);
    setPlaceholder("");
    setOptionsText("");
    setDialogOpen(true);
  };
  const openEdit = (def) => {
    setEditing(def);
    setLabel(def.label);
    setType(def.type);
    setRequired(!!def.required);
    setPlaceholder(def.placeholder || "");
    setOptionsText((def.options || []).join("\n"));
    setDialogOpen(true);
  };
  const handleSave = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setSnackbar("请输入字段名称");
      return;
    }
    const options = type === "select" ? optionsText.split("\n").map((s) => s.trim()).filter(Boolean) : void 0;
    const def = {
      key: (editing == null ? void 0 : editing.key) || makeFieldKey(trimmed),
      label: trimmed,
      type,
      required,
      placeholder: placeholder.trim() || void 0,
      options
    };
    if (editing) {
      updateField(entity, editing.key, def);
      setSnackbar("已更新字段");
    } else {
      addField(entity, def);
      setSnackbar("已新增字段");
    }
    setDialogOpen(false);
  };
  const handleDelete = (key) => {
    if (confirm("确定删除该自定义字段？已录入的数据不会自动清除。")) {
      removeField(entity, key);
      setSnackbar("已删除字段");
    }
  };
  const handleReset = () => {
    if (confirm(`确定清空「${CUSTOM_FIELD_ENTITY_LABELS[entity]}」的全部自定义字段？`)) {
      resetEntity(entity);
      setSnackbar("已重置");
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 600, children: "自定义字段" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "为业务实体配置扩展字段，保存后在对应表单自动出现，随主数据一起存储。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: openAdd, children: "新增字段" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 2, display: "flex", alignItems: "center", gap: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { minWidth: 200 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "业务实体" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Select,
          {
            value: entity,
            label: "业务实体",
            onChange: (e) => setEntity(e.target.value),
            children: ENTITIES$1.map((en) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: en, children: CUSTOM_FIELD_ENTITY_LABELS[en] }, en))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(RestartAlt, {}), color: "warning", onClick: handleReset, children: "重置该实体" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "字段名称" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "类型" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "必填" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "可选项" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
        list.map((def, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: def.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: CUSTOM_FIELD_TYPE_LABELS[def.type] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: def.required ? "是" : "否" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: def.type === "select" ? (def.options || []).join("、") || "—" : "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "上移", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", disabled: idx === 0, onClick: () => moveField(entity, def.key, -1), children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpward, { fontSize: "small" }) }) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "下移", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", disabled: idx === list.length - 1, onClick: () => moveField(entity, def.key, 1), children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDownward, { fontSize: "small" }) }) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "编辑", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => openEdit(def), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "删除", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => handleDelete(def.key), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) })
          ] })
        ] }, def.key)),
        list.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { colSpan: 5, sx: { textAlign: "center", color: "text.secondary", py: 4 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tune, { sx: { fontSize: 32, opacity: 0.3, display: "block", mx: "auto", mb: 1 } }),
          "暂无自定义字段，点击「新增字段」开始配置"
        ] }) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: dialogOpen, onClose: () => setDialogOpen(false), maxWidth: "xs", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: editing ? "编辑字段" : "新增自定义字段" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { sx: { pt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, sx: { mt: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            label: "字段名称",
            value: label,
            onChange: (e) => setLabel(e.target.value),
            placeholder: "如：环保等级",
            autoFocus: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "字段类型" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: type, label: "字段类型", onChange: (e) => setType(e.target.value), children: Object.keys(CUSTOM_FIELD_TYPE_LABELS).map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: t, children: CUSTOM_FIELD_TYPE_LABELS[t] }, t)) })
        ] }),
        type === "select" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            multiline: true,
            rows: 3,
            label: "可选项（每行一个）",
            value: optionsText,
            onChange: (e) => setOptionsText(e.target.value),
            placeholder: "选项A\n选项B",
            helperText: "仅「下拉选择」类型生效"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            label: "占位提示",
            value: placeholder,
            onChange: (e) => setPlaceholder(e.target.value),
            placeholder: "如：请输入…"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormControlLabel,
          {
            control: /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: required, onChange: (e) => setRequired(e.target.checked) }),
            label: "必填"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDialogOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleSave, children: "保存" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Snackbar,
      {
        open: !!snackbar,
        autoHideDuration: 2e3,
        onClose: () => setSnackbar(""),
        message: snackbar
      }
    )
  ] });
};
const ENTITIES = Object.keys(PRINT_ENTITY_LABELS);
const SAMPLE_RECORDS = {
  purchaseOrder: {
    orderNo: "PO20260713001",
    vendorName: "宝钢股份",
    orderDate: "2026-07-13",
    expectedDeliveryDate: "2026-08-01",
    paymentTerms: "货到验收后30天",
    tradeTerms: "CIF（到岸价）",
    projectName: "XX技改项目",
    totalAmount: 125e3,
    remarks: "请按交期准时到货",
    items: [{ materialName: "冷轧钢板", specification: "Q235B 1.5mm", unit: "张", orderedQuantity: 100, unitPrice: 1250, amount: 125e3 }]
  },
  material: {
    code: "MAT-001",
    name: "冷轧钢板",
    specification: "Q235B 1.5mm",
    unit: "张",
    materialType: "raw",
    price: 1250,
    safetyStock: 50,
    currentStock: 320,
    remarks: "常规备料"
  },
  vendor: {
    name: "宝钢股份",
    code: "VEN-001",
    contact: "王经理",
    phone: "13800000000",
    email: "sales@baosteel.com",
    address: "上海市浦东新区",
    level: "A",
    remarks: "战略供应商"
  }
};
const PrintTemplateTab = () => {
  const { templates, addTemplate, updateTemplate, removeTemplate, resetTemplates, getTemplateByEntity } = usePrintTemplateStore();
  const [entity, setEntity] = reactExports.useState("purchaseOrder");
  const entityTemplates = templates.filter((t) => t.entity === entity);
  const previewTemplate = getTemplateByEntity(entity);
  const [dialogOpen, setDialogOpen] = reactExports.useState(false);
  const [editing, setEditing] = reactExports.useState(null);
  const [name, setName] = reactExports.useState("");
  const [title, setTitle] = reactExports.useState("");
  const [paperSize, setPaperSize] = reactExports.useState("A4");
  const [orientation, setOrientation] = reactExports.useState("portrait");
  const [headerText, setHeaderText] = reactExports.useState("");
  const [footerText, setFooterText] = reactExports.useState("");
  const [fieldKeys, setFieldKeys] = reactExports.useState([]);
  const [snackbar, setSnackbar] = reactExports.useState("");
  const openAdd = () => {
    setEditing(null);
    setName("");
    setTitle(PRINT_ENTITY_LABELS[entity] + "打印模板");
    setPaperSize("A4");
    setOrientation("portrait");
    setHeaderText("");
    setFooterText("打印时间：{now}");
    setFieldKeys(PRINT_FIELD_CATALOG[entity].map((c) => c.key));
    setDialogOpen(true);
  };
  const openEdit = (tpl) => {
    setEditing(tpl);
    setName(tpl.name);
    setTitle(tpl.title);
    setPaperSize(tpl.paperSize);
    setOrientation(tpl.orientation);
    setHeaderText(tpl.headerText);
    setFooterText(tpl.footerText);
    setFieldKeys([...tpl.fieldKeys]);
    setDialogOpen(true);
  };
  const toggleField = (key) => {
    setFieldKeys((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };
  const handleSave = () => {
    if (!name.trim()) {
      setSnackbar("请输入模板名称");
      return;
    }
    const tpl = {
      id: (editing == null ? void 0 : editing.id) || `tpl-${entity}-${Date.now()}`,
      name: name.trim(),
      entity,
      title: title.trim() || name.trim(),
      paperSize,
      orientation,
      headerText,
      footerText,
      fieldKeys
    };
    if (editing) {
      updateTemplate(editing.id, tpl);
      setSnackbar("已更新模板");
    } else {
      addTemplate(tpl);
      setSnackbar("已新增模板");
    }
    setDialogOpen(false);
  };
  const handleDelete = (id) => {
    if (confirm("确定删除该打印模板？")) {
      removeTemplate(id);
      setSnackbar("已删除模板");
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 600, children: "打印模板设计器" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "为单据设计打印版式（标题/纸张/页眉页脚/字段），业务页面「打印」按钮将套用对应模板。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(RestartAlt, {}), color: "warning", onClick: () => {
          if (confirm("恢复全部默认模板？")) {
            resetTemplates();
            setSnackbar("已恢复默认");
          }
        }, children: "恢复默认" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: openAdd, children: "新增模板" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { minWidth: 200 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "业务实体" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: entity, label: "业务实体", onChange: (e) => setEntity(e.target.value), children: ENTITIES.map((en) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: en, children: PRINT_ENTITY_LABELS[en] }, en)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid_, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { flex: "1 1 320px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "模板名称" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "纸张" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "字段数" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "操作" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
          entityTemplates.map((tpl) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: tpl.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: `${tpl.paperSize}·${tpl.orientation === "portrait" ? "纵向" : "横向"}` }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: tpl.fieldKeys.length }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "编辑", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => openEdit(tpl), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "删除", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => handleDelete(tpl.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) })
            ] })
          ] }, tpl.id)),
          entityTemplates.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { colSpan: 4, sx: { textAlign: "center", color: "text.secondary", py: 4 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Description, { sx: { fontSize: 32, opacity: 0.3, display: "block", mx: "auto", mb: 1 } }),
            "暂无模板，点击「新增模板」"
          ] }) })
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { flex: "1 1 420px" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", sx: { mb: 1, display: "flex", alignItems: "center", gap: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Print, { fontSize: "small" }),
          " 实时预览（样例数据）"
        ] }),
        previewTemplate ? /* @__PURE__ */ jsxRuntimeExports.jsx(PrintPreview, { template: previewTemplate, record: SAMPLE_RECORDS[entity] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", children: "该实体暂无模板，请先新增。" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: dialogOpen, onClose: () => setDialogOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: editing ? "编辑打印模板" : "新增打印模板" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { sx: { pt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, sx: { mt: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "模板名称", value: name, onChange: (e) => setName(e.target.value), autoFocus: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "单据标题", value: title, onChange: (e) => setTitle(e.target.value), placeholder: "如：采购订单" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "纸张" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: paperSize, label: "纸张", onChange: (e) => setPaperSize(e.target.value), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "A4", children: "A4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "A5", children: "A5" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "方向" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: orientation, label: "方向", onChange: (e) => setOrientation(e.target.value), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "portrait", children: "纵向" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "landscape", children: "横向" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, multiline: true, rows: 2, label: "页眉", value: headerText, onChange: (e) => setHeaderText(e.target.value), placeholder: "支持换行，留空不显示" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, multiline: true, rows: 2, label: "页脚", value: footerText, onChange: (e) => setFooterText(e.target.value), placeholder: "可用 {now} 表示打印时间" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { mb: 1 }, children: "打印字段（勾选）" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", flexWrap: "wrap", gap: 1 }, children: PRINT_FIELD_CATALOG[entity].map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            FormControlLabel,
            {
              control: /* @__PURE__ */ jsxRuntimeExports.jsx(Checkbox, { checked: fieldKeys.includes(c.key), onChange: () => toggleField(c.key) }),
              label: c.label
            },
            c.key
          )) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDialogOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleSave, children: "保存" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Snackbar, { open: !!snackbar, autoHideDuration: 2e3, onClose: () => setSnackbar(""), message: snackbar })
  ] });
};
const Grid_ = ({ children }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-start" }, children });
const StepConfigRow = ({
  step,
  idx,
  defaultFields,
  isMakePath,
  onRoleChange,
  onToggleField
}) => /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
  /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", sx: { mb: 1 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", sx: { fontWeight: 600 }, children: [
      "步骤 ",
      idx + 1,
      "：",
      step.label
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { minWidth: 200 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "处理角色" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Select,
        {
          label: "处理角色",
          value: step.role,
          onChange: (e) => onRoleChange(idx, e.target.value),
          children: Object.keys(ROLE_NAMES).map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: r, children: ROLE_NAMES[r] }, r))
        }
      )
    ] })
  ] }),
  /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 1 } }),
  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "可编辑字段" }),
  /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 1, flexWrap: "wrap", useFlexGap: true, sx: { mt: 1 }, children: defaultFields.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "（批准步骤，无可编辑字段）" }) : defaultFields.map((field) => {
    const on = step.fields.includes(field);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Chip,
      {
        label: field,
        color: on ? isMakePath ? "secondary" : "primary" : "default",
        variant: on ? "filled" : "outlined",
        clickable: true,
        onClick: () => onToggleField(idx, field),
        sx: { mb: 1 }
      },
      field
    );
  }) })
] });
const MaterialApprovalTab = () => {
  const { materialApprovalConfig, setMaterialApprovalConfig } = useSettingsStore();
  const [local, setLocal] = reactExports.useState(materialApprovalConfig);
  reactExports.useEffect(() => {
    setLocal(materialApprovalConfig);
  }, [materialApprovalConfig]);
  const handleEnabledChange = (checked) => {
    setLocal((prev) => ({ ...prev, enabled: checked }));
  };
  const handleRoleChange = (stepIdx, role) => {
    setLocal((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => i === stepIdx ? { ...s, role } : s)
    }));
  };
  const handleToggleField = (stepIdx, field) => {
    setLocal((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => {
        if (i !== stepIdx) return s;
        const has = s.fields.includes(field);
        return {
          ...s,
          fields: has ? s.fields.filter((f) => f !== field) : [...s.fields, field]
        };
      })
    }));
  };
  const handleMakeRoleChange = (stepIdx, role) => {
    const currentMake = local.makeSteps || DEFAULT_MATERIAL_MAKE_STEPS.map((s) => ({ ...s, fields: [...s.fields] }));
    setLocal((prev) => ({
      ...prev,
      makeSteps: currentMake.map((s, i) => i === stepIdx ? { ...s, role } : s)
    }));
  };
  const handleMakeToggleField = (stepIdx, field) => {
    const currentMake = local.makeSteps || DEFAULT_MATERIAL_MAKE_STEPS.map((s) => ({ ...s, fields: [...s.fields] }));
    setLocal((prev) => ({
      ...prev,
      makeSteps: currentMake.map((s, i) => {
        if (i !== stepIdx) return s;
        const has = s.fields.includes(field);
        return {
          ...s,
          fields: has ? s.fields.filter((f) => f !== field) : [...s.fields, field]
        };
      })
    }));
  };
  const handleSave = () => {
    setMaterialApprovalConfig(local);
  };
  const handleRestore = () => {
    const def = {
      enabled: true,
      steps: DEFAULT_MATERIAL_BUY_STEPS.map((s) => ({ ...s, fields: [...s.fields] })),
      makeSteps: DEFAULT_MATERIAL_MAKE_STEPS.map((s) => ({ ...s, fields: [...s.fields] }))
    };
    setMaterialApprovalConfig(def);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 1 }, children: "物料新增审批" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: [
      "启用后，新增物料将进入分步审批流程，最终批准才生成正式物料档案。 系统根据「自制/外购」字段自动选择审批路径： 外购件 → 发起申请 → ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "采购审核" }),
      " → 批准生效； 自制件 → 发起申请 → ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "工艺审核" }),
      " → 批准生效。"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2, mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      FormControlLabel,
      {
        control: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Switch,
          {
            "data-testid": "approval-enabled",
            checked: local.enabled,
            onChange: (e) => handleEnabledChange(e.target.checked)
          }
        ),
        label: local.enabled ? "审批已启用" : "审批已关闭（新增物料直接保存）"
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 3, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", color: "primary", sx: { mb: 1, fontWeight: 600 }, children: "📦 外购件路径（makeOrBuy = 外购）" }),
        local.steps.map((step, idx) => {
          var _a;
          const defaultFields = ((_a = DEFAULT_MATERIAL_BUY_STEPS[idx]) == null ? void 0 : _a.fields) ?? [];
          return /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2, mb: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            StepConfigRow,
            {
              step,
              idx,
              defaultFields,
              onRoleChange: handleRoleChange,
              onToggleField: handleToggleField
            }
          ) }, `buy-${idx}`);
        })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", color: "secondary", sx: { mb: 1, fontWeight: 600 }, children: "🔧 自制件路径（makeOrBuy = 自制）" }),
        (local.makeSteps || DEFAULT_MATERIAL_MAKE_STEPS).map((step, idx) => {
          var _a;
          const defaultFields = ((_a = DEFAULT_MATERIAL_MAKE_STEPS[idx]) == null ? void 0 : _a.fields) ?? [];
          return /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2, mb: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            StepConfigRow,
            {
              step,
              idx,
              defaultFields,
              isMakePath: true,
              onRoleChange: (i, role) => handleMakeRoleChange(i, role),
              onToggleField: (i, field) => handleMakeToggleField(i, field)
            }
          ) }, `make-${idx}`);
        })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, sx: { mt: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleSave, children: "保存" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(RestartAlt, {}), onClick: handleRestore, children: "恢复默认" })
    ] })
  ] });
};
const WEIGHT_LABELS$1 = {
  bomUsage: "更多BOM使用",
  purchaseFreq: "采购频次高",
  shortLead: "交货期短",
  lowMoq: "起订量低",
  goodQuality: "质量好"
};
const WEIGHT_KEYS$1 = ["bomUsage", "purchaseFreq", "shortLead", "lowMoq", "goodQuality"];
const DEFAULT_CONFIG$1 = {
  enabled: true,
  weights: { bomUsage: 25, purchaseFreq: 25, shortLead: 20, lowMoq: 15, goodQuality: 15 },
  thresholds: { A: 80, B: 60, C: 40 }
};
const MaterialRatingTab = () => {
  const materialRatingConfig = useSettingsStore((s) => s.materialRatingConfig);
  const setMaterialRatingConfig = useSettingsStore((s) => s.setMaterialRatingConfig);
  const [enabled, setEnabled] = reactExports.useState(materialRatingConfig.enabled);
  const [weights, setWeights] = reactExports.useState({ ...materialRatingConfig.weights });
  const [thresholds, setThresholds] = reactExports.useState({
    ...materialRatingConfig.thresholds
  });
  const handleSave = () => {
    setMaterialRatingConfig({ enabled, weights, thresholds });
  };
  const handleReset = () => {
    setEnabled(DEFAULT_CONFIG$1.enabled);
    setWeights({ ...DEFAULT_CONFIG$1.weights });
    setThresholds({ ...DEFAULT_CONFIG$1.thresholds });
    setMaterialRatingConfig(DEFAULT_CONFIG$1);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 2 }, children: "物料自动评级设置" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 3 }, children: "配置各评价指标权重（0-100）与等级阈值，详情页将实时聚合 BOM、采购、质量数据计算评级。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      FormControlLabel,
      {
        control: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Switch,
          {
            "data-testid": "rating-enabled",
            checked: enabled,
            onChange: (e) => setEnabled(e.target.checked)
          }
        ),
        label: "启用自动评级",
        sx: { mb: 2 }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2, mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", sx: { mb: 2 }, children: "指标权重" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 2, children: WEIGHT_KEYS$1.map((key) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          "data-testid": `rating-weight-${key}`,
          label: WEIGHT_LABELS$1[key],
          type: "number",
          value: weights[key],
          InputProps: { inputProps: { min: 0, max: 100 } },
          onChange: (e) => {
            const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
            setWeights((prev) => ({ ...prev, [key]: v }));
          },
          fullWidth: true
        },
        key
      )) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2, mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", sx: { mb: 2 }, children: "等级阈值（总分 ≥ 阈值）" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            "data-testid": "rating-threshold-A",
            label: "A 级阈值",
            type: "number",
            value: thresholds.A,
            InputProps: { inputProps: { min: 0, max: 100 } },
            onChange: (e) => setThresholds((prev) => ({ ...prev, A: Number(e.target.value) || 0 })),
            fullWidth: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            "data-testid": "rating-threshold-B",
            label: "B 级阈值",
            type: "number",
            value: thresholds.B,
            InputProps: { inputProps: { min: 0, max: 100 } },
            onChange: (e) => setThresholds((prev) => ({ ...prev, B: Number(e.target.value) || 0 })),
            fullWidth: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            "data-testid": "rating-threshold-C",
            label: "C 级阈值",
            type: "number",
            value: thresholds.C,
            InputProps: { inputProps: { min: 0, max: 100 } },
            onChange: (e) => setThresholds((prev) => ({ ...prev, C: Number(e.target.value) || 0 })),
            fullWidth: true
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 2 } }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleSave, children: "保存" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", onClick: handleReset, children: "恢复默认" })
    ] })
  ] });
};
const DisplaySettingsTab = () => {
  var _a;
  const theme = useTheme();
  const p = theme.palette.primary.main;
  const {
    mode,
    primary,
    density,
    fontSize,
    highContrast,
    setMode,
    setPrimary,
    setDensity,
    setFontSize,
    setHighContrast,
    reset
  } = useDisplayStore();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 0.5, fontWeight: 600, color: "text.primary" }, children: "显示与主题" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "text.secondary", mb: 3 }, children: "个性化您的界面外观。所有设置实时生效并自动保存到本地，刷新后保留。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2.5, borderRadius: 2, height: "100%" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 2, color: "text.primary" }, children: "主题模式" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          ToggleButtonGroup,
          {
            exclusive: true,
            value: mode,
            onChange: (_, v) => v && setMode(v),
            sx: { width: "100%" },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(ToggleButton, { value: "light", sx: { flex: 1, py: 1.5, borderRadius: 2 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(LightMode, { sx: { mr: 1, fontSize: 20 } }),
                " 浅色"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(ToggleButton, { value: "dark", sx: { flex: 1, py: 1.5, borderRadius: 2 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DarkMode, { sx: { mr: 1, fontSize: 20 } }),
                " 深色"
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "text.secondary", display: "block", mt: 1.5 }, children: "深色模式降低夜间用眼疲劳；深色下页面框架与组件自动适配，列表/表单沿用语义配色。" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2.5, borderRadius: 2, height: "100%" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 2, color: "text.primary" }, children: "主题色" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 1.5, children: PRIMARY_OPTIONS.map((opt) => {
          const selected = primary === opt.value;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: opt.label, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              onClick: () => setPrimary(opt.value),
              sx: {
                width: 56,
                height: 56,
                borderRadius: 2,
                p: 0,
                bgcolor: alpha(opt.main, 0.12),
                border: selected ? `2px solid ${opt.main}` : `2px solid transparent`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { sx: { bgcolor: opt.main, width: 32, height: 32 }, children: selected ? /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { sx: { fontSize: 18, color: "#fff" } }) : null })
            }
          ) }, opt.value);
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "text.secondary", display: "block", mt: 1.5 }, children: "主题色应用于主按钮、选中态、链接与强调元素。" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2.5, borderRadius: 2, height: "100%" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 2, color: "text.primary" }, children: "界面密度" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ToggleButtonGroup,
          {
            exclusive: true,
            value: density,
            onChange: (_, v) => v && setDensity(v),
            sx: { width: "100%" },
            children: DENSITY_OPTIONS.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(ToggleButton, { value: opt.value, sx: { flex: 1, py: 1.2, borderRadius: 2 }, children: opt.label }, opt.value))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "text.secondary", display: "block", mt: 1.5 }, children: (_a = DENSITY_OPTIONS.find((o) => o.value === density)) == null ? void 0 : _a.desc })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2.5, borderRadius: 2, height: "100%" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 2, color: "text.primary" }, children: "字号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ToggleButtonGroup,
          {
            exclusive: true,
            value: fontSize,
            onChange: (_, v) => v && setFontSize(v),
            sx: { width: "100%", mb: 2 },
            children: FONT_SIZE_OPTIONS.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(ToggleButton, { value: opt.value, sx: { flex: 1, py: 1.2, borderRadius: 2 }, children: opt.label }, opt.value))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 1.5, borderColor: "divider" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormControlLabel,
          {
            control: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Switch,
              {
                checked: highContrast,
                onChange: (e) => setHighContrast(e.target.checked),
                sx: { "& .MuiSwitch-switchBase.Mui-checked": { color: p }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: p } }
              }
            ),
            label: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, sx: { color: "text.primary" }, children: "高对比模式" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "text.secondary" }, children: "增强文字与边框对比，提升可读性（WCAG 取向）" })
            ] })
          }
        )
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mt: 3, display: "flex", justifyContent: "flex-end" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        variant: "outlined",
        startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(RestartAlt, {}),
        onClick: reset,
        sx: { color: "text.secondary", borderColor: "divider" },
        children: "恢复默认显示设置"
      }
    ) })
  ] });
};
const WEIGHT_LABELS = {
  quality: "质量合格率（来料检验通过率 / NCR）",
  delivery: "交期达成率（按约交付占比）",
  price: "价格竞争力（对比同物料最低价）"
};
const WEIGHT_KEYS = ["quality", "delivery", "price"];
const DEFAULT_CONFIG = {
  enabled: true,
  weights: { quality: 40, delivery: 35, price: 25 },
  thresholds: { A: 80, B: 60, C: 40 }
};
const VendorRatingTab = () => {
  const vendorRatingConfig = useSettingsStore((s) => s.vendorRatingConfig);
  const setVendorRatingConfig = useSettingsStore((s) => s.setVendorRatingConfig);
  const [enabled, setEnabled] = reactExports.useState(vendorRatingConfig.enabled);
  const [weights, setWeights] = reactExports.useState({ ...vendorRatingConfig.weights });
  const [thresholds, setThresholds] = reactExports.useState({
    ...vendorRatingConfig.thresholds
  });
  const handleSave = () => {
    setVendorRatingConfig({ enabled, weights, thresholds });
  };
  const handleReset = () => {
    setEnabled(DEFAULT_CONFIG.enabled);
    setWeights({ ...DEFAULT_CONFIG.weights });
    setThresholds({ ...DEFAULT_CONFIG.thresholds });
    setVendorRatingConfig(DEFAULT_CONFIG);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 2 }, children: "供应商绩效自动评级设置" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 3 }, children: "配置各绩效指标权重（0-100）与等级阈值。供应商详情页将实时聚合质量（来料检验）、交期（采购订单）、价格（价目表）数据自动计算 A/B/C/D 评级，无需人工干预。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      FormControlLabel,
      {
        control: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Switch,
          {
            "data-testid": "vendor-rating-enabled",
            checked: enabled,
            onChange: (e) => setEnabled(e.target.checked)
          }
        ),
        label: "启用自动评级",
        sx: { mb: 2 }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2, mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", sx: { mb: 2 }, children: "指标权重" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 2, children: WEIGHT_KEYS.map((key) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          "data-testid": `vendor-rating-weight-${key}`,
          label: WEIGHT_LABELS[key],
          type: "number",
          value: weights[key],
          InputProps: { inputProps: { min: 0, max: 100 } },
          onChange: (e) => {
            const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
            setWeights((prev) => ({ ...prev, [key]: v }));
          },
          fullWidth: true
        },
        key
      )) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2, mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", sx: { mb: 2 }, children: "等级阈值（总分 ≥ 阈值）" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            "data-testid": "vendor-rating-threshold-A",
            label: "A 级阈值",
            type: "number",
            value: thresholds.A,
            InputProps: { inputProps: { min: 0, max: 100 } },
            onChange: (e) => setThresholds((prev) => ({ ...prev, A: Number(e.target.value) || 0 })),
            fullWidth: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            "data-testid": "vendor-rating-threshold-B",
            label: "B 级阈值",
            type: "number",
            value: thresholds.B,
            InputProps: { inputProps: { min: 0, max: 100 } },
            onChange: (e) => setThresholds((prev) => ({ ...prev, B: Number(e.target.value) || 0 })),
            fullWidth: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            "data-testid": "vendor-rating-threshold-C",
            label: "C 级阈值",
            type: "number",
            value: thresholds.C,
            InputProps: { inputProps: { min: 0, max: 100 } },
            onChange: (e) => setThresholds((prev) => ({ ...prev, C: Number(e.target.value) || 0 })),
            fullWidth: true
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 2 } }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleSave, children: "保存" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", onClick: handleReset, children: "恢复默认" })
    ] })
  ] });
};
const VendorPortalConfigTab = () => {
  const { vendorPortalConfig, setVendorPortalConfig } = useSettingsStore();
  const { vendorOrderAutoConfirmHours, inquiryAttachmentPolicy, inquiryAttachmentDownloadHours } = vendorPortalConfig;
  const update = (patch) => setVendorPortalConfig({ ...vendorPortalConfig, ...patch });
  const policyLabel = {
    always: "一直允许下载",
    timed: `限时允许（${inquiryAttachmentDownloadHours} 小时内）`,
    viewOnly: "仅在线查看（禁止下载）"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 700, sx: { mb: 0.5 }, children: "供应商门户配置" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "面向供应商门户的订单确认时限与询价附件安全策略。修改即时生效并持久化。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 3, mt: 3, borderRadius: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 1.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Schedule, { color: "primary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "订单确认自动确认时限" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2, fontSize: "0.8rem" }, children: "供应商收到订单确认后，若超过设定时限仍未手动处理，系统将自动确认（状态置为「已确认」）。" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, alignItems: "center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            type: "number",
            label: "默认确认时限",
            value: vendorOrderAutoConfirmHours,
            InputProps: { endAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(InputAdornment, { position: "end", children: "小时" }) },
            inputProps: { min: 0, step: 1 },
            onChange: (e) => update({ vendorOrderAutoConfirmHours: Number(e.target.value) || 0 })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 8, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
          "当前设置：",
          vendorOrderAutoConfirmHours,
          " 小时（0 表示不自动确认）。"
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 3, mt: 3, borderRadius: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 1.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { color: "primary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "询价附件下载策略（技术保密）" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2, fontSize: "0.8rem" }, children: "控制供应商对询价附件（图纸/规格书等）的下载权限，防范技术资料外泄。在线预览仅对图片、PDF 等常见格式开放。" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, alignItems: "center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 5, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "下载策略" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              value: inquiryAttachmentPolicy,
              label: "下载策略",
              onChange: (e) => update({ inquiryAttachmentPolicy: e.target.value }),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "always", children: "一直允许下载" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "timed", children: "限时允许下载" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "viewOnly", children: "仅在线查看（禁止下载）" })
              ]
            }
          )
        ] }) }),
        inquiryAttachmentPolicy === "timed" && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            type: "number",
            label: "允许下载时长",
            value: inquiryAttachmentDownloadHours,
            InputProps: { endAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(InputAdornment, { position: "end", children: "小时" }) },
            inputProps: { min: 1 },
            onChange: (e) => update({ inquiryAttachmentDownloadHours: Number(e.target.value) || 1 })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
          "当前生效策略：",
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: policyLabel[inquiryAttachmentPolicy] })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 2, display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Storefront, { fontSize: "small" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: "以上设置保存于本地（ssa-erp-settings），刷新后仍然有效。" })
    ] })
  ] });
};
const DATE_PATTERN_LABELS = {
  none: "无日期",
  YYYY: "年 (2026)",
  YYYYMM: "年月 (202608)",
  YYYYMMDD: "年月日 (20260805)"
};
const NumberingTab = () => {
  const { rules, updateRule, resetSeq, previewNext, nextNo } = useNumberingStore();
  const [sample, setSample] = reactExports.useState("");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 700, mb: 0.5 }, children: "统一编号规则中心" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#64748B", mb: 2 }, children: "集中维护所有单据的编号规则。修改前缀/日期格式后下方预览实时更新；试生成会占用一个序号。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, sx: { borderRadius: 3, mb: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 700 }, children: "单据类型" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 700 }, children: "前缀" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 700 }, children: "分隔符" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 700 }, children: "日期格式" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 700 }, children: "序号位数" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 700 }, children: "实时预览" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 700, textAlign: "right" }, children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: DOC_TYPES.map((dt) => {
        const rule = rules[dt];
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 600 }, children: rule.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: dt, size: "small", sx: { mt: 0.5, bgcolor: "#EFF6FF", color: "#2563EB", fontFamily: "monospace" } })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              size: "small",
              value: rule.prefix,
              onChange: (e) => updateRule(dt, { prefix: e.target.value }),
              "data-testid": `nr-prefix-${dt}`,
              sx: { width: 110, "& input": { fontFamily: "monospace" } }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              size: "small",
              value: rule.separator,
              onChange: (e) => updateRule(dt, { separator: e.target.value }),
              sx: { width: 70, "& input": { fontFamily: "monospace" } }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              select: true,
              size: "small",
              value: rule.datePattern,
              onChange: (e) => updateRule(dt, { datePattern: e.target.value }),
              sx: { minWidth: 150 },
              children: Object.keys(DATE_PATTERN_LABELS).map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: p, children: DATE_PATTERN_LABELS[p] }, p))
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              type: "number",
              size: "small",
              value: rule.seqLength,
              onChange: (e) => updateRule(dt, { seqLength: Math.max(1, Number(e.target.value) || 1) }),
              sx: { width: 90 }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Typography,
            {
              variant: "body2",
              "data-testid": `nr-preview-${dt}`,
              sx: { fontWeight: 600, fontFamily: "monospace", color: "#0F766E" },
              children: previewNext(dt)
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "small",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Refresh, {}),
              onClick: () => resetSeq(dt),
              "data-testid": `nr-reset-${dt}`,
              children: "重置序号"
            }
          ) })
        ] }, dt);
      }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 2 } }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "contained",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Casino, {}),
          onClick: () => setSample(nextNo("WO")),
          "data-testid": "nr-sample",
          children: "试生成工单号（消耗序号）"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#64748B" }, children: "试生成结果" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Typography,
          {
            variant: "body1",
            "data-testid": "nr-sample-result",
            sx: { fontWeight: 700, fontFamily: "monospace", color: "#1E293B" },
            children: sample || "—"
          }
        )
      ] })
    ] })
  ] });
};
const MODULE_LABELS = {
  production: "生产",
  purchase: "采购",
  sales: "销售",
  warehouse: "仓储",
  quality: "质量"
};
const MODULE_FIELD_OPTIONS = {
  purchase: [
    { value: "unitPrice", label: "采购单价" },
    { value: "amount", label: "采购金额" },
    { value: "vendorName", label: "供应商名称" }
  ],
  sales: [
    { value: "unitPrice", label: "销售单价" },
    { value: "costPrice", label: "成本价" },
    { value: "customerCredit", label: "客户信用额度" }
  ],
  production: [
    { value: "cost", label: "生产成本" },
    { value: "wages", label: "工时工资" }
  ],
  warehouse: [
    { value: "inventoryValue", label: "库存价值" }
  ],
  quality: [
    { value: "inspectionCost", label: "检验费用" }
  ]
};
const DataPermissionTab = () => {
  const {
    enabled,
    mode,
    modules,
    sensitiveFields,
    setEnabled,
    setMode,
    toggleModule,
    addSensitiveFieldConfig,
    removeSensitiveFieldConfig
  } = useDataPermissionStore();
  const currentOrg = useCurrentOrg();
  const [newRole, setNewRole] = reactExports.useState("");
  const [newModule, setNewModule] = reactExports.useState("");
  const [newFields, setNewFields] = reactExports.useState([]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 700, mb: 0.5 }, children: "数据权限（行级 / 组织级）" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { color: "#64748B", mb: 2 }, children: [
      "在多组织基础上落地数据过滤：开启后，业务列表按当前组织（",
      (currentOrg == null ? void 0 : currentOrg.name) ?? "—",
      "）过滤行级数据。"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3, p: 2, mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", sx: { fontWeight: 600 }, children: "启用数据权限" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#64748B" }, children: "关闭则全部数据可见（默认兼容旧逻辑）" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormControlLabel,
          {
            control: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Switch,
              {
                checked: enabled,
                onChange: (e) => setEnabled(e.target.checked),
                "data-testid": "dp-switch"
              }
            ),
            label: enabled ? "已开启" : "已关闭"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 2 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { fontWeight: 600, mb: 1 }, children: "组织级模式" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(ButtonGroup, { variant: "outlined", sx: { mb: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: mode === "all" ? "contained" : "outlined",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Visibility, {}),
            onClick: () => setMode("all"),
            "data-testid": "dp-mode-all",
            children: "全部组织可见"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: mode === "current-org" ? "contained" : "outlined",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, {}),
            onClick: () => setMode("current-org"),
            "data-testid": "dp-mode-current-org",
            children: "仅当前组织"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mt: 1, alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Business, { fontSize: "small", sx: { mr: 1 } }),
        "当前组织：",
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { component: "span", "data-testid": "dp-current-org", sx: { fontWeight: 700, mx: 0.5 }, children: (currentOrg == null ? void 0 : currentOrg.name) ?? (currentOrg == null ? void 0 : currentOrg.id) ?? "—" }),
        "（",
        mode === "current-org" ? "仅显示归属该组织的行级数据，遗留数据仍可见" : "显示全部组织数据",
        "）"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3, p: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { fontWeight: 600, mb: 1 }, children: "纳入过滤的业务模块" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 1, flexWrap: "wrap", useFlexGap: true, children: Object.keys(MODULE_LABELS).map((key) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: MODULE_LABELS[key],
          clickable: true,
          color: modules[key] ? "primary" : "default",
          variant: modules[key] ? "filled" : "outlined",
          onClick: () => toggleModule(key),
          "data-testid": `dp-module-${key}`
        },
        key
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#64748B", display: "block", mt: 1 }, children: "未勾选的模块即使开启数据权限也显示全部数据；无组织标记的遗留数据始终可见。" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3, p: 2, mt: 2 }, "data-testid": "dp-sensitive-fields", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { fontWeight: 600, mb: 1 }, children: "敏感字段屏蔽（按角色隐藏模块字段）" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#64748B", display: "block", mb: 2 }, children: "例如：仓库员看不到采购单价、采购员看不到销售价等。配置后对应角色在页面中看到「***」掩码。" }),
      sensitiveFields.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 1, sx: { mb: 2 }, children: sensitiveFields.map((cfg) => {
        var _a;
        const roleName = ((_a = ROLE_DEFINITIONS.find((r) => r.id === cfg.role)) == null ? void 0 : _a.name) || cfg.role;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Box,
          {
            sx: {
              display: "flex",
              alignItems: "center",
              gap: 1,
              p: 1,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "#F8FAFC"
            },
            "data-testid": `dp-sf-${cfg.role}-${cfg.module}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: roleName, size: "small", color: "primary", variant: "outlined" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: MODULE_LABELS[cfg.module] || cfg.module }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { color: "#EF4444", flex: 1 }, children: [
                "隐藏：",
                cfg.fields.map((f) => {
                  var _a2;
                  const opts = MODULE_FIELD_OPTIONS[cfg.module] || [];
                  return ((_a2 = opts.find((o) => o.value === f)) == null ? void 0 : _a2.label) || f;
                }).join("、")
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                IconButton,
                {
                  size: "small",
                  color: "error",
                  onClick: () => removeSensitiveFieldConfig(cfg.role, cfg.module),
                  "data-testid": `dp-sf-delete-${cfg.role}-${cfg.module}`,
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" })
                }
              )
            ]
          },
          `${cfg.role}-${cfg.module}`
        );
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { minWidth: 140 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "角色" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              value: newRole,
              label: "角色",
              onChange: (e) => setNewRole(e.target.value),
              "data-testid": "dp-sf-role-select",
              children: ROLE_DEFINITIONS.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: r.id, children: r.name }, r.id))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { minWidth: 120 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "模块" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              value: newModule,
              label: "模块",
              onChange: (e) => setNewModule(e.target.value),
              "data-testid": "dp-sf-module-select",
              children: Object.entries(MODULE_LABELS).map(([key, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: key, children: label }, key))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { minWidth: 220 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "隐藏字段" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              multiple: true,
              value: newFields,
              label: "隐藏字段",
              onChange: (e) => setNewFields(e.target.value),
              input: /* @__PURE__ */ jsxRuntimeExports.jsx(OutlinedInput, { label: "隐藏字段" }),
              "data-testid": "dp-sf-fields-select",
              renderValue: (selected) => selected.map((v) => {
                var _a;
                const opts = MODULE_FIELD_OPTIONS[newModule] || [];
                return ((_a = opts.find((o) => o.value === v)) == null ? void 0 : _a.label) || v;
              }).join(", "),
              children: (MODULE_FIELD_OPTIONS[newModule] || []).map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: opt.value, children: opt.label }, opt.value))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            size: "small",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}),
            disabled: !newRole || !newModule || newFields.length === 0,
            onClick: () => {
              const config = {
                role: newRole,
                module: newModule,
                fields: [...newFields]
              };
              addSensitiveFieldConfig(config);
              setNewRole("");
              setNewModule("");
              setNewFields([]);
            },
            "data-testid": "dp-sf-add-btn",
            children: "添加"
          }
        )
      ] })
    ] })
  ] });
};
const emptyItem = {
  customerId: "",
  customerName: "",
  materialId: "",
  materialCode: "",
  materialName: "",
  specification: "",
  unit: "",
  basePrice: 0,
  discountRate: 0,
  tiers: [],
  currency: "CNY",
  status: "active"
};
const emptyPromo = {
  name: "",
  type: "percent",
  value: 0,
  enabled: true
};
const SalesPriceTab = () => {
  const { priceList, promotions, addPriceItem, updatePriceItem, deletePriceItem, addPromotion, updatePromotion, deletePromotion, resolvePrice } = useSalesPriceStore();
  const customers = useCustomerStore((s) => s.customers);
  const materials = useMaterialStore((s) => s.materials);
  const [open, setOpen] = reactExports.useState(false);
  const [item, setItem] = reactExports.useState(emptyItem);
  const [promoOpen, setPromoOpen] = reactExports.useState(false);
  const [promo, setPromo] = reactExports.useState(emptyPromo);
  const [calcCustomer, setCalcCustomer] = reactExports.useState("");
  const [calcMaterial, setCalcMaterial] = reactExports.useState("");
  const [calcQty, setCalcQty] = reactExports.useState(10);
  const [calcResult, setCalcResult] = reactExports.useState("");
  const onPickMaterial = (mid) => {
    const m = materials.find((x) => x.id === mid);
    setItem((prev) => ({
      ...prev,
      materialId: mid,
      materialCode: (m == null ? void 0 : m.code) || "",
      materialName: (m == null ? void 0 : m.name) || "",
      specification: (m == null ? void 0 : m.specification) || "",
      unit: (m == null ? void 0 : m.unit) || "",
      basePrice: (m == null ? void 0 : m.price) || prev.basePrice
    }));
  };
  const onPickCalcMaterial = (mid) => {
    materials.find((x) => x.id === mid);
    setCalcMaterial(mid);
    setCalcResult("");
  };
  const handleSave = () => {
    if (!item.materialId) return;
    const cust = customers.find((c) => c.id === item.customerId);
    addPriceItem({ ...item, customerName: cust == null ? void 0 : cust.name });
    setOpen(false);
    setItem(emptyItem);
  };
  const handleSavePromo = () => {
    if (!promo.name.trim()) return;
    addPromotion(promo);
    setPromoOpen(false);
    setPromo(emptyPromo);
  };
  const doCalc = () => {
    var _a;
    if (!calcMaterial) return;
    const base = ((_a = materials.find((m) => m.id === calcMaterial)) == null ? void 0 : _a.price) || 0;
    const r = resolvePrice(calcCustomer || void 0, calcMaterial, Number(calcQty) || 0, base);
    setCalcResult(
      `基准价 ${formatCurrency(base)} → 折扣率 ${r.discountRate}%` + (r.promotionApplied ? ` + 促销「${r.promotionApplied}」` : "") + ` → 最终单价 ${formatCurrency(r.unitPrice)}`
    );
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 2, borderRadius: 2 }, children: [
      "C5 销售价目表 / 折扣 / 促销：支持「客户级 / 通用物料级」单价 + 折扣率 + 阶梯量价（tier）+ 限时促销（百分比 / 立减 / 特价）。 销售订单选择物料时自动调用 ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: "resolvePrice" }),
      " 取价。"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2, borderRadius: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { mb: 1.5, fontWeight: 600 }, children: "取价试算（resolvePrice）" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: { xs: "column", sm: "row" }, spacing: 1.5, alignItems: "flex-end", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          TextField,
          {
            select: true,
            label: "客户(可空=通用)",
            value: calcCustomer,
            onChange: (e) => setCalcCustomer(e.target.value),
            sx: { minWidth: 180 },
            SelectProps: { SelectDisplayProps: { "data-testid": "sp-calc-customer" } },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "通用物料价" }),
              customers.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: c.id, children: c.name }, c.id))
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            select: true,
            label: "物料",
            value: calcMaterial,
            onChange: (e) => onPickCalcMaterial(e.target.value),
            sx: { minWidth: 200 },
            SelectProps: { SelectDisplayProps: { "data-testid": "sp-calc-material" } },
            children: materials.slice(0, 30).map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: m.id, children: m.name }, m.id))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { label: "数量", type: "number", value: calcQty, onChange: (e) => setCalcQty(Number(e.target.value)), sx: { width: 100 }, inputProps: { "data-testid": "sp-calc-qty" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Calculate, {}), onClick: doCalc, "data-testid": "sp-calc-btn", children: "试算" })
      ] }),
      calcResult && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { mt: 1.5, color: "#0F766E", fontWeight: 600 }, "data-testid": "sp-calc-result", children: calcResult })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, children: [
        "价目表（",
        priceList.length,
        "）"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => {
        setItem(emptyItem);
        setOpen(true);
      }, children: "新增价目表项" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, sx: { borderRadius: 2, mb: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "客户" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "基准价" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "折扣率" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "阶梯量价" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: priceList.map((p) => {
        var _a;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: p.customerName || /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: "通用", color: "default" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
            p.materialName,
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
              "(",
              p.materialCode,
              ")"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(p.basePrice) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
            p.discountRate,
            "%"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: ((_a = p.tiers) == null ? void 0 : _a.length) ? p.tiers.map((t) => `≥${t.minQty}:${t.unitPrice}`).join(" / ") : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => deletePriceItem(p.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) })
        ] }, p.id);
      }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, children: [
        "促销活动（",
        promotions.length,
        "）"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => {
        setPromo(emptyPromo);
        setPromoOpen(true);
      }, children: "新增促销" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, sx: { borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "名称" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "类型" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "值" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "适用" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: promotions.map((p) => {
        var _a, _b;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: p.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: p.type === "percent" ? "百分比折扣" : p.type === "amount" ? "立减金额" : "固定特价" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
            p.value,
            p.type === "percent" ? "%" : ""
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
            p.customerId ? `客户 ${((_a = customers.find((c) => c.id === p.customerId)) == null ? void 0 : _a.name) || p.customerId}` : "全部客户",
            " / ",
            p.materialId ? `物料 ${((_b = materials.find((m) => m.id === p.materialId)) == null ? void 0 : _b.name) || p.materialId}` : "全部物料"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: p.enabled ? "启用" : "停用", color: p.enabled ? "success" : "default" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => deletePromotion(p.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) })
        ] }, p.id);
      }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增价目表项" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TextField, { select: true, fullWidth: true, label: "客户(可空=通用)", value: item.customerId, onChange: (e) => setItem({ ...item, customerId: e.target.value }), sx: { mt: 1, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "通用物料价" }),
          customers.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: c.id, children: c.name }, c.id))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { select: true, fullWidth: true, label: "物料", value: item.materialId, onChange: (e) => onPickMaterial(e.target.value), sx: { mb: 2 }, children: materials.slice(0, 30).map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: m.id, children: m.name }, m.id)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, sx: { mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "基准单价", type: "number", value: item.basePrice, onChange: (e) => setItem({ ...item, basePrice: Number(e.target.value) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "折扣率(%)", type: "number", value: item.discountRate, onChange: (e) => setItem({ ...item, discountRate: Number(e.target.value) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: "阶梯量价（可选，每行：起订量:单价，逗号分隔）" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            label: "阶梯量价",
            value: (item.tiers || []).map((t) => `${t.minQty}:${t.unitPrice}`).join(", "),
            onChange: (e) => {
              const tiers = e.target.value.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
                const [minQty, unitPrice] = s.split(":").map((x) => Number(x));
                return { minQty: minQty || 0, unitPrice: unitPrice || 0 };
              }).filter((t) => t.unitPrice > 0);
              setItem({ ...item, tiers });
            },
            helperText: "例：50:4050, 100:3950"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleSave, children: "确定" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: promoOpen, onClose: () => setPromoOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增促销" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "促销名称", value: promo.name, onChange: (e) => setPromo({ ...promo, name: e.target.value }), sx: { mt: 1, mb: 2 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TextField, { select: true, fullWidth: true, label: "类型", value: promo.type, onChange: (e) => setPromo({ ...promo, type: e.target.value }), sx: { mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "percent", children: "百分比折扣" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "amount", children: "立减金额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "fixed", children: "固定特价" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, sx: { mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "优惠值", type: "number", value: promo.value, onChange: (e) => setPromo({ ...promo, value: Number(e.target.value) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TextField, { select: true, fullWidth: true, label: "适用客户(可空=全部)", value: promo.customerId || "", onChange: (e) => setPromo({ ...promo, customerId: e.target.value || void 0 }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "全部客户" }),
            customers.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: c.id, children: c.name }, c.id))
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TextField, { select: true, fullWidth: true, label: "适用物料(可空=全部)", value: promo.materialId || "", onChange: (e) => setPromo({ ...promo, materialId: e.target.value || void 0 }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "全部物料" }),
          materials.slice(0, 30).map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: m.id, children: m.name }, m.id))
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setPromoOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleSavePromo, children: "确定" })
      ] })
    ] })
  ] });
};
const STORAGE_PREFIX$1 = "ssa-erp-";
let driver = "local";
const listCollections = () => {
  if (typeof localStorage === "undefined") return [];
  return Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX$1)).sort();
};
const estimateStorageKB = () => {
  if (typeof localStorage === "undefined") return 0;
  const bytes = listCollections().reduce((sum, k) => {
    var _a;
    return sum + (((_a = localStorage.getItem(k)) == null ? void 0 : _a.length) || 0);
  }, 0);
  return Math.round(bytes / 1024 * 10) / 10;
};
const getServerStatus = () => {
  const u = currentUser();
  return {
    driver,
    collections: listCollections().length,
    storageKB: estimateStorageKB(),
    user: u.userName,
    token: u.token
  };
};
const ACTION_COLORS = {
  create: "success",
  update: "info",
  delete: "error",
  login: "default",
  export: "warning",
  approve: "success"
};
const ServerAuditTab = () => {
  const session = useSessionStore((s) => s.current);
  const history = useSessionStore((s) => s.history);
  const switchUser = useSessionStore((s) => s.switchUser);
  const users = useUserStore((s) => s.users);
  const records = useAuditStore((s) => s.records);
  const clearAudit = useAuditStore((s) => s.clearAudit);
  const [filterAction, setFilterAction] = reactExports.useState("");
  const [filterUser, setFilterUser] = reactExports.useState("");
  const status = reactExports.useMemo(() => getServerStatus(), [records.length, session.token]);
  const collections = reactExports.useMemo(() => listCollections(), [records.length]);
  const filtered = records.filter(
    (r) => (!filterAction || r.action === filterAction) && (!filterUser || r.userId === filterUser)
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 2, borderRadius: 2 }, children: [
      "C7 服务端化雏形：多用户会话 + 写操作落库审计 + 持久化抽象层。当前存储驱动为",
      /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
        " ",
        status.driver === "local" ? "本地（localStorage）" : "远端服务"
      ] }),
      "， 所有经 ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: "serverService" }),
      " / store 的写操作都会记录「谁在什么时候改了什么」。"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 2 }, children: [
      { label: "存储驱动", value: status.driver === "local" ? "local（浏览器）" : "remote", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Storage, { fontSize: "small" }), testid: "srv-driver" },
      { label: "数据表数量", value: String(status.collections), icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Storage, { fontSize: "small" }), testid: "srv-collections" },
      { label: "已用存储", value: `${status.storageKB} KB`, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Storage, { fontSize: "small" }), testid: "srv-storage" },
      { label: "审计条数", value: String(records.length), icon: /* @__PURE__ */ jsxRuntimeExports.jsx(History, { fontSize: "small" }), testid: "srv-audit-count" }
    ].map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, borderRadius: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", sx: { color: "text.secondary", mb: 0.5 }, children: [
        c.icon,
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: c.label })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 700, "data-testid": c.testid, children: c.value })
    ] }) }, c.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2, borderRadius: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { mb: 1.5, fontWeight: 600 }, children: "当前会话" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: { xs: "column", sm: "row" }, spacing: 2, alignItems: { sm: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Person, {}), label: session.userName, color: "primary", "data-testid": "srv-current-user" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
          "角色 ",
          session.role,
          " / ",
          session.department
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", "data-testid": "srv-token", children: [
          "token: ",
          session.token
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { flexGrow: 1 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            select: true,
            size: "small",
            label: "切换用户",
            value: session.userId,
            onChange: (e) => switchUser(e.target.value),
            sx: { minWidth: 160 },
            SelectProps: { SelectDisplayProps: { "data-testid": "srv-switch-user" } },
            children: users.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: u.id, children: u.name }, u.id))
          }
        )
      ] }),
      history.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 1.5 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
          "最近会话：",
          history.slice(0, 5).map((h) => h.userName).join(" → ")
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2, borderRadius: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { mb: 1.5, fontWeight: 600 }, children: "数据表（localStorage collections）" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexWrap: "wrap", gap: 0.75 }, children: [
        collections.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: c.replace("ssa-erp-", ""), variant: "outlined" }, c)),
        collections.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "暂无数据表" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, gap: 1, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, children: [
        "审计日志（",
        filtered.length,
        "/",
        records.length,
        "）"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          TextField,
          {
            select: true,
            size: "small",
            label: "操作类型",
            value: filterAction,
            onChange: (e) => setFilterAction(e.target.value),
            sx: { minWidth: 120 },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "全部" }),
              Object.keys(AUDIT_ACTION_LABELS).map((a) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: a, children: AUDIT_ACTION_LABELS[a] }, a))
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          TextField,
          {
            select: true,
            size: "small",
            label: "操作人",
            value: filterUser,
            onChange: (e) => setFilterUser(e.target.value),
            sx: { minWidth: 130 },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "全部" }),
              users.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: u.id, children: u.name }, u.id))
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "small",
            color: "error",
            variant: "outlined",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(DeleteSweep, {}),
            onClick: clearAudit,
            "data-testid": "srv-clear-audit",
            children: "清空"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, sx: { borderRadius: 2, maxHeight: 420 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", stickyHeader: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "时间" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "操作人" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "实体" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "动作" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "摘要" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
        filtered.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": `audit-row-${r.id}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { whiteSpace: "nowrap" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: new Date(r.createdAt).toLocaleString("zh-CN") }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.userName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: r.entity }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: AUDIT_ACTION_LABELS[r.action], color: ACTION_COLORS[r.action] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.summary })
        ] }, r.id)),
        filtered.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 5, align: "center", sx: { py: 3, color: "text.secondary" }, children: "暂无审计记录（新增/修改/删除销售价目表等操作后会自动记录）" }) })
      ] })
    ] }) })
  ] });
};
const STORAGE_PREFIX = "ssa-erp-";
const formatTimestamp = () => {
  const d = /* @__PURE__ */ new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};
const DataManagement = () => {
  const [collections, setCollections] = reactExports.useState([]);
  const [alert, setAlert] = reactExports.useState(null);
  const [resetDialog, setResetDialog] = reactExports.useState(false);
  const [totalKB, setTotalKB] = reactExports.useState(0);
  const [totalKeys, setTotalKeys] = reactExports.useState(0);
  const fileInputRef = reactExports.useRef(null);
  const loadStorageInfo = () => {
    const keys = listCollections();
    const info = keys.map((k) => {
      const raw = localStorage.getItem(k) || "";
      const bytes = raw.length;
      return {
        key: k,
        displayName: k.replace(STORAGE_PREFIX, ""),
        sizeBytes: bytes,
        sizeKB: Math.round(bytes / 1024 * 100) / 100
      };
    });
    setCollections(info);
    setTotalKB(estimateStorageKB());
    setTotalKeys(keys.length);
  };
  reactExports.useEffect(() => {
    loadStorageInfo();
  }, []);
  const handleExport = () => {
    try {
      const data = {};
      listCollections().forEach((k) => {
        data[k] = localStorage.getItem(k) || "";
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ssa-erp-backup-${formatTimestamp()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setAlert({ type: "success", msg: `已导出 ${listCollections().length} 个数据项` });
    } catch (e) {
      setAlert({ type: "error", msg: `导出失败：${e}` });
    }
  };
  const handleImport = (e) => {
    var _a;
    const file = (_a = e.target.files) == null ? void 0 : _a[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        var _a2;
        try {
          const data = JSON.parse((_a2 = ev.target) == null ? void 0 : _a2.result);
          let count = 0;
          Object.entries(data).forEach(([key, val]) => {
            if (key.startsWith(STORAGE_PREFIX)) {
              localStorage.setItem(key, val);
              count++;
            }
          });
          loadStorageInfo();
          setAlert({ type: "success", msg: `已导入 ${count} 个数据项，页面数据已更新` });
        } catch {
          setAlert({ type: "error", msg: "JSON 解析失败，请检查文件格式" });
        }
      };
      reader.readAsText(file);
    } catch (e2) {
      setAlert({ type: "error", msg: `导入失败：${e2}` });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const handleReset = () => {
    try {
      listCollections().forEach((k) => localStorage.removeItem(k));
      setResetDialog(false);
      window.location.reload();
    } catch (e) {
      setAlert({ type: "error", msg: `重置失败：${e}` });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    alert && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Alert,
      {
        severity: alert.type,
        onClose: () => setAlert(null),
        sx: { mb: 3, borderRadius: 2 },
        children: alert.msg
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "center" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "contained",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, {}),
          onClick: handleExport,
          "data-testid": "dm-export",
          children: "一键导出"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "outlined",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, {}),
          onClick: () => {
            var _a;
            return (_a = fileInputRef.current) == null ? void 0 : _a.click();
          },
          "data-testid": "dm-import",
          children: "一键导入"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          ref: fileInputRef,
          type: "file",
          accept: ".json",
          style: { display: "none" },
          onChange: handleImport
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "outlined",
          color: "error",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(DeleteOutline, {}),
          onClick: () => setResetDialog(true),
          "data-testid": "dm-reset",
          children: "重置所有数据"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "刷新信息", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { onClick: loadStorageInfo, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Refresh, {}) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", sx: { borderRadius: 2, borderColor: "#E2E8F0" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { "&:last-child": { pb: 2 } }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "数据表数量" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", fontWeight: 700, sx: { mt: 0.5, color: "#1E293B" }, children: totalKeys })
      ] }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", sx: { borderRadius: 2, borderColor: "#E2E8F0" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { "&:last-child": { pb: 2 } }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "存储用量" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "h4", fontWeight: 700, sx: { mt: 0.5, color: "#1E293B" }, children: [
          totalKB,
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { component: "span", variant: "body2", color: "text.secondary", children: "KB" })
        ] })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600, color: "#1E293B", mb: 2 }, children: "数据表详情" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, variant: "outlined", sx: { borderRadius: 2, borderColor: "#E2E8F0" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "Storage Key" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "显示名称" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "大小 (KB)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "字符数" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: collections.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 4, align: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", sx: { py: 4 }, children: "暂无数据" }) }) }) : collections.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontFamily: "monospace", fontSize: "0.8rem", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }, children: c.key }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: c.displayName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: c.sizeKB }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: c.sizeBytes.toLocaleString() })
      ] }, c.key)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: resetDialog, onClose: () => setResetDialog(false), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: "确认重置所有数据" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContentText, { children: [
          "此操作将清空 ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "所有" }),
          " ssa-erp-* 前缀的 localStorage 数据， 包括用户配置、业务数据、审批流程等。",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "操作不可恢复。" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", sx: { mt: 2, borderRadius: 2 }, children: '建议先通过"一键导出"备份数据。' })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setResetDialog(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", color: "error", onClick: handleReset, children: "确认重置" })
      ] })
    ] })
  ] });
};
const CONDITION_TYPE_LABELS = {
  price: "价格",
  discount: "折扣",
  freight: "运费",
  tax: "税费",
  surcharge: "附加费"
};
const CALC_RULE_LABELS = {
  fixed: "固定金额",
  percentage: "百分比",
  quantity_based: "按数量",
  tiered: "阶梯"
};
const emptyCondition = {
  conditionType: "price",
  rate: 0,
  calcRule: "fixed",
  priority: 1,
  active: true
};
const ConditionTab = () => {
  const { conditions, addCondition, updateCondition, deleteCondition } = useConditionStore();
  const vendors = useVendorStore((s) => s.vendors);
  const materials = useMaterialStore((s) => s.materials);
  const [open, setOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState(emptyCondition);
  const [editingId, setEditingId] = reactExports.useState(null);
  const handleOpenNew = () => {
    setEditingId(null);
    setForm(emptyCondition);
    setOpen(true);
  };
  const handleEdit = (cond) => {
    setEditingId(cond.id);
    const { id, ...rest } = cond;
    setForm(rest);
    setOpen(true);
  };
  const handleSave = () => {
    if (editingId) {
      updateCondition(editingId, form);
    } else {
      addCondition(form);
    }
    setOpen(false);
    setForm(emptyCondition);
    setEditingId(null);
  };
  const typeColors = {
    price: "primary",
    discount: "success",
    freight: "warning",
    tax: "error",
    surcharge: "info"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2, borderRadius: 2 }, children: "P1-04 条件技术引擎：管理采购/销售定价条件记录，支持固定金额、百分比、按数量、阶梯等多种计算规则。 条件按优先级生效，用于采购订单和销售订单的自动取价叠加。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", justifyContent: "flex-end", mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: handleOpenNew, children: "新增条件记录" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, variant: "outlined", sx: { borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "条件类型" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "供应商" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "费率" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "计算规则" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "有效期" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, align: "center" }, children: "优先级" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, align: "center" }, children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, align: "center" }, children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
        conditions.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: CONDITION_TYPE_LABELS[c.conditionType],
              size: "small",
              color: typeColors[c.conditionType],
              variant: "outlined"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: c.vendorName || "通用" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: c.materialName || "通用" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 600, children: [
            c.calcRule === "percentage" ? `${c.rate}%` : c.rate.toLocaleString(),
            c.unit ? ` /${c.unit}` : ""
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: CALC_RULE_LABELS[c.calcRule], size: "small", variant: "outlined" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
            c.fromDate || "不限",
            " ~ ",
            c.toDate || "不限"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: c.priority,
              size: "small",
              color: c.priority >= 5 ? "error" : c.priority >= 3 ? "warning" : "default",
              sx: { minWidth: 32 }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              size: "small",
              checked: c.active,
              onChange: () => updateCondition(c.id, { active: !c.active })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => handleEdit(c), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => deleteCondition(c.id), color: "error", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) })
          ] })
        ] }, c.id)),
        conditions.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 9, align: "center", sx: { py: 4, color: "text.secondary" }, children: "暂无条件记录，点击「新增条件记录」添加" }) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: editingId ? "编辑条件记录" : "新增条件记录" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { sx: { pt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, sx: { mt: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            select: true,
            label: "条件类型",
            value: form.conditionType,
            onChange: (e) => setForm({ ...form, conditionType: e.target.value }),
            fullWidth: true,
            inputProps: { "data-testid": "cond-type" },
            children: Object.entries(CONDITION_TYPE_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: k, children: v }, k))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Autocomplete,
          {
            options: vendors,
            getOptionLabel: (v) => v.name,
            value: vendors.find((v) => v.id === form.vendorId) || null,
            onChange: (_, val) => setForm({ ...form, vendorId: val == null ? void 0 : val.id, vendorName: val == null ? void 0 : val.name }),
            renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, label: "供应商（可选）" }),
            isOptionEqualToValue: (opt, val) => opt.id === val.id
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Autocomplete,
          {
            options: materials,
            getOptionLabel: (m) => `${m.name} (${m.code})`,
            value: materials.find((m) => m.id === form.materialId) || null,
            onChange: (_, val) => setForm({ ...form, materialId: val == null ? void 0 : val.id, materialName: val == null ? void 0 : val.name }),
            renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, label: "物料（可选）" }),
            isOptionEqualToValue: (opt, val) => opt.id === val.id
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "费率",
            type: "number",
            value: form.rate,
            onChange: (e) => setForm({ ...form, rate: Number(e.target.value) }),
            fullWidth: true,
            inputProps: { "data-testid": "cond-rate" }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            select: true,
            label: "计算规则",
            value: form.calcRule,
            onChange: (e) => setForm({ ...form, calcRule: e.target.value }),
            fullWidth: true,
            children: Object.entries(CALC_RULE_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: k, children: v }, k))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              label: "生效日期（起）",
              type: "date",
              value: form.fromDate || "",
              onChange: (e) => setForm({ ...form, fromDate: e.target.value || void 0 }),
              fullWidth: true,
              InputLabelProps: { shrink: true }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              label: "生效日期（止）",
              type: "date",
              value: form.toDate || "",
              onChange: (e) => setForm({ ...form, toDate: e.target.value || void 0 }),
              fullWidth: true,
              InputLabelProps: { shrink: true }
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              label: "优先级",
              type: "number",
              value: form.priority,
              onChange: (e) => setForm({ ...form, priority: Number(e.target.value) }),
              sx: { width: 120 }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              label: "计费基础",
              value: form.scaleBasis || "",
              onChange: (e) => setForm({ ...form, scaleBasis: e.target.value || void 0 }),
              sx: { flex: 1 }
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              label: "币种",
              value: form.currency || "",
              onChange: (e) => setForm({ ...form, currency: e.target.value || void 0 }),
              sx: { width: 120 }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              label: "单位",
              value: form.unit || "",
              onChange: (e) => setForm({ ...form, unit: e.target.value || void 0 }),
              sx: { flex: 1 }
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormControlLabel,
          {
            control: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Switch,
              {
                checked: form.active,
                onChange: (e) => setForm({ ...form, active: e.target.checked })
              }
            ),
            label: "启用"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleSave, "data-testid": "cond-submit", children: "保存" })
      ] })
    ] })
  ] });
};
const delay = () => new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
function ok(data, message) {
  return { success: true, data, message };
}
function fail(code, message) {
  return { success: false, error: { code, message } };
}
async function wrap(fn, notFoundMsg = "资源未找到") {
  await delay();
  try {
    const result = fn();
    if (result === null || result === void 0) {
      return fail("NOT_FOUND", notFoundMsg);
    }
    return ok(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail("INTERNAL_ERROR", msg);
  }
}
function paginate(items, params) {
  if (!params) return items;
  const { page = 1, pageSize = 20 } = params;
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
const materialApi = {
  async list(params) {
    await delay();
    try {
      const state = useMaterialStore.getState();
      let items = [...state.materials];
      if (params == null ? void 0 : params.categoryId) {
        items = items.filter((m) => m.categoryId === params.categoryId);
      }
      if (params == null ? void 0 : params.status) {
        items = items.filter((m) => m.status === params.status);
      }
      if (params == null ? void 0 : params.keyword) {
        const kw = params.keyword.toLowerCase();
        items = items.filter(
          (m) => {
            var _a, _b, _c;
            return ((_a = m.code) == null ? void 0 : _a.toLowerCase().includes(kw)) || false || (((_b = m.name) == null ? void 0 : _b.toLowerCase().includes(kw)) || false) || (((_c = m.specification) == null ? void 0 : _c.toLowerCase().includes(kw)) || false);
          }
        );
      }
      items = paginate(items, params);
      return ok(items);
    } catch (e) {
      return fail("ERROR", e instanceof Error ? e.message : String(e));
    }
  },
  async getById(id) {
    return wrap(() => useMaterialStore.getState().materials.find((m) => m.id === id) ?? null);
  },
  async create(data) {
    await delay();
    try {
      const id = `mat-${Date.now()}`;
      const material = {
        code: data.code || `MAT-${Date.now()}`,
        name: data.name || "",
        categoryId: data.categoryId || "",
        unit: data.unit || "",
        safetyStock: data.safetyStock ?? 0,
        minStock: data.minStock ?? 0,
        maxStock: data.maxStock ?? 0,
        currentStock: data.currentStock ?? 0,
        price: data.price ?? 0,
        currency: data.currency || "CNY",
        status: data.status || "draft",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        createdBy: "",
        updatedBy: "",
        ...data,
        id
      };
      useMaterialStore.getState().addMaterial(material);
      return ok(material);
    } catch (e) {
      return fail("ERROR", e instanceof Error ? e.message : String(e));
    }
  },
  async update(id, data) {
    await delay();
    try {
      const store = useMaterialStore.getState();
      const existing = store.materials.find((m) => m.id === id);
      if (!existing) return fail("NOT_FOUND", "物料未找到");
      store.updateMaterial(id, data);
      const updated = useMaterialStore.getState().materials.find((m) => m.id === id);
      return ok(updated);
    } catch (e) {
      return fail("ERROR", e instanceof Error ? e.message : String(e));
    }
  },
  async delete(id) {
    await delay();
    try {
      useMaterialStore.getState().deleteMaterial(id);
      return ok(null);
    } catch (e) {
      return fail("ERROR", e instanceof Error ? e.message : String(e));
    }
  },
  // 物料分类
  async getCategories() {
    await delay();
    try {
      return ok(useMaterialStore.getState().categories);
    } catch (e) {
      return fail("ERROR", e instanceof Error ? e.message : String(e));
    }
  }
};
const vendorApi = {
  async list(params) {
    await delay();
    try {
      const state = useVendorStore.getState();
      let items = [...state.vendors];
      if (params == null ? void 0 : params.type) items = items.filter((v) => v.type === params.type);
      if (params == null ? void 0 : params.status) items = items.filter((v) => v.status === params.status);
      if (params == null ? void 0 : params.rating) items = items.filter((v) => (v.rating ?? 0) >= params.rating);
      if (params == null ? void 0 : params.keyword) {
        const kw = params.keyword.toLowerCase();
        items = items.filter(
          (v) => {
            var _a, _b;
            return ((_a = v.code) == null ? void 0 : _a.toLowerCase().includes(kw)) || false || (((_b = v.name) == null ? void 0 : _b.toLowerCase().includes(kw)) || false);
          }
        );
      }
      items = paginate(items, params);
      return ok(items);
    } catch (e) {
      return fail("ERROR", e instanceof Error ? e.message : String(e));
    }
  },
  async getById(id) {
    return wrap(() => useVendorStore.getState().vendors.find((v) => v.id === id) ?? null);
  },
  async create(data) {
    await delay();
    try {
      const id = `ven-${Date.now()}`;
      const vendor = {
        id,
        code: data.code || `VEN-${Date.now()}`,
        name: data.name || "",
        type: data.type || "manufacturer",
        status: data.status || "active",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      Object.assign(vendor, data, { id });
      useVendorStore.getState().addVendor(vendor);
      return ok(vendor);
    } catch (e) {
      return fail("ERROR", e instanceof Error ? e.message : String(e));
    }
  },
  async update(id, data) {
    await delay();
    try {
      const store = useVendorStore.getState();
      const existing = store.vendors.find((v) => v.id === id);
      if (!existing) return fail("NOT_FOUND", "供应商未找到");
      store.updateVendor(id, data);
      const updated = useVendorStore.getState().vendors.find((v) => v.id === id);
      return ok(updated);
    } catch (e) {
      return fail("ERROR", e instanceof Error ? e.message : String(e));
    }
  },
  async delete(id) {
    await delay();
    try {
      useVendorStore.getState().deleteVendor(id);
      return ok(null);
    } catch (e) {
      return fail("ERROR", e instanceof Error ? e.message : String(e));
    }
  },
  async blacklist(id, reason) {
    await delay();
    try {
      const store = useVendorStore.getState();
      const vendor = store.vendors.find((v) => v.id === id);
      if (!vendor) return fail("NOT_FOUND", "供应商未找到");
      store.updateVendor(id, { status: "blacklisted", remarks: reason });
      const updated = useVendorStore.getState().vendors.find((v) => v.id === id);
      return ok(updated);
    } catch (e) {
      return fail("ERROR", e instanceof Error ? e.message : String(e));
    }
  },
  async checkRating(id) {
    var _a;
    await delay();
    try {
      const rating = ((_a = useVendorStore.getState().vendors.find((v) => v.id === id)) == null ? void 0 : _a.rating) ?? 0;
      return ok(rating);
    } catch (e) {
      return fail("ERROR", e instanceof Error ? e.message : String(e));
    }
  }
};
const customerApi = {
  async list(params) {
    await delay();
    try {
      const state = useCustomerStore.getState();
      let items = [...state.customers];
      if (params == null ? void 0 : params.status) items = items.filter((c) => c.status === params.status);
      if (params == null ? void 0 : params.keyword) {
        const kw = params.keyword.toLowerCase();
        items = items.filter(
          (c) => {
            var _a, _b;
            return ((_a = c.code) == null ? void 0 : _a.toLowerCase().includes(kw)) || false || (((_b = c.name) == null ? void 0 : _b.toLowerCase().includes(kw)) || false);
          }
        );
      }
      items = paginate(items, params);
      return ok(items);
    } catch (e) {
      return fail("ERROR", e instanceof Error ? e.message : String(e));
    }
  },
  async getById(id) {
    return wrap(() => useCustomerStore.getState().customers.find((c) => c.id === id) ?? null);
  },
  async create(data) {
    await delay();
    try {
      const id = `cus-${Date.now()}`;
      const customer = {
        id,
        code: data.code || `CUS-${Date.now()}`,
        name: data.name || "",
        status: data.status || "active",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      Object.assign(customer, data, { id });
      useCustomerStore.getState().addCustomer(customer);
      return ok(customer);
    } catch (e) {
      return fail("ERROR", e instanceof Error ? e.message : String(e));
    }
  },
  async update(id, data) {
    await delay();
    try {
      const store = useCustomerStore.getState();
      const existing = store.customers.find((c) => c.id === id);
      if (!existing) return fail("NOT_FOUND", "客户未找到");
      store.updateCustomer(id, data);
      const updated = useCustomerStore.getState().customers.find((c) => c.id === id);
      return ok(updated);
    } catch (e) {
      return fail("ERROR", e instanceof Error ? e.message : String(e));
    }
  },
  async delete(id) {
    await delay();
    try {
      useCustomerStore.getState().deleteCustomer(id);
      return ok(null);
    } catch (e) {
      return fail("ERROR", e instanceof Error ? e.message : String(e));
    }
  }
};
const purchaseApi = {
  request: {
    async list(params) {
      await delay();
      try {
        const state = usePurchaseStore.getState();
        let items = [...state.purchaseRequests];
        if (params == null ? void 0 : params.status) items = items.filter((r) => r.status === params.status);
        if (params == null ? void 0 : params.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter((r) => {
            var _a;
            return ((_a = r.requestNo) == null ? void 0 : _a.toLowerCase().includes(kw)) || false;
          });
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async getById(id) {
      return wrap(() => usePurchaseStore.getState().purchaseRequests.find((r) => r.id === id) ?? null);
    },
    async create(data) {
      await delay();
      try {
        const id = `pr-${Date.now()}`;
        const request = {
          id,
          requestNo: data.requestNo || `PR-${Date.now()}`,
          title: data.title || "采购申请",
          applicant: data.applicant || "",
          department: data.department || "",
          type: data.type || "material",
          priority: data.priority || "normal",
          reason: data.reason || "",
          expectedDate: data.expectedDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          status: data.status || "draft",
          items: data.items || [],
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: "",
          updatedBy: "",
          ...data
        };
        usePurchaseStore.getState().addPurchaseRequest(request);
        return ok(request);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async update(id, data) {
      await delay();
      try {
        const store = usePurchaseStore.getState();
        if (!store.purchaseRequests.find((r) => r.id === id)) return fail("NOT_FOUND", "采购申请未找到");
        store.updatePurchaseRequest(id, data);
        return ok(usePurchaseStore.getState().purchaseRequests.find((r) => r.id === id));
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async delete(id) {
      await delay();
      try {
        usePurchaseStore.getState().deletePurchaseRequest(id);
        return ok(null);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  },
  order: {
    async list(params) {
      await delay();
      try {
        const state = usePurchaseStore.getState();
        let items = [...state.purchaseOrders];
        if (params == null ? void 0 : params.status) items = items.filter((o) => o.status === params.status);
        if (params == null ? void 0 : params.vendorId) items = items.filter((o) => o.vendorId === params.vendorId);
        if (params == null ? void 0 : params.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter((o) => {
            var _a;
            return ((_a = o.orderNo) == null ? void 0 : _a.toLowerCase().includes(kw)) || false;
          });
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async getById(id) {
      return wrap(() => usePurchaseStore.getState().purchaseOrders.find((o) => o.id === id) ?? null);
    },
    async create(data) {
      await delay();
      try {
        const id = `po-${Date.now()}`;
        const order = {
          id,
          orderNo: data.orderNo || `PO-${Date.now()}`,
          vendorId: data.vendorId || "",
          vendorName: data.vendorName || "",
          status: data.status || "draft",
          items: data.items || [],
          totalAmount: data.totalAmount ?? 0,
          currency: data.currency || "CNY",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        Object.assign(order, data, { id });
        usePurchaseStore.getState().addPurchaseOrder(order);
        return ok(order);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async update(id, data) {
      await delay();
      try {
        const store = usePurchaseStore.getState();
        if (!store.purchaseOrders.find((o) => o.id === id)) return fail("NOT_FOUND", "采购订单未找到");
        store.updatePurchaseOrder(id, data);
        return ok(usePurchaseStore.getState().purchaseOrders.find((o) => o.id === id));
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async delete(id) {
      await delay();
      try {
        usePurchaseStore.getState().deletePurchaseOrder(id);
        return ok(null);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async confirm(id) {
      await delay();
      try {
        const store = usePurchaseStore.getState();
        const order = store.purchaseOrders.find((o) => o.id === id);
        if (!order) return fail("NOT_FOUND", "采购订单未找到");
        store.updatePurchaseOrder(id, { status: "confirmed" });
        return ok(usePurchaseStore.getState().purchaseOrders.find((o) => o.id === id));
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  },
  infoRecord: {
    async list(params) {
      await delay();
      try {
        const state = usePurchaseInfoRecordStore.getState();
        let items = [...state.records];
        if (params == null ? void 0 : params.vendorId) items = items.filter((r) => r.vendorId === params.vendorId);
        if (params == null ? void 0 : params.materialId) items = items.filter((r) => r.materialId === params.materialId);
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async create(data) {
      await delay();
      try {
        const id = `pir-${Date.now()}`;
        const record = { id, isDefault: false, ...data };
        usePurchaseInfoRecordStore.getState().addRecord(record);
        return ok(record);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async update(id, data) {
      await delay();
      try {
        usePurchaseInfoRecordStore.getState().updateRecord(id, data);
        const updated = usePurchaseInfoRecordStore.getState().records.find((r) => r.id === id);
        if (!updated) return fail("NOT_FOUND", "信息记录未找到");
        return ok(updated);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async delete(id) {
      await delay();
      try {
        usePurchaseInfoRecordStore.getState().deleteRecord(id);
        return ok(null);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  },
  sourceList: {
    async list(params) {
      await delay();
      try {
        const state = useSourceListStore.getState();
        let items = [...state.items];
        if (params == null ? void 0 : params.materialId) items = items.filter((s) => s.materialId === params.materialId);
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async create(data) {
      await delay();
      try {
        const id = `sl-${Date.now()}`;
        const item = { id, ...data };
        useSourceListStore.getState().addItem(item);
        return ok(item);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async update(id, data) {
      await delay();
      try {
        useSourceListStore.getState().updateItem(id, data);
        const updated = useSourceListStore.getState().items.find((s) => s.id === id);
        if (!updated) return fail("NOT_FOUND", "货源清单条目未找到");
        return ok(updated);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async delete(id) {
      await delay();
      try {
        useSourceListStore.getState().deleteItem(id);
        return ok(null);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  }
};
const salesApi = {
  order: {
    async list(params) {
      await delay();
      try {
        const state = useSalesStore.getState();
        let items = [...state.salesOrders];
        if (params == null ? void 0 : params.status) items = items.filter((o) => o.status === params.status);
        if (params == null ? void 0 : params.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter((o) => {
            var _a;
            return ((_a = o.orderNo) == null ? void 0 : _a.toLowerCase().includes(kw)) || false;
          });
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async getById(id) {
      return wrap(() => useSalesStore.getState().salesOrders.find((o) => o.id === id) ?? null);
    },
    async create(data) {
      await delay();
      try {
        const id = `so-${Date.now()}`;
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const order = {
          id,
          orderNo: data.orderNo || `SO-${Date.now()}`,
          type: data.type || "standard",
          status: data.status || "draft",
          customerId: data.customerId || "",
          customerName: data.customerName || "",
          totalAmount: data.totalAmount ?? 0,
          taxRate: data.taxRate ?? 13,
          taxAmount: data.taxAmount ?? 0,
          grandTotal: data.grandTotal ?? 0,
          orderDate: data.orderDate || today,
          expectedDeliveryDate: data.expectedDeliveryDate || today,
          items: data.items || [],
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: "",
          updatedBy: "",
          ...data
        };
        useSalesStore.getState().addSalesOrder(order);
        return ok(order);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async update(id, data) {
      await delay();
      try {
        const store = useSalesStore.getState();
        if (!store.salesOrders.find((o) => o.id === id)) return fail("NOT_FOUND", "销售订单未找到");
        store.updateSalesOrder(id, data);
        return ok(useSalesStore.getState().salesOrders.find((o) => o.id === id));
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async delete(id) {
      await delay();
      try {
        useSalesStore.getState().deleteSalesOrder(id);
        return ok(null);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  },
  contract: {
    async list(params) {
      await delay();
      try {
        const state = useSalesContractStore.getState();
        let items = [...state.contracts];
        if (params == null ? void 0 : params.status) items = items.filter((c) => c.status === params.status);
        if (params == null ? void 0 : params.customerId) items = items.filter((c) => c.customerId === params.customerId);
        if (params == null ? void 0 : params.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter((c) => {
            var _a, _b;
            return ((_a = c.contractNo) == null ? void 0 : _a.toLowerCase().includes(kw)) || ((_b = c.name) == null ? void 0 : _b.toLowerCase().includes(kw)) || false;
          });
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async getById(id) {
      return wrap(() => useSalesContractStore.getState().contracts.find((c) => c.id === id) ?? null);
    },
    async create(data) {
      await delay();
      try {
        const id = `sc-${Date.now()}`;
        const contract = {
          id,
          contractNo: data.contractNo || `SC-${Date.now()}`,
          name: data.name || "",
          customerId: data.customerId || "",
          customerName: data.customerName || "",
          salesPerson: data.salesPerson || "",
          amount: data.amount ?? 0,
          startDate: data.startDate || "",
          endDate: data.endDate || "",
          status: data.status || "draft",
          items: data.items || [],
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        Object.assign(contract, data, { id });
        useSalesContractStore.getState().addContract(contract);
        return ok(contract);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async update(id, data) {
      await delay();
      try {
        const store = useSalesContractStore.getState();
        if (!store.contracts.find((c) => c.id === id)) return fail("NOT_FOUND", "合同未找到");
        store.updateContract(id, data);
        return ok(useSalesContractStore.getState().contracts.find((c) => c.id === id));
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async delete(id) {
      await delay();
      try {
        useSalesContractStore.getState().deleteContract(id);
        return ok(null);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  },
  prospect: {
    async list(params) {
      await delay();
      try {
        const state = useSalesStore.getState();
        let items = [...state.prospects];
        if (params == null ? void 0 : params.status) items = items.filter((p) => p.status === params.status);
        if (params == null ? void 0 : params.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter((p) => {
            var _a, _b;
            return ((_a = p.contactName) == null ? void 0 : _a.toLowerCase().includes(kw)) || ((_b = p.companyName) == null ? void 0 : _b.toLowerCase().includes(kw)) || false;
          });
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async create(data) {
      await delay();
      try {
        const id = `prosp-${Date.now()}`;
        const prospect = {
          id,
          prospectNo: data.prospectNo || `PROSP-${Date.now()}`,
          companyName: data.companyName || "",
          contactName: data.contactName || "",
          contactPhone: data.contactPhone || "",
          contactEmail: data.contactEmail || "",
          source: data.source || "referral",
          status: data.status || "new",
          assignedTo: data.assignedTo || "",
          interestProducts: data.interestProducts || [],
          followupRecords: data.followupRecords || [],
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        Object.assign(prospect, data, { id });
        useSalesStore.getState().addProspect(prospect);
        return ok(prospect);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async update(id, data) {
      await delay();
      try {
        const store = useSalesStore.getState();
        if (!store.prospects.find((p) => p.id === id)) return fail("NOT_FOUND", "意向客户未找到");
        store.updateProspect(id, data);
        return ok(useSalesStore.getState().prospects.find((p) => p.id === id));
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async convert(id, customerData) {
      var _a;
      await delay();
      try {
        const salesState = useSalesStore.getState();
        const prospect = salesState.prospects.find((p) => p.id === id);
        if (!prospect) return fail("NOT_FOUND", "意向客户未找到");
        const customerId = `cus-${Date.now()}`;
        const customer = {
          id: customerId,
          code: (customerData == null ? void 0 : customerData.code) || `CUS-${Date.now()}`,
          name: (customerData == null ? void 0 : customerData.name) || prospect.companyName || "",
          shortName: (customerData == null ? void 0 : customerData.shortName) || ((_a = prospect.companyName) == null ? void 0 : _a.substring(0, 10)),
          type: (customerData == null ? void 0 : customerData.type) || "enterprise",
          status: "active",
          invoiceTitle: (customerData == null ? void 0 : customerData.invoiceTitle) || prospect.companyName,
          invoicePhone: (customerData == null ? void 0 : customerData.invoicePhone) || prospect.contactPhone,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          ...customerData
        };
        useCustomerStore.getState().addCustomer(customer);
        salesState.updateProspect(id, { status: "won" });
        return ok(customer);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  }
};
const warehouseApi = {
  inbound: {
    async list(params) {
      await delay();
      try {
        const state = useWarehouseStore.getState();
        let items = [...state.inboundOrders];
        if (params == null ? void 0 : params.status) items = items.filter((o) => o.status === params.status);
        if (params == null ? void 0 : params.type) items = items.filter((o) => o.type === params.type);
        if (params == null ? void 0 : params.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter((o) => {
            var _a;
            return ((_a = o.inboundNo) == null ? void 0 : _a.toLowerCase().includes(kw)) || false;
          });
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async create(data) {
      await delay();
      try {
        const id = `ib-${Date.now()}`;
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const order = {
          id,
          inboundNo: data.inboundNo || `IN-${Date.now()}`,
          type: data.type || "purchase",
          status: data.status || "pending",
          warehouseId: data.warehouseId || "",
          operator: data.operator || "",
          inboundDate: data.inboundDate || today,
          items: data.items || [],
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: "",
          updatedBy: "",
          ...data
        };
        useWarehouseStore.getState().addInboundOrder(order);
        return ok(order);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async update(id, data) {
      await delay();
      try {
        const store = useWarehouseStore.getState();
        if (!store.inboundOrders.find((o) => o.id === id)) return fail("NOT_FOUND", "入库单未找到");
        store.updateInboundOrder(id, data);
        return ok(useWarehouseStore.getState().inboundOrders.find((o) => o.id === id));
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  },
  outbound: {
    async list(params) {
      await delay();
      try {
        const state = useWarehouseStore.getState();
        let items = [...state.outboundOrders];
        if (params == null ? void 0 : params.status) items = items.filter((o) => o.status === params.status);
        if (params == null ? void 0 : params.type) items = items.filter((o) => o.type === params.type);
        if (params == null ? void 0 : params.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter((o) => {
            var _a;
            return ((_a = o.outboundNo) == null ? void 0 : _a.toLowerCase().includes(kw)) || false;
          });
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async create(data) {
      await delay();
      try {
        const id = `ob-${Date.now()}`;
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const order = {
          id,
          outboundNo: data.outboundNo || `OUT-${Date.now()}`,
          type: data.type || "sale",
          status: data.status || "pending",
          warehouseId: data.warehouseId || "",
          operator: data.operator || "",
          outboundDate: data.outboundDate || today,
          items: data.items || [],
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: "",
          updatedBy: "",
          ...data
        };
        useWarehouseStore.getState().addOutboundOrder(order);
        return ok(order);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async update(id, data) {
      await delay();
      try {
        const store = useWarehouseStore.getState();
        if (!store.outboundOrders.find((o) => o.id === id)) return fail("NOT_FOUND", "出库单未找到");
        store.updateOutboundOrder(id, data);
        return ok(useWarehouseStore.getState().outboundOrders.find((o) => o.id === id));
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  },
  inventory: {
    async list(params) {
      await delay();
      try {
        const state = useWarehouseStore.getState();
        let items = [...state.inventoryRecords];
        if (params == null ? void 0 : params.warehouseId) items = items.filter((r) => r.warehouseId === params.warehouseId);
        if (params == null ? void 0 : params.materialId) items = items.filter((r) => r.materialId === params.materialId);
        if (params == null ? void 0 : params.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter((r) => {
            var _a, _b;
            return ((_a = r.materialName) == null ? void 0 : _a.toLowerCase().includes(kw)) || ((_b = r.materialCode) == null ? void 0 : _b.toLowerCase().includes(kw)) || false;
          });
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async query(params) {
      return warehouseApi.inventory.list({ ...params, page: 1, pageSize: 1e3 });
    }
  },
  check: {
    async list(params) {
      await delay();
      try {
        const state = useWarehouseStore.getState();
        let items = [...state.checkTasks];
        if (params == null ? void 0 : params.status) items = items.filter((t) => t.status === params.status);
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async create(data) {
      await delay();
      try {
        const id = `ck-${Date.now()}`;
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const task = {
          id,
          taskNo: data.taskNo || `CK-${Date.now()}`,
          warehouseId: data.warehouseId || "",
          type: data.type || "full",
          status: data.status || "pending",
          startDate: data.startDate || today,
          operator: data.operator || "",
          items: data.items || [],
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: "",
          updatedBy: "",
          ...data
        };
        useWarehouseStore.getState().addCheckTask(task);
        return ok(task);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  }
};
const qualityApi = {
  inspection: {
    async list(params) {
      await delay();
      try {
        const state = useQualityStore.getState();
        let items = [...state.inspectionTasks];
        if (params == null ? void 0 : params.type) items = items.filter((t) => t.type === params.type);
        if (params == null ? void 0 : params.status) items = items.filter((t) => t.status === params.status);
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async getById(id) {
      return wrap(() => useQualityStore.getState().inspectionTasks.find((t) => t.id === id) ?? null);
    },
    async create(data) {
      await delay();
      try {
        const id = `insp-${Date.now()}`;
        const task = {
          id,
          taskNo: data.taskNo || `INS-${Date.now()}`,
          type: data.type || "incoming",
          status: data.status || "pending",
          materialId: data.materialId || "",
          materialCode: data.materialCode || "",
          materialName: data.materialName || "",
          batchNo: data.batchNo || "",
          quantity: data.quantity ?? 0,
          sampleQuantity: data.sampleQuantity ?? 0,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: "",
          updatedBy: "",
          ...data
        };
        useQualityStore.getState().addInspectionTask(task);
        return ok(task);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async update(id, data) {
      await delay();
      try {
        useQualityStore.getState().updateInspectionTask(id, data);
        const updated = useQualityStore.getState().inspectionTasks.find((t) => t.id === id);
        if (!updated) return fail("NOT_FOUND", "检验任务未找到");
        return ok(updated);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async delete(id) {
      await delay();
      try {
        useQualityStore.getState().deleteInspectionTask(id);
        return ok(null);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  },
  unqualified: {
    async list(params) {
      await delay();
      try {
        const state = useQualityStore.getState();
        let items = [...state.unqualifiedItems];
        if (params == null ? void 0 : params.status) items = items.filter((i) => i.status === params.status);
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async create(data) {
      await delay();
      try {
        const id = `uq-${Date.now()}`;
        const d = data;
        const item = {
          id,
          itemNo: d.itemNo || `UQ-${Date.now()}`,
          inspectionTaskId: d.inspectionTaskId || "",
          inspectionTaskNo: d.inspectionTaskNo || "",
          materialCode: d.materialCode || "",
          materialName: d.materialName || "",
          batchNo: d.batchNo || "",
          defectQuantity: d.defectQuantity ?? 0,
          defectDescription: d.defectDescription || "",
          disposition: d.disposition || "rework",
          dispositionStatus: d.dispositionStatus || "pending",
          status: data.status || "open",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: "",
          updatedBy: "",
          ...data
        };
        useQualityStore.getState().addUnqualifiedItem(item);
        return ok(item);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async update(id, data) {
      await delay();
      try {
        useQualityStore.getState().updateUnqualifiedItem(id, data);
        const updated = useQualityStore.getState().unqualifiedItems.find((i) => i.id === id);
        if (!updated) return fail("NOT_FOUND", "不合格品未找到");
        return ok(updated);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  },
  fmea: {
    async list(params) {
      await delay();
      try {
        const state = useFMEAStore.getState();
        let items = [...state.items];
        if (params == null ? void 0 : params.materialCode) items = items.filter((r) => r.item === params.materialCode);
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async create(data) {
      await delay();
      try {
        const id = `fmea-${Date.now()}`;
        const record = { id, createdBy: "", updatedBy: "", ...data };
        useFMEAStore.getState().addItem(record);
        return ok(record);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async update(id, data) {
      await delay();
      try {
        useFMEAStore.getState().updateItem(id, data);
        const updated = useFMEAStore.getState().items.find((r) => r.id === id);
        if (!updated) return fail("NOT_FOUND", "FMEA记录未找到");
        return ok(updated);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async delete(id) {
      await delay();
      try {
        useFMEAStore.getState().deleteItem(id);
        return ok(null);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  }
};
const productionApi = {
  workOrder: {
    async list(params) {
      await delay();
      try {
        const state = useProductionStore.getState();
        let items = [...state.workOrders];
        if (params == null ? void 0 : params.status) items = items.filter((o) => o.status === params.status);
        if (params == null ? void 0 : params.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter((o) => {
            var _a, _b;
            return ((_a = o.orderNo) == null ? void 0 : _a.toLowerCase().includes(kw)) || ((_b = o.productName) == null ? void 0 : _b.toLowerCase().includes(kw)) || false;
          });
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async getById(id) {
      return wrap(() => useProductionStore.getState().workOrders.find((o) => o.id === id) ?? null);
    },
    async create(data) {
      await delay();
      try {
        const id = `wo-${Date.now()}`;
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const d = data;
        const order = {
          id,
          orderNo: d.orderNo || `WO-${Date.now()}`,
          productCode: d.productCode || "",
          productName: d.productName || "",
          bomId: d.bomId || "",
          bomNo: d.bomNo || "",
          routeId: d.routeId || "",
          routeNo: d.routeNo || "",
          plannedQuantity: d.plannedQuantity ?? 0,
          completedQuantity: 0,
          scrapQuantity: 0,
          plannedStartDate: d.plannedStartDate || today,
          plannedEndDate: d.plannedEndDate || today,
          priority: d.priority || "normal",
          workshop: d.workshop || "",
          supervisor: d.supervisor || "",
          status: data.status || "draft",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: "",
          updatedBy: "",
          ...data
        };
        useProductionStore.getState().addWorkOrder(order);
        return ok(order);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async update(id, data) {
      await delay();
      try {
        const store = useProductionStore.getState();
        if (!store.workOrders.find((o) => o.id === id)) return fail("NOT_FOUND", "生产工单未找到");
        store.updateWorkOrder(id, data);
        return ok(useProductionStore.getState().workOrders.find((o) => o.id === id));
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async delete(id) {
      await delay();
      try {
        useProductionStore.getState().deleteWorkOrder(id);
        return ok(null);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  },
  bom: {
    async list(params) {
      await delay();
      try {
        const state = useBOMStore.getState();
        let items = [...state.bomList];
        if (params == null ? void 0 : params.productId) items = items.filter((b) => b.productId === params.productId);
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async getById(id) {
      return wrap(() => useBOMStore.getState().bomList.find((b) => b.id === id) ?? null);
    },
    async create(data) {
      await delay();
      try {
        const id = `bom-${Date.now()}`;
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const d = data;
        const bom = {
          id,
          bomNo: d.bomNo || `BOM-${Date.now()}`,
          name: d.name || "",
          type: d.type || "MBOM",
          productId: d.productId || "",
          productCode: d.productCode || "",
          productName: d.productName || "",
          version: d.version || "1.0",
          status: data.status || "draft",
          effectiveDate: d.effectiveDate || today,
          currency: d.currency || "CNY",
          items: d.items || void 0,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: "",
          updatedBy: "",
          ...data
        };
        useBOMStore.getState().addBOM(bom);
        return ok(bom);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async update(id, data) {
      await delay();
      try {
        const store = useBOMStore.getState();
        if (!store.bomList.find((b) => b.id === id)) return fail("NOT_FOUND", "BOM未找到");
        store.updateBOM(id, data);
        return ok(useBOMStore.getState().bomList.find((b) => b.id === id));
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async delete(id) {
      await delay();
      try {
        useBOMStore.getState().deleteBOM(id);
        return ok(null);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  },
  mrp: {
    async list(params) {
      await delay();
      try {
        const state = useProductionStore.getState();
        const items = paginate([...state.mrpRecommendations], params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  }
};
const financeApi = {
  voucher: {
    async list(params) {
      await delay();
      try {
        const state = useFinanceStore.getState();
        let items = [...state.vouchers];
        if (params == null ? void 0 : params.status) items = items.filter((v) => v.status === params.status);
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async getById(id) {
      return wrap(() => useFinanceStore.getState().vouchers.find((v) => v.id === id) ?? null);
    },
    async create(data) {
      await delay();
      try {
        const store = useFinanceStore.getState();
        const result = store.createVoucher({
          date: data.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          voucherType: data.voucherType || "记账",
          items: data.items || [],
          remark: data.remark || ""
        });
        if (!result.ok) return fail("VALIDATION", result.message);
        return ok(useFinanceStore.getState().vouchers[useFinanceStore.getState().vouchers.length - 1]);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async update(id, data) {
      await delay();
      try {
        const store = useFinanceStore.getState();
        if (!store.vouchers.find((v) => v.id === id)) return fail("NOT_FOUND", "凭证未找到");
        store.updateVoucher(id, data);
        return ok(useFinanceStore.getState().vouchers.find((v) => v.id === id));
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async delete(id) {
      await delay();
      try {
        useFinanceStore.getState().deleteVoucher(id);
        return ok(null);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  },
  receivable: {
    async list(params) {
      await delay();
      try {
        const state = useArapStore.getState();
        let items = [...state.receivables];
        if (params == null ? void 0 : params.customerId) items = items.filter((r) => r.customerId === params.customerId);
        if (params == null ? void 0 : params.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter((r) => {
            var _a;
            return ((_a = r.customerName) == null ? void 0 : _a.toLowerCase().includes(kw)) || false;
          });
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async getById(id) {
      return wrap(() => useArapStore.getState().receivables.find((r) => r.id === id) ?? null);
    }
  },
  payable: {
    async list(params) {
      await delay();
      try {
        const state = useArapStore.getState();
        let items = [...state.payables];
        if (params == null ? void 0 : params.vendorId) items = items.filter((p) => p.vendorId === params.vendorId);
        if (params == null ? void 0 : params.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter((p) => {
            var _a;
            return ((_a = p.vendorName) == null ? void 0 : _a.toLowerCase().includes(kw)) || false;
          });
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async getById(id) {
      return wrap(() => useArapStore.getState().payables.find((p) => p.id === id) ?? null);
    }
  }
};
const priceApi = {
  inquiry: {
    async list(params) {
      await delay();
      try {
        const state = usePriceStore.getState();
        let items = [...state.priceInquiries];
        if (params == null ? void 0 : params.status) items = items.filter((i) => i.status === params.status);
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async getById(id) {
      return wrap(() => usePriceStore.getState().priceInquiries.find((i) => i.id === id) ?? null);
    },
    async create(data) {
      await delay();
      try {
        const id = `inq-${Date.now()}`;
        const inquiry = {
          id,
          inquiryNo: data.inquiryNo || `INQ-${Date.now()}`,
          status: data.status || "draft",
          items: data.items || [],
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        Object.assign(inquiry, data, { id });
        usePriceStore.getState().addPriceInquiry(inquiry);
        return ok(inquiry);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async update(id, data) {
      await delay();
      try {
        usePriceStore.getState().updatePriceInquiry(id, data);
        const updated = usePriceStore.getState().priceInquiries.find((i) => i.id === id);
        if (!updated) return fail("NOT_FOUND", "询价单未找到");
        return ok(updated);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async delete(id) {
      await delay();
      try {
        usePriceStore.getState().deletePriceInquiry(id);
        return ok(null);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  },
  priceList: {
    async list(params) {
      await delay();
      try {
        const state = usePriceStore.getState();
        let items = [...state.priceList];
        if (params == null ? void 0 : params.status) items = items.filter((p) => p.status === params.status);
        if (params == null ? void 0 : params.vendorId) items = items.filter((p) => p.vendorId === params.vendorId);
        items = paginate(items, params);
        return ok(items);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async create(data) {
      await delay();
      try {
        const id = `pl-${Date.now()}`;
        const item = { id, ...data };
        usePriceStore.getState().addPriceListItem(item);
        return ok(item);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async update(id, data) {
      await delay();
      try {
        usePriceStore.getState().updatePriceListItem(id, data);
        const updated = usePriceStore.getState().priceList.find((p) => p.id === id);
        if (!updated) return fail("NOT_FOUND", "价格条目未找到");
        return ok(updated);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    },
    async delete(id) {
      await delay();
      try {
        const store = usePriceStore.getState();
        const filtered = store.priceList.filter((p) => p.id !== id);
        store.setPriceList(filtered);
        return ok(null);
      } catch (e) {
        return fail("ERROR", e instanceof Error ? e.message : String(e));
      }
    }
  }
};
const systemApi = {
  async getStatus() {
    await delay();
    try {
      const stores = [
        useMaterialStore.getState(),
        useVendorStore.getState(),
        useCustomerStore.getState(),
        usePurchaseStore.getState(),
        useSalesStore.getState(),
        useWarehouseStore.getState()
      ];
      let storeCount = 0;
      for (const s of stores) {
        const vals = Object.values(s);
        for (const v of vals) {
          if (Array.isArray(v)) storeCount += v.length;
        }
      }
      let storageKB = 0;
      try {
        const total = Object.keys(localStorage).reduce((sum, k) => {
          var _a;
          return sum + (((_a = localStorage.getItem(k)) == null ? void 0 : _a.length) ?? 0);
        }, 0);
        storageKB = Math.round(total / 1024);
      } catch {
      }
      return ok({ version: "1.0.0", storeCount, storageKB });
    } catch (e) {
      return fail("ERROR", e instanceof Error ? e.message : String(e));
    }
  },
  async exportAll() {
    await delay();
    try {
      const data = {};
      const storeMap = [
        ["materials", useMaterialStore],
        ["vendors", useVendorStore],
        ["customers", useCustomerStore],
        ["purchase", usePurchaseStore],
        ["sales", useSalesStore],
        ["warehouse", useWarehouseStore],
        ["quality", useQualityStore],
        ["production", useProductionStore],
        ["finance", useFinanceStore],
        ["price", usePriceStore],
        ["settings", useSettingsStore]
      ];
      for (const [key, storeHook] of storeMap) {
        const state = storeHook.getState();
        for (const [sk, sv] of Object.entries(state)) {
          if (Array.isArray(sv)) {
            data[`${key}.${sk}`] = sv;
          }
        }
      }
      return ok(data);
    } catch (e) {
      return fail("ERROR", e instanceof Error ? e.message : String(e));
    }
  },
  async importAll(data) {
    await delay();
    try {
      const storeSetters = {
        "materials.materials": (items) => useMaterialStore.setState({ materials: items }),
        "vendors.vendors": (items) => useVendorStore.setState({ vendors: items }),
        "customers.customers": (items) => useCustomerStore.setState({ customers: items })
      };
      for (const [key, value] of Object.entries(data)) {
        if (storeSetters[key] && Array.isArray(value)) {
          storeSetters[key](value);
        }
      }
      return ok(null);
    } catch (e) {
      return fail("ERROR", e instanceof Error ? e.message : String(e));
    }
  }
};
const api = {
  material: materialApi,
  vendor: vendorApi,
  customer: customerApi,
  purchase: purchaseApi,
  sales: salesApi,
  warehouse: warehouseApi,
  quality: qualityApi,
  production: productionApi,
  finance: financeApi,
  price: priceApi,
  system: systemApi
};
const methodColors = {
  GET: "#22C55E",
  POST: "#3B82F6",
  PUT: "#F59E0B",
  DELETE: "#EF4444",
  PATCH: "#8B5CF6"
};
const httpStatusText = {
  GET: "查询/获取资源",
  POST: "创建新资源",
  PUT: "更新资源",
  DELETE: "删除资源",
  PATCH: "部分更新资源"
};
const apiModules = [
  {
    key: "material",
    label: "物料管理",
    color: "#8B5CF6",
    endpoints: [
      { id: "mat-list", method: "GET", path: "/api/materials", description: "获取物料列表，支持分类、状态、关键词筛选", params: [
        { name: "page", type: "number", location: "query", required: false, description: "页码" },
        { name: "pageSize", type: "number", location: "query", required: false, description: "每页数量" },
        { name: "categoryId", type: "string", location: "query", required: false, description: "分类ID" },
        { name: "status", type: "string", location: "query", required: false, description: "状态：draft/active/inactive" },
        { name: "keyword", type: "string", location: "query", required: false, description: "模糊查询关键词" }
      ], action: () => api.material.list(), responseExample: '{ "success": true, "data": [{ "id": "mat-001", "code": "MAT-001", "name": "钢板", "unit": "吨", ... }] }' },
      { id: "mat-get", method: "GET", path: "/api/materials/:id", description: "根据ID获取物料详情", params: [
        { name: "id", type: "string", location: "path", required: true, description: "物料ID" }
      ], action: () => api.material.getById("mat-001"), responseExample: '{ "success": true, "data": { "id": "mat-001", "code": "MAT-001", "name": "钢板", ... } }' },
      { id: "mat-create", method: "POST", path: "/api/materials", description: "创建新物料", params: [
        { name: "body", type: "object", location: "body", required: true, description: "物料数据" }
      ], action: () => api.material.create({ name: "测试物料", code: "TEST", unit: "个", categoryId: "cat-001" }), bodyExample: '{ "name": "物料名称", "code": "MAT-XXX", "unit": "个", "categoryId": "cat-001" }' },
      { id: "mat-update", method: "PUT", path: "/api/materials/:id", description: "更新物料信息", params: [
        { name: "id", type: "string", location: "path", required: true, description: "物料ID" }
      ], action: () => api.material.update("mat-001", { name: "更新后的名称" }) },
      { id: "mat-delete", method: "DELETE", path: "/api/materials/:id", description: "删除物料", params: [
        { name: "id", type: "string", location: "path", required: true, description: "物料ID" }
      ], action: () => api.material.delete("mat-001") }
    ]
  },
  {
    key: "vendor",
    label: "供应商管理",
    color: "#F59E0B",
    endpoints: [
      { id: "ven-list", method: "GET", path: "/api/vendors", description: "获取供应商列表", params: [
        { name: "page", type: "number", location: "query", required: false, description: "页码" },
        { name: "type", type: "string", location: "query", required: false, description: "供应商类型" },
        { name: "status", type: "string", location: "query", required: false, description: "状态" }
      ], action: () => api.vendor.list() },
      { id: "ven-get", method: "GET", path: "/api/vendors/:id", description: "获取供应商详情", params: [
        { name: "id", type: "string", location: "path", required: true, description: "供应商ID" }
      ], action: () => api.vendor.getById("ven-001") },
      { id: "ven-create", method: "POST", path: "/api/vendors", description: "创建供应商", action: () => api.vendor.create({ name: "测试供应商", code: "V-TEST" }) },
      { id: "ven-update", method: "PUT", path: "/api/vendors/:id", description: "更新供应商信息", action: () => api.vendor.update("ven-001", { name: "更新后供应商" }) },
      { id: "ven-delete", method: "DELETE", path: "/api/vendors/:id", description: "删除供应商", action: () => api.vendor.delete("ven-001") },
      { id: "ven-blacklist", method: "POST", path: "/api/vendors/:id/blacklist", description: "拉黑供应商", params: [
        { name: "id", type: "string", location: "path", required: true, description: "供应商ID" },
        { name: "reason", type: "string", location: "body", required: true, description: "拉黑原因" }
      ], action: () => api.vendor.blacklist("ven-001", "质量不合格") }
    ]
  },
  {
    key: "customer",
    label: "客户管理",
    color: "#10B981",
    endpoints: [
      { id: "cus-list", method: "GET", path: "/api/customers", description: "获取客户列表", params: [
        { name: "status", type: "string", location: "query", required: false, description: "状态" }
      ], action: () => api.customer.list() },
      { id: "cus-get", method: "GET", path: "/api/customers/:id", description: "获取客户详情", action: () => api.customer.getById("cus-001") },
      { id: "cus-create", method: "POST", path: "/api/customers", description: "创建客户", action: () => api.customer.create({ name: "测试客户", code: "C-TEST" }) },
      { id: "cus-update", method: "PUT", path: "/api/customers/:id", description: "更新客户信息", action: () => api.customer.update("cus-001", { name: "更新后客户" }) },
      { id: "cus-delete", method: "DELETE", path: "/api/customers/:id", description: "删除客户", action: () => api.customer.delete("cus-001") }
    ]
  },
  {
    key: "purchase",
    label: "采购管理",
    color: "#3B82F6",
    endpoints: [
      { id: "pr-list", method: "GET", path: "/api/purchase-requests", description: "获取采购申请列表", action: () => api.purchase.request.list() },
      { id: "pr-get", method: "GET", path: "/api/purchase-requests/:id", description: "获取采购申请详情", action: () => api.purchase.request.getById("pr-001") },
      { id: "pr-create", method: "POST", path: "/api/purchase-requests", description: "创建采购申请", action: () => api.purchase.request.create({ applicant: "张三", department: "采购部", title: "测试采购申请" }) },
      { id: "pr-update", method: "PUT", path: "/api/purchase-requests/:id", description: "更新采购申请", action: () => api.purchase.request.update("pr-001", {}) },
      { id: "pr-delete", method: "DELETE", path: "/api/purchase-requests/:id", description: "删除采购申请", action: () => api.purchase.request.delete("pr-001") },
      { id: "po-list", method: "GET", path: "/api/purchase-orders", description: "获取采购订单列表", action: () => api.purchase.order.list() },
      { id: "po-get", method: "GET", path: "/api/purchase-orders/:id", description: "获取采购订单详情", action: () => api.purchase.order.getById("po-001") },
      { id: "po-create", method: "POST", path: "/api/purchase-orders", description: "创建采购订单", action: () => api.purchase.order.create({ vendorId: "ven-001", vendorName: "测试供应商" }) },
      { id: "po-update", method: "PUT", path: "/api/purchase-orders/:id", description: "更新采购订单", action: () => api.purchase.order.update("po-001", {}) },
      { id: "po-confirm", method: "POST", path: "/api/purchase-orders/:id/confirm", description: "确认采购订单", action: () => api.purchase.order.confirm("po-001") },
      { id: "info-list", method: "GET", path: "/api/purchase-info-records", description: "获取采购信息记录", action: () => api.purchase.infoRecord.list() },
      { id: "info-create", method: "POST", path: "/api/purchase-info-records", description: "创建采购信息记录", action: () => api.purchase.infoRecord.create({ vendorId: "ven-001", materialId: "mat-001" }) },
      { id: "source-list", method: "GET", path: "/api/source-list", description: "获取货源清单", action: () => api.purchase.sourceList.list() }
    ]
  },
  {
    key: "sales",
    label: "销售管理",
    color: "#F97316",
    endpoints: [
      { id: "so-list", method: "GET", path: "/api/sales-orders", description: "获取销售订单列表", action: () => api.sales.order.list() },
      { id: "so-get", method: "GET", path: "/api/sales-orders/:id", description: "获取销售订单详情", action: () => api.sales.order.getById("so-001") },
      { id: "so-create", method: "POST", path: "/api/sales-orders", description: "创建销售订单", action: () => api.sales.order.create({ customerId: "cus-001", customerName: "测试客户" }) },
      { id: "so-update", method: "PUT", path: "/api/sales-orders/:id", description: "更新销售订单", action: () => api.sales.order.update("so-001", {}) },
      { id: "so-delete", method: "DELETE", path: "/api/sales-orders/:id", description: "删除销售订单", action: () => api.sales.order.delete("so-001") },
      { id: "sc-list", method: "GET", path: "/api/sales-contracts", description: "获取销售合同列表", action: () => api.sales.contract.list() },
      { id: "sc-create", method: "POST", path: "/api/sales-contracts", description: "创建销售合同", action: () => api.sales.contract.create({ name: "测试合同", customerId: "cus-001" }) },
      { id: "prosp-list", method: "GET", path: "/api/prospects", description: "获取意向客户列表", action: () => api.sales.prospect.list() },
      { id: "prosp-convert", method: "POST", path: "/api/prospects/:id/convert", description: "意向客户转化为正式客户", action: () => api.sales.prospect.convert("prosp-001") }
    ]
  },
  {
    key: "warehouse",
    label: "仓储管理",
    color: "#06B6D4",
    endpoints: [
      { id: "ib-list", method: "GET", path: "/api/inbounds", description: "获取入库单列表", action: () => api.warehouse.inbound.list() },
      { id: "ib-create", method: "POST", path: "/api/inbounds", description: "创建入库单", action: () => api.warehouse.inbound.create({ type: "purchase" }) },
      { id: "ob-list", method: "GET", path: "/api/outbounds", description: "获取出库单列表", action: () => api.warehouse.outbound.list() },
      { id: "ob-create", method: "POST", path: "/api/outbounds", description: "创建出库单", action: () => api.warehouse.outbound.create({ type: "sale" }) },
      { id: "inv-list", method: "GET", path: "/api/inventory", description: "获取库存列表", action: () => api.warehouse.inventory.list() },
      { id: "ck-list", method: "GET", path: "/api/inventory-checks", description: "获取盘点任务", action: () => api.warehouse.check.list() }
    ]
  },
  {
    key: "quality",
    label: "质量管理",
    color: "#EF4444",
    endpoints: [
      { id: "insp-list", method: "GET", path: "/api/inspections", description: "获取检验任务列表", action: () => api.quality.inspection.list() },
      { id: "insp-create", method: "POST", path: "/api/inspections", description: "创建检验任务", action: () => api.quality.inspection.create({ type: "incoming" }) },
      { id: "uq-list", method: "GET", path: "/api/unqualified-items", description: "获取不合格品列表", action: () => api.quality.unqualified.list() },
      { id: "fmea-list", method: "GET", path: "/api/fmea", description: "获取FMEA记录", action: () => api.quality.fmea.list() }
    ]
  },
  {
    key: "production",
    label: "生产管理",
    color: "#A855F7",
    endpoints: [
      { id: "wo-list", method: "GET", path: "/api/work-orders", description: "获取生产工单列表", action: () => api.production.workOrder.list() },
      { id: "wo-create", method: "POST", path: "/api/work-orders", description: "创建生产工单", action: () => api.production.workOrder.create({ productName: "测试物料", plannedQuantity: 100 }) },
      { id: "bom-list", method: "GET", path: "/api/boms", description: "获取BOM列表", action: () => api.production.bom.list() },
      { id: "mrp-list", method: "GET", path: "/api/mrp", description: "获取MRP建议", action: () => api.production.mrp.list() }
    ]
  },
  {
    key: "finance",
    label: "财务管理",
    color: "#6366F1",
    endpoints: [
      { id: "vch-list", method: "GET", path: "/api/vouchers", description: "获取会计凭证列表", action: () => api.finance.voucher.list() },
      { id: "vch-create", method: "POST", path: "/api/vouchers", description: "创建会计凭证", action: () => api.finance.voucher.create({ remark: "测试凭证" }) },
      { id: "ar-list", method: "GET", path: "/api/receivables", description: "获取应收账款列表", action: () => api.finance.receivable.list() },
      { id: "ap-list", method: "GET", path: "/api/payables", description: "获取应付账款列表", action: () => api.finance.payable.list() }
    ]
  },
  {
    key: "price",
    label: "价格管理",
    color: "#EC4899",
    endpoints: [
      { id: "inq-list", method: "GET", path: "/api/price-inquiries", description: "获取询价单列表", action: () => api.price.inquiry.list() },
      { id: "inq-create", method: "POST", path: "/api/price-inquiries", description: "创建询价单", action: () => api.price.inquiry.create({ inquiryNo: `INQ-${Date.now()}` }) },
      { id: "pl-list", method: "GET", path: "/api/price-list", description: "获取价目表", action: () => api.price.priceList.list() }
    ]
  },
  {
    key: "system",
    label: "系统管理",
    color: "#64748B",
    endpoints: [
      { id: "sys-status", method: "GET", path: "/api/status", description: "获取系统状态（版本、存储数据量）", action: () => api.system.getStatus(), responseExample: '{ "success": true, "data": { "version": "1.0.0", "storeCount": 0, "storageKB": 0 } }' },
      { id: "sys-export", method: "GET", path: "/api/export", description: "导出全部数据", action: () => api.system.exportAll() },
      { id: "sys-import", method: "POST", path: "/api/import", description: "导入数据", action: () => api.system.importAll({}) }
    ]
  }
];
const APIDocTab = () => {
  const [selectedEndpoint, setSelectedEndpoint] = reactExports.useState(null);
  const [calling, setCalling] = reactExports.useState(false);
  const [response, setResponse] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const handleSelect = reactExports.useCallback((endpoint) => {
    setSelectedEndpoint(endpoint);
    setResponse(null);
    setError(null);
  }, []);
  const handleTry = reactExports.useCallback(async () => {
    if (!(selectedEndpoint == null ? void 0 : selectedEndpoint.action)) return;
    setCalling(true);
    setResponse(null);
    setError(null);
    try {
      const res = await selectedEndpoint.action();
      setResponse(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCalling(false);
    }
  }, [selectedEndpoint]);
  const selectedModule = reactExports.useMemo(() => {
    if (!selectedEndpoint) return null;
    return apiModules.find(
      (m) => m.endpoints.some((e) => e.id === selectedEndpoint.id)
    ) ?? null;
  }, [selectedEndpoint]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { height: "calc(100vh - 300px)", minHeight: 500 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Key, {}), sx: { mb: 2, borderRadius: 2, fontSize: "0.8125rem" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTitle, { sx: { fontWeight: 600, fontSize: "0.875rem" }, children: "认证方式（Demo 模式无需认证）" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: { xs: "column", sm: "row" }, spacing: 3, sx: { mt: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", fontWeight: 600, children: "Bearer Token：" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { component: "code", variant: "caption", sx: { bgcolor: "#0F172A", color: "#22C55E", px: 1, py: 0.3, borderRadius: 0.5, ml: 0.5 }, children: [
            "Authorization: Bearer ",
            "{",
            "token",
            "}"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", fontWeight: 600, children: "API Key：" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { component: "code", variant: "caption", sx: { bgcolor: "#0F172A", color: "#F59E0B", px: 1, py: 0.3, borderRadius: 0.5, ml: 0.5 }, children: [
            "X-API-Key: ",
            "{",
            "key",
            "}"
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 2, height: "100%" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Paper,
        {
          elevation: 0,
          "data-testid": "api-doc-tree",
          sx: {
            width: 300,
            minWidth: 280,
            flexShrink: 0,
            overflow: "auto",
            border: "1px solid rgba(226,232,240,0.8)",
            borderRadius: 2
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { px: 2, py: 1.5, borderBottom: "1px solid rgba(226,232,240,0.6)", display: "flex", alignItems: "center", gap: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Http, { fontSize: "small", color: "primary" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 700, children: "API 端点目录" })
            ] }),
            apiModules.map((mod) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Accordion,
              {
                disableGutters: true,
                elevation: 0,
                sx: {
                  "&:before": { display: "none" },
                  borderBottom: "1px solid rgba(226,232,240,0.4)"
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    AccordionSummary,
                    {
                      expandIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandMore, {}),
                      sx: { minHeight: 44, "& .MuiAccordionSummary-content": { my: 0.5 } },
                      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 8, height: 8, borderRadius: "50%", bgcolor: mod.color, flexShrink: 0 } }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: mod.label }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: mod.endpoints.length, size: "small", sx: { height: 18, fontSize: "0.65rem" } })
                      ] })
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionDetails, { sx: { pt: 0, pb: 0.5, px: 1 }, children: mod.endpoints.map((ep) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Box,
                    {
                      onClick: () => handleSelect(ep),
                      sx: {
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        px: 1,
                        py: 0.6,
                        borderRadius: 1,
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        bgcolor: (selectedEndpoint == null ? void 0 : selectedEndpoint.id) === ep.id ? mod.color + "15" : "transparent",
                        "&:hover": { bgcolor: mod.color + "08" }
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Chip,
                          {
                            label: ep.method,
                            size: "small",
                            sx: {
                              height: 20,
                              fontSize: "0.6rem",
                              fontWeight: 700,
                              bgcolor: methodColors[ep.method] + "18",
                              color: methodColors[ep.method],
                              minWidth: 48,
                              fontFamily: "monospace"
                            }
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Typography,
                          {
                            variant: "caption",
                            fontFamily: "monospace",
                            fontSize: "0.75rem",
                            noWrap: true,
                            sx: { flex: 1 },
                            children: ep.path
                          }
                        )
                      ]
                    },
                    ep.id
                  )) })
                ]
              },
              mod.key
            ))
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Paper,
        {
          elevation: 0,
          "data-testid": "api-doc-detail",
          sx: {
            flex: 1,
            overflow: "auto",
            p: 0,
            border: "1px solid rgba(226,232,240,0.8)",
            borderRadius: 2
          },
          children: !selectedEndpoint ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", p: 4 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Http, { sx: { fontSize: 48, color: "#CBD5E1", mb: 2 } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { color: "text.secondary", children: "从左侧选择一个 API 端点查看详情" })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { px: 3, py: 2, borderBottom: "1px solid rgba(226,232,240,0.6)", display: "flex", alignItems: "center", gap: 2 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  label: selectedEndpoint.method,
                  sx: {
                    fontWeight: 700,
                    fontFamily: "monospace",
                    bgcolor: methodColors[selectedEndpoint.method] + "18",
                    color: methodColors[selectedEndpoint.method]
                  }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body1", fontFamily: "monospace", fontWeight: 600, children: selectedEndpoint.path }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  label: httpStatusText[selectedEndpoint.method],
                  size: "small",
                  sx: { bgcolor: "#F1F5F9", color: "#64748B", fontSize: "0.75rem" }
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { mb: 3, color: "#475569" }, children: selectedEndpoint.description }),
              selectedEndpoint.params && selectedEndpoint.params.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 3 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, mb: 1, children: "请求参数" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "参数名" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "类型" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "位置" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "必填" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "说明" })
                  ] }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: selectedEndpoint.params.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", fontFamily: "monospace", children: p.name }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: p.type, size: "small", sx: { height: 20, fontSize: "0.65rem" } }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: p.location, size: "small", variant: "outlined", sx: { height: 20, fontSize: "0.65rem" } }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: p.required ? /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { sx: { fontSize: 16, color: "#EF4444" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "否" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: p.description }) })
                  ] }, p.name)) })
                ] }) })
              ] }),
              selectedEndpoint.bodyExample && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 3 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, mb: 1, children: "请求体示例" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Box,
                  {
                    component: "pre",
                    sx: {
                      bgcolor: "#0F172A",
                      color: "#22C55E",
                      p: 2,
                      borderRadius: 1.5,
                      fontSize: "0.75rem",
                      fontFamily: "monospace",
                      overflow: "auto",
                      maxHeight: 200
                    },
                    children: selectedEndpoint.bodyExample
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 2 } }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 2, mb: 3 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    "data-testid": "api-doc-try",
                    variant: "contained",
                    startIcon: calling ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircularProgress, { size: 16, color: "inherit" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(PlayArrow, {}),
                    onClick: handleTry,
                    disabled: calling || !selectedEndpoint.action,
                    size: "small",
                    children: calling ? "调用中..." : "Try it"
                  }
                ),
                selectedModule && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Chip,
                  {
                    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 8, height: 8, borderRadius: "50%", bgcolor: selectedModule.color, ml: 1 } }),
                    label: selectedModule.label,
                    size: "small",
                    variant: "outlined"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { "data-testid": "api-doc-response", children: [
                (response || error) && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: 1 }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "响应结果" }),
                    response && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Chip,
                      {
                        icon: response.success ? /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { fontSize: "small" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorOutline, { fontSize: "small" }),
                        label: response.success ? "200 OK" : "Error",
                        size: "small",
                        color: response.success ? "success" : "error",
                        variant: "filled"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Box,
                    {
                      component: "pre",
                      sx: {
                        bgcolor: "#0F172A",
                        color: (response == null ? void 0 : response.success) ? "#22C55E" : "#EF4444",
                        p: 2,
                        borderRadius: 1.5,
                        fontSize: "0.75rem",
                        fontFamily: "monospace",
                        overflow: "auto",
                        maxHeight: 300,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all"
                      },
                      children: error ? `Error: ${error}` : JSON.stringify(response, null, 2)
                    }
                  ),
                  selectedEndpoint.responseExample && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 2 }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, mb: 0.5, color: "text.secondary", children: "响应示例" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Box,
                      {
                        component: "pre",
                        sx: {
                          bgcolor: "#F8FAFC",
                          color: "#334155",
                          p: 2,
                          borderRadius: 1.5,
                          fontSize: "0.75rem",
                          fontFamily: "monospace",
                          overflow: "auto",
                          maxHeight: 200,
                          border: "1px solid rgba(226,232,240,0.6)",
                          whiteSpace: "pre-wrap"
                        },
                        children: selectedEndpoint.responseExample
                      }
                    )
                  ] })
                ] }),
                !response && !error && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", sx: { fontStyle: "italic" }, children: '点击 "Try it" 按钮测试此 API 端点' })
              ] })
            ] })
          ] })
        }
      )
    ] })
  ] });
};
const FORM_PERMISSIONS = [
  {
    group: "生产管理",
    color: "#8B5CF6",
    forms: [
      { id: "work_order", name: "生产工单", desc: "工单创建、工序派工、完工报告" },
      { id: "mrp", name: "MRP计划", desc: "MRP运算、需求查看、计划调整" },
      { id: "process_route", name: "工艺路线", desc: "路线定义、工序参数管理" }
    ]
  },
  {
    group: "采购管理",
    color: "#3B82F6",
    forms: [
      { id: "purchase_request", name: "采购申请", desc: "申请创建、提交审批、审批" },
      { id: "purchase_order", name: "采购订单", desc: "订单创建、确认、变更、关闭" },
      { id: "price_compare", name: "比价管理", desc: "报价比较、定价决策" },
      { id: "order_track", name: "订单跟踪", desc: "交货进度查看、催货" }
    ]
  },
  {
    group: "销售管理",
    color: "#F97316",
    forms: [
      { id: "sales_order", name: "销售订单", desc: "订单创建、审批、跟踪" },
      { id: "sales_prospect", name: "意向客户", desc: "客户开发、跟进、转化" },
      { id: "sales_project", name: "项目管理", desc: "项目进度、异常反馈" },
      { id: "sales_logistics", name: "物流发货", desc: "发货计划、物流跟踪" }
    ]
  },
  {
    group: "供应商管理",
    color: "#F59E0B",
    forms: [
      { id: "vendor_register", name: "供应商注册", desc: "新供应商注册申请（含供应商自助）" },
      { id: "vendor_approval", name: "供应商审批", desc: "注册审批、资质审核" },
      { id: "vendor_order_confirm", name: "订单确认", desc: "供应商侧确认采购订单（供应商界面）" },
      { id: "delivery_shipment", name: "发货物流", desc: "发货通知、物流跟踪（供应商界面）" },
      { id: "vendor_quality_issue", name: "质量问题单", desc: "质量问题创建、响应、关闭" },
      { id: "vendor_8d", name: "8D改善报告", desc: "改善报告提交与审核（供应商界面）" },
      { id: "vendor_statement", name: "对账单", desc: "月度对账单生成与确认" },
      { id: "vendor_invoice", name: "开票申请", desc: "发票申请、审核、认证（供应商界面）" }
    ]
  },
  {
    group: "仓储物流",
    color: "#10B981",
    forms: [
      { id: "inbound", name: "采购入库单", desc: "入库单创建、实收录入" },
      { id: "outbound", name: "出库单", desc: "出库申请、发料确认" },
      { id: "fg_inbound", name: "成品入库单", desc: "成品入库、关联生产工单" },
      { id: "inventory_check", name: "库存盘点单", desc: "盘点任务、差异处理" }
    ]
  },
  {
    group: "质量管理",
    color: "#EF4444",
    forms: [
      { id: "inspection_notice", name: "报检单", desc: "来料/成品报检，关联检验单" },
      { id: "inspection_task", name: "检验单", desc: "检验结果录入、判定" },
      { id: "unqualified", name: "不合格品处理单", desc: "不合格品隔离、让步/退货/报废处理" },
      { id: "pdca", name: "PDCA改善单", desc: "质量改善立项与跟踪" }
    ]
  },
  {
    group: "财务管理",
    color: "#6366F1",
    forms: [
      { id: "invoice_mgmt", name: "发票管理", desc: "发票登记、验证、归档" },
      { id: "payment_plan", name: "付款计划", desc: "付款计划制定与审批" },
      { id: "accounting", name: "会计凭证", desc: "凭证录入、审核、过账" },
      { id: "tax_accounting", name: "税务核算", desc: "税单管理、税务申报" },
      { id: "project_accounting", name: "项目核算", desc: "项目成本、预算跟踪" }
    ]
  }
];
const PERMISSION_ACTIONS = ["查看", "新建", "编辑", "删除", "审批", "导出"];
const rolePermMap = {
  admin: Object.fromEntries(FORM_PERMISSIONS.flatMap((g) => g.forms.map((f) => [f.id, [true, true, true, true, true, true]]))),
  buyer: Object.fromEntries(
    FORM_PERMISSIONS.flatMap((g) => g.forms.map((f) => {
      if (["purchase_request", "purchase_order", "price_compare", "order_track", "sales_order", "sales_prospect"].includes(f.id)) return [f.id, [true, true, true, false, false, true]];
      if (["vendor_order_confirm", "delivery_shipment", "vendor_quality_issue", "vendor_statement"].includes(f.id)) return [f.id, [true, false, false, false, false, true]];
      return [f.id, [true, false, false, false, false, false]];
    }))
  ),
  qa_engineer: Object.fromEntries(
    FORM_PERMISSIONS.flatMap((g) => g.forms.map((f) => {
      if (["inspection_notice", "inspection_task", "unqualified", "pdca", "vendor_quality_issue", "vendor_8d"].includes(f.id)) return [f.id, [true, true, true, false, true, true]];
      return [f.id, [true, false, false, false, false, false]];
    }))
  ),
  warehouse_keeper: Object.fromEntries(
    FORM_PERMISSIONS.flatMap((g) => g.forms.map((f) => {
      if (["inbound", "outbound", "fg_inbound", "inventory_check"].includes(f.id)) return [f.id, [true, true, true, false, false, true]];
      return [f.id, [true, false, false, false, false, false]];
    }))
  )
};
function FormPermissionPanel() {
  const [selectedRole, setSelectedRole] = reactExports.useState("admin");
  const [expanded, setExpanded] = reactExports.useState({});
  const toggleGroup = (g) => setExpanded((prev) => ({ ...prev, [g]: !prev[g] }));
  const currentPerms = rolePermMap[selectedRole] || rolePermMap.admin;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 2, mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "选择角色：" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 1, flexWrap: "wrap" }, children: ROLE_DEFINITIONS.slice(0, 6).map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: r.name,
          size: "small",
          color: selectedRole === r.id ? "primary" : "default",
          onClick: () => setSelectedRole(r.id),
          sx: { cursor: "pointer", fontWeight: selectedRole === r.id ? 600 : 400 }
        },
        r.id
      )) })
    ] }),
    FORM_PERMISSIONS.map((group) => {
      const isOpen = expanded[group.group] !== false;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Paper,
        {
          elevation: 0,
          sx: { border: "1px solid rgba(226,232,240,.8)", borderRadius: 2, mb: 2, overflow: "hidden" },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: {
              px: 2,
              py: 1.5,
              bgcolor: group.color + "10",
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              userSelect: "none"
            }, onClick: () => toggleGroup(group.group), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 10, height: 10, borderRadius: "50%", bgcolor: group.color, mr: 1.5 } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 700, sx: { flex: 1 }, children: group.group }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { mr: 1 }, children: [
                group.forms.length,
                " 个表单"
              ] }),
              isOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandLess, { sx: { fontSize: 18 } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandMore, { sx: { fontSize: 18 } })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Collapse, { in: isOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, fontSize: "0.8rem", minWidth: 180 }, children: "表单名称" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, fontSize: "0.8rem" }, children: "说明" }),
                PERMISSION_ACTIONS.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", sx: { fontWeight: 600, fontSize: "0.8rem", minWidth: 56 }, children: a }, a))
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: group.forms.map((form) => {
                const perms = currentPerms[form.id] || [false, false, false, false, false, false];
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: form.name }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: form.desc }) }),
                  PERMISSION_ACTIONS.map((a, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Switch,
                    {
                      size: "small",
                      checked: perms[i] || false,
                      sx: {
                        "& .MuiSwitch-switchBase.Mui-checked": { color: group.color },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: group.color }
                      },
                      disabled: selectedRole === "admin"
                    }
                  ) }, a))
                ] }, form.id);
              }) })
            ] }) }) })
          ]
        },
        group.group
      );
    }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", justifyContent: "flex-end", mt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), children: "保存权限配置" }) })
  ] });
}
const Settings = () => {
  const [snackbar, setSnackbar] = reactExports.useState({ open: false, msg: "" });
  const [switchDialog, setSwitchDialog] = reactExports.useState(false);
  const [selectedRole, setSelectedRole] = reactExports.useState("admin");
  const [selectedName, setSelectedName] = reactExports.useState("");
  const { currentUser: currentUser2, switchRole } = useAuthStore();
  const navigate = useNavigate();
  const users = useUserStore((s) => s.users);
  const addUser = useUserStore((s) => s.addUser);
  const updateUser = useUserStore((s) => s.updateUser);
  const [editUser, setEditUser] = reactExports.useState(null);
  const [query, setQuery] = reactExports.useState("");
  const [activeId, setActiveId] = reactExports.useState("basic");
  const handleSave = () => setSnackbar({ open: true, msg: "设置已保存" });
  const handleSwitchRole = () => {
    if (selectedName && selectedRole) {
      switchRole(selectedRole, selectedName);
      setSwitchDialog(false);
      setSnackbar({ open: true, msg: `已切换到角色：${ROLE_NAMES[selectedRole]}` });
    }
  };
  const renderProcurementStrategy = () => /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 3, fontWeight: 600, color: "#1E293B" }, children: "价格抓取策略" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 3, borderRadius: 2 }, children: "设置创建采购订单时自动从价目表抓取物料价格的规则。采购员可在订单中手动覆盖自动抓取的价格。" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2.5, borderRadius: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "价格来源优先级" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, sx: { mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "价格抓取规则" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { defaultValue: "latest-valid", label: "价格抓取规则", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "latest-valid", children: "有效期内的最新价格（推荐）" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "lowest-valid", children: "有效期内最低价格" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "latest-approved", children: "最新审批通过价格" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "manual", children: "不自动抓取（全部手工输入）" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "默认为「有效期内的最新价格」：系统自动匹配物料编码，查找状态为「有效」且在有效期内的价目表记录，按生效日期降序取最新一条。" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2.5, borderRadius: 2, height: "100%" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "供应商匹配规则" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, sx: { mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "默认供应商选择" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { defaultValue: "auto-price", label: "默认供应商选择", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "auto-price", children: "跟随价目表（按价格策略自动匹配）" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "last-order", children: "最近一次采购的供应商" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "manual-select", children: "手工选择" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, sx: { mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "多供应商策略" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { defaultValue: "allow-multi", label: "多供应商策略", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "allow-multi", children: "允许不同物料选择不同供应商" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "single-vendor", children: "整单统一供应商" })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2.5, borderRadius: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "价格有效期校验" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: "column", gap: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: "严格校验价格有效期" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "仅抓取当前日期在有效期内的价格" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { defaultChecked: true })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: "允许抓取即将过期价格" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "到期前30天内的价格仍可使用" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { defaultChecked: true })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: "过期价格预警" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "抓取的价格距过期不足15天时提示" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { defaultChecked: true })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2.5, borderRadius: 2, height: "100%" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "价格允许浮动范围" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: "column", gap: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "允许上浮比例",
            defaultValue: "5",
            type: "number",
            InputProps: { endAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { ml: 1 }, children: "%" }) },
            helperText: "采购订单价格超过价目表价格的上限，超出需审批"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "允许下浮比例",
            defaultValue: "20",
            type: "number",
            InputProps: { endAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { ml: 1 }, children: "%" }) },
            helperText: "采购订单价格低于价目表的优惠下限，可不审批自动通过"
          }
        )
      ] })
    ] }) })
  ] });
  const renderNotification = () => /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 6, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 2, fontWeight: 600, color: "#1E293B" }, children: "联系方式" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: "column", gap: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { label: "管理员邮箱", defaultValue: "admin@ssa.com", fullWidth: true, type: "email" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { label: "联系电话", defaultValue: "400-888-8888", fullWidth: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { label: "运维群", defaultValue: "SSA-ERP-维护群", fullWidth: true })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 6, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 2, fontWeight: 600, color: "#1E293B" }, children: "推送配置" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: "column", gap: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "采购到期提醒" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { defaultValue: "3", label: "采购到期提醒", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "1", children: "提前1天" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "3", children: "提前3天" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "7", children: "提前7天" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "库存预警阈值" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { defaultValue: "20", label: "库存预警阈值", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "10", children: "低于10%时预警" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "20", children: "低于20%时预警" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "30", children: "低于30%时预警" })
          ] })
        ] })
      ] })
    ] })
  ] });
  const renderUserManagement = () => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600, color: "#1E293B" }, children: "用户列表" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outlined",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, {}),
            onClick: () => setSwitchDialog(true),
            size: "small",
            children: "切换当前角色"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(PersonAdd, {}),
            size: "small",
            onClick: () => {
              const id = `u-${Date.now()}`;
              setEditUser({
                id,
                name: "",
                username: "",
                role: "buyer",
                department: "",
                status: "active",
                email: ""
              });
            },
            children: "新增用户"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 2, borderRadius: 2 }, children: [
      "当前登录身份：",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: currentUser2 == null ? void 0 : currentUser2.name }),
      " — ",
      ROLE_NAMES[currentUser2 == null ? void 0 : currentUser2.role] || "",
      "。可通过「切换当前角色」来测试不同角色视角。"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "用户" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "账号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "角色" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "部门" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: users.map((user) => {
        const roleDef = ROLE_DEFINITIONS.find((r) => r.id === user.role);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { sx: { width: 32, height: 32, bgcolor: (roleDef == null ? void 0 : roleDef.color) + "20", color: roleDef == null ? void 0 : roleDef.color, fontSize: "0.875rem", fontWeight: 600 }, children: user.name.charAt(0) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 500 }, children: user.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#94A3B8" }, children: user.email })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: user.username }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: ROLE_NAMES[user.role],
              size: "small",
              sx: { bgcolor: (roleDef == null ? void 0 : roleDef.color) + "15", color: roleDef == null ? void 0 : roleDef.color, fontWeight: 500, border: "none" }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: user.department }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5 }, children: [
            user.status === "active" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { sx: { fontSize: 14, color: "#10B981" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(RadioButtonUnchecked, { sx: { fontSize: 14, color: "#94A3B8" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: user.status === "active" ? "#10B981" : "#94A3B8" }, children: user.status === "active" ? "启用" : "停用" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => setEditUser({ ...user }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }) })
        ] }, user.id);
      }) })
    ] }) })
  ] });
  const renderRolePermissions = () => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 2, fontWeight: 600, color: "#1E293B" }, children: "角色权限矩阵" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, children: ROLE_DEFINITIONS.map((role) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Paper,
      {
        variant: "outlined",
        sx: {
          p: 2.5,
          borderRadius: 2,
          borderColor: role.color + "40",
          bgcolor: role.color + "08",
          height: "100%"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { sx: { width: 36, height: 36, bgcolor: role.color + "20", color: role.color, fontSize: "0.875rem" }, children: role.name.charAt(0) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { fontWeight: 600, color: "#1E293B" }, children: role.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#64748B" }, children: role.description })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }, children: [
            role.permissions.includes("*") ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "全部权限", size: "small", sx: { bgcolor: role.color + "20", color: role.color, fontSize: "0.6875rem" } }) : role.permissions.slice(0, 6).map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: p, size: "small", sx: { bgcolor: "#F1F5F9", color: "#475569", fontSize: "0.6875rem" } }, p)),
            role.permissions.length > 6 && !role.permissions.includes("*") && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `+${role.permissions.length - 6}`, size: "small", sx: { bgcolor: role.color + "15", color: role.color, fontSize: "0.6875rem" } })
          ] })
        ]
      }
    ) }, role.id)) })
  ] });
  const groups = [
    {
      id: "enterprise",
      label: "企业基础",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Business, { fontSize: "small" }),
      items: [
        { id: "basic", label: "基本设置", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Tune, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(BasicConfigTab, {}) },
        { id: "org", label: "组织账套", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Hub, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(OrgTab, {}) },
        { id: "datadict", label: "数据字典", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Storage, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(DataDictTab, {}) },
        { id: "numbering", label: "编号规则", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Description, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(NumberingTab, {}) }
      ]
    },
    {
      id: "user",
      label: "用户与权限",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(People, { fontSize: "small" }),
      items: [
        { id: "users", label: "用户管理", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(People, { fontSize: "small" }), render: renderUserManagement },
        { id: "roles", label: "角色权限", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Security, { fontSize: "small" }), render: renderRolePermissions },
        { id: "forms", label: "表单权限", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Assignment, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(FormPermissionPanel, {}) },
        { id: "dataperm", label: "数据权限", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Security, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(DataPermissionTab, {}) },
        { id: "fieldperm", label: "字段级权限", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(VerifiedUser, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(FieldPermissions, {}) }
      ]
    },
    {
      id: "oa",
      label: "OA流程定制",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AccountTree, { fontSize: "small" }),
      items: [
        { id: "approval", label: "审批流程", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AccountTree, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(ApprovalFlowTab, {}) },
        { id: "workflowEngine", label: "工作流引擎", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(WorkflowEngine, {}) },
        { id: "lowcode", label: "表单设计器", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Description, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(LowCodeDesigner, {}) },
        { id: "material_approval", label: "物料审批", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FactCheck, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(MaterialApprovalTab, {}) },
        { id: "material_rating", label: "物料评级", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(StarRate, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(MaterialRatingTab, {}) },
        { id: "vendor_rating", label: "供应商评级", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(StarRate, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(VendorRatingTab, {}) },
        { id: "condition", label: "条件技术", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Tune, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(ConditionTab, {}) }
      ]
    },
    {
      id: "ux",
      label: "界面与体验",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Palette, { fontSize: "small" }),
      items: [
        { id: "menu", label: "菜单配置", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MenuIcon, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuConfigTab, {}) },
        { id: "display", label: "显示与主题", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(DarkMode, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(DisplaySettingsTab, {}) },
        { id: "mobile", label: "移动端", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(PhoneAndroid, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(MobileTab, {}) },
        { id: "customfield", label: "自定义字段", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Tune, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(CustomFieldTab, {}) },
        { id: "print", label: "打印模板", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Description, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(PrintTemplateTab, {}) },
        { id: "ordertemplate", label: "订单模板", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Description, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(OrderTemplateTab, {}) },
        { id: "notify", label: "通知设置", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Notifications, { fontSize: "small" }), render: renderNotification },
        { id: "i18n", label: "多语言", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Translate, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(I18nSettings, {}) }
      ]
    },
    {
      id: "supply",
      label: "供应链策略",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Inventory2, { fontSize: "small" }),
      items: [
        { id: "purchase", label: "采购策略", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CartIcon, { fontSize: "small" }), render: renderProcurementStrategy },
        { id: "salesprice", label: "销售价目表", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CartIcon, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(SalesPriceTab, {}) },
        { id: "unit", label: "单位换算", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(SwapHoriz, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(UnitConversionTab, {}) },
        { id: "vendorportal", label: "供应商门户", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Storefront, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(VendorPortalConfigTab, {}) }
      ]
    },
    {
      id: "integration",
      label: "集成与开发",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Code, { fontSize: "small" }),
      items: [
        { id: "integration", label: "第三方对接通道", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Hub, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(IntegrationTab, {}) },
        { id: "integrationHub", label: "开放接口与Webhook", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Api, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(IntegrationHub, {}) },
        { id: "api", label: "API接口文档", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Code, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(APIDocTab, {}) },
        { id: "server", label: "服务端与审计", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Security, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(ServerAuditTab, {}) }
      ]
    },
    {
      id: "dataops",
      label: "数据与运维",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Backup, { fontSize: "small" }),
      items: [
        { id: "datamgmt", label: "数据管理", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Storage, { fontSize: "small" }), render: () => /* @__PURE__ */ jsxRuntimeExports.jsx(DataManagement, {}) }
      ]
    },
    {
      id: "help",
      label: "帮助中心",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(HelpOutline, { fontSize: "small" }),
      items: [
        {
          id: "manual",
          label: "使用说明书",
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MenuBook, { fontSize: "small" }),
          render: () => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3, textAlign: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 1, fontWeight: 600 }, children: "SSA ERP 使用说明书" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3, maxWidth: 480, mx: "auto" }, children: "覆盖每个表单的用途、为何这样操作、关键字段、操作流程与注意事项；并提供「版本更新记录」供每次升级后查阅变更。" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(MenuBook, {}), onClick: () => navigate("/help/manual"), children: "打开使用说明书" })
          ] })
        }
      ]
    }
  ];
  const q = query.trim().toLowerCase();
  const filteredGroups = q ? groups.map((g) => ({ ...g, items: g.items.filter((it) => it.label.toLowerCase().includes(q)) })).filter((g) => g.items.length > 0) : groups;
  const activeGroup = filteredGroups.find((g) => g.items.some((it) => it.id === activeId)) || groups.find((g) => g.items.some((it) => it.id === activeId));
  const activeItem = activeGroup == null ? void 0 : activeGroup.items.find((it) => it.id === activeId);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: "#1E293B" }, children: "系统设置" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleSave, children: "保存设置" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { borderRadius: 3, overflow: "hidden" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: { xs: "column", md: "row" }, minHeight: 620 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: {
        width: { xs: "100%", md: 264 },
        borderRight: { md: "1px solid rgba(226,232,240,0.8)" },
        borderBottom: { xs: "1px solid rgba(226,232,240,0.8)", md: "none" },
        p: 1.5,
        overflowY: "auto"
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            placeholder: "搜索设置项",
            value: query,
            onChange: (e) => setQuery(e.target.value),
            InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { fontSize: "small", sx: { mr: 0.5, color: "#94A3B8" } }) },
            sx: { mb: 1.5 }
          }
        ),
        filteredGroups.map((g) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, px: 1, py: 0.75, color: "#64748B" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", color: "#94A3B8" }, children: g.icon }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "overline", sx: { fontWeight: 700, letterSpacing: "0.06em", fontSize: "0.72rem" }, children: g.label })
          ] }),
          g.items.map((it) => {
            const active = it.id === activeId;
            return /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                fullWidth: true,
                startIcon: it.icon,
                onClick: () => {
                  if (it.id === "manual") {
                    navigate("/help/manual");
                    return;
                  }
                  setActiveId(it.id);
                },
                sx: {
                  justifyContent: "flex-start",
                  textTransform: "none",
                  fontSize: "0.875rem",
                  py: 0.9,
                  px: 1.5,
                  mb: 0.25,
                  borderRadius: 1.5,
                  color: active ? "primary.main" : "#475569",
                  bgcolor: active ? "primary.main10" : "transparent",
                  fontWeight: active ? 600 : 400,
                  "&:hover": { bgcolor: active ? "primary.main18" : "rgba(148,163,184,0.12)" }
                },
                children: it.label
              },
              it.id
            );
          })
        ] }, g.id)),
        filteredGroups.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { px: 1.5, py: 2 }, children: [
          "未找到匹配「",
          query,
          "」的设置项"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { flex: 1, minWidth: 0, p: { xs: 2, md: 3 } }, children: [
        activeGroup && activeItem && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5, mb: 2, color: "#94A3B8" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { fontWeight: 600 }, children: activeGroup.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { sx: { fontSize: 16 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", sx: { fontWeight: 700, color: "#1E293B" }, children: activeItem.label })
        ] }),
        activeItem ? activeItem.render() : null
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: switchDialog, onClose: () => setSwitchDialog(false), maxWidth: "xs", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: "切换角色（测试用）" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { sx: { pt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: "column", gap: 2, pt: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "选择角色" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              value: selectedRole,
              label: "选择角色",
              onChange: (e) => {
                var _a;
                setSelectedRole(e.target.value);
                const def = ROLE_DEFINITIONS.find((r) => r.id === e.target.value);
                if (def) setSelectedName(((_a = users.find((u) => u.role === e.target.value)) == null ? void 0 : _a.name) || def.name);
              },
              children: ROLE_DEFINITIONS.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: r.id, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 8, height: 8, borderRadius: "50%", bgcolor: r.color } }),
                r.name
              ] }) }, r.id))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "显示名称",
            value: selectedName,
            onChange: (e) => setSelectedName(e.target.value),
            fullWidth: true
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setSwitchDialog(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleSwitchRole, children: "切换" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Snackbar,
      {
        open: snackbar.open,
        autoHideDuration: 2500,
        onClose: () => setSnackbar({ open: false, msg: "" }),
        message: snackbar.msg
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: !!editUser, onClose: () => setEditUser(null), maxWidth: "xs", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: (editUser == null ? void 0 : editUser.id) ? "编辑用户" : "新增用户" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { sx: { pt: 2 }, children: editUser && /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, sx: { mt: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "姓名",
            value: editUser.name,
            onChange: (e) => setEditUser({ ...editUser, name: e.target.value }),
            fullWidth: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "账号",
            value: editUser.username,
            onChange: (e) => setEditUser({ ...editUser, username: e.target.value }),
            fullWidth: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "角色" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              value: editUser.role,
              label: "角色",
              onChange: (e) => setEditUser({ ...editUser, role: e.target.value }),
              children: ROLE_DEFINITIONS.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: r.id, children: r.name }, r.id))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "部门",
            value: editUser.department,
            onChange: (e) => setEditUser({ ...editUser, department: e.target.value }),
            fullWidth: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "邮箱",
            value: editUser.email,
            onChange: (e) => setEditUser({ ...editUser, email: e.target.value }),
            fullWidth: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "状态" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              value: editUser.status,
              label: "状态",
              onChange: (e) => setEditUser({ ...editUser, status: e.target.value }),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "active", children: "启用" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "inactive", children: "停用" })
              ]
            }
          )
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setEditUser(null), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            disabled: !(editUser == null ? void 0 : editUser.name.trim()) || !(editUser == null ? void 0 : editUser.username.trim()),
            onClick: () => {
              if (!editUser) return;
              const exists = users.some((u) => u.id === editUser.id);
              if (exists) updateUser(editUser.id, editUser);
              else addUser(editUser);
              setEditUser(null);
              setSnackbar({ open: true, msg: "用户已保存" });
            },
            children: "保存"
          }
        )
      ] })
    ] })
  ] });
};
export {
  Settings as default
};
