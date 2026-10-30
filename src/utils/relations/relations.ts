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
  /**
   * 商机（V3.119.0 修正）。
   *
   * 原写法 { target: 'salesQuotation', linkField: 'sourceProspectId' } 有个致命错误：
   *   downstream 的匹配基准默认是本单的 numberField（商机单号 PRO202406001），
   *   而报价单的 sourceProspectId 存的是商机的 **id**（pro-001）—— 两者永远不相等，
   *   于是商机列表的「销售报价单」列恒为空，且不报任何错。
   *   必须显式 matchField:'id' 才算对（同 V3.117.0 不合格品单 inspectionTaskId 的先例）。
   */
  salesOpportunity: {
    numberField: 'prospectNo',
    downstream: [{ target: 'salesQuotation', linkField: 'sourceProspectId', matchField: 'id' }],
  },
  salesQuotation: {
    numberField: 'quotationNo',
    // V3.119.0：显式声明上游，让「商机」列在数据断链时也能稳定出列（否则整列静默消失）
    upstreamTargets: ['salesOpportunity'],
    upstreamResolver: (r: any) => toRef('salesOpportunity', noById('salesOpportunity', r?.sourceProspectId)),
    downstream: [{ target: 'salesOrder', linkField: 'convertedOrderNo' }, { target: 'salesOrder', linkField: 'convertedOrderId', matchField: 'id' }],
  },
  /**
   * 销售订单（V3.119.0 修正）。
   *
   * 改造前有三处让「下游单据」列大面积失真：
   *   ① { target: 'workOrder', linkField: 'orderNo' } —— 去工单表里找 orderNo 等于**销售订单号**的工单，
   *      但工单从来不存销售订单号（它只有自己的 orderNo），这条规则恒为空。销售订单真实的工单关联
   *      存在 linkedWorkOrders[] 数组里（{ workOrderId, workOrderNo }），必须按这个数组反查。
   *   ② { target: 'salesContract', linkField: 'contractNo' } —— 合同号已在 upstream 里认过一次，
   *      同一张合同又被当成下游列出，用户会看到「上游=合同A，下游=合同A」这种自指。
   *   ③ { target: 'outbound', linkField: 'sourceNo' } —— 销售出库单的 sourceNo 语义是「来源单号」，
   *      手工出库时甚至存的是别的出库单号；只按单号相等匹配会把 A 单的出库算到 B 单头上。
   *      改为按 type='sale' + 客户/物料/日期综合判定太脆，这里退而求其次：只认 type='sale' 且
   *      sourceNo 精确等于本订单号的出库单，并额外接入同源反查（见 siblingResolver）。
   */
  salesOrder: {
    numberField: 'orderNo',
    upstreamTargets: ['salesContract', 'salesQuotation'],
    upstreamResolver: (r: any) => {
      const refs: RelatedDocRef[] = [];
      if (r?.contractNo) refs.push({ type: 'salesContract', no: String(r.contractNo) });
      // 报价转订单：报价单上存 convertedOrderNo / convertedOrderId，从订单侧看不到，
      // 只能反查。这是「这张订单是从哪张报价转来的」的唯一可信路径。
      if (r?.orderNo) {
        refs.push(...docsByField('salesQuotation', 'convertedOrderNo', String(r.orderNo)));
      }
      return pickExistingRefs(refs);
    },
    downstream: [
      { target: 'salesLogistics', linkField: 'salesOrderNo' },
      { target: 'outbound', linkField: 'sourceNo' },
      { target: 'salesInvoice', linkField: 'salesOrderNo' },
      { target: 'salesReturn', linkField: 'salesOrderNo' },
      { target: 'voucher', linkField: 'sourceNo' },
    ],
    // 工单只能靠 linkedWorkOrders 数组反查（见上方 ① 的说明），普通 linkField 表达不了。
    siblingTargets: ['workOrder'],
    siblingResolver: (r: any) => {
      const refs: RelatedDocRef[] = [];
      for (const w of Array.isArray(r?.linkedWorkOrders) ? r.linkedWorkOrders : []) {
        if (w?.workOrderNo) refs.push({ type: 'workOrder', no: String(w.workOrderNo) });
        else if (w?.workOrderId) {
          const no = noById('workOrder', w.workOrderId);
          if (no) refs.push({ type: 'workOrder', no });
        }
      }
      return uniqRefs(pickExistingRefs(refs));
    },
  },
  salesLogistics: {
    numberField: 'shipmentNo',
    upstreamTargets: ['salesOrder', 'project'],
    upstreamResolver: (r: any) => {
      const refs: RelatedDocRef[] = [];
      if (r?.salesOrderNo) refs.push({ type: 'salesOrder', no: String(r.salesOrderNo) });
      if (r?.projectNo) refs.push({ type: 'project', no: String(r.projectNo) });
      return pickExistingRefs(refs);
    },
    // 发货会触发销售出库（见 V3.59.0 联动），出库单 sourceNo 存发货单号
    downstream: [{ target: 'outbound', linkField: 'sourceNo' }],
  },
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
  /**
   * 三方代销（V3.119.0）。
   *
   * 诚实边界：本单据的数据模型里**没有任何指向其他业务单据的单号字段** ——
   *   TripartySale 只有 docNo（自身单号）、partyCode/partyName（经销商）、customerId（客户外键）、
   *   materialCode（物料编码）。它既没有 sourceNo（不追溯到销售订单/出库单），
   *   也没有被别的单据按单号引用。因此「销售订单 / 出库单」这类列构造不出来，
   *   写上去只会是恒空的假列，故不登记。
   *
   * 唯一真实可连的是客户外键：customerId 有值时按 id 反查客户档案。
   *   upstreamTargets 显式声明 customer，是为了让「客户」列稳定出列（哪怕当前数据没填外键），
   *   让用户看得见「这里本该关联到客户档案」；填了外键的行则可直接点进客户。
   */
  tripartySales: {
    numberField: 'docNo',
    upstreamTargets: ['customer'],
    // 注意：toRef 收的是「单号」不是 id，而 customer 的 numberField 是 customerCode，
    // 故须先用 noById 把 customerId 换成客户编码，否则查不到目标、被 pickExistingRefs 丢弃。
    upstreamResolver: (r: any) => toRef('customer', noById('customer', r?.customerId)),
  },
  /**
   * 销售合同（V3.119.0）。
   * 合同→订单的关联存两份：合同侧 linkedOrderNos[]（由订单 contractId 回填，P0-2 补的），
   * 订单侧 contractNo。只认一边都不可靠 —— 历史数据里存在「订单有合同号、合同 linkedOrderNos 未回填」
   * 与反之的情况，故两条都查再合并去重。
   */
  salesContract: {
    numberField: 'contractNo',
    downstream: [{ target: 'salesOrder', linkField: 'contractNo' }],
    siblingTargets: ['salesOrder'],
    siblingResolver: (r: any) => {
      const refs: RelatedDocRef[] = [];
      for (const no of Array.isArray(r?.linkedOrderNos) ? r.linkedOrderNos : []) {
        if (no) refs.push({ type: 'salesOrder', no: String(no) });
      }
      if (r?.id) refs.push(...docsByField('salesOrder', 'contractId', String(r.id)));
      return uniqRefs(pickExistingRefs(refs));
    },
  },
  /**
   * 项目（V3.119.0）。
   * 改造前只有 { target: 'salesOrder', linkField: 'projectNo' } —— 要求销售订单上存 projectNo。
   * 实际 SalesOrder 确实有 projectNo 字段，但种子数据与多数真实单据并未回填，且项目侧自己就存了
   * linkedOrders[]。两条都查，避免「项目明明挂了订单、列表里却显示无」。
   */
  project: {
    numberField: 'projectNo',
    downstream: [{ target: 'salesOrder', linkField: 'projectNo' }],
    siblingTargets: ['salesOrder', 'salesLogistics'],
    siblingResolver: (r: any) => {
      const refs: RelatedDocRef[] = [];
      for (const no of Array.isArray(r?.linkedOrders) ? r.linkedOrders : []) {
        if (no) refs.push({ type: 'salesOrder', no: String(no) });
      }
      if (r?.projectNo) refs.push(...docsByField('salesLogistics', 'projectNo', String(r.projectNo)));
      return uniqRefs(pickExistingRefs(refs));
    },
  },

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
  /**
   * 库存调拨单（V3.119.0 补全）。
   * 调拨单自身不存任何上游业务单号（只有源/目标仓库与物料明细），所以「上游」只能靠
   * 其他单据反向引用它：入库单 type='transfer' / 出库单 type='transfer' 的 sourceNo 存调拨单号。
   * 这意味着调拨单列表要看到「这次调拨产生了哪张入库、哪张出库」，必须用 siblingResolver 反查，
   * 正向 linkField 永远查不到（调拨单上没有"我的入库单号"这个字段，一张调拨可能分多次收发货）。
   */
  stockTransfer: {
    numberField: 'transferNo',
    siblingTargets: ['inbound', 'outbound'],
    siblingResolver: (r: any) => {
      if (!r?.transferNo) return [];
      const onlyTransfer = (type: string) => (d: RelatedDocRef) => {
        const list = DOC_SOURCES[type]?.getDocs() as Record<string, any>[] | undefined;
        const hit = Array.isArray(list) ? list.find((x) => String(x[type === 'inbound' ? 'inboundNo' : 'outboundNo']) === d.no) : undefined;
        return hit?.type === 'transfer';
      };
      return uniqRefs([
        ...docsByField('inbound', 'sourceNo', String(r.transferNo)).filter(onlyTransfer('inbound')),
        ...docsByField('outbound', 'sourceNo', String(r.transferNo)).filter(onlyTransfer('outbound')),
      ]);
    },
  },
  /**
   * 库存调整单（V3.119.0 补全）。
   * 调整单是「盘点差异过账」的载体（见 V3.57.0 W1），它会生成凭证；盘点任务过账时
   * 也可能连带生成调整单。可用连接点只有凭证号（voucherNo 字段），故下游只挂凭证，
   * 上游按盘点任务反查（盘点任务表不存调整单号，只能从调整单备注/来源推断，此处不做猜测）。
   */
  inventoryAdjustment: {
    numberField: 'adjustmentNo',
    downstream: [{ target: 'voucher', linkField: 'sourceNo' }],
  },
  /**
   * 盘点任务（V3.119.0 补全）。
   * CheckTask 无上游字段（只有仓库、盘点范围与明细），它是一切的**起点**，
   * 下游是「本次盘点过账后产生的库存调整单」。两者之间没有共用的单号字段，
   * 调整单上也没有 taskNo，只能按「同仓库 + 同日期区间」猜 —— 这种猜测会产生错误关联，
   * 因此这里**明确不连**，保持列空并在文档中说明，绝不硬凑一个假关联。
   */
  checkTask: { numberField: 'taskNo' },
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
    // V3.119.0：原 downstream: [{ target:'inspectionTask', linkField:'noticeNo' }] 恒为空 ——
    //   InspectionTask（types/quality.ts）没有 noticeNo 字段，它只有 purchaseOrderNo / workOrderNo。
    //   报检单与检验任务之间没有直接单号引用，只能按「共同来源单号」横向并联（同源关联）：
    //     报检单的 sourceNo 是采购订单号或工单号，检验任务上也存同一个号 → 二者同属一次检验。
    //   走 siblingResolver 表达，避免假装存在一个不存在的字段。
    siblingTargets: ['inspectionTask'],
    siblingResolver: (r: any) => {
      if (!r?.sourceNo) return [];
      const refs: RelatedDocRef[] = [];
      if (r?.sourceType === 'purchase') refs.push(...docsByField('inspectionTask', 'purchaseOrderNo', String(r.sourceNo)));
      else if (r?.sourceType === 'production') refs.push(...docsByField('inspectionTask', 'workOrderNo', String(r.sourceNo)));
      return uniqRefs(pickExistingRefs(refs));
    },
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
      // V3.119.0：移除 { target:'pdca', linkField:'sourceNo' }。
      //   PDCARecord 没有 sourceNo 字段（只有 relatedItemId 指向不合格品明细），
      //   这条规则永远匹配不到 → 检验任务列表的「PDCA」列恒空。
      //   PDCA 与检验任务的关联走反向路径：PDCA.relatedItemId → 不合格品单 → inspectionTaskId。
      //   留一条永远为空的规则，比没有更容易误导维护者，故删除。
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
      // V3.119.0：移除 { target:'outbound', linkField:'linkedOutboundNo' } 与
      //   { target:'inbound', linkField:'linkedInboundNo' } —— 方向写反了：
      //   linkedOutboundNo / linkedInboundNo 是**本单（不合格品单）自己的字段**，
      //   不是出库单/入库单上的字段。downstream 的语义是"去目标表里找 linkField 等于本单号"，
      //   而目标表根本没有这两个字段 → 规则恒空。
      //   这两张单据的真实关系已在上面 upstreamResolver 里正确表达（读本单字段 → 指向目标单号）。
    ],
  },
  /**
   * PDCA 单（V3.119.0 修正）。
   *
   * 原实现读 r.sourceType / r.sourceNo 定位上游 —— 但 PDCARecord 类型里没有这两个字段
   *   （见 types/quality.ts：只有 source 与 relatedItemId），读出来恒为 undefined，
   *   于是 PDCA 的「来源单据」永远解析不出来。这两个分支实际是死代码。
   *   真实可用的连接是 relatedItemId（指向不合格品单的 id），按它反查单号。
   *   source='inspection' 这类只标明"来自哪类问题"，不含具体单号，无法据此连单据 —— 不硬凑。
   *
   * downstream 原按 { target:'eightD', linkField:'sourceNo' }：8D 是否真有 sourceNo 字段
   *   由 eightD 的 source 登记决定，见下方 eightD 段；此处保留，若目标无该字段则恒空但不报错。
   */
  pdca: {
    numberField: 'pdcaNo',
    upstreamTargets: ['unqualified'],
    upstreamResolver: (r: any) => pickExistingRefs(toRef('unqualified', noById('unqualified', r?.relatedItemId))),
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
    downstream: [
      { target: 'eightD', linkField: 'sourceNo' },
      // V3.119.0：同 inspectionTask，移除 { target:'pdca', linkField:'sourceNo' }
      //   —— PDCARecord 无 sourceNo 字段，规则恒空。PDCA 走 relatedItemId 反向关联。
    ],
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
  /**
   * 询价单（V3.119.0 修正）。
   *
   * 原写法 upstream: { field: 'sourceRequestNo', target: 'purchaseRequest' } 恒为空：
   *   sourceRequestNo 是 **明细行(items)上的字段**（见 types/price.ts 的 PriceInquiryItem），
   *   单据头上没有这个字段 → 读 row.sourceRequestNo 永远是 undefined。
   *   改为 upstreamResolver：扫明细行，收集所有 sourceRequestNo 去重。
   */
  priceInquiry: {
    numberField: 'inquiryNo',
    upstreamTargets: ['purchaseRequest'],
    upstreamResolver: (r: any) => {
      const refs: RelatedDocRef[] = [];
      for (const it of Array.isArray(r?.items) ? r.items : []) {
        if (it?.sourceRequestNo) refs.push({ type: 'purchaseRequest', no: String(it.sourceRequestNo) });
      }
      return uniqRefs(pickExistingRefs(refs));
    },
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
    // V3.119.0：移除 downstream: [{ target:'purchaseOrder', linkField:'releases' }]。
    //   PurchaseOrder 类型（types/purchase.ts）里根本没有 releases 字段，全项目仅此一处引用 ——
    //   这条规则是凭想象写的，永远匹配不到（框架协议列表的「采购订单」列恒空且不报错）。
    //   采购订单侧目前没有任何指向框架协议的单号字段（只有 requestId/sourceRequestIds 指向采购申请），
    //   在数据模型补字段之前，这里保持不登记，而不是留一条永远为空的假规则。
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
