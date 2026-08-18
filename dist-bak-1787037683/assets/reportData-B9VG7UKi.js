import { r as reactExports } from "./vendor-46QZWBd3.js";
import { u as useMaterialStore, b as usePurchaseStore, c as useWarehouseStore, e as useSalesStore, a as useVendorStore, f as useFinanceStore } from "./index-CcOZBoQL.js";
import { u as useFinanceExtensionStore, g as getExchangeRate } from "./financeExtensionStore-DcH2weuS.js";
import { u as useProductionStore } from "./productionStore-D_DSIs05.js";
const DATASETS = {
  material: {
    label: "物料",
    fields: [
      { key: "code", label: "物料编码", type: "text" },
      { key: "name", label: "物料名称", type: "text" },
      { key: "specification", label: "规格", type: "text" },
      { key: "unit", label: "单位", type: "text" },
      { key: "price", label: "单价", type: "number" },
      { key: "categoryName", label: "分类", type: "text" },
      { key: "status", label: "状态", type: "text" }
    ]
  },
  purchase: {
    label: "采购订单",
    fields: [
      { key: "orderNo", label: "订单号", type: "text" },
      { key: "vendorName", label: "供应商", type: "text" },
      { key: "status", label: "状态", type: "text" },
      { key: "totalAmount", label: "总金额", type: "number" },
      { key: "orderDate", label: "订单日期", type: "text" }
    ]
  },
  inventory: {
    label: "库存",
    fields: [
      { key: "materialCode", label: "物料编码", type: "text" },
      { key: "materialName", label: "物料名称", type: "text" },
      { key: "warehouseName", label: "仓库", type: "text" },
      { key: "quantity", label: "数量", type: "number" },
      { key: "availableQuantity", label: "可用数量", type: "number" },
      { key: "unit", label: "单位", type: "text" }
    ]
  },
  sales: {
    label: "销售订单",
    fields: [
      { key: "orderNo", label: "订单号", type: "text" },
      { key: "customerName", label: "客户", type: "text" },
      { key: "status", label: "状态", type: "text" },
      { key: "totalAmount", label: "总金额", type: "number" },
      { key: "orderDate", label: "订单日期", type: "text" }
    ]
  },
  vendor: {
    label: "供应商",
    fields: [
      { key: "code", label: "编码", type: "text" },
      { key: "name", label: "名称", type: "text" },
      { key: "type", label: "类型", type: "text" },
      { key: "status", label: "状态", type: "text" },
      { key: "rating", label: "评级", type: "number" }
    ]
  },
  // P2-6 新增：财务报表数据集（发票跨模块折算本位币）
  finance: {
    label: "财务发票",
    fields: [
      { key: "invoiceNo", label: "发票号", type: "text" },
      { key: "invoiceType", label: "发票类型", type: "text" },
      { key: "status", label: "状态", type: "text" },
      { key: "vendorName", label: "供应商", type: "text" },
      { key: "purchaseOrderNo", label: "采购订单号", type: "text" },
      { key: "invoiceDate", label: "开票日期", type: "text" },
      { key: "currency", label: "币种", type: "text" },
      { key: "totalAmount", label: "含税金额", type: "number" },
      { key: "taxAmount", label: "税额", type: "number" },
      { key: "baseAmount", label: "折本位币", type: "number" }
    ]
  },
  // P2-6 新增：生产工单成本数据集（来自 P2-3 productionStore）
  production: {
    label: "生产工单",
    fields: [
      { key: "orderNo", label: "工单号", type: "text" },
      { key: "productName", label: "产品名称", type: "text" },
      { key: "status", label: "状态", type: "text" },
      { key: "plannedQuantity", label: "计划数量", type: "number" },
      { key: "completedQuantity", label: "完工数量", type: "number" },
      { key: "scrapQuantity", label: "报废数量", type: "number" },
      { key: "actualTotalCost", label: "实际总成本", type: "number" }
    ]
  }
};
function useReportDataMap() {
  const materials = useMaterialStore((s) => s.materials);
  const purchaseOrders = usePurchaseStore((s) => s.purchaseOrders);
  const inventoryRecords = useWarehouseStore((s) => s.inventoryRecords);
  const salesOrders = useSalesStore((s) => s.salesOrders);
  const vendors = useVendorStore((s) => s.vendors);
  const invoices = useFinanceStore((s) => s.invoices);
  const exchangeRates = useFinanceExtensionStore((s) => s.exchangeRates);
  const workOrders = useProductionStore((s) => s.workOrders);
  return reactExports.useMemo(() => {
    const financeRows = invoices.map((inv) => {
      const rate = getExchangeRate(inv.currency, exchangeRates);
      return {
        invoiceNo: inv.invoiceNo,
        invoiceType: inv.invoiceType,
        status: inv.status,
        vendorName: inv.vendorName,
        purchaseOrderNo: inv.purchaseOrderNo,
        invoiceDate: inv.invoiceDate,
        currency: inv.currency || "CNY",
        totalAmount: inv.totalAmount,
        taxAmount: inv.taxAmount,
        baseAmount: (inv.totalAmount || 0) * rate
      };
    });
    const productionRows = workOrders.map((wo) => ({
      orderNo: wo.orderNo,
      productName: wo.productName,
      status: wo.status,
      plannedQuantity: wo.plannedQuantity,
      completedQuantity: wo.completedQuantity,
      scrapQuantity: wo.scrapQuantity,
      actualTotalCost: wo.actualTotalCost ?? 0
    }));
    return {
      material: materials,
      purchase: purchaseOrders,
      inventory: inventoryRecords,
      sales: salesOrders,
      vendor: vendors,
      finance: financeRows,
      production: productionRows
    };
  }, [materials, purchaseOrders, inventoryRecords, salesOrders, vendors, invoices, exchangeRates, workOrders]);
}
function joinDatasets(leftRows, leftFields, rightRows, rightFields, leftKey, rightKey, joinType) {
  const rightIndex = /* @__PURE__ */ new Map();
  rightRows.forEach((r) => {
    const k = String(r[rightKey] ?? "").trim();
    if (k) rightIndex.set(k, r);
  });
  const rows = [];
  leftRows.forEach((l) => {
    const k = String(l[leftKey] ?? "").trim();
    const matched = k ? rightIndex.get(k) : void 0;
    if (matched || joinType === "left") {
      const merged = { ...l };
      rightFields.forEach((f) => {
        merged[`r_${f.key}`] = matched ? matched[f.key] : null;
      });
      rows.push(merged);
    }
  });
  const fields = [
    ...leftFields.map((f) => ({ ...f })),
    ...rightFields.map((f) => ({ key: `r_${f.key}`, label: `R·${f.label}`, type: f.type }))
  ];
  return { rows, fields };
}
export {
  DATASETS as D,
  joinDatasets as j,
  useReportDataMap as u
};
