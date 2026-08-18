import { aG as useNavigate, cJ as useParams, cL as useForm, r as reactExports, j as jsxRuntimeExports, B as Box, i as Divider, h as Typography, bX as Grid, bt as TextField, cM as Controller, aO as MenuItem, cN as Autocomplete, bk as Button, bf as Add, dp as ContentPaste, aP as Paper, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip, aJ as IconButton, bc as Delete, dq as TableFooter, bY as ArrowBack, bb as Save, cV as t, cW as objectType, cX as stringType } from "./vendor-46QZWBd3.js";
import { e as useSalesStore, u as useMaterialStore, b as usePurchaseStore } from "./index-CcOZBoQL.js";
import { F as FlowTracker } from "./FlowTracker-C0aNMuXm.js";
import { f as formatCurrency } from "./format-Rp8---CI.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import { R as ResponsiblePersons } from "./ResponsiblePersons-D9INyHNC.js";
import { u as useProductionStore } from "./productionStore-D_DSIs05.js";
import { b as generatePurchaseRequestNo } from "./codeGenerator-DzlFgjvf.js";
import "./customerStore-IdYDDJRc.js";
import "./priceStore-BUzakAdL.js";
import "./salesPriceStore-BzUxjPzH.js";
import "./conditionStore-BSext3Wu.js";
import "./bomStore-VWzRK_BU.js";
import "./productionOperationStore-ZzJ7_OWX.js";
import "./financeExtensionStore-DcH2weuS.js";
import "./productionVersionStore-D_-Ec9Z0.js";
import "./subcontractStore-CQ-ex-am.js";
import "./equipmentStore-D-RvzWch.js";
import "./productionSchedulingStore-BVkrPwFf.js";
import "./vendorPerformanceStore-BxbIBs-n.js";
import "./vendorPortalStore-d2uxDrSz.js";
import "./dataDictStore-B1uh9qqV.js";
import "./options-BINuI5Gr.js";
import "./numberingStore-DnRDBnD9.js";
import "./warehouseMasterStore-Ct1rrWsm.js";
import "./reportPermissionStore-BivOpSPb.js";
import "./salesAdvancedStore-CA71PkD6.js";
import "./purchaseAdvancedStore-DLlH_i-t.js";
import "./warehouseAdvancedStore-BrWnd5bC.js";
import "./qualityAdvancedStore-dxrXzSTj.js";
import "./vendorRating-DKHWnbxs.js";
import "./materialExtensionStore-B0eAxQzZ.js";
import "./purchaseInfoRecordStore-nI3akWE2.js";
import "./sourceListStore-BhAGJqGB.js";
import "./qualityExtensionStore-BtbaFcCN.js";
import "./analyticsStore-SaeDm71F.js";
import "./arapStore-BYvdVu0r.js";
import "./workbenchStore-DCSKoEhL.js";
import "./ecnStore-DIX7gpta.js";
import "./rebateStore-C8MR-wRT.js";
import "./fmeaStore--YKtrk44.js";
import "./CategoryList-DMRXpnYP.js";
import "./DataTable-vc5G5ARo.js";
import "./StatusBadge-Db1uY4YU.js";
import "./ConfirmDialog-BMZp8iYJ.js";
const purchaseSchema = objectType({
  title: stringType().min(1, "请输入标题"),
  type: stringType().min(1, "请选择类型"),
  priority: stringType().min(1, "请选择优先级"),
  department: stringType().min(1, "请输入部门"),
  expectedDate: stringType().min(1, "请选择期望日期"),
  reason: stringType().min(1, "请输入申请原因")
});
const SOURCE_OPTIONS = [
  { value: "manual", label: "手工创建", desc: "手动录入物料明细" },
  { value: "salesOrder", label: "销售订单", desc: "从销售订单拉取物料需求" },
  { value: "workOrder", label: "生产工单", desc: "从生产工单拉取物料需求" },
  { value: "mrp", label: "MRP需求", desc: "从MRP运算结果拉取采购建议" }
];
const PurchaseForm = () => {
  var _a;
  const { projects, salesOrders } = useSalesStore();
  const { workOrders, mrpRecommendations } = useProductionStore();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const materials = useMaterialStore((s) => s.materials);
  const { purchaseRequests, addPurchaseRequest, updatePurchaseRequest } = usePurchaseStore();
  const existingRequest = isEdit ? purchaseRequests.find((r) => r.id === id) : void 0;
  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: t(purchaseSchema),
    defaultValues: {
      title: "",
      type: "material",
      priority: "normal",
      department: "",
      expectedDate: "",
      reason: ""
    }
  });
  const purchaseType = watch("type");
  const [items, setItems] = reactExports.useState([]);
  const itemCategoryIds = reactExports.useMemo(() => {
    const ids = /* @__PURE__ */ new Set();
    items.forEach((it) => {
      if (it.materialId) {
        const m = materials.find((mm) => mm.id === it.materialId);
        if (m == null ? void 0 : m.categoryId) ids.add(m.categoryId);
      }
    });
    return [...ids];
  }, [items, materials]);
  const [serviceDescription, setServiceDescription] = reactExports.useState((existingRequest == null ? void 0 : existingRequest.remarks) || "");
  const [selectedProject, setSelectedProject] = reactExports.useState(null);
  const [requestNo, setRequestNo] = reactExports.useState("");
  const [sourceType, setSourceType] = reactExports.useState("manual");
  const [sourceDoc, setSourceDoc] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (isEdit && existingRequest) {
      reset({
        title: existingRequest.title,
        type: existingRequest.type,
        priority: existingRequest.priority,
        department: existingRequest.department,
        expectedDate: existingRequest.expectedDate,
        reason: existingRequest.reason || ""
      });
      setRequestNo(existingRequest.requestNo);
      if (existingRequest.sourceType) {
        setSourceType(existingRequest.sourceType || "manual");
      }
      const filledItems = (existingRequest.items || []).map((item) => {
        var _a2;
        return {
          id: item.id,
          materialCode: item.materialCode || ((_a2 = materials.find((m) => m.id === item.materialId)) == null ? void 0 : _a2.code) || "",
          materialId: item.materialId,
          materialName: item.materialName || "",
          specification: item.specification || "",
          unit: item.unit || "",
          quantity: item.quantity,
          estimatedPrice: item.estimatedPrice || 0,
          estimatedAmount: item.estimatedAmount || 0
        };
      });
      setItems(filledItems);
      if (existingRequest.projectNo) {
        const proj = projects.find((p) => p.projectNo === existingRequest.projectNo);
        if (proj) setSelectedProject(proj);
      }
    }
  }, [isEdit, existingRequest, reset]);
  const ensureRequestNo = (dept) => {
    if (requestNo) return requestNo;
    const no = generatePurchaseRequestNo(dept, purchaseRequests.map((r) => r.requestNo));
    setRequestNo(no);
    return no;
  };
  const addItem = (row) => {
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      materialCode: (row == null ? void 0 : row.materialCode) || "",
      materialId: (row == null ? void 0 : row.materialId) || "",
      materialName: (row == null ? void 0 : row.materialName) || "",
      specification: (row == null ? void 0 : row.specification) || "",
      unit: (row == null ? void 0 : row.unit) || "",
      quantity: (row == null ? void 0 : row.quantity) ?? 1,
      estimatedPrice: (row == null ? void 0 : row.estimatedPrice) ?? 0,
      estimatedAmount: (row == null ? void 0 : row.estimatedAmount) ?? 0
    };
    setItems((prev) => [...prev, newItem]);
  };
  const removeItem = (id2) => {
    setItems((prev) => prev.filter((item) => item.id !== id2));
  };
  const lookupMaterial = (keyword) => {
    if (!keyword.trim()) return null;
    const kw = keyword.trim().toLowerCase();
    let mat = materials.find((m) => m.code.toLowerCase() === kw);
    if (!mat) mat = materials.find((m) => m.name.toLowerCase() === kw);
    if (!mat) mat = materials.find((m) => m.code.toLowerCase().includes(kw) || m.name.toLowerCase().includes(kw));
    return mat || null;
  };
  const updateItem = (id2, field, value) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id2) return item;
      const updatedItem = { ...item, [field]: value };
      if (field === "materialCode") {
        const mat = lookupMaterial(String(value));
        if (mat) {
          updatedItem.materialId = mat.id;
          updatedItem.materialCode = mat.code;
          updatedItem.materialName = mat.name;
          updatedItem.specification = mat.specification || "";
          updatedItem.unit = mat.unit || "";
          updatedItem.estimatedPrice = mat.price || 0;
        } else {
          updatedItem.materialId = "";
          updatedItem.materialName = "";
          updatedItem.specification = "";
          updatedItem.unit = "";
        }
      }
      if (field === "quantity" || field === "estimatedPrice") {
        updatedItem.estimatedAmount = Number(updatedItem.quantity || 0) * Number(updatedItem.estimatedPrice || 0);
      }
      return updatedItem;
    }));
  };
  const parsePasteLines = (text) => {
    return text.split(/[\r\n]+/).map((line) => line.split("	")[0].trim()).filter((line) => line.length > 0);
  };
  const handleMaterialPaste = (e) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;
    const lines = parsePasteLines(text);
    if (lines.length <= 1) return;
    e.preventDefault();
    lines.forEach((code) => {
      const mat = lookupMaterial(code);
      addItem({
        materialCode: mat ? mat.code : code,
        materialId: (mat == null ? void 0 : mat.id) || "",
        materialName: (mat == null ? void 0 : mat.name) || "",
        specification: (mat == null ? void 0 : mat.specification) || "",
        unit: (mat == null ? void 0 : mat.unit) || "",
        quantity: 1,
        estimatedPrice: (mat == null ? void 0 : mat.price) || 0,
        estimatedAmount: (mat == null ? void 0 : mat.price) || 0
      });
    });
  };
  const fillItemsFromSource = () => {
    if (!sourceDoc) return;
    let rows = [];
    switch (sourceType) {
      case "salesOrder": {
        const orderItems = sourceDoc.items || [];
        rows = orderItems.map((oi, idx) => {
          const mat = oi.materialId ? materials.find((m) => m.id === oi.materialId) : null;
          return {
            id: `item-${Date.now()}-${idx}`,
            materialCode: oi.materialCode || (mat == null ? void 0 : mat.code) || "",
            materialId: oi.materialId || (mat == null ? void 0 : mat.id) || "",
            materialName: oi.materialName || (mat == null ? void 0 : mat.name) || "",
            specification: oi.specification || (mat == null ? void 0 : mat.specification) || "",
            unit: oi.unit || (mat == null ? void 0 : mat.unit) || "",
            quantity: oi.quantity ?? 1,
            estimatedPrice: oi.unitPrice || (mat == null ? void 0 : mat.price) || 0,
            estimatedAmount: (oi.quantity ?? 1) * (oi.unitPrice || (mat == null ? void 0 : mat.price) || 0)
          };
        });
        break;
      }
      case "workOrder": {
        const woMaterials = sourceDoc.materials || [];
        rows = woMaterials.map((wm, idx) => {
          const mat = wm.materialId ? materials.find((m) => m.id === wm.materialId) : null;
          return {
            id: `item-${Date.now()}-${idx}`,
            materialCode: wm.materialCode || (mat == null ? void 0 : mat.code) || "",
            materialId: wm.materialId || (mat == null ? void 0 : mat.id) || "",
            materialName: wm.materialName || (mat == null ? void 0 : mat.name) || "",
            specification: (mat == null ? void 0 : mat.specification) || "",
            unit: (mat == null ? void 0 : mat.unit) || "",
            quantity: wm.requiredQty ?? 1,
            estimatedPrice: (mat == null ? void 0 : mat.price) || 0,
            estimatedAmount: (wm.requiredQty ?? 1) * ((mat == null ? void 0 : mat.price) || 0)
          };
        });
        break;
      }
      case "mrp": {
        const rec = sourceDoc;
        const mat = rec.materialId ? materials.find((m) => m.id === rec.materialId) : null;
        rows = [{
          id: `item-${Date.now()}-0`,
          materialCode: (mat == null ? void 0 : mat.code) || "",
          materialId: rec.materialId || (mat == null ? void 0 : mat.id) || "",
          materialName: (mat == null ? void 0 : mat.name) || rec.materialName || "",
          specification: (mat == null ? void 0 : mat.specification) || "",
          unit: (mat == null ? void 0 : mat.unit) || "",
          quantity: rec.suggestedOrderQty || 1,
          estimatedPrice: (mat == null ? void 0 : mat.price) || 0,
          estimatedAmount: (rec.suggestedOrderQty || 1) * ((mat == null ? void 0 : mat.price) || 0)
        }];
        break;
      }
    }
    if (rows.length > 0) {
      setItems((prev) => [...prev, ...rows]);
    }
  };
  const getSourceOptions = () => {
    switch (sourceType) {
      case "salesOrder":
        return salesOrders.filter((o) => o.status !== "cancelled");
      case "workOrder":
        return workOrders.filter((o) => o.status !== "cancelled");
      case "mrp":
        return mrpRecommendations.filter((r) => r.status === "open");
      default:
        return [];
    }
  };
  const getSourceOptionLabel = (doc) => {
    switch (sourceType) {
      case "salesOrder":
        return `${doc.orderNo || ""} ${doc.customerName || ""}`.trim();
      case "workOrder":
        return `${doc.orderNo || ""} ${doc.productName || ""}`.trim();
      case "mrp":
        return `${doc.materialName || ""} (建议${doc.suggestedOrderQty || 0})`.trim();
      default:
        return "";
    }
  };
  const totalAmount = items.reduce((sum, item) => sum + (item.estimatedAmount || 0), 0);
  const onSubmit = (data) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const no = ensureRequestNo(data.department);
    const requestItems = items.map((item) => ({
      id: item.id,
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      specification: item.specification,
      unit: item.unit,
      quantity: item.quantity,
      estimatedPrice: item.estimatedPrice,
      estimatedAmount: item.estimatedAmount
    }));
    if (isEdit && existingRequest) {
      updatePurchaseRequest(id, {
        title: data.title,
        type: data.type,
        priority: data.priority,
        department: data.department,
        expectedDate: data.expectedDate,
        reason: data.reason,
        remarks: data.type === "service" ? serviceDescription : void 0,
        items: requestItems,
        totalAmount,
        projectNo: selectedProject == null ? void 0 : selectedProject.projectNo,
        projectName: selectedProject == null ? void 0 : selectedProject.projectName,
        updatedAt: now,
        updatedBy: "当前用户"
      });
    } else {
      addPurchaseRequest({
        id: `pr-${Date.now()}`,
        requestNo: no,
        title: data.title,
        applicant: "当前用户",
        department: data.department,
        type: data.type,
        priority: data.priority,
        reason: data.reason,
        remarks: data.type === "service" ? serviceDescription : void 0,
        expectedDate: data.expectedDate,
        status: "pending",
        sourceType,
        sourceNo: sourceDoc ? sourceDoc.orderNo || sourceDoc.id : void 0,
        sourceName: sourceDoc ? getSourceOptionLabel(sourceDoc) : void 0,
        items: requestItems,
        totalAmount,
        projectNo: selectedProject == null ? void 0 : selectedProject.projectNo,
        projectName: selectedProject == null ? void 0 : selectedProject.projectName,
        createdAt: now,
        updatedAt: now,
        createdBy: "当前用户",
        updatedBy: "当前用户"
      });
    }
    navigate("/purchase/requests");
  };
  const handleSaveDraft = () => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const dept = control._formValues.department || "";
    const no = ensureRequestNo(dept);
    const requestItems = items.map((item) => ({
      id: item.id,
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      specification: item.specification,
      unit: item.unit,
      quantity: item.quantity,
      estimatedPrice: item.estimatedPrice,
      estimatedAmount: item.estimatedAmount
    }));
    if (isEdit && existingRequest) {
      updatePurchaseRequest(id, {
        title: control._formValues.title || existingRequest.title,
        status: "draft",
        type: control._formValues.type || existingRequest.type,
        remarks: control._formValues.type === "service" ? serviceDescription : void 0,
        items: requestItems,
        totalAmount,
        projectNo: selectedProject == null ? void 0 : selectedProject.projectNo,
        projectName: selectedProject == null ? void 0 : selectedProject.projectName,
        updatedAt: now,
        updatedBy: "当前用户"
      });
    } else {
      addPurchaseRequest({
        id: `pr-${Date.now()}`,
        requestNo: no,
        title: "草稿 - 采购申请",
        applicant: "当前用户",
        department: dept,
        type: control._formValues.type || "material",
        priority: "normal",
        reason: "",
        remarks: control._formValues.type === "service" ? serviceDescription : void 0,
        expectedDate: "",
        status: "draft",
        sourceType,
        sourceNo: sourceDoc ? sourceDoc.orderNo || sourceDoc.id : void 0,
        sourceName: sourceDoc ? getSourceOptionLabel(sourceDoc) : void 0,
        items: requestItems,
        totalAmount,
        createdAt: now,
        updatedAt: now,
        createdBy: "当前用户",
        updatedBy: "当前用户"
      });
    }
    navigate("/purchase/requests");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    PageWrapper,
    {
      title: isEdit ? `编辑采购申请${existingRequest ? ` - ${existingRequest.requestNo}` : ""}` : "新建采购申请",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FlowTracker,
          {
            module: "purchase-request",
            currentStatus: existingRequest ? existingRequest.status : "draft"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}), onClick: () => navigate(-1), sx: { mr: 1 }, children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", onClick: handleSaveDraft, sx: { mr: 1 }, children: "暂存" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleSubmit(onSubmit), children: isEdit ? "保存修改" : "提交申请" })
      ] }),
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { component: "form", onSubmit: handleSubmit(onSubmit), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "申请信息" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              label: "采购申请号",
              value: requestNo || (isEdit ? existingRequest == null ? void 0 : existingRequest.requestNo : "提交/暂存时自动生成"),
              fullWidth: true,
              size: "small",
              InputProps: { readOnly: true },
              sx: { bgcolor: "action.disabledBackground" }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 8 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Controller,
            {
              name: "title",
              control,
              render: ({ field }) => {
                var _a2;
                return /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...field, label: "标题", fullWidth: true, error: !!errors.title, helperText: (_a2 = errors.title) == null ? void 0 : _a2.message });
              }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Controller,
            {
              name: "type",
              control,
              render: ({ field }) => {
                var _a2;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(TextField, { ...field, select: true, label: "申请类型", fullWidth: true, error: !!errors.type, helperText: (_a2 = errors.type) == null ? void 0 : _a2.message, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "material", children: "物料采购" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "service", children: "服务采购" })
                ] });
              }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Controller,
            {
              name: "priority",
              control,
              render: ({ field }) => {
                var _a2;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(TextField, { ...field, select: true, label: "优先级", fullWidth: true, error: !!errors.priority, helperText: (_a2 = errors.priority) == null ? void 0 : _a2.message, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "low", children: "低" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "normal", children: "普通" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "high", children: "高" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "urgent", children: "紧急" })
                ] });
              }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Controller,
            {
              name: "department",
              control,
              render: ({ field }) => {
                var _a2;
                return /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...field, label: "部门", fullWidth: true, error: !!errors.department, helperText: (_a2 = errors.department) == null ? void 0 : _a2.message });
              }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Controller,
            {
              name: "expectedDate",
              control,
              render: ({ field }) => {
                var _a2;
                return /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...field, type: "date", label: "期望日期", fullWidth: true, InputLabelProps: { shrink: true }, error: !!errors.expectedDate, helperText: (_a2 = errors.expectedDate) == null ? void 0 : _a2.message });
              }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Autocomplete,
            {
              size: "small",
              options: projects,
              getOptionLabel: (opt) => `${opt.projectName} (${opt.projectNo})`,
              value: selectedProject,
              onChange: (_, v) => setSelectedProject(v),
              renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, label: "关联项目（编号+名称）", placeholder: "选择或搜索项目" }),
              noOptionsText: "未找到匹配项目",
              isOptionEqualToValue: (o, v) => o.id === v.id
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              select: true,
              label: "来源类型",
              value: sourceType,
              onChange: (e) => {
                setSourceType(e.target.value);
                setSourceDoc(null);
              },
              fullWidth: true,
              size: "small",
              children: SOURCE_OPTIONS.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: opt.value, children: opt.label }, opt.value))
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 8, children: sourceType !== "manual" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            Autocomplete,
            {
              size: "small",
              options: getSourceOptions(),
              getOptionLabel: getSourceOptionLabel,
              value: sourceDoc,
              onChange: (_, v) => setSourceDoc(v),
              renderInput: (params) => {
                var _a2, _b;
                return /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TextField,
                  {
                    ...params,
                    label: `关联${((_a2 = SOURCE_OPTIONS.find((o) => o.value === sourceType)) == null ? void 0 : _a2.label) || "单据"}`,
                    placeholder: `选择${((_b = SOURCE_OPTIONS.find((o) => o.value === sourceType)) == null ? void 0 : _b.desc) || ""}`
                  }
                );
              },
              noOptionsText: "未找到可用单据",
              isOptionEqualToValue: (o, v) => o.id === v.id
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              label: "来源说明",
              value: "手工创建 — 手动录入物料明细",
              fullWidth: true,
              size: "small",
              InputProps: { readOnly: true },
              sx: { bgcolor: "action.disabledBackground" }
            }
          ) }),
          sourceType !== "manual" && sourceDoc && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outlined", size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: fillItemsFromSource, children: [
            "从",
            (_a = SOURCE_OPTIONS.find((o) => o.value === sourceType)) == null ? void 0 : _a.label,
            "拉取物料明细"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Controller,
            {
              name: "reason",
              control,
              render: ({ field }) => {
                var _a2;
                return /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...field, label: "申请原因", fullWidth: true, multiline: true, rows: 2, error: !!errors.reason, helperText: (_a2 = errors.reason) == null ? void 0 : _a2.message });
              }
            }
          ) })
        ] }),
        purchaseType === "service" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "服务描述" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              multiline: true,
              minRows: 4,
              maxRows: 10,
              label: "服务内容描述",
              value: serviceDescription,
              onChange: (e) => setServiceDescription(e.target.value),
              placeholder: "请详细描述服务采购的内容、范围、要求等...",
              helperText: "服务采购不需要物料明细，请在此描述服务内容"
            }
          )
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "物料明细" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 2, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => addItem(), children: "添加物料" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "（提示：物料号列可手工输入/下拉选择；也可直接粘贴 Excel 多行物料编码批量导入并自动匹配名称规格；表格内容可直接框选复制）" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              multiline: true,
              minRows: 2,
              maxRows: 6,
              fullWidth: true,
              label: "批量粘贴物料编码（从 Excel 复制多行，每行一个 / TSV 首列即物料编码）",
              placeholder: "例如：\nMAT202405010001\nMAT202405010002\nMAT202405010003",
              onPaste: handleMaterialPaste,
              helperText: "在上方文本框或任意物料号输入框直接 Ctrl+V 粘贴多行编码，系统自动匹配物料名称、规格、单位与单价",
              InputProps: {
                endAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(ContentPaste, { fontSize: "small", color: "action" })
              },
              sx: { mb: 2 }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { variant: "outlined", sx: { p: 2, mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            ResponsiblePersons,
            {
              categoryIds: itemCategoryIds,
              roles: ["buyer"],
              title: "相关物料责任人（采购）"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, sx: { mb: 3, userSelect: "text" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { minWidth: 160 }, children: "物料号" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { minWidth: 180 }, children: "物料名称" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "规格型号" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "单位" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "数量" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "预估单价" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "预估金额" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { width: 80, children: "操作" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
              items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Autocomplete,
                  {
                    size: "small",
                    freeSolo: true,
                    options: materials,
                    getOptionLabel: (o) => typeof o === "string" ? o : `${o.code} - ${o.name}`,
                    inputValue: item.materialCode,
                    onInputChange: (_, val) => updateItem(item.id, "materialCode", val),
                    onChange: (_, val) => {
                      if (val && typeof val !== "string") {
                        updateItem(item.id, "materialCode", val.code);
                      }
                    },
                    filterOptions: (opts, state) => opts.filter(
                      (m) => !state.inputValue || m.code.toLowerCase().includes(state.inputValue.toLowerCase()) || m.name.toLowerCase().includes(state.inputValue.toLowerCase())
                    ).slice(0, 10),
                    renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      TextField,
                      {
                        ...params,
                        placeholder: "输入或选择物料编码",
                        sx: { minWidth: 140 },
                        onPaste: handleMaterialPaste
                      }
                    ),
                    isOptionEqualToValue: (o, v) => o.id === v.id
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.materialName ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: item.materialName }),
                  !item.materialId && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "未匹配", size: "small", color: "warning", sx: { height: 20, fontSize: 11 } })
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: item.materialCode ? "未找到匹配物料" : "—" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.specification || "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.unit || "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TextField,
                  {
                    type: "number",
                    size: "small",
                    value: item.quantity,
                    onChange: (e) => updateItem(item.id, "quantity", Number(e.target.value)),
                    sx: { width: 80 }
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: formatCurrency(item.estimatedPrice) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: formatCurrency(item.estimatedAmount) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => removeItem(item.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) })
              ] }, item.id)),
              items.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 8, sx: { textAlign: "center", color: "text.secondary", py: 4 }, children: '暂无物料明细，请点击"添加物料"按钮添加，或从Excel复制多行物料编码后点击"粘贴物料"' }) })
            ] }),
            items.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableFooter, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 6, align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "合计金额：" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: formatCurrency(totalAmount) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, {})
            ] }) })
          ] }) })
        ] })
      ] })
    }
  );
};
export {
  PurchaseForm as default
};
