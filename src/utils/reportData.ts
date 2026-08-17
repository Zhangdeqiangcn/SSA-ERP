import { useMemo } from 'react';
import { useMaterialStore } from '@/stores/materialStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useSalesStore } from '@/stores/salesStore';
import { useVendorStore } from '@/stores/vendorStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useFinanceExtensionStore, getExchangeRate } from '@/stores/financeExtensionStore';
import { useProductionStore } from '@/stores/productionStore';

/**
 * 报表数据集注册中心（P2-6）
 * ------------------------------------------------------------
 * 集中管理所有可被「报表设计器 / BI 自助分析」使用的数据集与字段定义。
 * - 原有 5 个主数据/业务数据集（物料/采购/库存/销售/供应商）保留。
 * - 新增 finance（财务发票，跨模块折算本位币）与 production（生产工单成本）。
 * - joinDatasets 提供通用的跨模块关联（join）能力，供 BI 自助分析使用。
 */

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number';
}

export interface DatasetDef {
  label: string;
  fields: FieldDef[];
}

export const DATASETS: Record<string, DatasetDef> = {
  material: {
    label: '物料',
    fields: [
      { key: 'code', label: '物料编码', type: 'text' },
      { key: 'name', label: '物料名称', type: 'text' },
      { key: 'specification', label: '规格', type: 'text' },
      { key: 'unit', label: '单位', type: 'text' },
      { key: 'price', label: '单价', type: 'number' },
      { key: 'categoryName', label: '分类', type: 'text' },
      { key: 'status', label: '状态', type: 'text' },
    ],
  },
  purchase: {
    label: '采购订单',
    fields: [
      { key: 'orderNo', label: '订单号', type: 'text' },
      { key: 'vendorName', label: '供应商', type: 'text' },
      { key: 'status', label: '状态', type: 'text' },
      { key: 'totalAmount', label: '总金额', type: 'number' },
      { key: 'orderDate', label: '订单日期', type: 'text' },
    ],
  },
  inventory: {
    label: '库存',
    fields: [
      { key: 'materialCode', label: '物料编码', type: 'text' },
      { key: 'materialName', label: '物料名称', type: 'text' },
      { key: 'warehouseName', label: '仓库', type: 'text' },
      { key: 'quantity', label: '数量', type: 'number' },
      { key: 'availableQuantity', label: '可用数量', type: 'number' },
      { key: 'unit', label: '单位', type: 'text' },
    ],
  },
  sales: {
    label: '销售订单',
    fields: [
      { key: 'orderNo', label: '订单号', type: 'text' },
      { key: 'customerName', label: '客户', type: 'text' },
      { key: 'status', label: '状态', type: 'text' },
      { key: 'totalAmount', label: '总金额', type: 'number' },
      { key: 'orderDate', label: '订单日期', type: 'text' },
    ],
  },
  vendor: {
    label: '供应商',
    fields: [
      { key: 'code', label: '编码', type: 'text' },
      { key: 'name', label: '名称', type: 'text' },
      { key: 'type', label: '类型', type: 'text' },
      { key: 'status', label: '状态', type: 'text' },
      { key: 'rating', label: '评级', type: 'number' },
    ],
  },
  // P2-6 新增：财务报表数据集（发票跨模块折算本位币）
  finance: {
    label: '财务发票',
    fields: [
      { key: 'invoiceNo', label: '发票号', type: 'text' },
      { key: 'invoiceType', label: '发票类型', type: 'text' },
      { key: 'status', label: '状态', type: 'text' },
      { key: 'vendorName', label: '供应商', type: 'text' },
      { key: 'purchaseOrderNo', label: '采购订单号', type: 'text' },
      { key: 'invoiceDate', label: '开票日期', type: 'text' },
      { key: 'currency', label: '币种', type: 'text' },
      { key: 'totalAmount', label: '含税金额', type: 'number' },
      { key: 'taxAmount', label: '税额', type: 'number' },
      { key: 'baseAmount', label: '折本位币', type: 'number' },
    ],
  },
  // P2-6 新增：生产工单成本数据集（来自 P2-3 productionStore）
  production: {
    label: '生产工单',
    fields: [
      { key: 'orderNo', label: '工单号', type: 'text' },
      { key: 'productName', label: '产品名称', type: 'text' },
      { key: 'status', label: '状态', type: 'text' },
      { key: 'plannedQuantity', label: '计划数量', type: 'number' },
      { key: 'completedQuantity', label: '完工数量', type: 'number' },
      { key: 'scrapQuantity', label: '报废数量', type: 'number' },
      { key: 'actualTotalCost', label: '实际总成本', type: 'number' },
    ],
  },
};

