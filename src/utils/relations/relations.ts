// 单据上下游关联 · 数据源填充模块（V3.113.0 新增 · 运行时副作用）
// 集中 import 各 store，并在模块加载时把"数据源 / 上下游关系 / 路由"填进 documentRelations 的空表。
// 列表页通过 useEnsureRelatedStores 钩子触发本模块加载，从而让 withRelatedDocNos / resolveRoute 拿到真实数据。
// 集中放这里可避免 documentRelations（纯逻辑，被单测复用）依赖任何 store。

import { usePurchaseStore } from '@/stores/purchaseStore';
import { useSalesStore } from '@/stores/salesStore';
import { useProductionStore } from '@/stores/productionStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useWarehouseAdvancedStore } from '@/stores/warehouseAdvancedStore';
import { useSubcontractStore } from '@/stores/subcontractStore';
import { useQualityStore } from '@/stores/qualityStore';
import { useQualityAdvancedStore } from '@/stores/qualityAdvancedStore';
import { useQualityExtensionStore } from '@/stores/qualityExtensionStore';
import { usePriceStore } from '@/stores/priceStore';
import { useArapStore } from '@/stores/arapStore';
import { useCashMgmtStore } from '@/stores/cashMgmtStore';
import { useSourceListStore } from '@/stores/sourceListStore';
import { usePurchaseInfoRecordStore } from '@/stores/purchaseInfoRecordStore';
import { useECNStore } from '@/stores/ecnStore';
import { useProductionVersionStore } from '@/stores/productionVersionStore';
import { useFMEAStore } from '@/stores/fmeaStore';
import { useConsignmentStore } from '@/stores/consignmentStore';
import { useWaveRfidStore } from '@/stores/waveRfidStore';
import { useRepetitiveMfgStore } from '@/stores/repetitiveMfgStore';
import { useTripartySalesStore } from '@/stores/tripartySalesStore';
import { useSalesReturnStore } from '@/stores/salesReturnStore';
import { usePurchaseReturnStore } from '@/stores/purchaseReturnStore';
import { useFlowStore } from '@/stores/flowStore';
import { useSopStore } from '@/stores/sopStore';
import { useSalesContractStore } from '@/stores/salesContractStore';
import { useSalesAdvancedStore } from '@/stores/salesAdvancedStore';
import { usePurchaseAdvancedStore } from '@/stores/purchaseAdvancedStore';
import { useVendorStore } from '@/stores/vendorStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useCustomerStore } from '@/stores/customerStore';
import { DOC_SOURCES, DOC_RELATIONS, DOC_ROUTES, pickExistingRefs, type RelatedDocRef } from './documentRelations';

