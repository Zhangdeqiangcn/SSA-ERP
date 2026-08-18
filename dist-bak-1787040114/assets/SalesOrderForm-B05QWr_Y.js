import { r as reactExports, j as jsxRuntimeExports, B as Box, cN as Autocomplete, bt as TextField, h as Typography, aP as Paper, aL as Chip, eP as default_1, aG as useNavigate, cJ as useParams, bj as Alert, bX as Grid, aO as MenuItem, bK as Stack, bk as Button, bY as ArrowBack, bb as Save, bu as Send } from "./vendor-DGU5TO-x.js";
import { u as useMaterialStore, e as useSalesStore, a as useVendorStore } from "./index-DeeqqmHA.js";
import { f as formatCurrency } from "./format-DnEevvSX.js";
import { A as AttachmentUploader } from "./AttachmentUploader-CBb4exdh.js";
import { M as MaterialLineItemsGrid } from "./MaterialLineItemsGrid-ClTe2AVT.js";
import { P as PrintPreviewButton } from "./PrintPreviewButton-DI_LQm8R.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import { u as useCustomerStore } from "./customerStore-D75PJy1n.js";
import { u as useSalesPriceStore } from "./salesPriceStore-C1lbTZ_V.js";
import "./FileUpload-CMrbNP90.js";
import "./PrintPreview-cCBr3GzP.js";
import "./conditionStore-D-IHrlNs.js";
const INCOTERMS_2020 = [
  {
    code: "EXW",
    enName: "Ex Works",
    cnName: "工厂交货",
    riskTransfer: "卖方工厂/仓库货交买方时，风险即转移。",
    costSplit: "卖方不负责装车、出口清关及任何费用，买方承担全程费用。",
    transport: "任何方式"
  },
  {
    code: "FCA",
    enName: "Free Carrier",
    cnName: "货交承运人",
    riskTransfer: "货物在指定地点交付承运人/代理时风险转移。",
    costSplit: "卖方负责出口清关并交至承运人；其后费用由买方承担。",
    transport: "任何方式"
  },
  {
    code: "FAS",
    enName: "Free Alongside Ship",
    cnName: "船边交货",
    riskTransfer: "货物置于指定装运港船边时风险转移。",
    costSplit: "卖方负责运至船边并出口清关；装船及海运费由买方承担。",
    transport: "水路"
  },
  {
    code: "FOB",
    enName: "Free On Board",
    cnName: "船上交货",
    riskTransfer: "货物装上指定装运港船上时风险转移。",
    costSplit: "卖方负责装船与出口清关；海运费及保险由买方承担。",
    transport: "水路"
  },
  {
    code: "CFR",
    enName: "Cost and Freight",
    cnName: "成本加运费",
    riskTransfer: "货物装上船时风险转移（与运费支付分离）。",
    costSplit: "卖方承担运费至目的港，但风险在装船时转移给买方。",
    transport: "水路"
  },
  {
    code: "CIF",
    enName: "Cost, Insurance and Freight",
    cnName: "成本、保险费加运费",
    riskTransfer: "货物装上船时风险转移（保险由卖方投保）。",
    costSplit: "卖方承担运费与保险费至目的港，风险在装船时转移。",
    transport: "水路"
  },
  {
    code: "CPT",
    enName: "Carriage Paid To",
    cnName: "运费付至",
    riskTransfer: "货物交付第一承运人时风险转移。",
    costSplit: "卖方支付至目的地的运费，风险在交承运人时转移。",
    transport: "任何方式"
  },
  {
    code: "CIP",
    enName: "Carriage and Insurance Paid To",
    cnName: "运费和保险费付至",
    riskTransfer: "货物交付第一承运人时风险转移（保险由卖方投保）。",
    costSplit: "卖方支付运费与保险费至目的地，风险在交承运人时转移。",
    transport: "任何方式"
  },
  {
    code: "DAP",
    enName: "Delivered At Place",
    cnName: "目的地交货",
    riskTransfer: "货物在指定目的地交付买方处置时风险转移。",
    costSplit: "卖方承担全程运费与风险，但不负责进口清关与税费。",
    transport: "任何方式"
  },
  {
    code: "DPU",
    enName: "Delivered At Place Unloaded",
    cnName: "目的地卸货交货",
    riskTransfer: "货物在目的地卸货后交付买方处置时风险转移。",
    costSplit: "卖方承担运费、风险及卸货费用，不负责进口清关与税费。",
    transport: "任何方式"
  },
  {
    code: "DDP",
    enName: "Delivered Duty Paid",
    cnName: "完税后交货",
    riskTransfer: "货物在目的地完成进口清关后交付时风险转移。",
    costSplit: "卖方承担全程运费、风险及进口税费，责任最重。",
    transport: "任何方式"
  }
];
const incotermOptionLabel = (it) => `${it.code} - ${it.cnName}`;
const findIncoterm = (code) => INCOTERMS_2020.find((it) => it.code === (code || "").trim().toUpperCase());
const IncotermsField = ({
  label = "贸易条款",
  value,
  onChange,
  freeSolo = true,
  required = false,
  fullWidth = true,
  placeholder = "选择 Incoterms 2020 术语，或输入自定义贸易条件",
  showDescription = true,
  size = "small",
  inputProps
}) => {
  const selected = reactExports.useMemo(() => findIncoterm(value), [value]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Autocomplete,
      {
        size,
        freeSolo,
        options: INCOTERMS_2020,
        getOptionLabel: (opt) => typeof opt === "string" ? opt : incotermOptionLabel(opt),
        value: value || "",
        onChange: (_, v) => {
          if (typeof v === "string") onChange(v);
          else if (v && typeof v === "object") onChange(v.code);
          else onChange("");
        },
        onInputChange: (_, text) => onChange(text),
        filterOptions: (opts, state) => {
          const q = state.inputValue.trim().toUpperCase();
          if (!q) return opts;
          return opts.filter(
            (o) => o.code.includes(q) || o.cnName.includes(state.inputValue.trim()) || o.enName.toUpperCase().includes(q)
          );
        },
        renderOption: (props, opt) => /* @__PURE__ */ reactExports.createElement("li", { ...props, key: opt.code }, /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: "column", py: 0.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 600, children: [
            opt.code,
            " - ",
            opt.cnName
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: opt.riskTransfer })
        ] })),
        renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            ...params,
            label,
            placeholder,
            required,
            fullWidth,
            inputProps: { ...params.inputProps, ...inputProps }
          }
        )
      }
    ),
    showDescription && selected && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Paper,
      {
        variant: "outlined",
        sx: { mt: 1, p: 1.25, bgcolor: "background.default", borderColor: "divider" },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "primary", label: selected.code }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: selected.cnName }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
              "（",
              selected.enName,
              " · ",
              selected.transport,
              "）"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "flex-start", gap: 0.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, { fontSize: "small", color: "action", sx: { mt: 0.2 } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { lineHeight: 1.5 }, children: selected.costSplit })
          ] })
        ]
      }
    )
  ] });
};
const QUALITY_STANDARDS = [
  { code: "GB", cnName: "中国国家标准（强制）", description: "中华人民共和国强制性国家标准，必须执行。", domain: "全行业" },
  { code: "GB/T", cnName: "中国国家标准（推荐）", description: "中华人民共和国推荐性国家标准，鼓励采用。", domain: "全行业" },
  { code: "GBJ", cnName: "国家军用标准", description: "中华人民共和国国家军用标准（GJB）。", domain: "军工" },
  { code: "ASTM", cnName: "美国材料与试验协会标准", description: "ASTM International 材料、制品、系统与服务的标准。", domain: "材料/金属/化工" },
  { code: "JIS", cnName: "日本工业标准", description: "Japanese Industrial Standards，日本国家级工业标准。", domain: "制造/电子/材料" },
  { code: "ISO", cnName: "国际标准化组织标准", description: "International Organization for Standardization 管理体系与产品标准（如 ISO 9001）。", domain: "管理体系/通用" },
  { code: "EN", cnName: "欧洲标准", description: "European Norm，欧盟协调标准。", domain: "出口欧盟" },
  { code: "DIN", cnName: "德国工业标准", description: "Deutsches Institut für Normung，德国国家标准。", domain: "机械/制造" },
  { code: "企标", cnName: "企业标准", description: "企业内部制定的严于国标/行标的技术要求。", domain: "定制化产品" },
  { code: "客标", cnName: "客户指定标准", description: "按客户技术协议/规格书执行的质量要求。", domain: "按订单" }
];
const qualityOptionLabel = (q) => `${q.code} - ${q.cnName}`;
const findQualityStandard = (code) => QUALITY_STANDARDS.find((q) => q.code === (code || "").trim());
const QualityStandardField = ({
  label = "质量标准",
  value,
  onChange,
  freeSolo = true,
  required = false,
  fullWidth = true,
  placeholder = "选择质量标准，或输入自定义要求",
  showDescription = true,
  size = "small",
  inputProps
}) => {
  const selected = reactExports.useMemo(() => findQualityStandard(value), [value]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Autocomplete,
      {
        size,
        freeSolo,
        options: QUALITY_STANDARDS,
        getOptionLabel: (opt) => typeof opt === "string" ? opt : qualityOptionLabel(opt),
        value: value || "",
        onChange: (_, v) => {
          if (typeof v === "string") onChange(v);
          else if (v && typeof v === "object") onChange(v.code);
          else onChange("");
        },
        onInputChange: (_, text) => onChange(text),
        renderOption: (props, opt) => /* @__PURE__ */ reactExports.createElement("li", { ...props, key: opt.code }, /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: "column", py: 0.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 600, children: [
            opt.code,
            " - ",
            opt.cnName
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: opt.description })
        ] })),
        renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            ...params,
            label,
            placeholder,
            required,
            fullWidth,
            inputProps: { ...params.inputProps, ...inputProps }
          }
        )
      }
    ),
    showDescription && selected && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Paper,
      {
        variant: "outlined",
        sx: { mt: 1, p: 1.25, bgcolor: "background.default", borderColor: "divider" },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5, mb: 0.25 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "secondary", label: selected.code }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: selected.cnName })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { lineHeight: 1.5 }, children: selected.description })
        ]
      }
    )
  ] });
};
const SalesOrderForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const materials = useMaterialStore((s) => s.materials);
  const { salesOrders, addSalesOrder, updateSalesOrder, projects } = useSalesStore();
  const customers = useCustomerStore((s) => s.customers);
  const applyCreditDelta = useCustomerStore((s) => s.applyCreditDelta);
  const existingOrder = reactExports.useMemo(
    () => id ? salesOrders.find((o) => o.id === id) : null,
    [id, salesOrders]
  );
  const [customerName, setCustomerName] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.customerName) || "");
  const [customerCode, setCustomerCode] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.customerCode) || "");
  const [selectedCustomer, setSelectedCustomer] = reactExports.useState(() => {
    if (!existingOrder) return null;
    if (existingOrder.customerId) return customers.find((c) => c.id === existingOrder.customerId) || null;
    return customers.find((c) => c.name === existingOrder.customerName) || null;
  });
  const [contactName, setContactName] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.contactName) || "");
  const [contactPhone, setContactPhone] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.contactPhone) || "");
  const [orderType, setOrderType] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.type) || "standard");
  const [orderDate, setOrderDate] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.orderDate) || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.expectedDeliveryDate) || "");
  const [paymentTerms, setPaymentTerms] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.paymentTerms) || "预付30%，货到60%，验收后10%");
  const [deliveryAddress, setDeliveryAddress] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.deliveryAddress) || "");
  const [tradeTerms, setTradeTerms] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.tradeTerms) || "");
  const [qualityStandard, setQualityStandard] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.qualityStandard) || "GB/T");
  const [attachments, setAttachments] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.attachments) || []);
  const [shipToAddress, setShipToAddress] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.shipToAddress) || "");
  const [salesPerson, setSalesPerson] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.salesPerson) || "陈伟");
  const [taxRate, setTaxRate] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.taxRate) ?? 13);
  const [remarks, setRemarks] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.remarks) || "");
  const [shippingMode, setShippingMode] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.shippingMode) || "standard");
  const [directShipVendorId, setDirectShipVendorId] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.directShipVendorId) || "");
  const [directShipVendorName, setDirectShipVendorName] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.directShipVendorName) || "");
  const [thirdPartyCompanyName, setThirdPartyCompanyName] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.thirdPartyCompanyName) || "");
  const vendorStore = useVendorStore();
  const vendorOptions = vendorStore.vendors.map((v) => ({ id: v.id, name: v.name, code: v.code }));
  const [projectId, setProjectId] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.projectId) || "");
  const [projectNo, setProjectNo] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.projectNo) || "");
  const [projectName, setProjectName] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.projectName) || "");
  const [items, setItems] = reactExports.useState(() => {
    if (!existingOrder) return [];
    return existingOrder.items.map((item) => ({
      id: item.id,
      materialId: item.materialId,
      materialCode: item.materialCode || "",
      materialName: item.materialName || "",
      specification: item.specification || "",
      unit: item.unit || "件",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
      deliveryDate: item.deliveryDate || ""
    }));
  });
  const materialOptions = materials.map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    specification: m.specification || "",
    unit: m.unit,
    price: m.price
  }));
  const projectOptions = projects.map((p) => ({
    id: p.id,
    projectNo: p.projectNo,
    projectName: p.projectName,
    customerName: p.customerName
  }));
  const computeRow = (row) => {
    const qty = Number(row.quantity) || 0;
    const price = Number(row.unitPrice) || 0;
    return { ...row, amount: qty * price };
  };
  const handleMaterialPricing = (rowId, materialId) => {
    var _a;
    const mat = materials.find((m) => m.id === materialId);
    if (!mat) return {};
    const qty = ((_a = items.find((r) => r.id === rowId)) == null ? void 0 : _a.quantity) || 1;
    const resolved = useSalesPriceStore.getState().resolvePrice(selectedCustomer == null ? void 0 : selectedCustomer.id, materialId, qty, mat.price);
    return { unitPrice: resolved.unitPrice };
  };
  const soColumns = [
    { key: "materialCode", label: "物料编码", materialRole: "code", fillFromMaterial: "code", width: 150, fixed: true },
    { key: "materialName", label: "物料名称", materialRole: "name", fillFromMaterial: "name", width: 200, fixed: true },
    { key: "specification", label: "规格", fillFromMaterial: "specification", width: 160, hideable: true },
    { key: "unit", label: "单位", fillFromMaterial: "unit", width: 70, hideable: true },
    { key: "quantity", label: "数量", type: "number", align: "right", width: 100, min: 1, step: 1 },
    { key: "unitPrice", label: "单价", type: "number", align: "right", width: 120, min: 0, step: 0.01 },
    { key: "amount", label: "金额", type: "readonly", align: "right", width: 120 },
    { key: "deliveryDate", label: "交期", type: "date", width: 150, hideable: true }
  ];
  const makeNewRow = () => ({
    id: "",
    materialId: "",
    materialCode: "",
    materialName: "",
    specification: "",
    unit: "件",
    quantity: 1,
    unitPrice: 0,
    amount: 0,
    deliveryDate: ""
  });
  const handleProjectSelect = (project) => {
    if (project) {
      setProjectId(project.id);
      setProjectNo(project.projectNo);
      setProjectName(project.projectName);
      setCustomerName(project.customerName);
      const matched = customers.find((c) => c.name === project.customerName);
      if (matched) {
        setSelectedCustomer(matched);
        setCustomerCode(matched.code);
        setContactName(matched.contactName || "");
        setContactPhone(matched.contactPhone || "");
      }
    } else {
      setProjectId("");
      setProjectNo("");
      setProjectName("");
    }
  };
  const handleCustomerSelect = (c) => {
    setSelectedCustomer(c);
    if (c) {
      setCustomerName(c.name);
      setCustomerCode(c.code);
      setContactName(c.contactName || "");
      setContactPhone(c.contactPhone || "");
    }
  };
  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
  const taxAmount = subtotal * taxRate / 100;
  const grandTotal = subtotal + taxAmount;
  const buildPrintRecord = () => ({
    orderNo: (existingOrder == null ? void 0 : existingOrder.orderNo) || "(尚未保存)",
    customerName,
    customerCode,
    orderDate,
    expectedDeliveryDate,
    paymentTerms,
    tradeTerms,
    qualityStandard,
    salesPerson,
    projectName,
    grandTotal,
    remarks,
    items: items.map((it) => ({
      materialCode: it.materialCode,
      materialName: it.materialName,
      specification: it.specification,
      unit: it.unit,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      amount: it.amount,
      deliveryDate: it.deliveryDate
    }))
  });
  const handleSave = () => {
    const formData = {
      customerId: (selectedCustomer == null ? void 0 : selectedCustomer.id) || (existingOrder == null ? void 0 : existingOrder.customerId),
      customerName,
      customerCode,
      contactName,
      contactPhone,
      type: orderType,
      orderDate,
      expectedDeliveryDate,
      paymentTerms,
      deliveryAddress,
      tradeTerms,
      qualityStandard,
      shipToAddress,
      salesPerson,
      taxRate,
      remarks,
      projectId,
      projectNo,
      projectName,
      items,
      subtotal,
      taxAmount,
      grandTotal,
      attachments,
      shippingMode,
      directShipVendorId,
      directShipVendorName,
      thirdPartyCompanyName,
      // B1：草稿态不占用客户信用
      creditOccupied: false,
      creditAmount: 0
    };
    if (isEditMode && existingOrder) {
      const occupiedAmt = existingOrder.creditOccupied ? existingOrder.creditAmount ?? existingOrder.grandTotal ?? 0 : existingOrder.status !== "draft" && existingOrder.customerId ? existingOrder.grandTotal ?? 0 : 0;
      if (occupiedAmt > 0 && existingOrder.customerId) {
        applyCreditDelta(existingOrder.customerId, -occupiedAmt);
      }
    }
    if (isEditMode) {
      updateSalesOrder(id, { ...formData, status: "draft" });
    } else {
      addSalesOrder({ ...formData, id: `so-${Date.now()}`, orderNo: `SO-${Date.now()}`, status: "draft" });
    }
    navigate("/sales/orders");
  };
  const [creditError, setCreditError] = reactExports.useState("");
  const handleSubmit = () => {
    setCreditError("");
    if (!selectedCustomer) {
      setCreditError("请选择客户主数据（须为「客户列表」中的正式客户）。");
      return;
    }
    if (!customerName.trim()) {
      alert("请输入客户名称");
      return;
    }
    if (items.length === 0) {
      alert("请添加至少一项物料");
      return;
    }
    const limit = selectedCustomer.creditLimit;
    if (limit != null) {
      const used = selectedCustomer.usedCredit || 0;
      const prevAmount = isEditMode && (existingOrder == null ? void 0 : existingOrder.customerId) === selectedCustomer.id ? existingOrder.creditOccupied ? existingOrder.creditAmount ?? existingOrder.grandTotal ?? 0 : existingOrder.status !== "draft" ? existingOrder.grandTotal || 0 : 0 : 0;
      const effectiveAvailable = limit - used + prevAmount;
      if (grandTotal > effectiveAvailable + 5e-3) {
        setCreditError(
          `客户「${selectedCustomer.name}」信用额度不足：订单含税金额 ${formatCurrency(grandTotal)} 已超过可用额度 ${formatCurrency(Math.max(0, effectiveAvailable))}，禁止提交。`
        );
        return;
      }
    }
    const formData = {
      customerId: selectedCustomer.id,
      customerName,
      customerCode,
      contactName,
      contactPhone,
      type: orderType,
      orderDate,
      expectedDeliveryDate,
      paymentTerms,
      deliveryAddress,
      tradeTerms,
      qualityStandard,
      shipToAddress,
      salesPerson,
      taxRate,
      remarks,
      projectId,
      projectNo,
      projectName,
      items,
      subtotal,
      taxAmount,
      grandTotal,
      attachments,
      shippingMode,
      directShipVendorId,
      directShipVendorName,
      thirdPartyCompanyName,
      // B1：记录占用标记与占用金额快照（与采购订单对称，供删除时精确释放）
      creditOccupied: true,
      creditAmount: grandTotal
    };
    if (isEditMode && existingOrder) {
      const prevId = existingOrder.customerId;
      const prevAmt = existingOrder.creditOccupied ? existingOrder.creditAmount ?? existingOrder.grandTotal ?? 0 : existingOrder.status !== "draft" ? existingOrder.grandTotal || 0 : 0;
      if (prevId && prevId === selectedCustomer.id) {
        applyCreditDelta(selectedCustomer.id, grandTotal - prevAmt);
      } else {
        if (prevId) applyCreditDelta(prevId, -prevAmt);
        applyCreditDelta(selectedCustomer.id, grandTotal);
      }
      updateSalesOrder(id, { ...formData, status: "confirmed" });
    } else {
      applyCreditDelta(selectedCustomer.id, grandTotal);
      addSalesOrder({ ...formData, id: `so-${Date.now()}`, orderNo: `SO-${Date.now()}`, status: "confirmed" });
    }
    navigate("/sales/orders");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: isEditMode ? `修改销售订单${existingOrder ? " - " + existingOrder.orderNo : ""}` : "新建销售订单",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}), onClick: () => navigate("/sales/orders"), children: "返回" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          PrintPreviewButton,
          {
            entity: "salesOrder",
            record: buildPrintRecord(),
            showBoth: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleSave, children: "暂存" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, {}), onClick: handleSubmit, children: isEditMode ? "保存修改" : "提交订单" })
      ] }),
      children: [
        creditError && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "error", "data-testid": "so-credit-error", sx: { mb: 2 }, onClose: () => setCreditError(""), children: creditError }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "订单基本信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Autocomplete,
              {
                options: projectOptions,
                getOptionLabel: (opt) => `${opt.projectName} (${opt.projectNo})`,
                value: projectOptions.find((p) => p.id === projectId) || null,
                onChange: (_, v) => handleProjectSelect(v),
                renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, label: "关联项目", placeholder: "选择或搜索项目" }),
                noOptionsText: "未找到匹配项目"
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TextField, { select: true, fullWidth: true, label: "订单类型", value: orderType, onChange: (e) => setOrderType(e.target.value), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "standard", children: "标准订单" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "sample", children: "样品订单" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "maintenance", children: "维修订单" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "订单日期",
                type: "date",
                value: orderDate,
                onChange: (e) => setOrderDate(e.target.value),
                InputLabelProps: { shrink: true }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Autocomplete,
              {
                options: customers,
                getOptionLabel: (c) => `${c.name} (${c.code})`,
                value: selectedCustomer,
                onChange: (_, v) => handleCustomerSelect(v),
                renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, label: "客户主数据", placeholder: "选择或搜索客户", required: true, inputProps: { ...params.inputProps, "data-testid": "so-customer-input" } }),
                isOptionEqualToValue: (o, v) => o.id === v.id,
                noOptionsText: "未找到匹配客户"
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "客户编码", value: customerCode, disabled: true }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "销售员",
                value: salesPerson,
                onChange: (e) => setSalesPerson(e.target.value)
              }
            ) }),
            selectedCustomer && selectedCustomer.creditLimit != null && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: selectedCustomer.usedCredit && selectedCustomer.creditLimit - (selectedCustomer.usedCredit || 0) <= 0 ? "warning" : "info", sx: { mb: 0 }, children: [
              "客户「",
              selectedCustomer.name,
              "」授信 ",
              formatCurrency(selectedCustomer.creditLimit),
              "， 已用 ",
              formatCurrency(selectedCustomer.usedCredit || 0),
              "， 可用 ",
              formatCurrency(Math.max(0, (selectedCustomer.creditLimit || 0) - (selectedCustomer.usedCredit || 0)))
            ] }) }),
            projectName && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 0 }, children: [
              "关联项目：",
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: projectNo }),
              " — ",
              projectName
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "联系人",
                value: contactName,
                onChange: (e) => setContactName(e.target.value)
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "联系电话",
                value: contactPhone,
                onChange: (e) => setContactPhone(e.target.value)
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "预计交期",
                type: "date",
                value: expectedDeliveryDate,
                onChange: (e) => setExpectedDeliveryDate(e.target.value),
                InputLabelProps: { shrink: true }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "税率(%)",
                type: "number",
                value: taxRate,
                onChange: (e) => setTaxRate(Number(e.target.value)),
                inputProps: { min: 0, max: 100 }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "付款条件",
                value: paymentTerms,
                onChange: (e) => setPaymentTerms(e.target.value)
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "交货地址",
                value: deliveryAddress,
                onChange: (e) => setDeliveryAddress(e.target.value),
                multiline: true,
                rows: 2
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              IncotermsField,
              {
                label: "贸易条款",
                value: tradeTerms,
                onChange: setTradeTerms,
                required: true,
                inputProps: { "data-testid": "so-trade-terms" }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              QualityStandardField,
              {
                label: "质量标准",
                value: qualityStandard,
                onChange: setQualityStandard,
                inputProps: { "data-testid": "so-quality-standard" }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "送达方地址",
                value: shipToAddress,
                onChange: (e) => setShipToAddress(e.target.value),
                multiline: true,
                rows: 2,
                inputProps: { "data-testid": "so-ship-to" }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "备注", value: remarks, onChange: (e) => setRemarks(e.target.value), multiline: true, rows: 2 }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              TextField,
              {
                select: true,
                fullWidth: true,
                label: "发货方式",
                value: shippingMode,
                onChange: (e) => setShippingMode(e.target.value),
                inputProps: { "data-testid": "so-shipping-mode" },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "standard", children: "标准发货" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "direct_ship", children: "直接发运（供应商直发客户）" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "third_party", children: "三方销售" })
                ]
              }
            ) }),
            shippingMode === "direct_ship" && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Autocomplete,
              {
                options: vendorOptions,
                getOptionLabel: (opt) => `${opt.name} (${opt.code})`,
                value: vendorOptions.find((v) => v.id === directShipVendorId) || null,
                onChange: (_, v) => {
                  setDirectShipVendorId((v == null ? void 0 : v.id) || "");
                  setDirectShipVendorName((v == null ? void 0 : v.name) || "");
                },
                renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, label: "直发供应商", placeholder: "选择供应商", inputProps: { ...params.inputProps, "data-testid": "so-direct-vendor" } }),
                noOptionsText: "未找到匹配供应商",
                isOptionEqualToValue: (o, v) => o.id === v.id
              }
            ) }),
            shippingMode === "third_party" && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "第三方公司名称",
                value: thirdPartyCompanyName,
                onChange: (e) => setThirdPartyCompanyName(e.target.value),
                placeholder: "请输入第三方公司名称",
                inputProps: { "data-testid": "so-third-party-name" }
              }
            ) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          MaterialLineItemsGrid,
          {
            columns: soColumns,
            value: items,
            onChange: (rows) => setItems(rows),
            materials: materialOptions,
            onMaterialChange: handleMaterialPricing,
            computeRow,
            newRow: makeNewRow,
            storageKey: "ssa-so-material-columns",
            addLabel: "添加物料",
            testIdPrefix: "so",
            emptyHint: "请从下方「添加物料」录入，或直接从 Excel 复制多行后粘贴到任意单元格（物料编码/名称可自动匹配）。",
            footer: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 0.5, alignItems: "flex-end", px: 1, mt: 1, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                "不含税金额：",
                formatCurrency(subtotal)
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                "税额(",
                taxRate,
                "%)：",
                formatCurrency(taxAmount)
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 700, color: "primary", children: [
                "含税总额：",
                formatCurrency(grandTotal)
              ] })
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          AttachmentUploader,
          {
            label: "附件上传（合同 / 技术协议 / 图纸）",
            value: attachments,
            onChange: setAttachments,
            hint: "支持上传签订的合同、技术协议、图纸等；可上传多个文件，点击删除可移除。"
          }
        ) })
      ]
    }
  );
};
export {
  SalesOrderForm as default
};
