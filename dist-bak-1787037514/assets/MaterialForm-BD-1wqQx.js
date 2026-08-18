import { n as useParams, h as useNavigate, o as useSearchParams, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { u as useForm, C as Controller, t, o as objectType, s as stringType, n as numberType, a as arrayType } from "./vendor-forms-CgMxq7_e.js";
import { u as useMaterialStore, j as useSettingsStore, h as useAuthStore, k as useCustomFieldStore } from "./index-hTLNcGoC.js";
import { F as FileUpload } from "./FileUpload-p9NND86i.js";
import { C as CustomFieldsSection } from "./CustomFieldsSection-C9Cceb1I.js";
import "./vendor-date-DpsB6iVy.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
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
import { u as useDataDictStore } from "./dataDictStore-RUHQ7-st.js";
import "./numberingStore-BLNwdXfi.js";
import "./warehouseMasterStore-Lmmy-9XL.js";
import "./reportPermissionStore-BsrP4O9H.js";
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
import { u as useMaterialApprovalStore } from "./materialApprovalStore-CoEybaS-.js";
import { g as generateMaterialCodeByCategory, a as getCategoryFullCode } from "./codeGenerator-DzlFgjvf.js";
import { bL as Stack, bl as Alert, m as Box, bm as Button, c2 as Tabs, c3 as Tab, bY as Grid, aO as Chip, T as Typography, p as Tooltip, aM as IconButton, am as AutorenewIcon, bv as TextField, aR as MenuItem, cC as Autocomplete, n as Divider, bh as Add, cD as TableContainer, aS as Paper, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, be as Delete, cJ as Snackbar, bZ as ArrowBack, bd as Save } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./options-BINuI5Gr.js";
import "./vendorRating-DKHWnbxs.js";
const MATERIAL_TYPE_OPTIONS = [
  { value: "raw", label: "原材料" },
  { value: "semi", label: "半成品" },
  { value: "finished", label: "成品" },
  { value: "purchased", label: "外购件" },
  { value: "service", label: "服务" }
];
const MAKE_OR_BUY_OPTIONS = [
  { value: "make", label: "自制" },
  { value: "buy", label: "外购" }
];
const buildCategoryOptions = (nodes, depth = 0) => {
  const options = [];
  nodes.forEach((node) => {
    const indent = "  ".repeat(depth);
    options.push({
      id: node.id,
      label: `${indent}${depth > 0 ? "└ " : ""}${node.name}`,
      depth
    });
    if (node.children) {
      options.push(...buildCategoryOptions(node.children, depth + 1));
    }
  });
  return options;
};
const findCategoryName = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id) return node.name;
    if (node.children) {
      const name = findCategoryName(node.children, id);
      if (name) return name;
    }
  }
  return "";
};
const materialSchema = objectType({
  code: stringType().min(1, "请输入物料编码"),
  name: stringType().min(1, "请输入物料名称"),
  categoryId: stringType().min(1, "请选择物料分类"),
  specification: stringType().optional(),
  model: stringType().optional(),
  materialType: stringType().optional(),
  makeOrBuy: stringType().optional(),
  unit: stringType().min(1, "请输入单位"),
  safetyStock: numberType().min(0),
  minStock: numberType().min(0),
  maxStock: numberType().min(0),
  price: numberType().min(0),
  currency: stringType(),
  status: stringType(),
  remarks: stringType().optional(),
  leadTime: numberType().optional(),
  moq: numberType().optional(),
  mpq: numberType().optional(),
  defaultVendorId: stringType().optional(),
  defaultVendorName: stringType().optional(),
  purchaseUnit: stringType().optional(),
  unitConversion: numberType().optional(),
  parameters: arrayType(objectType({
    key: stringType(),
    value: stringType(),
    unit: stringType().optional()
  })).optional(),
  // 采购视图
  purchasingGroup: stringType().optional(),
  orderUnit: stringType().optional(),
  purchasingValueKey: stringType().optional(),
  grProcessingDays: numberType().optional(),
  // MRP 视图
  mrpType: stringType().optional(),
  mrpController: stringType().optional(),
  lotSize: numberType().optional(),
  reorderPoint: numberType().optional(),
  plannedDeliveryDays: numberType().optional(),
  // 销售视图
  taxClassification: stringType().optional(),
  deliveryUnit: stringType().optional(),
  minOrderQty: numberType().optional(),
  minDeliveryQty: numberType().optional(),
  accountAssignmentGroup: stringType().optional(),
  // P2-23 GTIN 条码
  gtin: stringType().optional()
});
const MaterialForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const templateName = searchParams.get("template");
  const templateCategoryId = searchParams.get("categoryId");
  searchParams.get("categoryName");
  const templateMaterialType = searchParams.get("materialType");
  const templateMakeOrBuy = searchParams.get("makeOrBuy");
  const templateUnit = searchParams.get("unit");
  const templateSpecification = searchParams.get("specification");
  const { materials, addMaterial, updateMaterial, categories } = useMaterialStore();
  const approvalConfig = useSettingsStore((s) => s.materialApprovalConfig);
  const addMaterialApplication = useMaterialApprovalStore((s) => s.addMaterialApplication);
  const currentUser = useAuthStore((s) => s.currentUser);
  const isApprovalMode = !isEdit && approvalConfig.enabled;
  const steps = approvalConfig.steps;
  const categoryOptions = buildCategoryOptions(categories);
  const unitOptions = useDataDictStore((s) => s.units);
  const existingMaterial = isEdit ? materials.find((m) => m.id === id) : null;
  const [parameterRows, setParameterRows] = reactExports.useState(
    (existingMaterial == null ? void 0 : existingMaterial.parameters) || []
  );
  const [customFields, setCustomFields] = reactExports.useState(
    (existingMaterial == null ? void 0 : existingMaterial.customFields) || {}
  );
  const [snackbar, setSnackbar] = reactExports.useState(false);
  const [submitted, setSubmitted] = reactExports.useState(false);
  const [formError, setFormError] = reactExports.useState(null);
  const [codeManuallyEdited, setCodeManuallyEdited] = reactExports.useState(false);
  const [tabValue, setTabValue] = reactExports.useState(0);
  const { control, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm({
    resolver: t(materialSchema),
    defaultValues: {
      code: (existingMaterial == null ? void 0 : existingMaterial.code) || (!isEdit && templateName ? `TMPL-${templateName}` : ""),
      name: (existingMaterial == null ? void 0 : existingMaterial.name) || (!isEdit && templateName ? templateName : ""),
      categoryId: (existingMaterial == null ? void 0 : existingMaterial.categoryId) || templateCategoryId || "",
      specification: (existingMaterial == null ? void 0 : existingMaterial.specification) || templateSpecification || "",
      model: (existingMaterial == null ? void 0 : existingMaterial.model) || "",
      materialType: (existingMaterial == null ? void 0 : existingMaterial.materialType) || templateMaterialType || "",
      makeOrBuy: (existingMaterial == null ? void 0 : existingMaterial.makeOrBuy) || templateMakeOrBuy || "",
      unit: (existingMaterial == null ? void 0 : existingMaterial.unit) || templateUnit || "",
      safetyStock: (existingMaterial == null ? void 0 : existingMaterial.safetyStock) || 0,
      minStock: (existingMaterial == null ? void 0 : existingMaterial.minStock) || 0,
      maxStock: (existingMaterial == null ? void 0 : existingMaterial.maxStock) || 0,
      price: (existingMaterial == null ? void 0 : existingMaterial.price) || 0,
      currency: (existingMaterial == null ? void 0 : existingMaterial.currency) || "CNY",
      status: (existingMaterial == null ? void 0 : existingMaterial.status) || "active",
      remarks: (existingMaterial == null ? void 0 : existingMaterial.remarks) || "",
      leadTime: (existingMaterial == null ? void 0 : existingMaterial.leadTime) || 0,
      moq: (existingMaterial == null ? void 0 : existingMaterial.moq) || 0,
      mpq: (existingMaterial == null ? void 0 : existingMaterial.mpq) || 0,
      defaultVendorId: (existingMaterial == null ? void 0 : existingMaterial.defaultVendorId) || "",
      defaultVendorName: (existingMaterial == null ? void 0 : existingMaterial.defaultVendorName) || "",
      purchaseUnit: (existingMaterial == null ? void 0 : existingMaterial.purchaseUnit) || "",
      unitConversion: (existingMaterial == null ? void 0 : existingMaterial.unitConversion) || 0,
      // 采购视图
      purchasingGroup: (existingMaterial == null ? void 0 : existingMaterial.purchasingGroup) || "",
      orderUnit: (existingMaterial == null ? void 0 : existingMaterial.orderUnit) || "",
      purchasingValueKey: (existingMaterial == null ? void 0 : existingMaterial.purchasingValueKey) || "",
      grProcessingDays: (existingMaterial == null ? void 0 : existingMaterial.grProcessingDays) || 0,
      // MRP 视图
      mrpType: (existingMaterial == null ? void 0 : existingMaterial.mrpType) || "",
      mrpController: (existingMaterial == null ? void 0 : existingMaterial.mrpController) || "",
      lotSize: (existingMaterial == null ? void 0 : existingMaterial.lotSize) || 0,
      reorderPoint: (existingMaterial == null ? void 0 : existingMaterial.reorderPoint) || 0,
      plannedDeliveryDays: (existingMaterial == null ? void 0 : existingMaterial.plannedDeliveryDays) || 0,
      // 销售视图
      taxClassification: (existingMaterial == null ? void 0 : existingMaterial.taxClassification) || "",
      deliveryUnit: (existingMaterial == null ? void 0 : existingMaterial.deliveryUnit) || "",
      minOrderQty: (existingMaterial == null ? void 0 : existingMaterial.minOrderQty) || 0,
      minDeliveryQty: (existingMaterial == null ? void 0 : existingMaterial.minDeliveryQty) || 0,
      accountAssignmentGroup: (existingMaterial == null ? void 0 : existingMaterial.accountAssignmentGroup) || "",
      // P2-23 GTIN
      gtin: (existingMaterial == null ? void 0 : existingMaterial.gtin) || ""
    }
  });
  const watchedCategoryId = watch("categoryId");
  const generatedCode = reactExports.useMemo(() => {
    if (!watchedCategoryId) return "";
    return generateMaterialCodeByCategory(watchedCategoryId, categories, materials);
  }, [watchedCategoryId, categories, materials]);
  const categoryPrefix = reactExports.useMemo(
    () => watchedCategoryId ? getCategoryFullCode(categories, watchedCategoryId) : "",
    [watchedCategoryId, categories]
  );
  reactExports.useEffect(() => {
    if (isEdit || codeManuallyEdited) return;
    if (!generatedCode) {
      setValue("code", "");
      return;
    }
    setValue("code", generatedCode);
  }, [generatedCode, isEdit, codeManuallyEdited, setValue]);
  const handleRegenerateCode = reactExports.useCallback(() => {
    if (!generatedCode) return;
    setValue("code", generatedCode);
    setCodeManuallyEdited(false);
  }, [generatedCode, setValue]);
  const addParameter = () => {
    setParameterRows([...parameterRows, { key: "", value: "", unit: "" }]);
  };
  const removeParameter = (index) => {
    setParameterRows(parameterRows.filter((_, i) => i !== index));
  };
  const updateParameter = (index, field, value) => {
    const updated = [...parameterRows];
    updated[index] = { ...updated[index], [field]: value };
    setParameterRows(updated);
  };
  const onSubmit = (data) => {
    var _a, _b;
    const now = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 19);
    const categoryName = findCategoryName(categories, data.categoryId);
    const cfDefs = useCustomFieldStore.getState().fields.material || [];
    for (const def of cfDefs) {
      if (def.required) {
        const v = customFields[def.key];
        if (v === void 0 || v === null || v === "" || def.type === "checkbox" && v === false) {
          setFormError(`「${def.label}」为必填项`);
          return;
        }
      }
    }
    setFormError(null);
    if (isApprovalMode) {
      const app = {
        id: `ma-${Date.now()}`,
        applicationNo: `MA${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "")}${Math.floor(Math.random() * 1e3)}`,
        applicant: (currentUser == null ? void 0 : currentUser.name) || "未知",
        applicantRole: (currentUser == null ? void 0 : currentUser.role) || "admin",
        status: "pending",
        currentStep: 0,
        draft: { ...data, parameters: parameterRows },
        stepHistory: [{
          step: 0,
          role: (currentUser == null ? void 0 : currentUser.role) || "admin",
          label: ((_a = steps[0]) == null ? void 0 : _a.label) || "发起申请",
          action: "submit",
          fields: ((_b = steps[0]) == null ? void 0 : _b.fields) ?? [],
          at: (/* @__PURE__ */ new Date()).toISOString()
        }],
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      addMaterialApplication(app);
      setSubmitted(true);
      return;
    }
    if (isEdit && existingMaterial) {
      updateMaterial(existingMaterial.id, {
        ...data,
        categoryName,
        currentStock: existingMaterial.currentStock,
        parameters: parameterRows,
        customFields,
        updatedAt: now,
        updatedBy: "admin"
      });
      setSnackbar(true);
      setTimeout(() => navigate("/material/list"), 500);
    } else {
      const newMaterial = {
        id: `mat-${Date.now()}`,
        ...data,
        categoryName,
        currentStock: 0,
        currency: data.currency,
        status: data.status,
        parameters: parameterRows,
        customFields,
        createdAt: now,
        updatedAt: now,
        createdBy: "admin",
        updatedBy: "admin"
      };
      addMaterial(newMaterial);
      setSnackbar(true);
      setTimeout(() => navigate("/material/list"), 500);
    }
  };
  const handleSaveDraft = () => {
    const now = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 19);
    const formValues = getValues();
    const categoryName = findCategoryName(categories, formValues.categoryId || "");
    if (isEdit && existingMaterial) {
      updateMaterial(existingMaterial.id, {
        ...formValues,
        categoryName,
        status: "draft",
        currentStock: existingMaterial.currentStock,
        customFields,
        updatedAt: now,
        updatedBy: "admin"
      });
    } else {
      const newMaterial = {
        id: `mat-${Date.now()}`,
        code: formValues.code || "AUTO",
        name: formValues.name || "未命名",
        categoryId: formValues.categoryId || "",
        categoryName,
        specification: formValues.specification || "",
        model: formValues.model || "",
        materialType: formValues.materialType,
        makeOrBuy: formValues.makeOrBuy,
        unit: formValues.unit || "",
        safetyStock: formValues.safetyStock || 0,
        minStock: formValues.minStock || 0,
        maxStock: formValues.maxStock || 0,
        currentStock: 0,
        price: formValues.price || 0,
        currency: formValues.currency || "CNY",
        status: "draft",
        remarks: formValues.remarks || "",
        leadTime: formValues.leadTime,
        moq: formValues.moq,
        mpq: formValues.mpq,
        defaultVendorId: formValues.defaultVendorId || "",
        defaultVendorName: formValues.defaultVendorName || "",
        purchaseUnit: formValues.purchaseUnit || "",
        unitConversion: formValues.unitConversion,
        purchasingGroup: formValues.purchasingGroup,
        orderUnit: formValues.orderUnit,
        purchasingValueKey: formValues.purchasingValueKey,
        grProcessingDays: formValues.grProcessingDays,
        mrpType: formValues.mrpType,
        mrpController: formValues.mrpController,
        lotSize: formValues.lotSize,
        reorderPoint: formValues.reorderPoint,
        plannedDeliveryDays: formValues.plannedDeliveryDays,
        taxClassification: formValues.taxClassification,
        deliveryUnit: formValues.deliveryUnit,
        minOrderQty: formValues.minOrderQty,
        minDeliveryQty: formValues.minDeliveryQty,
        accountAssignmentGroup: formValues.accountAssignmentGroup,
        // P2-23 GTIN
        gtin: formValues.gtin || "",
        parameters: parameterRows,
        customFields,
        createdAt: now,
        updatedAt: now,
        createdBy: "admin",
        updatedBy: "admin"
      };
      addMaterial(newMaterial);
    }
    setSnackbar(true);
    setTimeout(() => navigate("/material/list"), 500);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: isEdit ? "编辑物料" : isApprovalMode ? "新增物料（审批）" : templateName ? `新增物料（模板：${templateName}）` : "新增物料",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outlined",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}),
            onClick: () => navigate(-1),
            children: "取消"
          }
        ),
        !isApprovalMode && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outlined",
            onClick: handleSaveDraft,
            children: "暂存"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}),
            "data-testid": isApprovalMode ? "material-submit" : void 0,
            onClick: handleSubmit(onSubmit),
            children: "保存"
          }
        )
      ] }),
      children: [
        submitted ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "success", variant: "filled", children: "已提交物料新增审批，等待采购审核与批准生效" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: () => navigate("/material/list"), children: "返回物料列表" }) })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { component: "form", onSubmit: handleSubmit(onSubmit), children: [
          formError && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "error", sx: { mb: 2 }, onClose: () => setFormError(null), children: formError }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tabValue, onChange: (_, v) => setTabValue(v), sx: { mb: 3, borderBottom: 1, borderColor: "divider" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "基本信息" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "采购" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "MRP" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "销售" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "会计" })
          ] }),
          tabValue === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
              !isEdit && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Chip,
                  {
                    label: "编码规则：按分类自动生成",
                    color: "info",
                    size: "small",
                    variant: "outlined"
                  }
                ),
                categoryPrefix && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                  "前缀 ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: categoryPrefix }),
                  " + 流水号（由所属分类定义）"
                ] }),
                generatedCode && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Chip,
                  {
                    label: `预览：${generatedCode}`,
                    color: "success",
                    size: "small"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "重新生成编码", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { onClick: handleRegenerateCode, color: "primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AutorenewIcon, {}) }) })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "code",
                  control,
                  render: ({ field }) => {
                    var _a;
                    return /* @__PURE__ */ jsxRuntimeExports.jsx(
                      TextField,
                      {
                        ...field,
                        label: "物料编码",
                        fullWidth: true,
                        error: !!errors.code,
                        helperText: generatedCode && !codeManuallyEdited ? "已按分类自动生成，可手动修改" : (_a = errors.code) == null ? void 0 : _a.message,
                        onChange: (e) => {
                          field.onChange(e);
                          setCodeManuallyEdited(true);
                        },
                        InputProps: {
                          readOnly: false,
                          endAdornment: generatedCode && !codeManuallyEdited ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "自动", color: "success", size: "small", sx: { mr: 1 } }) : null
                        }
                      }
                    );
                  }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "name",
                  control,
                  render: ({ field }) => {
                    var _a;
                    return /* @__PURE__ */ jsxRuntimeExports.jsx(
                      TextField,
                      {
                        ...field,
                        label: "物料名称",
                        fullWidth: true,
                        error: !!errors.name,
                        helperText: (_a = errors.name) == null ? void 0 : _a.message
                      }
                    );
                  }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "categoryId",
                  control,
                  render: ({ field }) => {
                    var _a;
                    return /* @__PURE__ */ jsxRuntimeExports.jsx(
                      TextField,
                      {
                        ...field,
                        select: true,
                        label: "物料分类",
                        fullWidth: true,
                        error: !!errors.categoryId,
                        helperText: (_a = errors.categoryId) == null ? void 0 : _a.message,
                        children: categoryOptions.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                          MenuItem,
                          {
                            value: opt.id,
                            sx: { pl: 2 + opt.depth * 2 },
                            children: opt.label
                          },
                          opt.id
                        ))
                      }
                    );
                  }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "unit",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Autocomplete,
                    {
                      freeSolo: true,
                      options: unitOptions,
                      value: field.value || "",
                      onChange: (_, v) => field.onChange(v || ""),
                      onInputChange: (_, v) => field.onChange(v || ""),
                      renderInput: (params) => {
                        var _a;
                        return /* @__PURE__ */ jsxRuntimeExports.jsx(
                          TextField,
                          {
                            ...params,
                            label: "单位",
                            fullWidth: true,
                            error: !!errors.unit,
                            helperText: (_a = errors.unit) == null ? void 0 : _a.message
                          }
                        );
                      }
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "model",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      label: "型号",
                      fullWidth: true
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "materialType",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      select: true,
                      label: "物料类型",
                      fullWidth: true,
                      children: MATERIAL_TYPE_OPTIONS.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o.value, children: o.label }, o.value))
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "makeOrBuy",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      select: true,
                      label: "自制/外购",
                      fullWidth: true,
                      children: MAKE_OR_BUY_OPTIONS.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o.value, children: o.label }, o.value))
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "specification",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      label: "规格型号",
                      fullWidth: true
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "gtin",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      label: "GTIN 条码",
                      fullWidth: true,
                      inputProps: { "data-testid": "mat-gtin" },
                      placeholder: "全球贸易项目代码（EAN/UPC/GTIN）"
                    }
                  )
                }
              ) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "库存设置" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "safetyStock",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      type: "number",
                      label: "安全库存",
                      fullWidth: true,
                      onChange: (e) => field.onChange(Number(e.target.value))
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "minStock",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      type: "number",
                      label: "最小库存",
                      fullWidth: true,
                      onChange: (e) => field.onChange(Number(e.target.value))
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "maxStock",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      type: "number",
                      label: "最大库存",
                      fullWidth: true,
                      onChange: (e) => field.onChange(Number(e.target.value))
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "price",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      type: "number",
                      label: "单价",
                      fullWidth: true,
                      onChange: (e) => field.onChange(Number(e.target.value))
                    }
                  )
                }
              ) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "技术参数" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: addParameter, children: "添加参数" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, sx: { mb: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "参数名称" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "参数值" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "单位" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { width: 80, children: "操作" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
                parameterRows.map((param, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      size: "small",
                      value: param.key,
                      onChange: (e) => updateParameter(index, "key", e.target.value),
                      placeholder: "如：厚度"
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      size: "small",
                      value: param.value,
                      onChange: (e) => updateParameter(index, "value", e.target.value),
                      placeholder: "如：10mm"
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      size: "small",
                      value: param.unit || "",
                      onChange: (e) => updateParameter(index, "unit", e.target.value),
                      placeholder: "如：mm"
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => removeParameter(index), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) })
                ] }, index)),
                parameterRows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 4, sx: { textAlign: "center", color: "text.secondary" }, children: "暂无技术参数" }) })
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileUpload, { multiple: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CustomFieldsSection, { entity: "material", value: customFields, onChange: setCustomFields })
          ] }),
          tabValue === 1 && !isApprovalMode && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "采购视图" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "leadTime",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      type: "number",
                      label: "采购提前期(天)",
                      fullWidth: true,
                      inputProps: { "data-testid": "mat-leadtime" },
                      onChange: (e) => field.onChange(Number(e.target.value))
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "moq",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      type: "number",
                      label: "最小订单量(MOQ)",
                      fullWidth: true,
                      onChange: (e) => field.onChange(Number(e.target.value))
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "mpq",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      type: "number",
                      label: "最小包装量(MPQ)",
                      fullWidth: true,
                      onChange: (e) => field.onChange(Number(e.target.value))
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "purchaseUnit",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      label: "采购单位",
                      fullWidth: true
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "unitConversion",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      type: "number",
                      label: "单位换算系数",
                      fullWidth: true,
                      onChange: (e) => field.onChange(Number(e.target.value))
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "purchasingGroup",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      label: "采购组",
                      fullWidth: true,
                      inputProps: { "data-testid": "mat-purchasing-group" }
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "orderUnit",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      label: "订单单位",
                      fullWidth: true,
                      inputProps: { "data-testid": "mat-order-unit" }
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "purchasingValueKey",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      label: "采购值键",
                      fullWidth: true,
                      inputProps: { "data-testid": "mat-purchasing-value-key" }
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "grProcessingDays",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      type: "number",
                      label: "收货处理天数",
                      fullWidth: true,
                      inputProps: { "data-testid": "mat-gr-processing-days" },
                      onChange: (e) => field.onChange(Number(e.target.value))
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "defaultVendorId",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      label: "默认供应商ID",
                      fullWidth: true
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "defaultVendorName",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      label: "默认供应商名称",
                      fullWidth: true
                    }
                  )
                }
              ) })
            ] })
          ] }),
          tabValue === 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "MRP 视图" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "mrpType",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      label: "MRP 类型",
                      fullWidth: true,
                      placeholder: "PD / VB / ND",
                      inputProps: { "data-testid": "mat-mrp-type" }
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "mrpController",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      label: "MRP 控制者",
                      fullWidth: true,
                      inputProps: { "data-testid": "mat-mrp-controller" }
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "lotSize",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      type: "number",
                      label: "批量大小",
                      fullWidth: true,
                      inputProps: { "data-testid": "mat-lot-size" },
                      onChange: (e) => field.onChange(Number(e.target.value))
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "reorderPoint",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      type: "number",
                      label: "再订货点",
                      fullWidth: true,
                      inputProps: { "data-testid": "mat-reorder-point" },
                      onChange: (e) => field.onChange(Number(e.target.value))
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "plannedDeliveryDays",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      type: "number",
                      label: "计划交货天数",
                      fullWidth: true,
                      inputProps: { "data-testid": "mat-planned-delivery-days" },
                      onChange: (e) => field.onChange(Number(e.target.value))
                    }
                  )
                }
              ) })
            ] })
          ] }),
          tabValue === 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "销售视图" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "taxClassification",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      label: "税分类",
                      fullWidth: true,
                      inputProps: { "data-testid": "mat-tax-classification" }
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "deliveryUnit",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      label: "交货单位",
                      fullWidth: true,
                      inputProps: { "data-testid": "mat-delivery-unit" }
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "minOrderQty",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      type: "number",
                      label: "最小订单量",
                      fullWidth: true,
                      inputProps: { "data-testid": "mat-min-order-qty" },
                      onChange: (e) => field.onChange(Number(e.target.value))
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "minDeliveryQty",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      type: "number",
                      label: "最小交货量",
                      fullWidth: true,
                      inputProps: { "data-testid": "mat-min-delivery-qty" },
                      onChange: (e) => field.onChange(Number(e.target.value))
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Controller,
                {
                  name: "accountAssignmentGroup",
                  control,
                  render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TextField,
                    {
                      ...field,
                      label: "科目分配组",
                      fullWidth: true,
                      inputProps: { "data-testid": "mat-account-assignment-group" }
                    }
                  )
                }
              ) })
            ] })
          ] }),
          tabValue === 4 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "会计视图" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", sx: { py: 4 }, children: "暂无会计相关字段" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Snackbar,
          {
            open: snackbar,
            autoHideDuration: 2e3,
            onClose: () => setSnackbar(false),
            anchorOrigin: { vertical: "top", horizontal: "center" },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "success", variant: "filled", children: isEdit ? "物料已更新！" : "物料已保存，可在列表中查看！" })
          }
        )
      ]
    }
  );
};
export {
  MaterialForm as default
};
