import { r as reactExports, j as jsxRuntimeExports, bj as Alert, cO as TableContainer, aP as Paper, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip, bk as Button, bR as Visibility, b7 as Dialog, b8 as DialogTitle, B as Box, h as Typography, aS as CloseIcon, ba as DialogContent, bX as Grid, bt as TextField, aO as MenuItem, cN as Autocomplete, bK as Stack, bC as DialogActions, d2 as ThumbUp, d3 as Clear } from "./vendor-46QZWBd3.js";
import { j as useSettingsStore, h as useAuthStore, a as useVendorStore, R as ROLE_NAMES, u as useMaterialStore } from "./index-CcOZBoQL.js";
import { F as FlowTracker } from "./FlowTracker-C0aNMuXm.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import { u as useMaterialApprovalStore, b as buildMaterialFromApplication } from "./materialApprovalStore-SWd-rLjJ.js";
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
import "./reportPermissionStore-BivOpSPb.js";
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
import "./codeGenerator-DzlFgjvf.js";
import "./options-BINuI5Gr.js";
import "./vendorRating-DKHWnbxs.js";
const STATUS_LABEL = {
  draft: "草稿",
  pending: "待审批",
  approved: "已批准",
  rejected: "已驳回"
};
const STATUS_COLOR = {
  draft: "default",
  pending: "warning",
  approved: "success",
  rejected: "error"
};
const FIELD_LABELS = {
  name: "物料名称",
  unit: "单位",
  specification: "规格型号",
  model: "型号",
  makeOrBuy: "自制/外购",
  materialType: "物料类型",
  categoryId: "物料分类",
  safetyStock: "安全库存",
  minStock: "最小库存",
  maxStock: "最大库存",
  price: "单价",
  currency: "币种",
  remarks: "备注",
  leadTime: "采购提前期(天)",
  moq: "最小订单量",
  mpq: "最小包装量",
  defaultVendorId: "默认供应商ID",
  defaultVendorName: "默认供应商名称",
  purchaseUnit: "采购单位",
  unitConversion: "单位换算系数",
  // 工艺属性（自制件路径）
  routing: "工艺路线",
  workCenter: "工作中心",
  cycleTime: "周期时间(天)",
  scrapRate: "报废率(%)",
  inspectionPoint: "检验点"
};
const NUMERIC_FIELDS = /* @__PURE__ */ new Set([
  "safetyStock",
  "minStock",
  "maxStock",
  "price",
  "leadTime",
  "moq",
  "mpq",
  "unitConversion",
  "cycleTime",
  "scrapRate"
]);
const MAKE_OR_BUY_OPTIONS = [
  { value: "make", label: "自制" },
  { value: "buy", label: "外购" }
];
const MATERIAL_TYPE_OPTIONS = [
  { value: "raw", label: "原材料" },
  { value: "semi", label: "半成品" },
  { value: "finished", label: "成品" },
  { value: "purchased", label: "外购件" },
  { value: "service", label: "服务" }
];
const BUY_STEP_NODE_IDS = ["ma_submit", "ma_purchase", "ma_approve"];
const MAKE_STEP_NODE_IDS = ["mam_submit", "mam_process", "mam_approve"];
const roleName = (role) => role ? ROLE_NAMES[role] || role : "-";
const MaterialApprovalQueue = () => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p;
  const { materialApplications, updateMaterialApplication } = useMaterialApprovalStore();
  const buySteps = useSettingsStore((s) => s.materialApprovalConfig.steps);
  const makeSteps = useSettingsStore((s) => s.materialApprovalConfig.makeSteps);
  const currentUser = useAuthStore((s) => s.currentUser);
  const vendors = useVendorStore((s) => s.vendors);
  const [selectedId, setSelectedId] = reactExports.useState(null);
  const [rejectComment, setRejectComment] = reactExports.useState("");
  const [successMsg, setSuccessMsg] = reactExports.useState("");
  const [editValues, setEditValues] = reactExports.useState({});
  const selectedApp = materialApplications.find((a) => a.id === selectedId) || null;
  const effectiveSteps = reactExports.useMemo(() => {
    var _a2;
    const isMake = ((_a2 = selectedApp == null ? void 0 : selectedApp.draft) == null ? void 0 : _a2.makeOrBuy) === "make";
    return (isMake ? makeSteps : buySteps) || buySteps;
  }, [(_a = selectedApp == null ? void 0 : selectedApp.draft) == null ? void 0 : _a.makeOrBuy, makeSteps, buySteps]);
  const steps = effectiveSteps;
  const stepNodeIds = ((_b = selectedApp == null ? void 0 : selectedApp.draft) == null ? void 0 : _b.makeOrBuy) === "make" ? MAKE_STEP_NODE_IDS : BUY_STEP_NODE_IDS;
  const flowModule = ((_c = selectedApp == null ? void 0 : selectedApp.draft) == null ? void 0 : _c.makeOrBuy) === "make" ? "material-approval-make" : "material-approval";
  const canEdit = reactExports.useMemo(() => {
    if (!selectedApp) return false;
    const step = steps[selectedApp.currentStep];
    return !!step && ((currentUser == null ? void 0 : currentUser.role) === step.role || (currentUser == null ? void 0 : currentUser.role) === "admin" || (currentUser ? useAuthStore.getState().hasPermission("material.approve") : false));
  }, [selectedApp, steps, currentUser]);
  const openDialog = (app) => {
    var _a2;
    setSelectedId(app.id);
    setRejectComment("");
    setSuccessMsg("");
    const init = {};
    (((_a2 = steps[app.currentStep]) == null ? void 0 : _a2.fields) ?? []).forEach((f) => {
      init[f] = app.draft[f] ?? "";
    });
    setEditValues((prev) => ({ ...prev, [app.id]: init }));
  };
  const closeDialog = () => setSelectedId(null);
  const setFieldValue = (appId, field, value) => {
    setEditValues((prev) => ({
      ...prev,
      [appId]: { ...prev[appId] || {}, [field]: value }
    }));
  };
  const handleSubmitNext = (app) => {
    const cfg = useSettingsStore.getState().materialApprovalConfig;
    const nextStep = app.currentStep + 1;
    const nextCfg = cfg.steps[nextStep];
    const edited = editValues[app.id] || {};
    const fieldNames = Object.keys(edited).filter((k) => edited[k] !== "" && edited[k] !== void 0 && edited[k] !== null);
    const mergedDraft = { ...app.draft, ...edited };
    const now = (/* @__PURE__ */ new Date()).toISOString();
    updateMaterialApplication(app.id, {
      draft: mergedDraft,
      currentStep: nextStep,
      stepHistory: [
        ...app.stepHistory,
        {
          step: nextStep,
          role: (currentUser == null ? void 0 : currentUser.role) || "admin",
          label: (nextCfg == null ? void 0 : nextCfg.label) || "审核",
          action: "submit",
          fields: (nextCfg == null ? void 0 : nextCfg.fields) ?? [],
          at: now
        }
      ],
      updatedAt: now
    });
    const savedFields = fieldNames.length > 0 ? `（已保存：${fieldNames.map((f) => FIELD_LABELS[f] || f).join("、")}）` : "";
    setSuccessMsg(`✅ 已提交至下一步「${(nextCfg == null ? void 0 : nextCfg.label) || "审核"}」${savedFields}，等待处理`);
  };
  const handleApprove = (app) => {
    var _a2;
    const materialState = useMaterialStore.getState();
    const material = buildMaterialFromApplication(app, {
      categories: materialState.categories,
      existingCodes: materialState.materials.map((m) => m.code)
    });
    materialState.addMaterial(material);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    updateMaterialApplication(app.id, {
      status: "approved",
      stepHistory: [
        ...app.stepHistory,
        {
          step: app.currentStep,
          role: (currentUser == null ? void 0 : currentUser.role) || "admin",
          label: ((_a2 = steps[app.currentStep]) == null ? void 0 : _a2.label) || "批准生效",
          action: "approve",
          at: now
        }
      ],
      updatedAt: now
    });
    setSuccessMsg(`✅ 物料已批准生效！编码：${material.code}，采购属性（LT/MOQ/MPQ/供应商等）已写入物料主数据`);
  };
  const handleReject = (app) => {
    var _a2;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    updateMaterialApplication(app.id, {
      status: "rejected",
      stepHistory: [
        ...app.stepHistory,
        {
          step: app.currentStep,
          role: (currentUser == null ? void 0 : currentUser.role) || "admin",
          label: ((_a2 = steps[app.currentStep]) == null ? void 0 : _a2.label) || "驳回",
          action: "reject",
          comment: rejectComment || void 0,
          at: now
        }
      ],
      updatedAt: now
    });
    setSuccessMsg("已驳回该申请");
  };
  const currentStepFields = selectedApp ? ((_d = steps[selectedApp.currentStep]) == null ? void 0 : _d.fields) ?? [] : [];
  const isLastStep = selectedApp ? selectedApp.currentStep >= steps.length - 1 : false;
  const currentEdit = selectedApp ? editValues[selectedApp.id] || {} : {};
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "物料新增审批队列", children: [
    materialApplications.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", children: "暂无物料新增审批申请。" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "申请单号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "申请人" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料名称" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "当前步骤" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "创建时间" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { width: 100, children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: materialApplications.map((app) => {
        var _a2, _b2;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: app.applicationNo }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: app.applicant }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: ((_a2 = app.draft) == null ? void 0 : _a2.name) || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: ((_b2 = steps[app.currentStep]) == null ? void 0 : _b2.label) || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: STATUS_LABEL[app.status], color: STATUS_COLOR[app.status], size: "small" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: app.createdAt.slice(0, 10) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Visibility, {}), onClick: () => openDialog(app), children: "查看" }) })
        ] }, app.id);
      }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!selectedApp, onClose: closeDialog, maxWidth: "md", fullWidth: true, children: selectedApp && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "h6", children: [
            "物料新增审批 · ",
            selectedApp.applicationNo
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
            "申请人：",
            selectedApp.applicant,
            "（",
            roleName(selectedApp.applicantRole),
            "）"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: closeDialog, size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, {}) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { dividers: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FlowTracker,
          {
            module: flowModule,
            currentStatus: stepNodeIds[Math.min(selectedApp.currentStep, stepNodeIds.length - 1)],
            documentNo: selectedApp.applicationNo
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", sx: { fontWeight: 600, mb: 1 }, children: [
            "当前步骤：",
            (_e = steps[selectedApp.currentStep]) == null ? void 0 : _e.label,
            /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { sx: { ml: 1 }, label: STATUS_LABEL[selectedApp.status], color: STATUS_COLOR[selectedApp.status], size: "small" })
          ] }),
          successMsg && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "success", sx: { mb: 2 }, children: successMsg }),
          selectedApp.status !== "pending" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", children: [
            "该申请已",
            STATUS_LABEL[selectedApp.status],
            "，审批流程结束。"
          ] }) : canEdit ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 2, mb: 2, bgcolor: "grey.50" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", color: "text.secondary", sx: { mb: 1 }, children: "📋 物料基本信息" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "物料名称：" }),
                  ((_f = selectedApp.draft) == null ? void 0 : _f.name) || "—"
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "规格型号：" }),
                  ((_g = selectedApp.draft) == null ? void 0 : _g.specification) || "—"
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "自制/外购：" }),
                  ((_h = selectedApp.draft) == null ? void 0 : _h.makeOrBuy) === "buy" ? "📦 外购" : ((_i = selectedApp.draft) == null ? void 0 : _i.makeOrBuy) === "make" ? "🔧 自制" : "—"
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "物料类型：" }),
                  ((_j = MATERIAL_TYPE_OPTIONS.find((o) => {
                    var _a2;
                    return o.value === ((_a2 = selectedApp.draft) == null ? void 0 : _a2.materialType);
                  })) == null ? void 0 : _j.label) || (((_k = selectedApp.draft) == null ? void 0 : _k.materialType) || "—")
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "基本单位：" }),
                  ((_l = selectedApp.draft) == null ? void 0 : _l.unit) || "—"
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "型号：" }),
                  ((_m = selectedApp.draft) == null ? void 0 : _m.model) || "—"
                ] }) }),
                ((_n = selectedApp.draft) == null ? void 0 : _n.price) != null && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "单价：" }),
                  selectedApp.draft.price,
                  " ",
                  ((_o = selectedApp.draft) == null ? void 0 : _o.currency) || "CNY"
                ] }) }),
                ((_p = selectedApp.draft) == null ? void 0 : _p.remarks) && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "备注：" }),
                  selectedApp.draft.remarks
                ] }) })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
              currentStepFields.map((field) => {
                var _a2, _b2;
                if (field === "defaultVendorName") return null;
                const value = currentEdit[field] ?? selectedApp.draft[field] ?? "";
                if (field === "makeOrBuy") {
                  return /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      select: true,
                      fullWidth: true,
                      label: FIELD_LABELS[field] || field,
                      value,
                      onChange: (e) => setFieldValue(selectedApp.id, field, e.target.value),
                      children: MAKE_OR_BUY_OPTIONS.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o.value, children: o.label }, o.value))
                    }
                  ) }, field);
                }
                if (field === "materialType") {
                  return /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      select: true,
                      fullWidth: true,
                      label: FIELD_LABELS[field] || field,
                      value,
                      onChange: (e) => setFieldValue(selectedApp.id, field, e.target.value),
                      children: MATERIAL_TYPE_OPTIONS.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o.value, children: o.label }, o.value))
                    }
                  ) }, field);
                }
                if (field === "defaultVendorId") {
                  const vendorIdValue = currentEdit["defaultVendorId"] ?? ((_a2 = selectedApp.draft) == null ? void 0 : _a2.defaultVendorId) ?? "";
                  const vendorNameValue = currentEdit["defaultVendorName"] ?? ((_b2 = selectedApp.draft) == null ? void 0 : _b2.defaultVendorName) ?? "";
                  const selectedVendor = vendors.find((v) => v.id === vendorIdValue) || (vendorNameValue ? vendors.find((v) => v.name === vendorNameValue) : null);
                  return /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Autocomplete,
                    {
                      options: vendors,
                      getOptionLabel: (v) => `${v.name} (${v.code})`,
                      isOptionEqualToValue: (a, b) => a.id === b.id,
                      value: selectedVendor || null,
                      onChange: (_, newVendor) => {
                        setFieldValue(selectedApp.id, "defaultVendorId", (newVendor == null ? void 0 : newVendor.id) || "");
                        setFieldValue(selectedApp.id, "defaultVendorName", (newVendor == null ? void 0 : newVendor.name) || "");
                      },
                      renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, label: "默认供应商", placeholder: "搜索并选择供应商" }),
                      noOptionsText: "未找到匹配的供应商"
                    }
                  ) }, "vendor-select");
                }
                return /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TextField,
                  {
                    fullWidth: true,
                    type: NUMERIC_FIELDS.has(field) ? "number" : "text",
                    label: FIELD_LABELS[field] || field,
                    value,
                    onChange: (e) => setFieldValue(
                      selectedApp.id,
                      field,
                      NUMERIC_FIELDS.has(field) ? Number(e.target.value) : e.target.value
                    )
                  }
                ) }, field);
              }),
              currentStepFields.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "本步骤无可编辑字段。" }) })
            ] })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 1 }, children: [
              "当前角色（",
              roleName(currentUser == null ? void 0 : currentUser.role),
              "）无编辑权限，仅可查看。"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 0.5, children: Object.entries(selectedApp.draft).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
                FIELD_LABELS[k] || k,
                "："
              ] }),
              " ",
              v === void 0 || v === "" ? "—" : String(v)
            ] }, k)) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogActions, { sx: { flexDirection: "column", alignItems: "stretch", p: 2, gap: 1 }, children: selectedApp.status === "pending" && canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        !isLastStep ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ThumbUp, {}),
            "data-testid": "ma-approve-btn",
            onClick: () => handleSubmitNext(selectedApp),
            children: "提交下一步"
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            color: "success",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ThumbUp, {}),
            "data-testid": "ma-approve-btn",
            onClick: () => handleApprove(selectedApp),
            children: "批准生效"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { size: "small", label: "驳回意见", value: rejectComment, onChange: (e) => setRejectComment(e.target.value) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outlined",
            color: "error",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Clear, {}),
            "data-testid": "ma-reject-btn",
            onClick: () => handleReject(selectedApp),
            children: "驳回"
          }
        )
      ] }) })
    ] }) })
  ] });
};
export {
  MaterialApprovalQueue as default
};