// ───────────────────────────── 工具 ─────────────────────────────
const safe = <T,>(getter: () => T | undefined, fallback: T): T => {
  try {
    const v = getter();
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
};

/** 用 id 在某类型数据源里查编号（用于 id 型上游字段映射到可显示的编号） */
function noById(type: string, id: string, idField = 'id'): string | null {
  const src = DOC_SOURCES[type];
  if (!src || !id) return null;
  const doc = src.getDocs().find((d: Record<string, any>) => String(d[idField]) === String(id));
  return doc ? String(doc[src.numberField]) : null;
}

const toRef = (type: string, no: string | null | undefined): RelatedDocRef[] =>
  no ? [{ type, no: String(no) }] : [];

// ───────────────────────────── 数据源登记 ─────────────────────────────
const SOURCES: Record<string, any> = {
  purchaseRequest: { getDocs: () => safe(() => usePurchaseStore.getState().purchaseRequests, []), numberField: 'requestNo' },
  purchaseOrder: { getDocs: () => safe(() => usePurchaseStore.getState().purchaseOrders, []), numberField: 'orderNo' },
  finInvoice: {
    getDocs: () => safe(() => useFinanceStore.getState().invoices, []),
    numberField: 'invoiceNo',
    ensureLoaded: () => { const s: any = useFinanceStore.getState(); s.load?.(); },
  },
  sourceList: { getDocs: () => safe(() => useSourceListStore.getState().items, []), numberField: 'id' },
  infoRecord: { getDocs: () => safe(() => usePurchaseInfoRecordStore.getState().records, []), numberField: 'id' },
  frameworkAgreement: {
    getDocs: () => safe(() => usePurchaseAdvancedStore.getState().frameworkAgreements, []),
    numberField: 'agreementNo',
    ensureLoaded: () => { const s: any = usePurchaseAdvancedStore.getState(); s.load?.(); s.hydrate?.(); },
  },
  purchaseReturn: {
    getDocs: () => safe(() => usePurchaseReturnStore.getState().purchaseReturns, []),
    numberField: 'returnNo',
    ensureLoaded: () => { const s: any = usePurchaseReturnStore.getState(); s.load?.(); s.hydrate?.(); },
  },

  salesOpportunity: { getDocs: () => safe(() => useSalesStore.getState().prospects, []), numberField: 'prospectNo' },
  salesQuotation: {
    getDocs: () => safe(() => useSalesAdvancedStore.getState().quotations, []),
    numberField: 'quotationNo',
    ensureLoaded: () => { const s: any = useSalesAdvancedStore.getState(); s.hydrateQuotations?.(); },
  },
  salesOrder: { getDocs: () => safe(() => useSalesStore.getState().salesOrders, []), numberField: 'orderNo' },
  salesLogistics: { getDocs: () => safe(() => useSalesStore.getState().shipments, []), numberField: 'shipmentNo' },
  salesInvoice: {
    getDocs: () => safe(() => useSalesAdvancedStore.getState().salesInvoices, []),
    numberField: 'invoiceNo',
    ensureLoaded: () => { const s: any = useSalesAdvancedStore.getState(); s.hydrateInvoices?.(); },
  },
  salesReturn: {
    getDocs: () => safe(() => useSalesReturnStore.getState().salesReturns, []),
    numberField: 'returnNo',
    ensureLoaded: () => { const s: any = useSalesReturnStore.getState(); s.load?.(); s.hydrate?.(); },
  },
  tripartySales: {
    getDocs: () => safe(() => useTripartySalesStore.getState().list, []),
    numberField: 'docNo',
    ensureLoaded: () => { const s: any = useTripartySalesStore.getState(); s.load?.(); },
  },
  salesContract: {
    getDocs: () => safe(() => useSalesContractStore.getState().contracts, []),
    numberField: 'contractNo',
    ensureLoaded: () => { const s: any = useSalesContractStore.getState(); s.load?.(); s.hydrate?.(); },
  },
  project: { getDocs: () => safe(() => useSalesStore.getState().projects, []), numberField: 'projectNo' },

  inbound: { getDocs: () => safe(() => useWarehouseStore.getState().inboundOrders, []), numberField: 'inboundNo' },
  outbound: { getDocs: () => safe(() => useWarehouseStore.getState().outboundOrders, []), numberField: 'outboundNo' },
  checkTask: { getDocs: () => safe(() => useWarehouseStore.getState().checkTasks, []), numberField: 'taskNo' },
  stockTransfer: { getDocs: () => safe(() => useWarehouseAdvancedStore.getState().stockTransfers, []), numberField: 'transferNo' },
  inventoryAdjustment: { getDocs: () => safe(() => useWarehouseAdvancedStore.getState().inventoryAdjustments, []), numberField: 'adjustmentNo' },
  waveRfid: {
    getDocs: () => safe(() => useWaveRfidStore.getState().waves, []),
    numberField: 'waveNo',
    ensureLoaded: () => { const s: any = useWaveRfidStore.getState(); s.load?.(); },
  },
  inspectionNotice: {
    getDocs: () => safe(() => useFlowStore.getState().inspectionNotices, []),
    numberField: 'noticeNo',
    ensureLoaded: () => { const s: any = useFlowStore.getState(); s.load?.(); s.hydrate?.(); },
  },
  finishedGoodsInbound: { getDocs: () => safe(() => useWarehouseStore.getState().finishedGoodsInbounds, []), numberField: 'inboundNo' },
  batch: { getDocs: () => safe(() => useWarehouseStore.getState().batchRecords, []), numberField: 'batchNo' },
  serialHU: { getDocs: () => safe(() => useWarehouseAdvancedStore.getState().serialMasters, []), numberField: 'serialNo' },
  consignmentStock: {
    getDocs: () => safe(() => useConsignmentStore.getState().records, []),
    numberField: 'id',
    ensureLoaded: () => { const s: any = useConsignmentStore.getState(); s.hydrateConsignment?.(); },
  },

  inspectionTask: {
    getDocs: () => safe(() => useQualityStore.getState().inspectionTasks, []),
    numberField: 'taskNo',
    ensureLoaded: () => { const s: any = useQualityStore.getState(); s.load?.(); s.hydrate?.(); },
  },
  unqualified: {
    getDocs: () => safe(() => useQualityStore.getState().unqualifiedItems, []),
    numberField: 'itemNo',
    ensureLoaded: () => { const s: any = useQualityStore.getState(); s.load?.(); s.hydrate?.(); },
  },
  pdca: {
    getDocs: () => safe(() => useQualityStore.getState().pdcaRecords, []),
    numberField: 'pdcaNo',
    ensureLoaded: () => { const s: any = useQualityStore.getState(); s.load?.(); s.hydrate?.(); },
  },
  lot: {
    getDocs: () => safe(() => useQualityAdvancedStore.getState().inspectionLots, []),
    numberField: 'lotNo',
    ensureLoaded: () => { const s: any = useQualityAdvancedStore.getState(); s.load?.(); s.hydrate?.(); },
  },
  eightD: {
    getDocs: () => safe(() => useQualityExtensionStore.getState().eightDRecords, []),
    numberField: 'code',
    ensureLoaded: () => { const s: any = useQualityExtensionStore.getState(); s.load?.(); s.hydrate?.(); },
  },
  inspectionStandard: {
    getDocs: () => safe(() => useQualityStore.getState().inspectionStandards, []),
    numberField: 'standardNo',
    ensureLoaded: () => { const s: any = useQualityStore.getState(); s.load?.(); s.hydrate?.(); },
  },
  fmea: {
    getDocs: () => safe(() => useFMEAStore.getState().items, []),
    numberField: 'number',
    ensureLoaded: () => { const s: any = useFMEAStore.getState(); s.load?.(); s.hydrate?.(); },
  },
  labEquipment: {
    getDocs: () => safe(() => useQualityExtensionStore.getState().labEquipments, []),
    numberField: 'equipmentNo',
    ensureLoaded: () => { const s: any = useQualityExtensionStore.getState(); s.load?.(); s.hydrate?.(); },
  },

  workOrder: { getDocs: () => safe(() => useProductionStore.getState().workOrders, []), numberField: 'orderNo' },
  processRoute: { getDocs: () => safe(() => useProductionStore.getState().processRoutes, []), numberField: 'routeNo' },
  subcontract: { getDocs: () => safe(() => useSubcontractStore.getState().orders, []), numberField: 'orderNo' },
  repetitiveMfg: {
    getDocs: () => safe(() => useRepetitiveMfgStore.getState().periods, []),
    numberField: 'periodNo',
    ensureLoaded: () => { const s: any = useRepetitiveMfgStore.getState(); s.load?.(); },
  },
  ecn: {
    getDocs: () => safe(() => useECNStore.getState().ecns, []),
    numberField: 'changeNo',
    ensureLoaded: () => { const s: any = useECNStore.getState(); s.load?.(); },
  },
  productionVersion: {
    getDocs: () => safe(() => useProductionVersionStore.getState().versions, []),
    numberField: 'id',
    ensureLoaded: () => { const s: any = useProductionVersionStore.getState(); s.load?.(); },
  },
  sopPlan: {
    getDocs: () => safe(() => useSopStore.getState().items, []),
    numberField: 'id',
    ensureLoaded: () => { const s: any = useSopStore.getState(); s.load?.(); },
  },

  priceInquiry: {
    getDocs: () => safe(() => usePriceStore.getState().priceInquiries, []),
    numberField: 'inquiryNo',
    ensureLoaded: () => { const s: any = usePriceStore.getState(); s.load?.(); s.hydrate?.(); },
  },
  priceComparison: {
    getDocs: () => safe(() => usePriceStore.getState().priceComparisons, []),
    numberField: 'comparisonNo',
    ensureLoaded: () => { const s: any = usePriceStore.getState(); s.load?.(); s.hydrate?.(); },
  },
  priceApproval: {
    getDocs: () => safe(() => usePriceStore.getState().priceApprovals, []),
    numberField: 'approvalNo',
    ensureLoaded: () => { const s: any = usePriceStore.getState(); s.load?.(); s.hydrate?.(); },
  },
  priceList: { getDocs: () => safe(() => usePriceStore.getState().priceList, []), numberField: 'id' },

  receivable: {
    getDocs: () => safe(() => useArapStore.getState().receivables, []),
    // V3.113.2：编号字段用业务发票号（原来用 id，列表「上游/下游单号」列显示的是内部主键）
    numberField: 'invoiceNo',
    ensureLoaded: () => { const s: any = useArapStore.getState(); s.hydrateArap?.(); },
  },
  payable: {
    getDocs: () => safe(() => useArapStore.getState().payables, []),
    numberField: 'invoiceNo',
    ensureLoaded: () => { const s: any = useArapStore.getState(); s.hydrateArap?.(); },
  },
  cashMgmt: {
    getDocs: () => safe(() => useCashMgmtStore.getState().flows, []),
    numberField: 'id',
    ensureLoaded: () => { const s: any = useCashMgmtStore.getState(); s.load?.(); },
  },
  voucher: { getDocs: () => safe(() => useFinanceStore.getState().vouchers, []), numberField: 'voucherNo' },
  paymentPlan: { getDocs: () => safe(() => useFinanceStore.getState().paymentPlans, []), numberField: 'planNo' },

  vendor: { getDocs: () => safe(() => useVendorStore.getState().vendors, []), numberField: 'vendorCode' },
  material: { getDocs: () => safe(() => useMaterialStore.getState().materials, []), numberField: 'materialCode' },
  customer: { getDocs: () => safe(() => useCustomerStore.getState().customers, []), numberField: 'customerCode' },
};

// ───────────────────────────── 上下游关系登记 ─────────────────────────────
const RELS: Record<string, any> = {
  // ── 采购域 ──
  purchaseRequest: {
    numberField: 'requestNo',
    upstreamResolver: (r: any) => {
      const map: Record<string, string> = { salesOrder: 'salesOrder', workOrder: 'workOrder', mrp: 'mrpRecommendation' };
      const t = r?.sourceType ? map[r.sourceType] : undefined;
      return t ? toRef(t, r.sourceNo) : [];
    },
    downstream: [
      { target: 'purchaseOrder', linkField: 'sourceRequestIds', matchField: 'id' },
      { target: 'priceInquiry', linkField: 'sourceRequestNo' },
    ],
  },
  purchaseOrder: {
    numberField: 'orderNo',
    upstreamResolver: (r: any) => {
      const ids: string[] = Array.isArray(r?.sourceRequestIds) ? r.sourceRequestIds : [];
      const refs = ids
        .map((id) => {
          const no = noById('purchaseRequest', id);
          return no ? ({ type: 'purchaseRequest', no } as RelatedDocRef) : null;
        })
        .filter(Boolean) as RelatedDocRef[];
      if (refs.length === 0 && r?.sourceNo) return toRef('purchaseRequest', r.sourceNo);
      return refs;
    },
    downstream: [
      { target: 'inbound', linkField: 'sourceNo' },
      { target: 'finInvoice', linkField: 'purchaseOrderNo' },
      { target: 'paymentPlan', linkField: 'purchaseOrderNo' },
      { target: 'purchaseReturn', linkField: 'purchaseOrderNo' },
      { target: 'inspectionNotice', linkField: 'purchaseOrderId', matchField: 'id' },
    ],
  },
  finInvoice: {
    numberField: 'invoiceNo',
    upstream: { field: 'purchaseOrderNo', target: 'purchaseOrder' },
    downstream: [
      { target: 'receivable', linkField: 'invoiceNo' },
      { target: 'payable', linkField: 'invoiceNo' },
      { target: 'voucher', linkField: 'sourceNo' },
    ],
  },
  purchaseReturn: { numberField: 'returnNo', upstream: { field: 'purchaseOrderNo', target: 'purchaseOrder' } },

  // ── 销售域 ──
  salesOpportunity: { numberField: 'prospectNo', downstream: [{ target: 'salesQuotation', linkField: 'sourceProspectId' }] },
  salesQuotation: {
    numberField: 'quotationNo',
    upstreamResolver: (r: any) => toRef('salesOpportunity', noById('salesOpportunity', r?.sourceProspectId)),
    downstream: [{ target: 'salesOrder', linkField: 'convertedOrderNo' }, { target: 'salesOrder', linkField: 'convertedOrderId', matchField: 'id' }],
  },
  salesOrder: {
    numberField: 'orderNo',
    upstream: { field: 'contractNo', target: 'salesContract' },
    downstream: [
      { target: 'salesLogistics', linkField: 'salesOrderNo' },
      { target: 'outbound', linkField: 'sourceNo' },
      { target: 'salesInvoice', linkField: 'salesOrderNo' },
      { target: 'salesReturn', linkField: 'salesOrderNo' },
      { target: 'workOrder', linkField: 'orderNo' },
      { target: 'salesContract', linkField: 'contractNo' },
      { target: 'voucher', linkField: 'sourceNo' },
    ],
  },
  salesLogistics: { numberField: 'shipmentNo', upstream: { field: 'salesOrderNo', target: 'salesOrder' } },
  salesInvoice: {
    numberField: 'invoiceNo',
    upstream: { field: 'salesOrderNo', target: 'salesOrder' },
    downstream: [{ target: 'receivable', linkField: 'invoiceNo' }, { target: 'voucher', linkField: 'sourceNo' }],
  },
  salesReturn: {
    numberField: 'returnNo',
    upstream: { field: 'salesOrderNo', target: 'salesOrder' },
    downstream: [{ target: 'purchaseReturn', linkField: 'linkedPurchaseReturnNo' }],
  },
  tripartySales: { numberField: 'docNo' },
  salesContract: { numberField: 'contractNo', downstream: [{ target: 'salesOrder', linkField: 'contractNo' }] },
  project: { numberField: 'projectNo', downstream: [{ target: 'salesOrder', linkField: 'projectNo' }] },

  // ── 仓库域 ──
  inbound: {
    numberField: 'inboundNo',
    upstreamResolver: (r: any) => {
      const t = r?.type;
      if (t === 'purchase') return toRef('purchaseOrder', r.sourceNo);
      if (t === 'production') return toRef('workOrder', r.sourceNo);
      if (t === 'return') return toRef('salesReturn', r.sourceNo);
      if (t === 'transfer') return toRef('stockTransfer', r.sourceNo);
      if (t === 'subcontract') return toRef('subcontract', r.sourceNo);
      return [];
    },
    downstream: [
      { target: 'batch', linkField: 'inboundNo' },
      { target: 'lot', linkField: 'sourceNo' },
      { target: 'serialHU', linkField: 'docNo' },
      { target: 'voucher', linkField: 'sourceNo' },
    ],
  },
  outbound: {
    numberField: 'outboundNo',
    upstreamResolver: (r: any) => {
      const t = r?.type;
      if (t === 'sale') return toRef('salesOrder', r.sourceNo);
      if (t === 'pick') return toRef('workOrder', r.sourceNo);
      if (t === 'return') return toRef('salesReturn', r.sourceNo);
      if (t === 'transfer') return toRef('stockTransfer', r.sourceNo);
      if (t === 'subcontract') return toRef('subcontract', r.sourceNo);
      return [];
    },
    downstream: [{ target: 'serialHU', linkField: 'docNo' }, { target: 'voucher', linkField: 'sourceNo' }],
  },
  checkTask: { numberField: 'taskNo' },
  stockTransfer: { numberField: 'transferNo' },
  inventoryAdjustment: { numberField: 'adjustmentNo' },
  waveRfid: {
    numberField: 'waveNo',
    upstreamResolver: (r: any) => (Array.isArray(r?.lines) ? r.lines.map((l: any) => toRef('salesOrder', l.orderNo)).flat() : []),
  },
  inspectionNotice: {
    numberField: 'noticeNo',
    upstreamResolver: (r: any) => {
      const t = r?.sourceType;
      if (t === 'purchase') return toRef('purchaseOrder', r.sourceNo);
      if (t === 'production') return toRef('workOrder', r.sourceNo);
      if (t === 'return') return toRef('salesReturn', r.sourceNo);
      return [];
    },
    downstream: [{ target: 'inspectionTask', linkField: 'noticeNo' }],
  },
  finishedGoodsInbound: {
    numberField: 'inboundNo',
    upstreamResolver: (r: any) => toRef('workOrder', r.workOrderNo ?? r.workOrderId),
  },
  batch: { numberField: 'batchNo', upstream: { field: 'inboundNo', target: 'inbound' } },
  serialHU: { numberField: 'serialNo' },
  consignmentStock: { numberField: 'id' },

  // ── 质量域 ──
  inspectionTask: {
    numberField: 'taskNo',
    upstreamResolver: (r: any) => {
      const refs: RelatedDocRef[] = [];
      if (r?.purchaseOrderNo) refs.push({ type: 'purchaseOrder', no: r.purchaseOrderNo });
      if (r?.workOrderNo) refs.push({ type: 'workOrder', no: r.workOrderNo });
      if (r?.inspectionLotId || r?.inspectionLotNo) refs.push({ type: 'lot', no: r.inspectionLotNo ?? r.inspectionLotId });
      if (r?.noticeNo) refs.push({ type: 'inspectionNotice', no: r.noticeNo });
      return refs;
    },
    downstream: [
      { target: 'unqualified', linkField: 'inspectionTaskId', matchField: 'id' },
      { target: 'unqualified', linkField: 'inspectionTaskNo' },
      { target: 'lot', linkField: 'inspectionTaskId', matchField: 'id' },
      { target: 'lot', linkField: 'inspectionTaskNo' },
      { target: 'eightD', linkField: 'sourceNo' },
      { target: 'pdca', linkField: 'sourceNo' },
    ],
  },
  unqualified: {
    numberField: 'itemNo',
    upstreamResolver: (r: any) => {
      const refs: RelatedDocRef[] = [];
      if (r?.inspectionTaskId || r?.inspectionTaskNo) refs.push({ type: 'inspectionTask', no: r.inspectionTaskNo ?? r.inspectionTaskId });
      if (r?.linkedInboundNo) refs.push({ type: 'inbound', no: r.linkedInboundNo });
      if (r?.linkedOutboundNo) refs.push({ type: 'outbound', no: r.linkedOutboundNo });
      return refs;
    },
    downstream: [
      { target: 'eightD', linkField: 'sourceNo' },
      { target: 'outbound', linkField: 'linkedOutboundNo' },
      { target: 'inbound', linkField: 'linkedInboundNo' },
    ],
  },
  pdca: {
    numberField: 'pdcaNo',
    upstreamResolver: (r: any) => {
      if (r?.sourceType && r?.sourceNo) {
        const map: Record<string, string> = { inspection: 'inspectionTask', unqualified: 'unqualified', customer_complaint: 'customerComplaint', internal_audit: 'internalAudit', other: 'other' };
        return toRef(map[r.sourceType] ?? 'inspectionTask', r.sourceNo);
      }
      if (r?.relatedItemId) return toRef('unqualified', noById('unqualified', r.relatedItemId));
      return [];
    },
    downstream: [{ target: 'eightD', linkField: 'sourceNo' }],
  },
  lot: {
    numberField: 'lotNo',
    upstreamResolver: (r: any) => {
      const refs: RelatedDocRef[] = [];
      if (r?.sourceType && r?.sourceNo) {
        const map: Record<string, string> = { inbound: 'inbound', production: 'workOrder', purchase: 'purchaseOrder', sales: 'salesOrder' };
        refs.push(...toRef(map[r.sourceType] ?? 'inbound', r.sourceNo));
      }
      if (r?.inspectionTaskId || r?.inspectionTaskNo) refs.push({ type: 'inspectionTask', no: r.inspectionTaskNo ?? r.inspectionTaskId });
      return refs;
    },
    downstream: [{ target: 'eightD', linkField: 'sourceNo' }, { target: 'pdca', linkField: 'sourceNo' }],
  },
  eightD: {
    numberField: 'code',
    upstreamResolver: (r: any) => {
      if (r?.sourceType && r?.sourceNo) {
        const map: Record<string, string> = { unqualified: 'unqualified', inspection: 'inspectionTask', customer_complaint: 'customerComplaint' };
        return toRef(map[r.sourceType] ?? 'unqualified', r.sourceNo);
      }
      return [];
    },
  },
  inspectionStandard: { numberField: 'standardNo', downstream: [{ target: 'inspectionTask', linkField: 'inspectionStandardId', matchField: 'id' }] },
  fmea: { numberField: 'number' },
  labEquipment: { numberField: 'equipmentNo' },

  // ── 生产域 ──
  workOrder: {
    numberField: 'orderNo',
    downstream: [
      { target: 'finishedGoodsInbound', linkField: 'workOrderNo' },
      { target: 'outbound', linkField: 'sourceNo' },
      { target: 'subcontract', linkField: 'sourceWorkOrderId', matchField: 'id' },
      { target: 'inspectionNotice', linkField: 'workOrderId', matchField: 'id' },
      { target: 'voucher', linkField: 'sourceNo' },
    ],
  },
  processRoute: { numberField: 'routeNo' },
  subcontract: {
    numberField: 'orderNo',
    upstream: { field: 'sourceWorkOrderId', target: 'workOrder' },
    downstream: [{ target: 'outbound', linkField: 'issueOutboundNo' }, { target: 'inbound', linkField: 'receiptInboundNos' }],
  },
  repetitiveMfg: { numberField: 'periodNo' },
  ecn: { numberField: 'changeNo', downstream: [{ target: 'productionVersion', linkField: 'linkedChangeIds', matchField: 'id' }] },
  productionVersion: { numberField: 'id' },
  sopPlan: { numberField: 'id' },

  // ── 价格域 ──
  priceInquiry: {
    numberField: 'inquiryNo',
    upstream: { field: 'sourceRequestNo', target: 'purchaseRequest' },
    downstream: [{ target: 'priceComparison', linkField: 'inquiryNo' }, { target: 'priceApproval', linkField: 'inquiryNo' }],
  },
  priceComparison: {
    numberField: 'comparisonNo',
    upstream: { field: 'inquiryNo', target: 'priceInquiry' },
    downstream: [{ target: 'priceApproval', linkField: 'comparisonNo' }],
  },
  priceApproval: {
    numberField: 'approvalNo',
    upstreamResolver: (r: any) => {
      const refs: RelatedDocRef[] = [];
      if (r?.comparisonNo) refs.push({ type: 'priceComparison', no: r.comparisonNo });
      if (r?.inquiryNo) refs.push({ type: 'priceInquiry', no: r.inquiryNo });
      return refs;
    },
    downstream: [{ target: 'priceList', linkField: 'sourceApprovalNo' }],
  },
  priceList: { numberField: 'id', upstream: { field: 'sourceApprovalNo', target: 'priceApproval' } },

  // ── 财务域 ──
  // V3.113.2 修订：财务域的「来源单号」存在跨表编号体系不一致的问题
  //   - 应收/应收存的 invoiceNo 是业务发票号（SI-* / PI-*），与发票表（INV-*）不同源；
  //   - 凭证从扁平分录派生时 sourceNo 存的是凭证号自身。
  // 因此一律经 pickExistingRefs 兜底：解析不到真实目标的引用直接丢弃，绝不给点不动的死链。
  receivable: {
    // 编号字段用业务发票号（原来用 id，导致列表「上游/下游单号」列显示的是内部主键）
    numberField: 'invoiceNo',
    upstreamResolver: (r: any) => pickExistingRefs(toRef('salesInvoice', r?.invoiceNo)),
  },
  payable: {
    numberField: 'invoiceNo',
    upstreamResolver: (r: any) => pickExistingRefs(toRef('finInvoice', r?.invoiceNo)),
  },
  cashMgmt: { numberField: 'id' },
  voucher: {
    numberField: 'voucherNo',
    upstreamResolver: (r: any) => {
      if (!r?.source || !r?.sourceNo) return [];
      const map: Record<string, string> = {
        invoice: 'finInvoice', sales: 'salesOrder', inventory: 'inbound', production: 'workOrder',
        receipt: 'receivable', payment: 'paymentPlan', scrap: 'purchaseOrder', purchase: 'purchaseOrder',
      };
      const target = map[r.source];
      if (!target) return [];
      // 凭证号自身（V-PP-* / V-*）在目标源里查不到 → pickExistingRefs 自动丢弃，不给死链
      return pickExistingRefs(toRef(target, r.sourceNo));
    },
  },
  paymentPlan: {
    numberField: 'planNo',
    upstreamResolver: (r: any) => {
      const refs: RelatedDocRef[] = [];
      if (r?.purchaseOrderNo) refs.push({ type: 'purchaseOrder', no: r.purchaseOrderNo });
      if (r?.invoiceNo) refs.push({ type: 'finInvoice', no: r.invoiceNo });
      return pickExistingRefs(refs);
    },
  },

  frameworkAgreement: {
    numberField: 'agreementNo',
    upstreamResolver: (r: any) => (Array.isArray(r?.sourceRequestIds) ? r.sourceRequestIds.map((id: string) => toRef('purchaseRequest', noById('purchaseRequest', id))).flat() : []),
    downstream: [{ target: 'purchaseOrder', linkField: 'releases' }],
  },
};

// ───────────────────────────── 路由登记 ─────────────────────────────
const ROUTES: Record<string, (id: string) => string> = {
  purchaseRequest: (id) => `/purchase/${id}`,
  purchaseOrder: (id) => `/purchase/orders/${id}`,
  finInvoice: (id) => `/finance/invoices`,
  sourceList: (id) => `/purchase/source-list`,
  infoRecord: (id) => `/purchase/info-records`,
  frameworkAgreement: (id) => `/purchase/framework`,
  purchaseReturn: (id) => `/purchase/returns`,
  salesOpportunity: (id) => `/sales/prospects/${id}`,
  salesQuotation: (id) => `/sales/quotation/${id}`,
  salesOrder: (id) => `/sales/orders/${id}`,
  salesLogistics: (id) => `/sales/logistics/${id}`,
  salesInvoice: (id) => `/sales/invoices/${id}`,
  salesReturn: (id) => `/sales/returns/${id}`,
  tripartySales: (id) => `/sales/triparty/${id}`,
  salesContract: (id) => `/sales/contracts/${id}`,
  project: (id) => `/sales/projects/${id}`,
  inbound: (id) => `/warehouse/inbound/${id}`,
  outbound: (id) => `/warehouse/outbound/${id}`,
  checkTask: (id) => `/warehouse/check/${id}`,
  stockTransfer: (id) => `/warehouse/transfer/${id}`,
  inventoryAdjustment: (id) => `/warehouse/adjustment/${id}`,
  waveRfid: (id) => `/warehouse/wave-rfid/${id}`,
  inspectionNotice: (id) => `/warehouse/inspection-notice/${id}`,
  finishedGoodsInbound: (id) => `/warehouse/fg-inbound/${id}`,
  batch: (id) => `/warehouse/batch/${id}`,
  serialHU: (id) => `/warehouse/serial/${id}`,
  consignmentStock: (id) => `/warehouse/consignment/${id}`,
  inspectionTask: (id) => `/quality/inspection/${id}`,
  unqualified: (id) => `/quality/unqualified/${id}`,
  pdca: (id) => `/quality/pdca/${id}`,
  lot: (id) => `/quality/inspection-lot/${id}`,
  eightD: (id) => `/quality/8d/${id}`,
  inspectionStandard: (id) => `/quality/standards/${id}`,
  fmea: (id) => `/quality/fmea/${id}`,
  labEquipment: (id) => `/quality/lab/${id}`,
  workOrder: (id) => `/production/orders/${id}`,
  processRoute: (id) => `/production/routes/${id}`,
  subcontract: (id) => `/production/subcontract/${id}`,
  repetitiveMfg: (id) => `/production/repetitive/period/${id}`,
  ecn: (id) => `/production/ecn/${id}`,
  productionVersion: (id) => `/production/versions/${id}`,
  sopPlan: (id) => `/production/sop/${id}`,
  priceInquiry: (id) => `/price/inquiry/${id}`,
  priceComparison: (id) => `/price/comparison/${id}`,
  priceApproval: (id) => `/price/approval/${id}`,
  priceList: (id) => `/price/list`,
  receivable: (id) => `/finance/receivables`,
  payable: (id) => `/finance/payables`,
  cashMgmt: (id) => `/finance/cash`,
  voucher: (id) => `/finance/vouchers`,
  paymentPlan: (id) => `/finance/payments`,
  vendor: (id) => `/vendor/${id}`,
  material: (id) => `/material/${id}`,
  customer: (id) => `/customer/${id}`,
};

// 填充进纯逻辑模块的空表（同一引用，withRelatedDocNos / resolveRoute 立即可见）
Object.assign(DOC_SOURCES, SOURCES);
Object.assign(DOC_RELATIONS, RELS);
Object.assign(DOC_ROUTES, ROUTES);

// ─────────────────────────────────────────────────────────────
// 关系源 store 清单 + 目标类型推导（V3.113.1）
// 用途：详情页在「关联源 store 水合完成」时重算上下游，避免残留基于 mock 的死链。
// 说明：本文件已集中 import 全部业务 store，直接复用这份清单即可，
//      无需从 '@/stores' 总出口反查（避免重复打包与循环依赖）。
// ─────────────────────────────────────────────────────────────

/** 参与关联计算的业务 store（用于订阅数据变化） */
export const RELATION_STORES: Array<{ getState: () => unknown; subscribe: (fn: () => void) => () => void }> = [
  usePurchaseStore, usePurchaseAdvancedStore, usePurchaseInfoRecordStore, usePurchaseReturnStore,
  useSalesStore, useSalesAdvancedStore, useSalesContractStore, useSalesReturnStore, useConsignmentStore,
  useTripartySalesStore, useSourceListStore, useFlowStore,
  useWarehouseStore, useWarehouseAdvancedStore, useWaveRfidStore,
  useQualityStore, useQualityAdvancedStore, useQualityExtensionStore, useFMEAStore,
  useProductionStore, useProductionVersionStore, useRepetitiveMfgStore, useSubcontractStore, useSopStore, useECNStore,
  useFinanceStore, useArapStore, useCashMgmtStore, usePriceStore,
  useMaterialStore, useVendorStore, useCustomerStore,
] as never;

/**
 * 推导某单据类型「关联计算会用到的全部源类型」。
 * 含：本单自身 + 简单上游目标 + 全部下游目标；
 * 若本单用 upstreamResolver（其指向随行内字段动态决定，可能引用任意类型），
 * 则保守纳入全部已登记源类型，避免漏判导致重算不及时。
 */
export function getRelationTargetTypes(docType: string): string[] {
  const rel = DOC_RELATIONS[docType];
  const set = new Set<string>();
  if (docType) set.add(docType);
  if (rel?.upstream?.target) set.add(rel.upstream.target);
  for (const d of rel?.downstream ?? []) set.add(d.target);
  if (rel?.upstreamResolver) {
    for (const t of Object.keys(DOC_SOURCES)) set.add(t);
  }
  return Array.from(set);
}
