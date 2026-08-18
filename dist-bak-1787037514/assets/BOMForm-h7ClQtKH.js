import { n as useParams, h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { u as useMaterialStore } from "./index-hTLNcGoC.js";
import { F as FlowTracker } from "./FlowTracker-BvV1jEfP.js";
import { f as formatCurrency } from "./format-BXPn3erM.js";
import { M as MaterialLineItemsGrid } from "./MaterialLineItemsGrid-ClgE8gpx.js";
import { P as PrintPreviewButton } from "./PrintPreviewButton-DI-UifA3.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { u as useBOMStore } from "./bomStore-CeDOOVVk.js";
import { aS as Paper, T as Typography, bY as Grid, bv as TextField, aR as MenuItem, cM as FormControlLabel, cN as Switch, cU as Slider, bL as Stack, bm as Button, bh as Add, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, cC as Autocomplete, aM as IconButton, be as Delete, bl as Alert, bZ as ArrowBack, bd as Save, aO as Chip } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
import "./PrintPreview-Dx9G1wxr.js";
const BOMForm = () => {
  var _a;
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id && id !== "create";
  const materials = useMaterialStore((s) => s.materials);
  const { addBOM, updateBOM, bomList: storeBomList } = useBOMStore();
  const existingBOM = isEdit ? storeBomList.find((b) => b.id === id) : null;
  const [bomNo, setBomNo] = reactExports.useState((existingBOM == null ? void 0 : existingBOM.bomNo) ?? "BOM-2024-001");
  const [productName, setProductName] = reactExports.useState((existingBOM == null ? void 0 : existingBOM.productName) ?? "桥梁支座");
  const [productCode, setProductCode] = reactExports.useState((existingBOM == null ? void 0 : existingBOM.productCode) ?? "P-001");
  const [type, setType] = reactExports.useState((existingBOM == null ? void 0 : existingBOM.type) ?? "EBOM");
  const [version, setVersion] = reactExports.useState((existingBOM == null ? void 0 : existingBOM.version) ?? "V1.0");
  const [status, setStatus] = reactExports.useState((existingBOM == null ? void 0 : existingBOM.status) ?? "draft");
  const [effectiveDate, setEffectiveDate] = reactExports.useState((existingBOM == null ? void 0 : existingBOM.effectiveDate) ?? "2024-01-01");
  const [remarks, setRemarks] = reactExports.useState((existingBOM == null ? void 0 : existingBOM.description) ?? "");
  const [isAlternate, setIsAlternate] = reactExports.useState((existingBOM == null ? void 0 : existingBOM.isAlternate) ?? false);
  const [usageProbability, setUsageProbability] = reactExports.useState((existingBOM == null ? void 0 : existingBOM.usageProbability) ?? 50);
  const [priority, setPriority] = reactExports.useState((existingBOM == null ? void 0 : existingBOM.priority) ?? 1);
  const [coProducts, setCoProducts] = reactExports.useState((existingBOM == null ? void 0 : existingBOM.coProducts) ?? []);
  const [byProducts, setByProducts] = reactExports.useState((existingBOM == null ? void 0 : existingBOM.byProducts) ?? []);
  const [costSplitMethod, setCostSplitMethod] = reactExports.useState((existingBOM == null ? void 0 : existingBOM.costSplitMethod) ?? "");
  const [items, setItems] = reactExports.useState(((_a = existingBOM == null ? void 0 : existingBOM.items) == null ? void 0 : _a.map((item) => ({
    ...item,
    id: item.id,
    materialSpec: item.materialSpec ?? ""
  }))) ?? [
    {
      id: "bom-item-001",
      materialId: "M001",
      materialCode: "M001",
      materialName: "钢板Q235B",
      materialSpec: "12mm",
      quantity: 10,
      unit: "张",
      scrapRate: 5,
      source: "purchase",
      unitCost: 150,
      totalCost: 1500,
      isCritical: true
    },
    {
      id: "bom-item-002",
      materialId: "M002",
      materialCode: "M002",
      materialName: "H型钢Q345B",
      materialSpec: "H300×300×10×15",
      quantity: 20,
      unit: "米",
      scrapRate: 3,
      source: "purchase",
      unitCost: 85,
      totalCost: 1700,
      isCritical: false
    }
  ]);
  const materialOptions = materials.map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    specification: m.specification || "",
    unit: m.unit,
    price: m.price
  }));
  const computeBomRow = (row) => ({
    ...row,
    totalCost: (Number(row.quantity) || 0) * (Number(row.unitCost) || 0)
  });
  const handleBomMaterialPricing = (_rowId, materialId) => {
    const mat = materials.find((m) => m.id === materialId);
    if (!mat) return {};
    return { unitCost: mat.price };
  };
  const bomColumns = [
    { key: "materialCode", label: "物料编码", materialRole: "code", fillFromMaterial: "code", width: 140, fixed: true },
    { key: "materialName", label: "物料名称", materialRole: "name", fillFromMaterial: "name", width: 200, fixed: true },
    { key: "materialSpec", label: "规格", fillFromMaterial: "specification", width: 140, hideable: true },
    { key: "unit", label: "单位", fillFromMaterial: "unit", width: 70, hideable: true },
    { key: "quantity", label: "用量", type: "number", align: "right", width: 90, min: 0, step: 1 },
    { key: "scrapRate", label: "废品率(%)", type: "number", align: "right", width: 100, min: 0, max: 100, step: 1, hideable: true },
    { key: "source", label: "来源", type: "select", width: 110, options: [
      { value: "purchase", label: "外购" },
      { value: "manufacture", label: "自制" },
      { value: "phantom", label: "虚项" }
    ] },
    { key: "unitCost", label: "单价(¥)", type: "number", align: "right", width: 110, min: 0, step: 0.01 },
    { key: "totalCost", label: "小计(¥)", type: "readonly", align: "right", width: 110 },
    {
      key: "isCritical",
      label: "关键",
      width: 70,
      renderCell: (row) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: row.isCritical ? "是" : "否",
          size: "small",
          color: row.isCritical ? "error" : "default",
          onClick: () => setItems((prev) => prev.map((i) => i.id === row.id ? { ...i, isCritical: !i.isCritical } : i)),
          sx: { cursor: "pointer" }
        }
      )
    }
  ];
  const makeBomRow = () => ({
    id: "",
    materialId: "",
    materialCode: "",
    materialName: "",
    materialSpec: "",
    quantity: 1,
    unit: "件",
    scrapRate: 0,
    source: "purchase",
    unitCost: 0,
    totalCost: 0,
    isCritical: false
  });
  const handleAddCoProduct = () => {
    setCoProducts((prev) => [...prev, { materialId: "", materialName: "", outputRatio: 1 }]);
  };
  const handleCoProductChange = (index, field, value) => {
    setCoProducts((prev) => prev.map((cp, i) => i === index ? { ...cp, [field]: value } : cp));
  };
  const handleCoProductMaterialSelect = (index, materialId) => {
    const mat = materials.find((m) => m.id === materialId);
    if (!mat) return;
    setCoProducts((prev) => prev.map(
      (cp, i) => i === index ? { ...cp, materialId: mat.id, materialName: mat.name } : cp
    ));
  };
  const handleDeleteCoProduct = (index) => {
    setCoProducts((prev) => prev.filter((_, i) => i !== index));
  };
  const handleAddByProduct = () => {
    setByProducts((prev) => [...prev, { materialId: "", materialName: "", outputQuantity: 1, unitPrice: 0 }]);
  };
  const handleByProductChange = (index, field, value) => {
    setByProducts((prev) => prev.map((bp, i) => i === index ? { ...bp, [field]: value } : bp));
  };
  const handleByProductMaterialSelect = (index, materialId) => {
    const mat = materials.find((m) => m.id === materialId);
    if (!mat) return;
    setByProducts((prev) => prev.map(
      (bp, i) => i === index ? { ...bp, materialId: mat.id, materialName: mat.name } : bp
    ));
  };
  const handleDeleteByProduct = (index) => {
    setByProducts((prev) => prev.filter((_, i) => i !== index));
  };
  const materialCost = items.reduce((sum, item) => sum + item.totalCost, 0);
  const byProductValue = byProducts.reduce((sum, bp) => sum + bp.outputQuantity * (bp.unitPrice ?? 0), 0);
  const totalCost = Math.max(0, materialCost - byProductValue);
  const handleSave = () => {
    if (!productName.trim()) {
      alert("请输入产品名称");
      return;
    }
    if (items.length === 0) {
      alert("请添加至少一项物料");
      return;
    }
    const bomData = {
      bomNo,
      name: productName,
      type,
      status: "draft",
      productId: productCode,
      productCode,
      productName,
      version,
      effectiveDate,
      totalCost,
      currency: "CNY",
      description: remarks,
      items,
      isAlternate,
      usageProbability: isAlternate ? usageProbability : void 0,
      priority: isAlternate ? priority : void 0,
      coProducts: coProducts.length > 0 ? coProducts : void 0,
      byProducts: byProducts.length > 0 ? byProducts : void 0,
      costSplitMethod: costSplitMethod || void 0,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedBy: "currentUser"
    };
    if (isEdit && existingBOM) {
      updateBOM(existingBOM.id, bomData);
    } else {
      addBOM({
        id: `bom-${Date.now()}`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        createdBy: "currentUser",
        ...bomData
      });
    }
    navigate("/bom");
  };
  const handleRelease = () => {
    if (!productName.trim()) {
      alert("请输入产品名称");
      return;
    }
    if (items.length === 0) {
      alert("请添加至少一项物料");
      return;
    }
    const bomData = {
      bomNo,
      name: productName,
      type,
      status: "released",
      productId: productCode,
      productCode,
      productName,
      version,
      effectiveDate,
      totalCost,
      currency: "CNY",
      description: remarks,
      items,
      isAlternate,
      usageProbability: isAlternate ? usageProbability : void 0,
      priority: isAlternate ? priority : void 0,
      coProducts: coProducts.length > 0 ? coProducts : void 0,
      byProducts: byProducts.length > 0 ? byProducts : void 0,
      costSplitMethod: costSplitMethod || void 0,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedBy: "currentUser"
    };
    if (isEdit && existingBOM) {
      updateBOM(existingBOM.id, bomData);
    } else {
      addBOM({
        id: `bom-${Date.now()}`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        createdBy: "currentUser",
        ...bomData
      });
    }
    navigate("/bom");
  };
  const buildPrintRecord = () => ({
    bomNo,
    productName,
    productCode,
    type,
    version,
    status,
    effectiveDate,
    remarks,
    items: items.map((it) => ({
      materialCode: it.materialCode,
      materialName: it.materialName,
      specification: it.materialSpec,
      unit: it.unit,
      quantity: it.quantity,
      scrapRate: it.scrapRate,
      source: it.source,
      unitCost: it.unitCost,
      amount: it.totalCost,
      isCritical: it.isCritical
    }))
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: isEdit ? `编辑BOM - ${bomNo}` : "新建BOM",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FlowTracker,
          {
            module: "bom",
            currentStatus: status === "released" ? "bom_release" : "bom_design"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}), onClick: () => navigate("/bom"), children: "返回" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(PrintPreviewButton, { entity: "bom", record: buildPrintRecord(), showBoth: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleSave, children: "保存草稿" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleRelease, children: "发布" })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "基本信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "BOM编号",
                value: bomNo,
                onChange: (e) => setBomNo(e.target.value),
                disabled: isEdit
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "产品名称",
                value: productName,
                onChange: (e) => setProductName(e.target.value),
                required: true
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "产品编码",
                value: productCode,
                onChange: (e) => setProductCode(e.target.value)
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              TextField,
              {
                select: true,
                fullWidth: true,
                label: "BOM类型",
                value: type,
                onChange: (e) => setType(e.target.value),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "EBOM", children: "EBOM（设计BOM）" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "MBOM", children: "MBOM（制造BOM）" })
                ]
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "版本",
                value: version,
                onChange: (e) => setVersion(e.target.value)
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "生效日期",
                type: "date",
                value: effectiveDate,
                onChange: (e) => setEffectiveDate(e.target.value),
                InputLabelProps: { shrink: true }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              FormControlLabel,
              {
                control: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Switch,
                  {
                    checked: isAlternate,
                    onChange: (e) => setIsAlternate(e.target.checked),
                    "data-testid": "bom-is-alt"
                  }
                ),
                label: "替代BOM"
              }
            ) }),
            isAlternate && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, sm: 6, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", gutterBottom: true, sx: { display: "block" }, children: [
                  "使用概率：",
                  usageProbability,
                  "%"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Slider,
                  {
                    value: usageProbability,
                    onChange: (_, val) => setUsageProbability(val),
                    min: 0,
                    max: 100,
                    valueLabelDisplay: "auto"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  fullWidth: true,
                  label: "优先级",
                  type: "number",
                  value: priority,
                  onChange: (e) => setPriority(Number(e.target.value)),
                  helperText: "越小越优先选",
                  inputProps: { min: 1 }
                }
              ) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "备注",
                value: remarks,
                onChange: (e) => setRemarks(e.target.value),
                multiline: true,
                rows: 2
              }
            ) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 3, mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          MaterialLineItemsGrid,
          {
            columns: bomColumns,
            value: items,
            onChange: (rows) => setItems(rows),
            materials: materialOptions,
            onMaterialChange: handleBomMaterialPricing,
            computeRow: computeBomRow,
            newRow: makeBomRow,
            storageKey: "ssa-bom-material-columns",
            addLabel: "添加物料",
            testIdPrefix: "bom",
            footer: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", px: 1, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                "共 ",
                items.length,
                " 项物料"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, color: "primary", children: [
                "BOM总成本：",
                formatCurrency(totalCost)
              ] })
            ] })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", mb: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "联产品" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "outlined",
                size: "small",
                startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}),
                "data-testid": "bom-add-coproduct",
                onClick: handleAddCoProduct,
                children: "添加联产品"
              }
            )
          ] }),
          coProducts.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "产出比率" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { width: 60 })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: coProducts.map((cp, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Autocomplete,
                {
                  size: "small",
                  options: materialOptions,
                  getOptionLabel: (option) => `${option.name} (${option.code})`,
                  value: materialOptions.find((m) => m.id === cp.materialId) || null,
                  onChange: (_, newValue) => {
                    if (newValue) handleCoProductMaterialSelect(index, newValue.id);
                  },
                  renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, placeholder: "选择物料", sx: { minWidth: 180 } }),
                  isOptionEqualToValue: (o, v) => o.id === v.id
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  size: "small",
                  type: "number",
                  value: cp.outputRatio,
                  onChange: (e) => handleCoProductChange(index, "outputRatio", Number(e.target.value)),
                  sx: { width: 100 },
                  inputProps: { min: 0, step: 0.01 },
                  helperText: "单位/单位主产品"
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => handleDeleteCoProduct(index), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) })
            ] }, index)) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            TextField,
            {
              select: true,
              size: "small",
              label: "成本分摊方法",
              value: costSplitMethod,
              onChange: (e) => setCostSplitMethod(e.target.value),
              sx: { mt: 2, minWidth: 200 },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "无" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "weight", children: "重量法" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "volume", children: "体积法" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "market_value", children: "市场价值法" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", mb: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "副产品" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "outlined",
                size: "small",
                startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}),
                "data-testid": "bom-add-byproduct",
                onClick: handleAddByProduct,
                children: "添加副产品"
              }
            )
          ] }),
          byProducts.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "产出数量" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "单价(¥)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "抵减价值(¥)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { width: 60 })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: byProducts.map((bp, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Autocomplete,
                {
                  size: "small",
                  options: materialOptions,
                  getOptionLabel: (option) => `${option.name} (${option.code})`,
                  value: materialOptions.find((m) => m.id === bp.materialId) || null,
                  onChange: (_, newValue) => {
                    if (newValue) handleByProductMaterialSelect(index, newValue.id);
                  },
                  renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, placeholder: "选择物料", sx: { minWidth: 180 } }),
                  isOptionEqualToValue: (o, v) => o.id === v.id
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  size: "small",
                  type: "number",
                  value: bp.outputQuantity,
                  onChange: (e) => handleByProductChange(index, "outputQuantity", Number(e.target.value)),
                  sx: { width: 100 },
                  inputProps: { min: 0 }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  size: "small",
                  type: "number",
                  value: bp.unitPrice ?? 0,
                  onChange: (e) => handleByProductChange(index, "unitPrice", Number(e.target.value)),
                  sx: { width: 100 },
                  inputProps: { min: 0, step: 0.01 }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                "¥",
                ((bp.outputQuantity || 0) * (bp.unitPrice ?? 0)).toFixed(2)
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => handleDeleteByProduct(index), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) })
            ] }, index)) })
          ] }) }),
          byProducts.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mt: 1 }, children: [
            "主产品成本 = 总投入成本 ",
            formatCurrency(materialCost),
            " - 副产品价值之和 ",
            formatCurrency(byProductValue),
            " = ",
            formatCurrency(totalCost)
          ] })
        ] })
      ]
    }
  );
};
export {
  BOMForm as default
};
