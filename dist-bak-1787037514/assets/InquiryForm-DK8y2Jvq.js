import { h as useNavigate, f as useLocation, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { u as useMaterialStore, a as useVendorStore, b as usePurchaseStore } from "./index-hTLNcGoC.js";
import { f as formatCurrency } from "./format-BXPn3erM.js";
import { M as MaterialLineItemsGrid } from "./MaterialLineItemsGrid-ClgE8gpx.js";
import { P as PrintPreviewButton } from "./PrintPreviewButton-DI-UifA3.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { u as usePriceStore } from "./priceStore-D4MzJqWs.js";
import { aS as Paper, T as Typography, bY as Grid, bv as TextField, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, cC as Autocomplete, aO as Chip, bl as Alert, bm as Button, dI as PlaylistAdd, m as Box, bL as Stack, cX as Checkbox, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, bZ as ArrowBack, bd as Save, bw as Send } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
import "./PrintPreview-Dx9G1wxr.js";
const SOURCE_OPTIONS = [
  { value: "manual", label: "手动输入", desc: "逐行手动添加物料" },
  { value: "purchase_request", label: "采购申请", desc: "从已审批的采购申请中选择行项" },
  { value: "new_material", label: "新增物料", desc: "从物料主数据中选择外购件" },
  { value: "customer_inquiry", label: "客户询价", desc: "从客户询价/报价单导入（开发中）" }
];
const InquiryForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const materials = useMaterialStore((s) => s.materials);
  const vendors = useVendorStore((s) => s.vendors);
  const checkVendorBlacklist = useVendorStore((s) => s.checkVendorBlacklist);
  const purchaseRequests = usePurchaseStore((s) => s.purchaseRequests);
  const addPriceInquiry = usePriceStore((s) => s.addPriceInquiry);
  const [title, setTitle] = reactExports.useState("");
  const [deadline, setDeadline] = reactExports.useState("");
  const [currency, setCurrency] = reactExports.useState("CNY");
  const [remarks, setRemarks] = reactExports.useState("");
  const [targetVendors, setTargetVendors] = reactExports.useState([]);
  const [items, setItems] = reactExports.useState([]);
  const [sourceType, setSourceType] = reactExports.useState("manual");
  const [selectedPRIds, setSelectedPRIds] = reactExports.useState(/* @__PURE__ */ new Set());
  const [selectedMatIds, setSelectedMatIds] = reactExports.useState(/* @__PURE__ */ new Set());
  reactExports.useEffect(() => {
    const state = location.state;
    if (state == null ? void 0 : state.fromRequests) {
      const importedItems = state.fromRequests.map((item, idx) => ({
        id: `new-${idx}`,
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        specification: item.specification,
        unit: item.unit,
        quantity: item.quantity,
        requiredDate: item.requiredDate || "",
        estimatedPrice: item.estimatedPrice,
        estimatedAmount: item.estimatedAmount,
        sourceRequestId: item.sourceRequestId,
        sourceRequestNo: item.sourceRequestNo,
        sourceType: "purchase_request",
        remarks: ""
      }));
      setItems(importedItems);
      setSourceType("purchase_request");
    }
  }, [location.state]);
  const approvedPRs = reactExports.useMemo(
    () => purchaseRequests.filter((pr) => pr.status === "approved" || pr.status === "pending"),
    [purchaseRequests]
  );
  const purchasableMaterials = reactExports.useMemo(
    () => materials.filter((m) => m.makeOrBuy === "buy" || m.materialType === "purchased" || !m.makeOrBuy),
    [materials]
  );
  const totalAmount = items.reduce((sum, item) => sum + (item.estimatedAmount || item.quantity * (item.estimatedPrice || 0)), 0);
  const vendorOptions = vendors.filter((v) => v.status !== "blacklisted").map((v) => ({ id: v.id, name: v.name }));
  const blacklistedCount = vendors.filter((v) => v.status === "blacklisted").length;
  const handleSourceTypeChange = (newType) => {
    setSourceType(newType);
    setSelectedPRIds(/* @__PURE__ */ new Set());
    setSelectedMatIds(/* @__PURE__ */ new Set());
  };
  const togglePRItem = (prId, itemIdx) => {
    const key = `${prId}-${itemIdx}`;
    setSelectedPRIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const toggleMaterial = (matId) => {
    setSelectedMatIds((prev) => {
      const next = new Set(prev);
      if (next.has(matId)) next.delete(matId);
      else next.add(matId);
      return next;
    });
  };
  const handleBatchAdd = () => {
    if (sourceType === "purchase_request") {
      const newItems = [];
      approvedPRs.forEach((pr) => {
        pr.items.forEach((pItem, idx) => {
          const key = `${pr.id}-${idx}`;
          if (!selectedPRIds.has(key)) return;
          const exists = items.some((i) => i.materialId === pItem.materialId && i.sourceRequestId === pr.id);
          if (exists) return;
          newItems.push({
            id: `src-pr-${Date.now()}-${pItem.id || idx}`,
            materialId: pItem.materialId || "",
            materialCode: pItem.materialCode || "",
            materialName: pItem.materialName || "",
            specification: pItem.specification || "",
            unit: pItem.unit || "件",
            quantity: pItem.quantity || 1,
            requiredDate: pItem.deliveryDate || "",
            estimatedPrice: pItem.estimatedPrice,
            estimatedAmount: pItem.estimatedAmount || (pItem.quantity || 1) * (pItem.estimatedPrice || 0),
            sourceRequestId: pr.id,
            sourceRequestNo: pr.requestNo,
            sourceType: "purchase_request",
            remarks: ""
          });
        });
      });
      if (newItems.length === 0) alert("请先勾选需要加入的采购申请行项");
      else setItems((prev) => [...prev, ...newItems]);
      setSelectedPRIds(/* @__PURE__ */ new Set());
    }
    if (sourceType === "new_material") {
      const newItems = [];
      selectedMatIds.forEach((matId) => {
        const mat = purchasableMaterials.find((m) => m.id === matId);
        if (!mat) return;
        const exists = items.some((i) => i.materialId === matId);
        if (exists) return;
        newItems.push({
          id: `src-mat-${Date.now()}-${matId}`,
          materialId: mat.id,
          materialCode: mat.code,
          materialName: mat.name,
          specification: mat.specification || "",
          unit: mat.unit,
          quantity: 1,
          requiredDate: "",
          estimatedPrice: mat.price || void 0,
          estimatedAmount: mat.price || void 0,
          sourceType: "new_material",
          remarks: ""
        });
      });
      if (newItems.length === 0) alert("请先勾选需要加入的物料");
      else setItems((prev) => [...prev, ...newItems]);
      setSelectedMatIds(/* @__PURE__ */ new Set());
    }
    if (sourceType === "customer_inquiry") {
      alert("客户询价来源功能开发中，敬请期待");
    }
  };
  const inquiryMaterialOptions = materials.map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    specification: m.specification || "",
    unit: m.unit,
    price: m.price
  }));
  const computeInquiryRow = (row) => ({
    ...row,
    estimatedAmount: (Number(row.quantity) || 0) * (Number(row.estimatedPrice) || 0)
  });
  const handleInquiryMaterialPricing = (_rowId, materialId) => {
    const mat = materials.find((m) => m.id === materialId);
    if (!mat) return {};
    return { estimatedPrice: mat.price };
  };
  const inquiryColumns = [
    { key: "materialCode", label: "物料编码", materialRole: "code", fillFromMaterial: "code", width: 140, fixed: true },
    { key: "materialName", label: "物料名称", materialRole: "name", fillFromMaterial: "name", width: 200, fixed: true },
    { key: "specification", label: "规格", fillFromMaterial: "specification", width: 140, hideable: true },
    { key: "unit", label: "单位", fillFromMaterial: "unit", width: 70, hideable: true },
    { key: "quantity", label: "数量", type: "number", align: "right", width: 90, min: 1, step: 1 },
    { key: "estimatedPrice", label: "预估单价", type: "number", align: "right", width: 110, min: 0, step: 0.01 },
    { key: "estimatedAmount", label: "预估金额", type: "readonly", align: "right", width: 110 },
    { key: "requiredDate", label: "需求日期", type: "date", width: 150, hideable: true },
    {
      key: "sourceType",
      label: "来源",
      width: 140,
      hideable: true,
      renderCell: (row) => row.sourceRequestNo ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `采购申请:${row.sourceRequestNo}`, size: "small", variant: "outlined", sx: { fontSize: "0.65rem", height: 20 } }) : row.sourceType === "new_material" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "新增物料", size: "small", variant: "outlined", sx: { fontSize: "0.65rem", height: 20 } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "手动" })
    },
    { key: "remarks", label: "备注", width: 120, hideable: true }
  ];
  const makeInquiryRow = () => ({
    id: "",
    materialId: "",
    materialCode: "",
    materialName: "",
    specification: "",
    unit: "件",
    quantity: 1,
    requiredDate: "",
    estimatedPrice: void 0,
    estimatedAmount: void 0,
    sourceType: "manual",
    remarks: ""
  });
  const buildPriceInquiry = (status) => {
    const now = /* @__PURE__ */ new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const seq = String(Date.now() % 1e3).padStart(3, "0");
    return {
      id: `inquiry-${Date.now()}`,
      inquiryNo: `IQ${dateStr}${seq}`,
      title,
      inquiryDate: now.toISOString().split("T")[0],
      inquirer: "当前用户",
      department: "采购部",
      items: items.map(({ estimatedAmount, estimatedPrice, ...rest }) => ({
        ...rest,
        estimatedAmount: rest.quantity * (estimatedPrice || 0),
        estimatedPrice
      })),
      targetVendorIds: targetVendors.map((v) => v.id),
      targetVendorNames: targetVendors.map((v) => v.name),
      deadline,
      currency,
      status,
      totalEstimatedAmount: totalAmount,
      remarks: remarks || void 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      createdBy: "当前用户",
      updatedBy: "当前用户"
    };
  };
  const blockedByBlacklist = () => {
    const hits = targetVendors.map((tv) => ({ tv, bl: checkVendorBlacklist(tv.id) })).filter((x) => x.bl.blacklisted);
    if (hits.length === 0) return false;
    alert(
      `以下目标供应商已列入黑名单，询价单无法发布：
` + hits.map((h) => `· ${h.bl.vendorName || h.tv.name}：${h.bl.reason || "未填写原因"}`).join("\n") + `

请移除上述供应商后重新发布。`
    );
    return true;
  };
  const handleSaveDraft = () => {
    const inquiry = buildPriceInquiry("draft");
    addPriceInquiry(inquiry);
    navigate("/price/inquiry");
  };
  const handlePublish = () => {
    if (!title.trim()) {
      alert("请输入询价单标题");
      return;
    }
    if (items.length === 0) {
      alert("请添加至少一项物料");
      return;
    }
    if (!deadline) {
      alert("请设置报价截止日期");
      return;
    }
    if (targetVendors.length === 0) {
      alert("请选择至少一个目标供应商");
      return;
    }
    if (blockedByBlacklist()) return;
    const inquiry = buildPriceInquiry("published");
    addPriceInquiry(inquiry);
    navigate("/price/inquiry");
  };
  const prSelectedCount = Array.from(selectedPRIds).length;
  const matSelectedCount = selectedMatIds.size;
  const buildPrintRecord = () => ({
    inquiryNo: "(尚未保存)",
    title,
    deadline,
    remarks,
    items: items.map((it) => ({
      materialCode: it.materialCode,
      materialName: it.materialName,
      specification: it.specification,
      unit: it.unit,
      quantity: it.quantity,
      requiredDate: it.requiredDate,
      unitPrice: it.estimatedPrice,
      amount: it.estimatedAmount,
      sourceType: it.sourceType,
      remarks: it.remarks
    }))
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "新建询价单",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}), onClick: () => navigate("/price/inquiry"), children: "返回" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(PrintPreviewButton, { entity: "inquiry", record: buildPrintRecord(), showBoth: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleSaveDraft, children: "保存草稿" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, {}), onClick: handlePublish, children: "发布询价" })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "基本信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: { xs: 12, sm: 6 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "询价标题",
                value: title,
                onChange: (e) => setTitle(e.target.value),
                required: true,
                placeholder: "如：钢板Q235B+H型钢Q345B询价"
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: { xs: 12, sm: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "报价截止日期",
                type: "date",
                value: deadline,
                onChange: (e) => setDeadline(e.target.value),
                required: true,
                InputLabelProps: { shrink: true }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: { xs: 12, sm: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "币种" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: currency, onChange: (e) => setCurrency(e.target.value), label: "币种", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "CNY", children: "人民币 CNY" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "USD", children: "美元 USD" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "EUR", children: "欧元 EUR" })
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { size: { xs: 12 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Autocomplete,
                {
                  multiple: true,
                  options: vendorOptions,
                  getOptionLabel: (option) => option.name,
                  value: targetVendors,
                  onChange: (_, newValue) => setTargetVendors(newValue),
                  renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, label: "目标供应商", placeholder: "选择供应商", required: true }),
                  renderTags: (value, getTagProps) => value.map((option, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: option.name, size: "small", ...getTagProps({ index }) }))
                }
              ),
              blacklistedCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mt: 1, py: 0.25 }, "data-testid": "inquiry-blacklist-hint", children: [
                "已按黑名单规则屏蔽 ",
                blacklistedCount,
                " 家供应商，不可选为询价对象。"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: { xs: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "备注",
                value: remarks,
                onChange: (e) => setRemarks(e.target.value),
                multiline: true,
                rows: 2,
                placeholder: "特殊要求、付款条件等"
              }
            ) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "📥 需求来源" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, alignItems: "center", sx: { mb: 2 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: { xs: 12, sm: 5 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "选择需求来源" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: sourceType, label: "选择需求来源", inputProps: { "data-testid": "inquiry-source-type" }, onChange: (e) => handleSourceTypeChange(e.target.value), children: SOURCE_OPTIONS.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: opt.value, children: [
                opt.label,
                " — ",
                opt.desc
              ] }, opt.value)) })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: { xs: 12, sm: 7 }, children: sourceType !== "manual" && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                variant: "contained",
                size: "small",
                startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(PlaylistAdd, {}),
                onClick: handleBatchAdd,
                disabled: sourceType === "purchase_request" ? prSelectedCount === 0 : sourceType === "new_material" ? matSelectedCount === 0 : true,
                children: [
                  "批量加入明细",
                  `(${sourceType === "purchase_request" ? prSelectedCount : sourceType === "new_material" ? matSelectedCount : 0})`
                ]
              }
            ) })
          ] }),
          sourceType === "purchase_request" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
              "已审批的采购申请（共 ",
              approvedPRs.length,
              " 单，展开可查看行项并勾选）"
            ] }),
            approvedPRs.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mt: 1 }, children: "暂无已审批的采购申请" }) : approvedPRs.map((pr) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 1.5, mt: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", sx: { mb: 0.5 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Checkbox,
                  {
                    indeterminate: pr.items.length > 0 && pr.items.some((_, i) => selectedPRIds.has(`${pr.id}-${i}`)) && !pr.items.every((_, i) => selectedPRIds.has(`${pr.id}-${i}`)),
                    checked: pr.items.length > 0 && pr.items.every((_, i) => selectedPRIds.has(`${pr.id}-${i}`)),
                    onChange: () => {
                      const allChecked = pr.items.length > 0 && pr.items.every((_, i) => selectedPRIds.has(`${pr.id}-${i}`));
                      const next = new Set(selectedPRIds);
                      pr.items.forEach((_, i) => {
                        const key = `${pr.id}-${i}`;
                        if (allChecked) next.delete(key);
                        else next.add(key);
                      });
                      setSelectedPRIds(next);
                    },
                    size: "small"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: pr.requestNo }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: pr.title }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `${pr.items.length} 行`, size: "tiny", variant: "outlined", sx: { height: 18, fontSize: ".65rem" } })
              ] }),
              pr.items.map((pItem, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", sx: { pl: 3, py: 0.25 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Checkbox,
                  {
                    checked: selectedPRIds.has(`${pr.id}-${idx}`),
                    onChange: () => togglePRItem(pr.id, idx),
                    size: "small"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: pItem.materialCode || "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { flex: 1 }, children: pItem.materialName }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                  "×",
                  pItem.quantity,
                  pItem.unit || ""
                ] })
              ] }, `${pr.id}-${idx}`))
            ] }, pr.id))
          ] }),
          sourceType === "new_material" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
              "外购件物料列表（共 ",
              purchasableMaterials.length,
              " 个，勾选后批量加入）"
            ] }),
            purchasableMaterials.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mt: 1 }, children: "暂无可用的外购件物料" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { sx: { mt: 1, maxHeight: 280 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { width: 50, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Checkbox,
                  {
                    indeterminate: matSelectedCount > 0 && matSelectedCount < purchasableMaterials.length,
                    checked: matSelectedCount === purchasableMaterials.length && purchasableMaterials.length > 0,
                    onChange: () => {
                      const allChecked = matSelectedCount === purchasableMaterials.length;
                      setSelectedMatIds(allChecked ? /* @__PURE__ */ new Set() : new Set(purchasableMaterials.map((m) => m.id)));
                    },
                    size: "small"
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "编码" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "名称" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "规格" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "单价" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: purchasableMaterials.slice(0, 50).map((mat) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { padding: "checkbox", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Checkbox,
                  {
                    checked: selectedMatIds.has(mat.id),
                    onChange: () => toggleMaterial(mat.id),
                    size: "small"
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: mat.code }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: mat.name }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: mat.specification || "—" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: mat.price > 0 ? `¥${mat.price}` : "—" })
              ] }, mat.id)) })
            ] }) })
          ] }),
          sourceType === "customer_inquiry" && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mt: 1 }, children: "客户询价来源功能正在开发中，将支持从销售报价单/客户询价导入行项。 当前可使用「手动输入」或「新增物料」方式添加物料。" }),
          sourceType === "manual" && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mt: 1 }, children: "手动模式：点击下方「添加物料」按钮逐行录入，或在物料明细表中直接编辑。" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 3, mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          MaterialLineItemsGrid,
          {
            columns: inquiryColumns,
            value: items,
            onChange: (rows) => setItems(rows),
            materials: inquiryMaterialOptions,
            onMaterialChange: handleInquiryMaterialPricing,
            computeRow: computeInquiryRow,
            newRow: makeInquiryRow,
            storageKey: "ssa-inquiry-material-columns",
            addLabel: "添加物料",
            testIdPrefix: "inquiry",
            footer: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", px: 1, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                "共 ",
                items.length,
                " 项物料"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, color: "primary", children: [
                "预估总金额：",
                formatCurrency(totalAmount)
              ] })
            ] })
          }
        ) })
      ]
    }
  );
};
export {
  InquiryForm as default
};