export type ReportRow = Record<string, unknown>;
export type DataMap = Record<string, ReportRow[]>;

/** 读取全部数据集的原始行；finance/production 为跨模块派生视图 */
export function useReportDataMap(): DataMap {
  const materials = useMaterialStore((s) => s.materials);
  const purchaseOrders = usePurchaseStore((s) => s.purchaseOrders);
  const inventoryRecords = useWarehouseStore((s) => s.inventoryRecords);
  const salesOrders = useSalesStore((s) => s.salesOrders);
  const vendors = useVendorStore((s) => s.vendors);
  const invoices = useFinanceStore((s) => s.invoices);
  const exchangeRates = useFinanceExtensionStore((s) => s.exchangeRates);
  const workOrders = useProductionStore((s) => s.workOrders);

  return useMemo<DataMap>(() => {
    // 财务数据集：发票 × 汇率 → 折算本位币（跨模块 join 示例）
    const financeRows: ReportRow[] = invoices.map((inv) => {
      const rate = getExchangeRate(inv.currency, exchangeRates);
      return {
        invoiceNo: inv.invoiceNo,
        invoiceType: inv.invoiceType,
        status: inv.status,
        vendorName: inv.vendorName,
        purchaseOrderNo: inv.purchaseOrderNo,
        invoiceDate: inv.invoiceDate,
        currency: inv.currency || 'CNY',
        totalAmount: inv.totalAmount,
        taxAmount: inv.taxAmount,
        baseAmount: (inv.totalAmount || 0) * rate,
      };
    });

    // 生产数据集：工单成本
    const productionRows: ReportRow[] = workOrders.map((wo) => ({
      orderNo: wo.orderNo,
      productName: wo.productName,
      status: wo.status,
      plannedQuantity: wo.plannedQuantity,
      completedQuantity: wo.completedQuantity,
      scrapQuantity: wo.scrapQuantity,
      actualTotalCost: wo.actualTotalCost ?? 0,
    }));

    return {
      material: materials as unknown as ReportRow[],
      purchase: purchaseOrders as unknown as ReportRow[],
      inventory: inventoryRecords as unknown as ReportRow[],
      sales: salesOrders as unknown as ReportRow[],
      vendor: vendors as unknown as ReportRow[],
      finance: financeRows,
      production: productionRows,
    };
  }, [materials, purchaseOrders, inventoryRecords, salesOrders, vendors, invoices, exchangeRates, workOrders]);
}

export type JoinType = 'inner' | 'left';

export interface JoinResult {
  rows: ReportRow[];
  fields: FieldDef[];
}

/**
 * 通用跨模块关联（join）
 * - leftKey/rightKey 为两侧数据集的关联字段（按字符串相等匹配，忽略首尾空格）
 * - 右表字段统一加 `r_` 前缀，避免与左表同名字段冲突
 * - inner：仅保留两侧匹配的行；left：保留左表全部行（右表缺失填 null）
 */
export function joinDatasets(
  leftRows: ReportRow[],
  leftFields: FieldDef[],
  rightRows: ReportRow[],
  rightFields: FieldDef[],
  leftKey: string,
  rightKey: string,
  joinType: JoinType
): JoinResult {
  const rightIndex = new Map<string, ReportRow>();
  rightRows.forEach((r) => {
    const k = String(r[rightKey] ?? '').trim();
    if (k) rightIndex.set(k, r);
  });

  const rows: ReportRow[] = [];
  leftRows.forEach((l) => {
    const k = String(l[leftKey] ?? '').trim();
    const matched = k ? rightIndex.get(k) : undefined;
    if (matched || joinType === 'left') {
      const merged: ReportRow = { ...l };
      rightFields.forEach((f) => {
        merged[`r_${f.key}`] = matched ? matched[f.key] : null;
      });
      rows.push(merged);
    }
  });

  const fields: FieldDef[] = [
    ...leftFields.map((f) => ({ ...f })),
    ...rightFields.map((f) => ({ key: `r_${f.key}`, label: `R·${f.label}`, type: f.type })),
  ];

  return { rows, fields };
}
