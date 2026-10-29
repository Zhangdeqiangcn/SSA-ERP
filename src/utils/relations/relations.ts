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
import { DOC_SOURCES, DOC_RELATIONS, DOC_ROUTES, docsByField, pickExistingRefs, type RelatedDocRef } from './documentRelations';

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

/**
 * 关联引用去重（V3.116.0）。
 * 为什么要：对账单是**按明细行**记录"这一行对的是哪张采购订单 / 哪次入库"的，
 *   一张对账单往往有多行指向同一个订单号 —— 不去重的话列里会出现
 *   「PO20240506001、PO20240506001、PO20240506001」，看起来像三张不同的单。
 */
function uniqRefs(refs: RelatedDocRef[]): RelatedDocRef[] {
  const seen = new Set<string>();
  const out: RelatedDocRef[] = [];
  for (const r of refs) {
    if (!r?.type || !r?.no) continue;
    const key = `${r.type}|${r.no}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

// ───────────────────────────── 数据源登记 ─────────────────────────────
const SOURCES: Record<string, any> = {
  purchaseRequest: {
    getDocs: () => safe(() => usePurchaseStore.getState().purchaseRequests, []),
    numberField: 'requestNo',
    ensureLoaded: () => { const s: any = usePurchaseStore.getState(); s.load?.(); },
  },
  purchaseOrder: {
    getDocs: () => safe(() => usePurchaseStore.getState().purchaseOrders, []),
    numberField: 'orderNo',
    // V3.113.2：补 ensureLoaded —— 缺它时采购订单数据在财务页不会加载，
    // 财务域的「关联采购单」因解析不到目标而被死链防线丢弃 → 链接渲染为空。
    ensureLoaded: () => { const s: any = usePurchaseStore.getState(); s.load?.(); },
  },
  finInvoice: {
    getDocs: () => safe(() => useFinanceStore.getState().invoices, []),
    numberField: 'invoiceNo',
    ensureLoaded: () => { const s: any = useFinanceStore.getState(); s.load?.(); },
  },
  sourceList: {
    getDocs: () => safe(() => useSourceListStore.getState().items, []),
    numberField: 'id',
    ensureLoaded: () => { const s: any = useSourceListStore.getState(); s.hydrateSourceList?.(); },
  },
  infoRecord: {
    getDocs: () => safe(() => usePurchaseInfoRecordStore.getState().records, []),
    numberField: 'id',
    ensureLoaded: () => { const s: any = usePurchaseInfoRecordStore.getState(); s.hydrateInfoRecords?.(); },
  },
  frameworkAgreement: {
    getDocs: () => safe(() => usePurchaseAdvancedStore.getState().frameworkAgreements, []),
    numberField: 'agreementNo',
    ensureLoaded: () => { const s: any = usePurchaseAdvancedStore.getState(); s.hydrate?.() },
  },
  purchaseReturn: {
    getDocs: () => safe(() => usePurchaseReturnStore.getState().purchaseReturns, []),
    numberField: 'returnNo',
    ensureLoaded: () => { const s: any = usePurchaseReturnStore.getState(); s.hydrate?.() },
  },

  salesOpportunity: {
    getDocs: () => safe(() => useSalesStore.getState().prospects, []),
    numberField: 'prospectNo',
    ensureLoaded: () => { const s: any = useSalesStore.getState(); s.load?.(); },
  },
  salesQuotation: {
    getDocs: () => safe(() => useSalesAdvancedStore.getState().quotations, []),
    numberField: 'quotationNo',
    ensureLoaded: () => { const s: any = useSalesAdvancedStore.getState(); s.hydrateQuotations?.(); },
  },
  salesOrder: {
    getDocs: () => safe(() => useSalesStore.getState().salesOrders, []),
    numberField: 'orderNo',
    ensureLoaded: () => { const s: any = useSalesStore.getState(); s.load?.(); },
  },
  salesLogistics: {
    getDocs: () => safe(() => useSalesStore.getState().shipments, []),
    numberField: 'shipmentNo',
    ensureLoaded: () => { const s: any = useSalesStore.getState(); s.load?.(); },
  },
  salesInvoice: {
    getDocs: () => safe(() => useSalesAdvancedStore.getState().salesInvoices, []),
    numberField: 'invoiceNo',
    ensureLoaded: () => { const s: any = useSalesAdvancedStore.getState(); s.hydrateInvoices?.(); },
  },
  salesReturn: {
    getDocs: () => safe(() => useSalesReturnStore.getState().salesReturns, []),
    numberField: 'returnNo',
    ensureLoaded: () => { const s: any = useSalesReturnStore.getState(); s.hydrate?.() },
  },
  tripartySales: {
    getDocs: () => safe(() => useTripartySalesStore.getState().list, []),
    numberField: 'docNo',
    ensureLoaded: () => { const s: any = useTripartySalesStore.getState(); s.load?.(); },
  },
  salesContract: {
    getDocs: () => safe(() => useSalesContractStore.getState().contracts, []),
    numberField: 'contractNo',
    ensureLoaded: () => { const s: any = useSalesContractStore.getState(); s.hydrateContracts?.() },
  },
  project: {
    getDocs: () => safe(() => useSalesStore.getState().projects, []),
    numberField: 'projectNo',
    ensureLoaded: () => { const s: any = useSalesStore.getState(); s.load?.(); },
  },

  inbound: {
    getDocs: () => safe(() => useWarehouseStore.getState().inboundOrders, []),
    numberField: 'inboundNo',
    ensureLoaded: () => { const s: any = useWarehouseStore.getState(); s.loadWarehouseOrders?.(); },
  },
  outbound: {
    getDocs: () => safe(() => useWarehouseStore.getState().outboundOrders, []),
    numberField: 'outboundNo',
    ensureLoaded: () => { const s: any = useWarehouseStore.getState(); s.loadWarehouseOrders?.(); },
  },
  checkTask: {
    getDocs: () => safe(() => useWarehouseStore.getState().checkTasks, []),
    numberField: 'taskNo',
    ensureLoaded: () => { const s: any = useWarehouseStore.getState(); s.loadCheckTasks?.(); },
  },
  stockTransfer: {
    getDocs: () => safe(() => useWarehouseAdvancedStore.getState().stockTransfers, []),
    numberField: 'transferNo',
    ensureLoaded: () => { const s: any = useWarehouseAdvancedStore.getState(); s.loadWarehouseAdvanced?.(); },
  },
  inventoryAdjustment: {
    getDocs: () => safe(() => useWarehouseAdvancedStore.getState().inventoryAdjustments, []),
    numberField: 'adjustmentNo',
    ensureLoaded: () => { const s: any = useWarehouseAdvancedStore.getState(); s.loadWarehouseAdvanced?.(); },
  },
  waveRfid: {
    getDocs: () => safe(() => useWaveRfidStore.getState().waves, []),
    numberField: 'waveNo',
    ensureLoaded: () => { const s: any = useWaveRfidStore.getState(); s.load?.(); },
  },
  inspectionNotice: {
    getDocs: () => safe(() => useFlowStore.getState().inspectionNotices, []),
    numberField: 'noticeNo',
    ensureLoaded: () => { const s: any = useFlowStore.getState(); s.hydrateFlow?.() },
  },
  finishedGoodsInbound: {
    getDocs: () => safe(() => useWarehouseStore.getState().finishedGoodsInbounds, []),
    numberField: 'inboundNo',
    ensureLoaded: () => { const s: any = useWarehouseStore.getState(); s.loadFinishedGoodsInbounds?.(); },
  },
  batch: {
    getDocs: () => safe(() => useWarehouseStore.getState().batchRecords, []),
    numberField: 'batchNo',
    ensureLoaded: () => { const s: any = useWarehouseStore.getState(); s.loadBatchRecords?.(); },
  },
  serialHU: {
    getDocs: () => safe(() => useWarehouseAdvancedStore.getState().serialMasters, []),
    numberField: 'serialNo',
    ensureLoaded: () => { const s: any = useWarehouseAdvancedStore.getState(); s.loadSerialMasters?.(); },
  },
  consignmentStock: {
    getDocs: () => safe(() => useConsignmentStore.getState().records, []),
    numberField: 'id',
    ensureLoaded: () => { const s: any = useConsignmentStore.getState(); s.hydrateConsignment?.(); },
  },

  inspectionTask: {
    getDocs: () => safe(() => useQualityStore.getState().inspectionTasks, []),
    numberField: 'taskNo',
    ensureLoaded: () => { const s: any = useQualityStore.getState(); s.hydrate?.() },
  },
  unqualified: {
    getDocs: () => safe(() => useQualityStore.getState().unqualifiedItems, []),
    numberField: 'itemNo',
    ensureLoaded: () => { const s: any = useQualityStore.getState(); s.hydrate?.() },
  },
  pdca: {
    getDocs: () => safe(() => useQualityStore.getState().pdcaRecords, []),
    numberField: 'pdcaNo',
    ensureLoaded: () => { const s: any = useQualityStore.getState(); s.hydrate?.() },
  },
  lot: {
    getDocs: () => safe(() => useQualityAdvancedStore.getState().inspectionLots, []),
    numberField: 'lotNo',
    ensureLoaded: () => { const s: any = useQualityAdvancedStore.getState(); s.hydrateLots?.() },
  },
  eightD: {
    getDocs: () => safe(() => useQualityExtensionStore.getState().eightDRecords, []),
    numberField: 'code',
    ensureLoaded: () => { const s: any = useQualityExtensionStore.getState(); s.hydrateQualityExtension?.() },
  },
  inspectionStandard: {
    getDocs: () => safe(() => useQualityStore.getState().inspectionStandards, []),
    numberField: 'standardNo',
    ensureLoaded: () => { const s: any = useQualityStore.getState(); s.hydrate?.() },
  },
  fmea: {
    getDocs: () => safe(() => useFMEAStore.getState().items, []),
    numberField: 'number',
    ensureLoaded: () => { const s: any = useFMEAStore.getState(); s.hydrateFMEA?.() },
  },
  labEquipment: {
    getDocs: () => safe(() => useQualityExtensionStore.getState().labEquipments, []),
    numberField: 'equipmentNo',
    ensureLoaded: () => { const s: any = useQualityExtensionStore.getState(); s.hydrateQualityExtension?.() },
  },

  workOrder: {
    getDocs: () => safe(() => useProductionStore.getState().workOrders, []),
    numberField: 'orderNo',
    ensureLoaded: () => { const s: any = useProductionStore.getState(); s.load?.(); },
  },
  processRoute: {
    getDocs: () => safe(() => useProductionStore.getState().processRoutes, []),
    numberField: 'routeNo',
    ensureLoaded: () => { const s: any = useProductionStore.getState(); s.load?.(); },
  },
  subcontract: {
    getDocs: () => safe(() => useSubcontractStore.getState().orders, []),
    numberField: 'orderNo',
    ensureLoaded: () => { const s: any = useSubcontractStore.getState(); s.loadOrders?.() },
  },
  repetitiveMfg: {
    getDocs: () => safe(() => useRepetitiveMfgStore.getState().periods, []),
    numberField: 'periodNo',
    ensureLoaded: () => { const s: any = useRepetitiveMfgStore.getState(); s.load?.(); },
  },
  ecn: {
    getDocs: () => safe(() => useECNStore.getState().ecns, []),
    numberField: 'changeNo',
    ensureLoaded: () => { const s: any = useECNStore.getState(); s.hydrateECN?.() },
  },
  productionVersion: {
    getDocs: () => safe(() => useProductionVersionStore.getState().versions, []),
    numberField: 'id',
    ensureLoaded: () => { const s: any = useProductionVersionStore.getState(); s.hydrateProductionVersion?.() },
  },
  sopPlan: {
    getDocs: () => safe(() => useSopStore.getState().items, []),
    numberField: 'id',
    ensureLoaded: () => { const s: any = useSopStore.getState(); s.load?.(); },
  },

  priceInquiry: {
    getDocs: () => safe(() => usePriceStore.getState().priceInquiries, []),
    numberField: 'inquiryNo',
    ensureLoaded: () => { const s: any = usePriceStore.getState(); s.hydratePrice?.() },
  },
  priceComparison: {
    getDocs: () => safe(() => usePriceStore.getState().priceComparisons, []),
    numberField: 'comparisonNo',
    ensureLoaded: () => { const s: any = usePriceStore.getState(); s.hydratePrice?.() },
  },
  priceApproval: {
    getDocs: () => safe(() => usePriceStore.getState().priceApprovals, []),
    numberField: 'approvalNo',
    ensureLoaded: () => { const s: any = usePriceStore.getState(); s.hydratePrice?.() },
  },
  priceList: {
    getDocs: () => safe(() => usePriceStore.getState().priceList, []),
    numberField: 'id',
    ensureLoaded: () => { const s: any = usePriceStore.getState(); s.hydratePrice?.() },
  },

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
  voucher: {
    getDocs: () => safe(() => useFinanceStore.getState().vouchers, []),
    numberField: 'voucherNo',
    // V3.113.2：补 ensureLoaded —— 否则凭证页进入时凭证数据可能尚未拉取，
    // 「来源单据」行的上游链接会因源数据为空而渲染不出。
    ensureLoaded: () => { const s: any = useFinanceStore.getState(); s.load?.(); },
  },
  paymentPlan: {
    getDocs: () => safe(() => useFinanceStore.getState().paymentPlans, []),
    numberField: 'planNo',
    ensureLoaded: () => { const s: any = useFinanceStore.getState(); s.load?.(); },
  },

  // ── 供应商门户（V3.116.0）──────────────────────────────────
  // 对账单与开票申请的数据源在 flowStore（门户业务流程），不在 financeStore。
  // 注册后门户页才能反向查到「本对账单开出的发票/付款计划」，也才能让主 ERP 侧
  // 反向把对账单挂到采购订单上（当前只在门户页展示，未在 ERP 列表铺列）。
  vendorStatement: {
    getDocs: () => safe(() => useFlowStore.getState().vendorStatements, []),
    numberField: 'statementNo',
    ensureLoaded: () => { const s: any = useFlowStore.getState(); s.hydrateFlow?.(); },
  },
  vendorInvoiceRequest: {
    getDocs: () => safe(() => useFlowStore.getState().vendorInvoiceRequests, []),
    numberField: 'requestNo',
    ensureLoaded: () => { const s: any = useFlowStore.getState(); s.hydrateFlow?.(); },
  },

  vendor: {
    getDocs: () => safe(() => useVendorStore.getState().vendors, []),
    numberField: 'vendorCode',
    ensureLoaded: () => { const s: any = useVendorStore.getState(); s.loadVendors?.(); },
  },
  material: {
    getDocs: () => safe(() => useMaterialStore.getState().materials, []),
    // V3.117.0 修正：原登记为 'materialCode' —— 但 Material 接口的编号字段是 'code'
    //   （'materialCode' 只存在于「替代料组」这种子结构上）。字段名写错导致
    //   物料永远解析不出单号 → 任何以物料为上游的关联（如 ECN）都恒为空，
    //   且不报错，只是静默查不到，极难发现。
    numberField: 'code',
    ensureLoaded: () => { const s: any = useMaterialStore.getState(); s.loadMaterials?.(); },
  },
  customer: {
    getDocs: () => safe(() => useCustomerStore.getState().customers, []),
    numberField: 'customerCode',
    ensureLoaded: () => { const s: any = useCustomerStore.getState(); s.loadCustomers?.(); },
  },
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
      // V3.115.0：兼容历史订单的单值 requestId —— 否则这类订单在申请列表里"看不见"，
      // 用户会以为申请没被下单（业务上其实已经下单了）。
      { target: 'purchaseOrder', linkField: 'requestId', matchField: 'id' },
      { target: 'priceInquiry', linkField: 'sourceRequestNo' },
    ],
    /**
     * V3.115.0 关联单据（两跳）：采购申请与入库/发票/付款之间没有直接字段，
     * 但业务上要看"这个申请最终收到货没有、开票没有、付钱没有"。
     * 取数路径：申请 --id--> 采购订单 --订单号--> 入库单/采购发票/付款计划。
     * 只做一层下钻，不做更深的递归，避免列表列数失控。
     */
    siblingTargets: ['purchaseOrder', 'inbound', 'finInvoice', 'paymentPlan'],
    siblingResolver: (r: any) => {
      if (!r?.id) return [];
      // 订单→申请的关联存两种形态：新数据 sourceRequestIds（数组）、历史数据 requestId（单值）
      const rawOrders = [
        ...docsByField('purchaseOrder', 'sourceRequestIds', r.id),
        ...docsByField('purchaseOrder', 'requestId', r.id),
      ];
      const seen = new Set<string>();
      const orders = rawOrders.filter((o) => {
        if (seen.has(o.no)) return false;
        seen.add(o.no);
        return true;
      });
      const out: RelatedDocRef[] = [];
      for (const o of orders) {
        const po = o.no;
        out.push(
          ...docsByField('inbound', 'sourceNo', po).filter((d) => {
            const list = DOC_SOURCES.inbound?.getDocs() as Record<string, any>[] | undefined;
            const hit = Array.isArray(list) ? list.find((x) => String(x.inboundNo) === d.no) : undefined;
            return hit?.type === 'purchase';
          }),
          ...docsByField('finInvoice', 'purchaseOrderNo', po),
          ...docsByField('paymentPlan', 'purchaseOrderNo', po)
        );
      }
      return out;
    },
  },
  purchaseOrder: {
    numberField: 'orderNo',
    upstreamTargets: ['purchaseRequest'],
    upstreamResolver: (r: any) => {
      const ids: string[] = Array.isArray(r?.sourceRequestIds) ? [...r.sourceRequestIds] : [];
      // V3.115.0：兼容历史单据的单值 requestId（早期采购订单只存一条申请 id，字段名也非复数），
      // 否则这类订单在列表里「采购申请」列永远是空的，用户以为申请没关联上。
      if (ids.length === 0 && r?.requestId) ids.push(String(r.requestId));
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
    upstreamTargets: ['purchaseOrder'],
    upstream: { field: 'purchaseOrderNo', target: 'purchaseOrder' },
    downstream: [
      { target: 'receivable', linkField: 'invoiceNo' },
      { target: 'payable', linkField: 'invoiceNo' },
      { target: 'voucher', linkField: 'sourceNo' },
      // V3.115.0：付款计划上存了 invoiceNo，发票列表要能看到"这张票排了哪些付款"
      { target: 'paymentPlan', linkField: 'invoiceNo' },
    ],
    // V3.115.0 同源：同一采购订单下的收货入库单（发票本身不存入库单号，只能按 PO 反查）
    siblingTargets: ['inbound'],
    siblingResolver: (r: any) =>
      r?.purchaseOrderNo
        ? docsByField('inbound', 'sourceNo', r.purchaseOrderNo).filter((d) => {
            // 仅取"采购入库"，避免把调拨/生产入库等偶然同号的单据算进来
            const ent = DOC_SOURCES.inbound?.getDocs() as Record<string, any>[] | undefined;
            const hit = ent?.find((x) => String(x.inboundNo) === d.no);
            return hit?.type === 'purchase';
          })
        : [],
  },
  purchaseReturn: { numberField: 'returnNo', upstreamTargets: ['purchaseOrder'], upstream: { field: 'purchaseOrderNo', target: 'purchaseOrder' } },

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
    upstreamTargets: ['purchaseOrder'],
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
    /**
     * V3.115.0 同源单据：采购入库单只存 sourceNo（采购订单号），发票存 purchaseOrderNo、
     * 付款计划存 purchaseOrderNo、报检单存 sourceNo —— 三者都没有入库单号，
     * 只能按"同一采购订单"反查。这正是强哥要的「入库单列表里也能看到发票/付款状态」。
     * 口径说明：一个采购订单可有多张入库单与多张发票，此处列出的是**该订单项下全部**
     * 发票/付款计划，不按批次拆分（数据模型里没有行级锚点可拆）。
     */
    siblingTargets: ['finInvoice', 'paymentPlan', 'purchaseReturn', 'inspectionNotice'],
    siblingResolver: (r: any) => {
      if (r?.type !== 'purchase' || !r?.sourceNo) return [];
      const po = String(r.sourceNo);
      let notices: RelatedDocRef[] = [];
      try {
        const list = DOC_SOURCES.inspectionNotice?.getDocs() as Record<string, any>[] | undefined;
        notices = Array.isArray(list)
          ? list
              .filter((n) => n?.sourceType === 'purchase' && String(n.sourceNo) === po)
              .map((n) => ({ type: 'inspectionNotice', no: String(n.noticeNo) }) as RelatedDocRef)
          : [];
      } catch {
        notices = [];
      }
      return [
        ...docsByField('finInvoice', 'purchaseOrderNo', po),
        ...docsByField('paymentPlan', 'purchaseOrderNo', po),
        ...docsByField('purchaseReturn', 'purchaseOrderNo', po),
        ...notices,
      ];
    },
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
    // V3.117.0：上游清单显式声明 —— 列表要稳定摆出这几列（哪怕当前这批数据解析不到），
    // 否则数据一断列就整列消失，用户以为"这张检验单天生没有采购订单"。
    upstreamTargets: ['purchaseOrder', 'workOrder', 'inbound', 'inspectionNotice'],
    upstreamResolver: (r: any) => {
      const refs: RelatedDocRef[] = [];
      if (r?.purchaseOrderNo) refs.push({ type: 'purchaseOrder', no: String(r.purchaseOrderNo) });
      if (r?.workOrderNo) refs.push({ type: 'workOrder', no: String(r.workOrderNo) });
      // 来料检验的真实依据是入库单（检验的是"这批到货"），检验任务上存了批次号，
      // 由批次号反查入库单比单纯看采购订单更贴近业务。
      if (r?.batchNo) {
        const batch = (DOC_SOURCES.batch?.getDocs() as Record<string, any>[] | undefined)?.find(
          (x) => String(x.batchNo) === String(r.batchNo)
        );
        if (batch?.inboundNo) refs.push({ type: 'inbound', no: String(batch.inboundNo) });
      }
      if (r?.inspectionLotNo) refs.push({ type: 'lot', no: String(r.inspectionLotNo) });
      if (r?.noticeNo) refs.push({ type: 'inspectionNotice', no: String(r.noticeNo) });
      // 过滤掉查不到目标的引用：宁可少给一个链接，也不给点不动的死链
      return uniqRefs(pickExistingRefs(refs));
    },
    // V3.117.0：unqualified 与 lot 各自登记了"按 id"和"按单号"两条下游，
    //   同一张单两条都命中时会重复出现（NCR-xxx,NCR-xxx）。出口统一去重。
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
    upstreamTargets: ['inspectionTask', 'inbound', 'outbound'],
    upstreamResolver: (r: any) => {
      const refs: RelatedDocRef[] = [];
      if (r?.inspectionTaskId || r?.inspectionTaskNo) refs.push({ type: 'inspectionTask', no: r.inspectionTaskNo ?? r.inspectionTaskId });
      if (r?.linkedInboundNo) refs.push({ type: 'inbound', no: r.linkedInboundNo });
      if (r?.linkedOutboundNo) refs.push({ type: 'outbound', no: r.linkedOutboundNo });
      return uniqRefs(pickExistingRefs(refs));
    },
    downstream: [
      { target: 'eightD', linkField: 'sourceNo' },
      { target: 'outbound', linkField: 'linkedOutboundNo' },
      { target: 'inbound', linkField: 'linkedInboundNo' },
    ],
  },
  pdca: {
    numberField: 'pdcaNo',
    upstreamTargets: ['inspectionTask', 'unqualified'],
    upstreamResolver: (r: any) => {
      if (r?.sourceType && r?.sourceNo) {
        // customerComplaint / internalAudit 当前未纳入关联单据体系（无数据源登记），
        // 硬映射会产出查不到的单号 → 交给 pickExistingRefs 过滤掉，不留死链。
        const map: Record<string, string> = { inspection: 'inspectionTask', unqualified: 'unqualified', customer_complaint: 'customerComplaint', internal_audit: 'internalAudit', other: 'other' };
        return pickExistingRefs(toRef(map[r.sourceType] ?? 'inspectionTask', r.sourceNo));
      }
      if (r?.relatedItemId) return pickExistingRefs(toRef('unqualified', noById('unqualified', r.relatedItemId)));
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
    upstreamTargets: ['unqualified', 'inspectionTask'],
    upstreamResolver: (r: any) => {
      if (r?.sourceType && r?.sourceNo) {
        const map: Record<string, string> = { unqualified: 'unqualified', inspection: 'inspectionTask', customer_complaint: 'customerComplaint' };
        return pickExistingRefs(toRef(map[r.sourceType] ?? 'unqualified', r.sourceNo));
      }
      return [];
    },
  },
  inspectionStandard: { numberField: 'standardNo', downstream: [{ target: 'inspectionTask', linkField: 'inspectionStandardId', matchField: 'id' }] },
  fmea: { numberField: 'number' },
  labEquipment: { numberField: 'equipmentNo' },

  // ── 生产域 ──
  // V3.117.0 改造（强哥需求：生产列表也要像采购订单那样列出关联单据、点击可跳转）：
  //   原定义只有 downstream，列表里"来源单据"一栏永远是空的 —— 工单明明由 BOM 与工艺路线
  //   定义、向上还能追到销售订单/MRP 建议，但用户在列表上看不到任何上游，也没法点进去。
  workOrder: {
    numberField: 'orderNo',
    upstreamTargets: ['processRoute', 'inspectionNotice', 'salesOrder', 'purchaseRequest'],
    upstreamResolver: (r: any) => {
      const refs: RelatedDocRef[] = [];
      // 工艺路线：工单存 routeId + routeNo 双字段，优先按编号，缺编号时回退用 id 反查
      if (r?.routeNo) refs.push({ type: 'processRoute', no: String(r.routeNo) });
      else if (r?.routeId) {
        const route = (DOC_SOURCES.processRoute?.getDocs() as Record<string, any>[] | undefined)?.find(
          (x) => String(x.id) === String(r.routeId)
        );
        if (route?.routeNo) refs.push({ type: 'processRoute', no: String(route.routeNo) });
      }
      // 销售订单 / 采购申请：工单可能由销售订单直接下达，也可能由采购申请（备货）转来
      if (r?.salesOrderNo) refs.push({ type: 'salesOrder', no: String(r.salesOrderNo) });
      if (r?.purchaseRequestNo) refs.push({ type: 'purchaseRequest', no: String(r.purchaseRequestNo) });
      if (r?.sourceWorkOrderNo) refs.push({ type: 'workOrder', no: String(r.sourceWorkOrderNo) });
      return pickExistingRefs(refs);
    },
    downstream: [
      { target: 'finishedGoodsInbound', linkField: 'workOrderNo' },
      { target: 'outbound', linkField: 'sourceNo' },
      { target: 'subcontract', linkField: 'sourceWorkOrderId', matchField: 'id' },
      { target: 'inspectionNotice', linkField: 'workOrderId', matchField: 'id' },
      { target: 'voucher', linkField: 'sourceNo' },
    ],
    /**
     * V3.117.0 同源：工单与「报检单 / 检验任务」之间没有直接单号相连 ——
     *   检验任务只存 workOrderNo，但成品检验往往是凭报检单发起的，两边单号体系不同源。
     *   业务上必须能回答"这张工单检了没有、合不合格"，故按共同工单号横向并过来。
     */
    siblingTargets: ['inspectionTask'],
    siblingResolver: (r: any) => {
      if (!r?.orderNo) return [];
      return uniqRefs(docsByField('inspectionTask', 'workOrderNo', String(r.orderNo)));
    },
  },
  processRoute: { numberField: 'routeNo' },
  subcontract: {
    numberField: 'orderNo',
    upstream: { field: 'sourceWorkOrderId', target: 'workOrder' },
    downstream: [{ target: 'outbound', linkField: 'issueOutboundNo' }, { target: 'inbound', linkField: 'receiptInboundNos' }],
  },
  repetitiveMfg: { numberField: 'periodNo' },
  /**
   * ECN（物料域工程变更，V3.117.0 补全）。
   *
   * 改造前只有一条下游（生产版本），列表里"来源单据 / 后续单据"两列全空：
   *   · 上游：ECN 只存 materialId，不存物料编码 → 必须反查物料表拿 code 才能成链；
   *   · 下游：物料域的 ECN 与生产域 ECN 是**两套独立数据源**（一套在 ecnStore、
   *     一套在 productionVersionStore.ecns），靠 linkedEcnIds 互相挂钩，
   *     但生产域 ECN 未登记为关联单据类型 → 这里不给链接，避免点出死链。
   */
  ecn: {
    numberField: 'changeNo',
    upstreamTargets: ['material'],
    upstreamResolver: (r: any) => {
      if (!r?.materialId) return [];
      const mat = (DOC_SOURCES.material?.getDocs() as Record<string, any>[] | undefined)?.find(
        (m) => String(m.id) === String(r.materialId)
      );
      // material 类型的编号字段是 Material.code（见上方 SOURCES.material 的修正说明），
      // 用 id 拼出来的引用会被 pickExistingRefs 判成不存在。
      return mat?.code ? [{ type: 'material', no: String(mat.code) }] : [];
    },
    downstream: [{ target: 'productionVersion', linkField: 'linkedChangeIds', matchField: 'id' }],
  },
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
    upstreamTargets: ['finInvoice'],
    upstreamResolver: (r: any) => pickExistingRefs(toRef('finInvoice', r?.invoiceNo)),
    // V3.115.0：应付单列表要能直接看到"这张票排了哪些付款计划"
    downstream: [{ target: 'paymentPlan', linkField: 'invoiceNo' }],
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
    upstreamTargets: ['purchaseOrder', 'finInvoice'],
    upstreamResolver: (r: any) => {
      const refs: RelatedDocRef[] = [];
      if (r?.purchaseOrderNo) refs.push({ type: 'purchaseOrder', no: r.purchaseOrderNo });
      if (r?.invoiceNo) refs.push({ type: 'finInvoice', no: r.invoiceNo });
      return pickExistingRefs(refs);
    },
    // V3.115.0 同源：同一采购订单下的采购入库单（付款计划不存入库单号，只能按 PO 反查）
    siblingTargets: ['inbound'],
    siblingResolver: (r: any) => {
      if (!r?.purchaseOrderNo) return [];
      const po = String(r.purchaseOrderNo);
      return docsByField('inbound', 'sourceNo', po).filter((d) => {
        const list = DOC_SOURCES.inbound?.getDocs() as Record<string, any>[] | undefined;
        const hit = Array.isArray(list) ? list.find((x) => String(x.inboundNo) === d.no) : undefined;
        return hit?.type === 'purchase';
      });
    },
  },

  frameworkAgreement: {
    numberField: 'agreementNo',
    upstreamResolver: (r: any) => (Array.isArray(r?.sourceRequestIds) ? r.sourceRequestIds.map((id: string) => toRef('purchaseRequest', noById('purchaseRequest', id))).flat() : []),
    downstream: [{ target: 'purchaseOrder', linkField: 'releases' }],
  },

  // ── 供应商门户：对账单（V3.116.0）──────────────────────────────────────────
  // 业务背景（强哥需求）：供应商在门户对账时，必须能一眼看到"对的是哪几张采购订单、
  //   哪几次入库、开出的发票验没验、付款计划排到哪一步"，并能点开对应单据。
  //
  // 上游（对账依据）= 明细行里逐行记的 purchaseOrderNo / inboundNo。
  //   这是对账单与采购域、仓储域**唯一**的连接点；按行取出去重，就是本单对的是哪几张单。
  // 下游（结算结果）三路，各有各的坑：
  //   · 开票申请 vendorInvoiceRequest —— 直接存 statementNo，一次反查即可；
  //   · 采购发票 finInvoice —— 发票表**不存对账单号**；唯一可信来源是对账单行开票后
  //     回写的 invoiceNo（见 VendorFinancePage.InvoiceIssueDialog）。不按发票 note 文本猜，
  //     那种"从备注里搜单号"的做法一旦文案改了就静默失效；
  //   · 付款计划 paymentPlan —— 只认发票号，故由行内 invoiceNo 再跳一层反查。
  vendorStatement: {
    numberField: 'statementNo',
    upstreamTargets: ['purchaseOrder', 'inbound'],
    upstreamResolver: (r: any) => {
      const refs: RelatedDocRef[] = [];
      for (const it of Array.isArray(r?.items) ? r.items : []) {
        if (it?.purchaseOrderNo) refs.push({ type: 'purchaseOrder', no: String(it.purchaseOrderNo) });
        if (it?.inboundNo) refs.push({ type: 'inbound', no: String(it.inboundNo) });
      }
      // 过滤掉在目标源里查不到的（宁可少给一个链接，也不给点不动的死链）
      return uniqRefs(pickExistingRefs(refs));
    },
    downstream: [{ target: 'vendorInvoiceRequest', linkField: 'statementNo' }],
    siblingTargets: ['finInvoice', 'paymentPlan'],
    siblingResolver: (r: any) => {
      const items = Array.isArray(r?.items) ? r.items : [];
      const invoiceNos = uniqRefs(
        items
          .filter((it: any) => it?.invoiceNo)
          .map((it: any) => ({ type: 'finInvoice', no: String(it.invoiceNo) }))
      );
      const refs: RelatedDocRef[] = invoiceNos.map((d) => ({ type: 'finInvoice', no: d.no }));
      for (const d of invoiceNos) refs.push(...docsByField('paymentPlan', 'invoiceNo', d.no));
      // 付款计划也可能直接挂在采购订单上（还没开票就排了付款），故订单号也反查一次 ——
      // 只认发票号会漏掉"已排付款、发票未到"这种常见情形。
      const poNos = uniqRefs(
        items
          .filter((it: any) => it?.purchaseOrderNo)
          .map((it: any) => ({ type: 'paymentPlan', no: String(it.purchaseOrderNo) }))
      );
      for (const d of poNos) refs.push(...docsByField('paymentPlan', 'purchaseOrderNo', d.no));
      // 这里**不**做存在性过滤：行上记着发票号却查不到台账，本身就是"跨系统未同步"
      // 这个异常的信号，渲染层会把它降级为灰色不可点单号，比直接吞掉更有信息量。
      return uniqRefs(refs);
    },
    // 门户私有状态：与本类型通用语义冲突的才声明（draft/closed 等沿用通用字典）
    statusLabels: {
      submitted: { label: '待审批', color: 'warning' },
      reviewing: { label: '审批中', color: 'info' },
      sent: { label: '已发送', color: 'info' },
      confirmed: { label: '已确认', color: 'success' },
      disputed: { label: '有争议', color: 'error' },
    },
  },

  // ── 供应商门户：开票申请（V3.116.0）────────────────────────────────────────
  vendorInvoiceRequest: {
    numberField: 'requestNo',
    upstreamTargets: ['vendorStatement'],
    upstreamResolver: (r: any) => pickExistingRefs(toRef('vendorStatement', r?.statementNo)),
    siblingTargets: ['finInvoice', 'paymentPlan'],
    siblingResolver: (r: any) => {
      if (!r?.invoiceNo) return [];
      const no = String(r.invoiceNo);
      return uniqRefs([{ type: 'finInvoice', no }, ...docsByField('paymentPlan', 'invoiceNo', no)]);
    },
    // 这几个 key 的通用语义在门户里是错的，必须覆盖：
    //   issued 通用=「已发料」→ 这里是「已开票」；received 通用=「已收货」→ 这里是「已收票」；
    //   pending 通用=「待处理」→ 这里是「待发起」（定时开票尚未到点）。
    statusLabels: {
      pending: { label: '待发起', color: 'warning' },
      submitted: { label: '待客户同意', color: 'info' },
      approved: { label: '客户已同意', color: 'success' },
      issued: { label: '已开票', color: 'success' },
      received: { label: '已收票', color: 'success' },
      verified: { label: '已认证', color: 'success' },
      rejected: { label: '已退回', color: 'error' },
    },
  },
};

// ───────────────────────────── 路由登记 ─────────────────────────────
const ROUTES: Record<string, (id: string) => string> = {
  purchaseRequest: (id) => `/purchase/${id}`,
  purchaseOrder: (id) => `/purchase/orders/${id}`,
  // V3.115.0 深链：财务域原先一律跳列表首页（/finance/invoices），点单号等于没反应。
  //   现改为带 focus=<实体id>，由各列表页读参数自动打开该单据的详情 —— 才能真正"点开单据"。
  finInvoice: (id) => `/finance/invoices?focus=${encodeURIComponent(id)}`,
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
  receivable: (id) => `/finance/receivables?focus=${encodeURIComponent(id)}`,
  payable: (id) => `/finance/payables?focus=${encodeURIComponent(id)}`,
  cashMgmt: (id) => `/finance/cash?focus=${encodeURIComponent(id)}`,
  voucher: (id) => `/finance/vouchers?focus=${encodeURIComponent(id)}`,
  paymentPlan: (id) => `/finance/payments?focus=${encodeURIComponent(id)}`,
  vendor: (id) => `/vendor/${id}`,
  material: (id) => `/material/${id}`,
  customer: (id) => `/customer/${id}`,
  // 供应商门户（V3.116.0）
  // 门户内点关联单号默认走「门户内只读速览弹窗」，不出门户、不要求主 ERP 登录权限。
  // 这里仍登记路由的原因：pickExistingRefs / resolveRoute 用"能否解析出路由"判定单据是否存在，
  // 不登记会被当成死链直接丢掉 —— 真实存在的对账单反而从关联列消失。
  vendorStatement: (id) => `/vendor-portal/purchase/statements?focus=${encodeURIComponent(id)}`,
  vendorInvoiceRequest: (id) => `/vendor-portal/finance/invoices?focus=${encodeURIComponent(id)}`,
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
  // V3.115.0：同源（兄弟）单据类型纳入订阅范围，数据替换时才能触发列表重算
  for (const t of rel?.siblingTargets ?? []) set.add(t);
  if (rel?.upstreamResolver) {
    for (const t of Object.keys(DOC_SOURCES)) set.add(t);
  }
  return Array.from(set);
}
