import { h as useNavigate, n as useParams, r as reactExports, o as useSearchParams, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { a as useVendorStore, e as useSalesStore, u as useMaterialStore, b as usePurchaseStore, D as DEFAULT_TAX_RATE, z as calcTaxTotals, k as useCustomFieldStore, A as calcLineTax } from "./index-hTLNcGoC.js";
import { F as FlowTracker } from "./FlowTracker-BvV1jEfP.js";
import { C as CustomFieldsSection } from "./CustomFieldsSection-C9Cceb1I.js";
import { f as formatCurrency } from "./format-BXPn3erM.js";
import { M as MaterialLineItemsGrid } from "./MaterialLineItemsGrid-ClgE8gpx.js";
import { P as PrintPreviewButton } from "./PrintPreviewButton-DI-UifA3.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { R as ResponsiblePersons } from "./ResponsiblePersons-CZkl9-1x.js";
import { u as usePriceStore } from "./priceStore-D4MzJqWs.js";
import { u as usePurchaseInfoRecordStore } from "./purchaseInfoRecordStore-BlIKCtxc.js";
import { g as getActiveSourcesByVendor } from "./sourceListStore-Z5_JkzNu.js";
import { u as useOrderTemplateStore } from "./reportPermissionStore-BsrP4O9H.js";
import { u as useDataDictStore } from "./dataDictStore-RUHQ7-st.js";
import { u as useFinanceExtensionStore, g as getExchangeRate } from "./financeExtensionStore-mnFIWL7o.js";
import { u as useNumberingStore } from "./numberingStore-BLNwdXfi.js";
import { C as CURRENCY_OPTIONS, c as TAX_RATE_OPTIONS } from "./options-BINuI5Gr.js";
import { bl as Alert, aS as Paper, T as Typography, m as Box, bL as Stack, aO as Chip, bm as Button, dC as FormLabel, dD as RadioGroup, cM as FormControlLabel, dE as Radio, bY as Grid, bv as TextField, cC as Autocomplete, aR as MenuItem, dF as AweIcon, bZ as ArrowBack, bd as Save, bw as Send, p as Tooltip, aM as IconButton } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
import "./PrintPreview-Dx9G1wxr.js";
import "./customerStore-BnoPAbgi.js";
import "./salesPriceStore-BQbM-EvA.js";
import "./conditionStore-DfnsSgER.js";
import "./bomStore-CeDOOVVk.js";
import "./productionStore-B8YnWPVr.js";
import "./productionOperationStore-CgIZnQhb.js";
import "./productionVersionStore-DVtUQpzp.js";
import "./subcontractStore-1iUXGTXR.js";
import "./equipmentStore-CosVhg2a.js";
import "./productionSchedulingStore-Bp1AedW2.js";
import "./vendorPerformanceStore-C5Wb2oBo.js";
import "./vendorPortalStore-9Kht_MGK.js";
import "./warehouseMasterStore-Lmmy-9XL.js";
import "./salesAdvancedStore-I173FqHq.js";
import "./purchaseAdvancedStore-j0gpV4PI.js";
import "./warehouseAdvancedStore-DGJOwep4.js";
import "./qualityAdvancedStore-DzVT3ddD.js";
import "./vendorRating-DKHWnbxs.js";
import "./materialExtensionStore-L3lHbzSm.js";
import "./qualityExtensionStore-CpmmvoMW.js";
import "./analyticsStore-Ci4UuBPH.js";
import "./arapStore-BN8EGkkl.js";
import "./workbenchStore-vCZX2zeS.js";
import "./ecnStore-JtBcJJ-e.js";
import "./rebateStore-CMmNfEnQ.js";
import "./fmeaStore-DSfTzw2E.js";
import "./CategoryList-BiXjmJ7_.js";
import "./DataTable-BBJNxQ8l.js";
import "./StatusBadge-D9w6gqgZ.js";
import "./vendor-table-l-0Px9iQ.js";
import "./ConfirmDialog-BAhqBvAF.js";
const recalcLine = (item, taxIncl) => {
  const r = calcLineTax({
    quantity: item.quantity,
    price: taxIncl ? item.priceWithTax || 0 : item.unitPrice || 0,
    taxRate: item.taxRate,
    taxIncluded: taxIncl
  });
  return {
    ...item,
    unitPrice: r.unitPrice,
    amount: r.amount,
    taxRate: r.taxRate,
    taxAmount: r.taxAmount,
    priceWithTax: r.priceWithTax,
    amountWithTax: r.amountWithTax
  };
};
const buildLineFromNetPrice = (quantity, netPrice, taxRate) => {
  const r = calcLineTax({ quantity, price: netPrice, taxRate, taxIncluded: false });
  return {
    unitPrice: r.unitPrice,
    amount: r.amount,
    taxRate: r.taxRate,
    taxAmount: r.taxAmount,
    priceWithTax: r.priceWithTax,
    amountWithTax: r.amountWithTax
  };
};
const OrderForm = () => {
  var _a, _b;
  const { vendors, applyVendorCreditDelta, checkVendorCredit, checkVendorBlacklist } = useVendorStore();
  const { priceList } = usePriceStore();
  const { projects } = useSalesStore();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const materials = useMaterialStore((s) => s.materials);
  const { purchaseOrders, purchaseRequests, addPurchaseOrder, updatePurchaseOrder, updatePurchaseRequest } = usePurchaseStore();
  const nextNo = useNumberingStore((s) => s.nextNo);
  const existingOrder = reactExports.useMemo(
    () => id ? purchaseOrders.find((o) => o.id === id) : null,
    [id, purchaseOrders]
  );
  const [searchParams] = useSearchParams();
  const fromRequestIds = reactExports.useMemo(() => {
    const raw = searchParams.get("fromRequests");
    if (!raw) return [];
    return raw.split(",").filter(Boolean);
  }, [searchParams]);
  const sourceRequests = reactExports.useMemo(
    () => fromRequestIds.length > 0 ? purchaseRequests.filter((r) => fromRequestIds.includes(r.id)) : [],
    [fromRequestIds, purchaseRequests]
  );
  const isConvertMode = fromRequestIds.length > 0 && sourceRequests.length > 0;
  const purchaseType = reactExports.useMemo(() => {
    var _a2;
    if (existingOrder == null ? void 0 : existingOrder.purchaseType) return existingOrder.purchaseType;
    if (isConvertMode) return ((_a2 = sourceRequests[0]) == null ? void 0 : _a2.type) || "material";
    return "material";
  }, [existingOrder, isConvertMode, sourceRequests]);
  const isServiceOrder = purchaseType === "service";
  const [orderMode, setOrderMode] = reactExports.useState(
    (existingOrder == null ? void 0 : existingOrder.orderMode) || "standard"
  );
  const [vendorId, setVendorId] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.vendorId) || "");
  const [title, setTitle] = reactExports.useState(() => {
    if (existingOrder) return `${existingOrder.vendorName} - 采购订单`;
    if (isConvertMode) {
      const firstReq = sourceRequests[0];
      return `采购订单 - ${firstReq.title}`;
    }
    return "";
  });
  const [paymentTerms, setPaymentTerms] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.paymentTerms) || "");
  const [tradeTerms, setTradeTerms] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.tradeTerms) || "");
  const [currency, setCurrency] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.currency) || "CNY");
  const [taxIncluded, setTaxIncluded] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.taxIncluded) ?? false);
  const [headerTaxRate, setHeaderTaxRate] = reactExports.useState(
    ((_b = (_a = existingOrder == null ? void 0 : existingOrder.items) == null ? void 0 : _a[0]) == null ? void 0 : _b.taxRate) ?? DEFAULT_TAX_RATE
  );
  const [deliveryTerms, setDeliveryTerms] = reactExports.useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = reactExports.useState(() => {
    var _a2;
    if (existingOrder == null ? void 0 : existingOrder.expectedDeliveryDate) return existingOrder.expectedDeliveryDate;
    if (isConvertMode) return ((_a2 = sourceRequests[0]) == null ? void 0 : _a2.expectedDate) || "";
    return "";
  });
  const [remarks, setRemarks] = reactExports.useState((existingOrder == null ? void 0 : existingOrder.remarks) || "");
  const [serviceDescription, setServiceDescription] = reactExports.useState(() => {
    var _a2;
    if (existingOrder == null ? void 0 : existingOrder.remarks) return existingOrder.remarks;
    if (isConvertMode) return ((_a2 = sourceRequests[0]) == null ? void 0 : _a2.remarks) || "";
    return "";
  });
  const [projectNo, setProjectNo] = reactExports.useState(() => {
    var _a2;
    if (existingOrder == null ? void 0 : existingOrder.projectNo) return existingOrder.projectNo;
    if (isConvertMode) return ((_a2 = sourceRequests[0]) == null ? void 0 : _a2.projectNo) || "";
    return "";
  });
  const [projectName, setProjectName] = reactExports.useState(() => {
    var _a2;
    if (existingOrder == null ? void 0 : existingOrder.projectName) return existingOrder.projectName;
    if (isConvertMode) return ((_a2 = sourceRequests[0]) == null ? void 0 : _a2.projectName) || "";
    return "";
  });
  const getPriceOptions = (materialId) => {
    return priceList.filter(
      (p) => p.materialId === materialId && p.status === "active" && (!p.expiryDate || p.expiryDate >= (/* @__PURE__ */ new Date()).toISOString().split("T")[0])
    ).sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  };
  const [items, setItems] = reactExports.useState(() => {
    if (existingOrder) {
      return existingOrder.items.map((item) => ({
        id: item.id,
        materialId: item.materialId,
        materialCode: item.materialCode || "",
        materialName: item.materialName || "",
        specification: item.specification || "",
        unit: item.unit || "件",
        quantity: item.orderedQuantity,
        ...buildLineFromNetPrice(item.orderedQuantity, item.unitPrice, item.taxRate ?? DEFAULT_TAX_RATE),
        vendorId: existingOrder.vendorId,
        vendorName: existingOrder.vendorName || "",
        expectedDeliveryDate: existingOrder.expectedDeliveryDate
      }));
    }
    if (isConvertMode) {
      let itemIdx = 0;
      const orderItems = [];
      sourceRequests.forEach((req) => {
        req.items.forEach((reqItem) => {
          const material = materials.find((m) => m.id === reqItem.materialId);
          const priceOpts = material ? getPriceOptions(material.id) : [];
          const bestPrice = priceOpts.length > 0 ? priceOpts[0].unitPrice : reqItem.estimatedPrice || 0;
          orderItems.push({
            id: `oi-convert-${itemIdx}`,
            materialId: reqItem.materialId,
            materialCode: (material == null ? void 0 : material.code) || reqItem.materialCode || "",
            materialName: (material == null ? void 0 : material.name) || reqItem.materialName || "",
            specification: (material == null ? void 0 : material.specification) || reqItem.specification || "",
            unit: (material == null ? void 0 : material.unit) || reqItem.unit || "件",
            quantity: reqItem.quantity,
            ...buildLineFromNetPrice(reqItem.quantity, bestPrice, DEFAULT_TAX_RATE),
            vendorId: "",
            vendorName: "",
            sourcePriceItemId: priceOpts.length > 0 ? priceOpts[0].id : void 0,
            expectedDeliveryDate: reqItem.deliveryDate || ""
          });
          itemIdx++;
        });
      });
      return orderItems;
    }
    return [];
  });
  const poCategoryIds = reactExports.useMemo(() => {
    const ids = /* @__PURE__ */ new Set();
    items.forEach((it) => {
      if (it.materialId) {
        const m = materials.find((mm) => mm.id === it.materialId);
        if (m == null ? void 0 : m.categoryId) ids.add(m.categoryId);
      }
    });
    return [...ids];
  }, [items, materials]);
  const [errors, setErrors] = reactExports.useState({});
  const [customFields, setCustomFields] = reactExports.useState(
    (existingOrder == null ? void 0 : existingOrder.customFields) || {}
  );
  const vendorOptions = reactExports.useMemo(
    () => vendors.map((v) => ({ id: v.id, name: v.name })),
    []
  );
  const tradeTermOptions = useDataDictStore((s) => s.tradeTerms);
  const exchangeRates = useFinanceExtensionStore((s) => s.exchangeRates);
  const exchangeRate = reactExports.useMemo(() => getExchangeRate(currency, exchangeRates), [currency, exchangeRates]);
  const orderTemplates = useOrderTemplateStore((s) => s.templates);
  const [selectedTemplate, setSelectedTemplate] = reactExports.useState(null);
  const [showTemplateSelect, setShowTemplateSelect] = reactExports.useState(!isEditMode && orderTemplates.length > 0);
  const handleApplyTemplate = (template) => {
    setSelectedTemplate(template);
    setVendorId(template.vendorId || "");
    setTitle(template.title || "");
    setPaymentTerms(template.paymentTerms || "");
    setTradeTerms(template.tradeTerms || "");
    setDeliveryTerms(template.deliveryTerms || "");
    setRemarks(template.remarks || "");
    setExpectedDeliveryDate(template.expectedDeliveryDate || "");
    if (template.items && template.items.length > 0) {
      setItems(template.items.map((item) => ({
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        materialId: item.materialId || "",
        materialCode: item.materialCode || "",
        materialName: item.materialName || "",
        specification: item.specification || "",
        unit: item.unit || "件",
        quantity: item.quantity || 1,
        ...buildLineFromNetPrice(item.quantity || 1, item.unitPrice || 0, item.taxRate ?? headerTaxRate),
        vendorId: template.vendorId || "",
        vendorName: template.vendorName || ""
      })));
    }
  };
  const { totalAmount, totalTaxAmount, grandTotal } = reactExports.useMemo(() => calcTaxTotals(items), [items]);
  const creditAmount = reactExports.useMemo(() => grandTotal || totalAmount || 0, [grandTotal, totalAmount]);
  const prevCredit = reactExports.useMemo(() => {
    if (!isEditMode || !(existingOrder == null ? void 0 : existingOrder.creditOccupied)) return { vendorId: "", amount: 0 };
    return { vendorId: existingOrder.vendorId, amount: existingOrder.creditAmount ?? 0 };
  }, [isEditMode, existingOrder]);
  const blacklistInfo = reactExports.useMemo(() => {
    if (!vendorId) return null;
    const bl = checkVendorBlacklist(vendorId);
    return bl.blacklisted ? bl : null;
  }, [vendorId, vendors]);
  const creditInfo = reactExports.useMemo(() => {
    if (!vendorId) return null;
    const v = vendors.find((x) => x.id === vendorId);
    if (!v) return null;
    const offset = prevCredit.vendorId === vendorId ? prevCredit.amount : 0;
    const used = Math.max(0, (v.usedCredit ?? 0) - offset);
    const limit = v.creditLimit ?? null;
    const available = limit == null ? Infinity : limit - used;
    return {
      vendorName: v.name,
      limit,
      used,
      available,
      willExceed: limit != null && creditAmount > available
    };
  }, [vendorId, vendors, prevCredit, creditAmount]);
  const sourceChips = reactExports.useMemo(() => {
    if (!vendorId) return [];
    return getActiveSourcesByVendor(vendorId).slice(0, 5).map((s) => {
      const mat = materials.find((m) => m.id === s.materialId);
      return { ...s, material: mat };
    }).filter((s) => s.material);
  }, [vendorId, materials]);
  const handleSourceChipClick = (chip) => {
    const newId = `item-src-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => {
      var _a2, _b2;
      return [...prev, {
        id: newId,
        materialId: chip.materialId,
        materialCode: chip.materialCode,
        materialName: chip.materialName,
        specification: ((_a2 = chip.material) == null ? void 0 : _a2.specification) || "",
        unit: ((_b2 = chip.material) == null ? void 0 : _b2.unit) || "件",
        quantity: 1,
        ...buildLineFromNetPrice(1, 0, headerTaxRate),
        vendorId,
        vendorName: chip.vendorName
      }];
    });
    setTimeout(() => handleMaterialChange(newId, chip.materialId), 0);
  };
  const handleHeaderTaxRateChange = (rate) => {
    setHeaderTaxRate(rate);
    setItems((prev) => prev.map((i) => recalcLine({ ...i, taxRate: rate }, taxIncluded)));
  };
  const handleTaxIncludedChange = (next) => {
    setTaxIncluded(next);
    setItems((prev) => prev.map((i) => recalcLine(i, false)));
  };
  const buildPOMaterialPatch = (materialId, effectiveVendorId, quantity) => {
    const material = materials.find((m) => m.id === materialId);
    if (!material) return {};
    const infoRecords = usePurchaseInfoRecordStore.getState().records.filter((r) => r.vendorId === effectiveVendorId && r.materialId === materialId && r.status === "active").sort((a, b) => a.unitPrice - b.unitPrice);
    const base = {
      materialId: material.id,
      materialCode: material.code,
      materialName: material.name,
      specification: material.specification || "",
      unit: material.unit,
      sourceInfoRecordId: void 0,
      sourcePriceItemId: void 0,
      leadTime: void 0
    };
    if (infoRecords.length > 0) {
      const best = infoRecords[0];
      return {
        ...base,
        ...buildLineFromNetPrice(quantity, best.unitPrice, headerTaxRate),
        vendorId: best.vendorId,
        vendorName: best.vendorName,
        sourceInfoRecordId: best.id,
        leadTime: best.leadTime
      };
    }
    const priceOpts = getPriceOptions(materialId);
    if (priceOpts.length > 0) {
      const bestPrice = priceOpts[0];
      return {
        ...base,
        ...buildLineFromNetPrice(quantity, bestPrice.unitPrice, headerTaxRate),
        vendorId: bestPrice.vendorId,
        vendorName: bestPrice.vendorName,
        sourcePriceItemId: bestPrice.id
      };
    }
    return { ...base, ...buildLineFromNetPrice(quantity, 0, headerTaxRate) };
  };
  const poMaterialOptions = materials.map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    specification: m.specification || "",
    unit: m.unit,
    price: m.price
  }));
  const handlePOMaterialPricing = (rowId, materialId) => {
    var _a2;
    return buildPOMaterialPatch(materialId, vendorId, ((_a2 = items.find((i) => i.id === rowId)) == null ? void 0 : _a2.quantity) || 1);
  };
  const computePORow = (row) => recalcLine(row, taxIncluded);
  const setRowVendor = (rowId, vId, vName, unitPrice) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== rowId) return item;
      const patch = unitPrice != null ? buildLineFromNetPrice(item.quantity, unitPrice, item.taxRate ?? headerTaxRate) : {};
      return { ...item, vendorId: vId, vendorName: vName, ...patch, sourceInfoRecordId: void 0, sourcePriceItemId: void 0 };
    }));
  };
  const poColumns = [
    { key: "materialCode", label: "物料编码", materialRole: "code", fillFromMaterial: "code", width: 130, fixed: true },
    { key: "materialName", label: "物料名称", materialRole: "name", fillFromMaterial: "name", width: 180, fixed: true },
    { key: "specification", label: "规格", fillFromMaterial: "specification", width: 140, hideable: true },
    { key: "unit", label: "单位", fillFromMaterial: "unit", width: 60, hideable: true },
    { key: "quantity", label: "数量", type: "number", align: "right", width: 80, min: 1, step: 1 },
    { key: "unitPrice", label: "未税单价", type: "number", align: "right", width: 110, min: 0, step: 0.01 },
    { key: "taxRate", label: "税率(%)", type: "number", align: "right", width: 80, min: 0, max: 100, step: 1 },
    { key: "priceWithTax", label: "含税单价", type: "number", align: "right", width: 110, min: 0, step: 0.01, hideable: true },
    { key: "amount", label: "未税金额", type: "readonly", align: "right", width: 110 },
    { key: "taxAmount", label: "税额", type: "readonly", align: "right", width: 90, hideable: true },
    { key: "amountWithTax", label: "价税合计", type: "readonly", align: "right", width: 110 },
    {
      key: "vendorId",
      label: "供应商",
      width: 230,
      renderCell: (row) => {
        const opts = row.materialId ? getVendorOptionsForMaterial(row.materialId) : [];
        const cur = opts.find((v) => v.id === row.vendorId) || null;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Autocomplete,
            {
              size: "small",
              options: opts,
              getOptionLabel: (o) => `${o.name} (${formatCurrency(o.unitPrice)})`,
              value: cur,
              onChange: (_, nv) => {
                if (nv) setRowVendor(row.id, nv.id, nv.name, nv.unitPrice);
              },
              renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, placeholder: "选择供应商" }),
              isOptionEqualToValue: (o, v) => o.id === v.id,
              noOptionsText: "该物料暂无有效价目表",
              sx: { minWidth: 200 }
            }
          ),
          row.sourceInfoRecordId && (() => {
            const irs = usePurchaseInfoRecordStore.getState().records.filter((r) => r.vendorId === vendorId && r.materialId === row.materialId && r.status === "active").sort((a, b) => a.unitPrice - b.unitPrice);
            if (!irs.length) return null;
            const min = irs[0].unitPrice, max = irs[irs.length - 1].unitPrice;
            const txt = irs.length > 1 ? ` ${formatCurrency(min)} ~ ${formatCurrency(max)}` : ` ${formatCurrency(min)}`;
            return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "info", variant: "outlined", label: `信息记录取价${txt}`, sx: { mt: 0.5 } });
          })(),
          row.sourcePriceItemId && (() => {
            const src = priceList.find((p) => p.id === row.sourcePriceItemId);
            return src ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "success", variant: "outlined", label: `价目表 ${src.sourceApprovalNo}`, sx: { mt: 0.5 } }) : null;
          })(),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "从价目表/信息记录抓取最新价格", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            IconButton,
            {
              size: "small",
              color: "success",
              onClick: () => handleFetchPrice(row.id),
              disabled: !row.materialId || getPriceOptions(row.materialId).length === 0 && usePurchaseInfoRecordStore.getState().records.filter((r) => r.vendorId === vendorId && r.materialId === row.materialId && r.status === "active").length === 0,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(AweIcon, { fontSize: "small" })
            }
          ) }) })
        ] });
      }
    },
    { key: "expectedDeliveryDate", label: "预计交货", type: "date", width: 140, hideable: true }
  ];
  const makePORow = () => {
    var _a2;
    return {
      id: "",
      materialId: "",
      materialCode: "",
      materialName: "",
      specification: "",
      unit: "件",
      quantity: 1,
      ...buildLineFromNetPrice(1, 0, headerTaxRate),
      vendorId,
      vendorName: ((_a2 = vendorOptions.find((v) => v.id === vendorId)) == null ? void 0 : _a2.name) || "",
      expectedDeliveryDate: ""
    };
  };
  const handleMaterialChange = (itemId, materialId, overrideVendorId) => {
    var _a2;
    const material = materials.find((m) => m.id === materialId);
    if (!material) return;
    const effectiveVendorId = overrideVendorId ?? vendorId;
    const qty = ((_a2 = items.find((i) => i.id === itemId)) == null ? void 0 : _a2.quantity) || 1;
    const patch = buildPOMaterialPatch(materialId, effectiveVendorId, qty);
    setItems((prev) => prev.map((item) => item.id !== itemId ? item : { ...item, ...patch }));
  };
  const handleFetchPrice = (itemId) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== itemId) return item;
      const infoRecords = usePurchaseInfoRecordStore.getState().records.filter((r) => r.vendorId === vendorId && r.materialId === item.materialId && r.status === "active").sort((a, b) => a.unitPrice - b.unitPrice);
      if (infoRecords.length > 0) {
        const best = infoRecords[0];
        return {
          ...item,
          ...buildLineFromNetPrice(item.quantity, best.unitPrice, item.taxRate ?? headerTaxRate),
          vendorId: best.vendorId,
          vendorName: best.vendorName,
          sourceInfoRecordId: best.id,
          sourcePriceItemId: void 0,
          leadTime: best.leadTime
        };
      }
      const priceOpts = getPriceOptions(item.materialId);
      if (priceOpts.length > 0) {
        const best = priceOpts[0];
        return {
          ...item,
          ...buildLineFromNetPrice(item.quantity, best.unitPrice, item.taxRate ?? headerTaxRate),
          vendorId: best.vendorId,
          vendorName: best.vendorName,
          sourcePriceItemId: best.id,
          sourceInfoRecordId: void 0
        };
      }
      return item;
    }));
  };
  const getVendorOptionsForMaterial = (materialId) => {
    if (!materialId) return [];
    const priceOpts = getPriceOptions(materialId);
    return priceOpts.map((p) => ({ id: p.vendorId, name: p.vendorName, unitPrice: p.unitPrice }));
  };
  const validate = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = "请输入订单标题";
    if (!vendorId) newErrors.vendorId = "请选择供应商";
    if (items.length === 0) newErrors.items = "请添加至少一项物料";
    items.forEach((item) => {
      if (!item.materialId) newErrors[`item_${item.id}_material`] = "请选择物料";
      if (item.quantity <= 0) newErrors[`item_${item.id}_qty`] = "数量必须大于0";
      if (item.unitPrice < 0) newErrors[`item_${item.id}_price`] = "单价不能为负";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const blockedByBlacklist = () => {
    if (!vendorId) return false;
    const bl = checkVendorBlacklist(vendorId);
    if (!bl.blacklisted) return false;
    alert(
      `供应商已列入黑名单，采购订单无法保存：
供应商：${bl.vendorName || vendorId}
拉黑原因：${bl.reason || "未填写"}
拉黑时间：${bl.blacklistedAt || "—"}

请更换合格供应商，或由采购部在「供应商管理 → 黑名单管理」解除黑名单后重试。`
    );
    return true;
  };
  const handleSaveDraft = () => {
    var _a2;
    if (blockedByBlacklist()) return;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (prevCredit.vendorId) {
      applyVendorCreditDelta(prevCredit.vendorId, -prevCredit.amount);
    }
    const orderItems = items.map((item) => ({
      id: item.id,
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      specification: item.specification,
      unit: item.unit,
      orderedQuantity: item.quantity,
      deliveredQuantity: 0,
      unitPrice: item.unitPrice,
      amount: item.amount,
      // A2 税价拆分
      taxRate: item.taxRate,
      taxAmount: item.taxAmount,
      priceWithTax: item.priceWithTax,
      amountWithTax: item.amountWithTax
    }));
    if (isEditMode && existingOrder) {
      updatePurchaseOrder(id, {
        vendorId,
        status: "created",
        purchaseType,
        orderMode,
        items: orderItems,
        totalAmount,
        currency,
        exchangeRate,
        taxIncluded,
        totalTaxAmount,
        grandTotal,
        paymentTerms,
        tradeTerms,
        expectedDeliveryDate,
        remarks: isServiceOrder ? serviceDescription : remarks,
        projectNo: projectNo || void 0,
        projectName: projectName || void 0,
        updatedAt: now,
        customFields,
        updatedBy: "当前用户",
        // B1：草稿态不占用信用
        creditOccupied: false,
        creditAmount: 0
      });
    } else {
      const orderNo = nextNo("PO");
      addPurchaseOrder({
        id: `po-${Date.now()}`,
        orderNo,
        vendorId,
        vendorName: ((_a2 = vendors.find((v) => v.id === vendorId)) == null ? void 0 : _a2.name) || "",
        status: "created",
        purchaseType,
        orderMode,
        sourceRequestIds: fromRequestIds,
        orderDate: now.split("T")[0],
        expectedDeliveryDate,
        items: orderItems,
        totalAmount,
        currency,
        exchangeRate,
        taxIncluded,
        totalTaxAmount,
        grandTotal,
        paymentTerms,
        tradeTerms,
        deliveryAddress: "",
        remarks: isServiceOrder ? serviceDescription : remarks,
        projectNo: projectNo || void 0,
        projectName: projectName || void 0,
        createdAt: now,
        updatedAt: now,
        createdBy: "当前用户",
        customFields,
        updatedBy: "当前用户",
        // B1：草稿态不占用信用
        creditOccupied: false,
        creditAmount: 0
      });
      fromRequestIds.forEach((rid) => updatePurchaseRequest(rid, { status: "ordered" }));
    }
    navigate("/purchase/orders");
  };
  const handleSubmit = () => {
    var _a2, _b2;
    if (!validate()) {
      const errorMessages = Object.values(errors).filter(Boolean).join("\n");
      alert(`请修正以下问题：
${errorMessages}`);
      return;
    }
    const cfDefs = useCustomFieldStore.getState().fields.purchaseOrder || [];
    for (const def of cfDefs) {
      if (def.required) {
        const v = customFields[def.key];
        if (v === void 0 || v === null || v === "" || def.type === "checkbox" && v === false) {
          alert(`请填写必填自定义字段：${def.label}`);
          return;
        }
      }
    }
    if (blockedByBlacklist()) return;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const offset = prevCredit.vendorId === vendorId ? prevCredit.amount : 0;
    const chk = checkVendorCredit(vendorId, creditAmount - offset);
    if (!chk.ok) {
      alert(
        `供应商信用额度不足，订单无法提交：
供应商：${chk.vendorName || vendorId}
授信额度：${formatCurrency(chk.limit ?? 0, currency)}
已占用：${formatCurrency(Math.max(0, chk.used - offset), currency)}
本单需占用：${formatCurrency(creditAmount, currency)}
可用额度：${formatCurrency(Math.max(0, chk.available + offset), currency)}

请调整订单金额，或联系财务提升授信额度后重试。`
      );
      return;
    }
    if (prevCredit.vendorId) {
      applyVendorCreditDelta(prevCredit.vendorId, -prevCredit.amount);
    }
    const occupied = applyVendorCreditDelta(vendorId, creditAmount);
    if (!occupied) {
      if (prevCredit.vendorId) {
        applyVendorCreditDelta(prevCredit.vendorId, prevCredit.amount);
      }
      alert("供应商信用额度占用失败，订单未提交。请核对供应商授信设置后重试。");
      return;
    }
    const orderItems = items.map((item) => ({
      id: item.id,
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      specification: item.specification,
      unit: item.unit,
      orderedQuantity: item.quantity,
      deliveredQuantity: 0,
      unitPrice: item.unitPrice,
      amount: item.amount,
      // A2 税价拆分
      taxRate: item.taxRate,
      taxAmount: item.taxAmount,
      priceWithTax: item.priceWithTax,
      amountWithTax: item.amountWithTax
    }));
    if (isEditMode && existingOrder) {
      updatePurchaseOrder(id, {
        vendorId,
        vendorName: ((_a2 = vendors.find((v) => v.id === vendorId)) == null ? void 0 : _a2.name) || existingOrder.vendorName,
        status: "created",
        orderMode,
        items: orderItems,
        totalAmount,
        currency,
        exchangeRate,
        taxIncluded,
        totalTaxAmount,
        grandTotal,
        paymentTerms,
        tradeTerms,
        expectedDeliveryDate,
        remarks,
        projectNo: projectNo || void 0,
        projectName: projectName || void 0,
        updatedAt: now,
        customFields,
        updatedBy: "当前用户",
        // B1：记录占用标记与占用金额快照
        creditOccupied: true,
        creditAmount
      });
    } else {
      const orderNo = nextNo("PO");
      addPurchaseOrder({
        id: `po-${Date.now()}`,
        orderNo,
        vendorId,
        vendorName: ((_b2 = vendors.find((v) => v.id === vendorId)) == null ? void 0 : _b2.name) || "",
        status: "created",
        orderMode,
        sourceRequestIds: fromRequestIds,
        orderDate: now.split("T")[0],
        expectedDeliveryDate,
        items: orderItems,
        totalAmount,
        currency,
        exchangeRate,
        taxIncluded,
        totalTaxAmount,
        grandTotal,
        paymentTerms,
        tradeTerms,
        deliveryAddress: "",
        remarks,
        projectNo: projectNo || void 0,
        projectName: projectName || void 0,
        createdAt: now,
        updatedAt: now,
        createdBy: "当前用户",
        customFields,
        updatedBy: "当前用户",
        // B1：记录占用标记与占用金额快照
        creditOccupied: true,
        creditAmount
      });
      fromRequestIds.forEach((rid) => updatePurchaseRequest(rid, { status: "ordered" }));
    }
    navigate("/purchase/orders");
  };
  const buildPrintRecord = () => {
    const vendor = vendors.find((v) => v.id === vendorId);
    return {
      orderNo: (existingOrder == null ? void 0 : existingOrder.orderNo) || "(尚未保存)",
      vendorName: (vendor == null ? void 0 : vendor.vendorName) || title || "",
      vendorCode: (vendor == null ? void 0 : vendor.vendorCode) || "",
      orderDate: (existingOrder == null ? void 0 : existingOrder.orderDate) || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      expectedDeliveryDate,
      paymentTerms,
      tradeTerms,
      currency,
      projectName,
      projectNo,
      remarks,
      items: items.map((it) => ({
        materialCode: it.materialCode,
        materialName: it.materialName,
        specification: it.specification,
        unit: it.unit,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        amount: it.amount,
        taxRate: it.taxRate,
        taxAmount: it.taxAmount,
        priceWithTax: it.priceWithTax,
        amountWithTax: it.amountWithTax,
        expectedDeliveryDate: it.expectedDeliveryDate
      }))
    };
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: isEditMode ? `修改采购订单${existingOrder ? " - " + existingOrder.orderNo : ""}` : "新建采购订单",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "purchase-order", currentStatus: "po_draft" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}), onClick: () => navigate("/purchase/orders"), children: "返回" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(PrintPreviewButton, { entity: "purchaseOrder", record: buildPrintRecord(), showBoth: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleSaveDraft, children: "暂存" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, {}), onClick: handleSubmit, children: isEditMode ? "保存修改" : "提交订单" })
      ] }),
      children: [
        isConvertMode && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: isServiceOrder ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          "已从 ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: sourceRequests.length }),
          " 条服务采购申请转入：",
          sourceRequests.map((r) => r.requestNo).join("、"),
          "（服务类订单不涉及收货/质检/入库）"
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          "已从 ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: sourceRequests.length }),
          " 条采购申请转入物料明细：",
          sourceRequests.map((r) => r.requestNo).join("、")
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "订单信息" }),
          !isEditMode && orderTemplates.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 2, p: 2, bgcolor: "#F0FDF4", borderRadius: 2, border: "1px solid #86EFAC" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", justifyContent: "space-between", mb: showTemplateSelect ? 1.5 : 0, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, color: "success.main", children: "📋 订单模板" }),
                selectedTemplate && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: selectedTemplate.name, size: "small", color: "success", onDelete: () => {
                  setSelectedTemplate(null);
                  setVendorId("");
                  setTitle("");
                  setPaymentTerms("");
                  setTradeTerms("");
                  setDeliveryTerms("");
                  setRemarks("");
                  setItems([]);
                } })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  size: "small",
                  variant: "text",
                  onClick: () => setShowTemplateSelect(!showTemplateSelect),
                  children: showTemplateSelect ? "收起" : "展开"
                }
              )
            ] }),
            showTemplateSelect && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 1, flexWrap: "wrap" }, children: orderTemplates.map((tpl) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: tpl.name,
                variant: (selectedTemplate == null ? void 0 : selectedTemplate.id) === tpl.id ? "filled" : "outlined",
                color: (selectedTemplate == null ? void 0 : selectedTemplate.id) === tpl.id ? "success" : "default",
                onClick: () => handleApplyTemplate(tpl),
                sx: { cursor: "pointer" }
              },
              tpl.id
            )) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { component: "legend", sx: { mb: 1, fontWeight: 500, fontSize: "0.875rem" }, children: "采购模式" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            RadioGroup,
            {
              row: true,
              value: orderMode,
              onChange: (e) => setOrderMode(e.target.value),
              "data-testid": "po-order-mode",
              sx: { mb: 2 },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormControlLabel, { value: "standard", control: /* @__PURE__ */ jsxRuntimeExports.jsx(Radio, {}), label: "标准采购" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormControlLabel, { value: "consignment", control: /* @__PURE__ */ jsxRuntimeExports.jsx(Radio, {}), label: "寄售采购" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: { xs: 12, sm: 6 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "订单标题",
                value: title,
                onChange: (e) => setTitle(e.target.value),
                error: !!errors.title,
                helperText: errors.title,
                placeholder: "如：钢板Q235B采购订单"
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: { xs: 12, sm: 6 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Autocomplete,
              {
                options: vendorOptions,
                getOptionLabel: (o) => o.name,
                value: vendorOptions.find((v) => v.id === vendorId) || null,
                onChange: (_, newVal) => {
                  const oldVendorId = vendorId;
                  setVendorId((newVal == null ? void 0 : newVal.id) || "");
                  if (newVal) {
                    setItems((prev) => prev.map((item) => {
                      if (!item.vendorId) {
                        return { ...item, vendorId: newVal.id, vendorName: newVal.name };
                      }
                      return item;
                    }));
                    if (newVal.id !== oldVendorId) {
                      const currentItems = items;
                      currentItems.filter((it) => it.materialId).forEach((it) => {
                        handleMaterialChange(it.id, it.materialId, newVal.id);
                      });
                    }
                  }
                },
                renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, label: "主供应商", error: !!errors.vendorId, helperText: errors.vendorId })
              }
            ) }),
            blacklistInfo && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "error", "data-testid": "po-vendor-blacklist", sx: { py: 0.5 }, children: [
              "供应商「",
              blacklistInfo.vendorName,
              "」已列入黑名单（",
              blacklistInfo.blacklistedAt || "—",
              "）：",
              blacklistInfo.reason || "未填写原因",
              " —— 本单无法提交或暂存，请更换供应商。"
            ] }) }),
            creditInfo && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Alert,
              {
                severity: creditInfo.willExceed ? "error" : creditInfo.limit == null ? "info" : "success",
                "data-testid": "po-vendor-credit",
                sx: { py: 0.5 },
                children: creditInfo.limit == null ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  "供应商「",
                  creditInfo.vendorName,
                  "」未设置授信额度，不做信用管控。"
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  "供应商「",
                  creditInfo.vendorName,
                  "」授信额度 ",
                  formatCurrency(creditInfo.limit, currency),
                  "， 已占用 ",
                  formatCurrency(creditInfo.used, currency),
                  "， 可用 ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { "data-testid": "po-credit-available", children: formatCurrency(creditInfo.available, currency) }),
                  "，本单需占用 ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { "data-testid": "po-credit-need", children: formatCurrency(creditAmount, currency) }),
                  creditInfo.willExceed && " —— 已超出可用额度，提交将被阻断"
                ] })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: { xs: 12, sm: 6 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "付款条件",
                value: paymentTerms,
                onChange: (e) => setPaymentTerms(e.target.value),
                placeholder: "如：货到验收后30天付清"
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: { xs: 12, sm: 6 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Autocomplete,
              {
                options: tradeTermOptions,
                value: tradeTerms || null,
                onChange: (_, newVal) => setTradeTerms(newVal || ""),
                renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, label: "贸易条件", placeholder: "选择或输入贸易条款" }),
                freeSolo: true,
                isOptionEqualToValue: (o, v) => o === v
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: { xs: 12, sm: 6 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "交付条件",
                value: deliveryTerms,
                onChange: (e) => setDeliveryTerms(e.target.value),
                placeholder: "如：含运费到厂"
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: { xs: 12, sm: 4 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                select: true,
                fullWidth: true,
                label: "币种",
                value: currency,
                onChange: (e) => setCurrency(e.target.value),
                "data-testid": "po-currency",
                helperText: "影响金额展示与后续汇率折算",
                children: CURRENCY_OPTIONS.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: opt.value, children: opt.label }, opt.value))
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: { xs: 12, sm: 4 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              TextField,
              {
                select: true,
                fullWidth: true,
                label: "价格类型",
                value: taxIncluded ? "true" : "false",
                onChange: (e) => handleTaxIncludedChange(e.target.value === "true"),
                "data-testid": "po-tax-included",
                helperText: taxIncluded ? "单价按含税价录入，自动反算未税" : "单价按未税价录入，自动计算税额",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "false", children: "未税价" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "true", children: "含税价" })
                ]
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: { xs: 12, sm: 4 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                select: true,
                fullWidth: true,
                label: "默认税率",
                value: headerTaxRate,
                onChange: (e) => handleHeaderTaxRateChange(Number(e.target.value)),
                "data-testid": "po-tax-rate",
                helperText: "带出到全部行，行内可单独调整",
                children: TAX_RATE_OPTIONS.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: opt.value, children: opt.label }, opt.value))
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: { xs: 12, sm: 6 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "期望交货日期",
                type: "date",
                value: expectedDeliveryDate,
                onChange: (e) => setExpectedDeliveryDate(e.target.value),
                InputLabelProps: { shrink: true }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: { xs: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "备注",
                value: remarks,
                onChange: (e) => setRemarks(e.target.value),
                multiline: true,
                rows: 2
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { size: { xs: 12, sm: 6 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Autocomplete,
              {
                size: "small",
                options: projects,
                getOptionLabel: (opt) => `${opt.projectName} (${opt.projectNo})`,
                value: null,
                onChange: (_, v) => {
                },
                renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, label: "关联项目（编号+名称）", placeholder: "选择或搜索项目" }),
                noOptionsText: "未找到匹配项目",
                isOptionEqualToValue: (o, v) => o.id === v.id
              }
            ) })
          ] })
        ] }),
        isServiceOrder ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "服务描述" }),
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
              helperText: "服务类采购不涉及物料明细、收货入库和质检流程"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mt: 2 }, children: "服务类采购订单不涉及收货/质检/入库操作，确认后直接进入付款流程。" })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { mb: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "物料明细" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "选择物料后自动从价目表抓取最新价格；支持 Excel 多行复制粘贴、可配置显示列，物料号与名称分列录入。" })
          ] }),
          errors.items && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "error", sx: { mb: 2 }, children: errors.items }),
          sourceChips.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { "data-testid": "so-source-chips", sx: { mb: 2, p: 1.5, bgcolor: "#EFF6FF", borderRadius: 2, border: "1px solid #93C5FD" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "primary", fontWeight: 600, sx: { mb: 0.5, display: "block" }, children: "该供应商货源清单推荐物料（点击快速添加）：" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 0.5, flexWrap: "wrap", useFlexGap: true, children: sourceChips.map((chip) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: `${chip.materialCode} ${chip.materialName}`,
                size: "small",
                color: "primary",
                variant: "outlined",
                clickable: true,
                onClick: () => handleSourceChipClick(chip),
                icon: chip.fixedVendor ? /* @__PURE__ */ jsxRuntimeExports.jsx(AweIcon, { sx: { fontSize: 14 } }) : void 0,
                sx: { mb: 0.5 }
              },
              chip.id
            )) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { variant: "outlined", sx: { p: 2, mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            ResponsiblePersons,
            {
              categoryIds: poCategoryIds,
              roles: ["buyer"],
              title: "相关物料责任人（采购）"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            MaterialLineItemsGrid,
            {
              columns: poColumns,
              value: items,
              onChange: (rows) => setItems(rows),
              materials: poMaterialOptions,
              onMaterialChange: handlePOMaterialPricing,
              computeRow: computePORow,
              newRow: makePORow,
              storageKey: "ssa-po-material-columns",
              addLabel: "添加物料",
              testIdPrefix: "po",
              footer: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", px: 1, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                  "共 ",
                  items.length,
                  " 项物料"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { textAlign: "right" }, "data-testid": "po-total-block", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                    "未税总额：",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { "data-testid": "po-total-net", children: formatCurrency(totalAmount, currency) })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
                    "税额合计：",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { "data-testid": "po-total-tax", children: formatCurrency(totalTaxAmount, currency) })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, color: "primary", "data-testid": "po-grand-total", children: [
                    "价税合计：",
                    formatCurrency(grandTotal, currency)
                  ] })
                ] })
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CustomFieldsSection, { entity: "purchaseOrder", value: customFields, onChange: setCustomFields }) })
      ]
    }
  );
};
export {
  OrderForm as default
};
