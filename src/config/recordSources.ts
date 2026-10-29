// ─────────────────────────────────────────────────────────────
// 全局搜索 · 业务记录源登记表（V3.71.0 全覆盖）
// ============================================================
// 背景（V3.70.0 遗留项①「记录搜索只覆盖 12 类高频单据，冷门台账后续按需加」）：
//   本文件把原先 globalSearch.ts 里硬编码的 12 个源，升级为**配置驱动的登记表**，
//   覆盖全部业务域台账（采购/销售/生产/仓库/质量/财务/供应商绩效），冷门台账
//   （凭证、资金流水、发票、应收应付、NCR、8D、批次、序列号、退货、设备、工艺路线…）
//   一并纳入。以后要再加一张台账，**只加一行**，引擎（globalSearch）与 UI（Header
//   下拉 + 独立结果页）零改动。
//
// 设计原则：
//   - store 一律动态 import（storePath）：本登记表被 Header 顶栏（App 早期加载链）
//     与独立结果页共引，静态引几十个业务 store 有循环依赖风险，动态导入彻底杜绝。
//   - **hookKey**：动态 import 拿到的是「模块」，取 store 实例得用该模块导出的
//     hook 名（如 useFMEAStore / useBOMStore，无法从文件名套公式推出）。逐一坐实，
//     引擎 `mod[hookKey].getState()` 取实例，取错会 undefined → 该源白屏，故显式登记。
//   - 字段口径以「类型定义 + 既有 12 源」坐实，pick() 里读不到就是 undefined，
//     引擎侧 `fields.some(f => f && f.includes(q))` 对 undefined 自动跳过，不会崩。
//   - **数据真实性闸门（loadedGate）**：B 类「云端数据库（D1）关系表」台账若尚未
//     加载完成（loaded 非 true），当前切片里是「演示假数据（mock 种子）」——此时**跳过
//     该源**，宁可少结果不可搜出假数据（比"搜不到"更糟）。A 类「本地持久化（persist）」
//     台账是用户本机真实数据，直接读，不置闸门。
//   - **按需预取（ensureLoaded）**：B 类台账系统启动时未必预加载，搜索时幂等拉一次
//     （拉完走内存，之后零请求）；失败/离线就降级跳过（闸门判 false），不阻塞其他源。
// ─────────────────────────────────────────────────────────────

/** 单条记录 → 展示三件套（标题 / 次行 / 参与模糊匹配的全部字段） */
export interface RecordPick {
  title: string;
  sub?: string;
  fields: string[];
}

/** 一个记录源 = 一个台账切片 */
export interface RecordSource {
  /** 动态 import 的 store 模块路径（相对 src 的 @/ 别名） */
  storePath: string;
  /** 该 store 模块导出的 hook 名（引擎用它 .getState() 取实例） */
  hookKey: string;
  /** store 实例上该台账的顶层切片字段名（如 'vouchers'、'receivables'） */
  slice: string;
  /** 数据权限口径（MODULE_RLS_SCOPE 的合法键；限 9 个：materials/production/finance/warehouse/quality/purchase/vendor/sales/customer） */
  moduleKey: string;
  /** 搜索分组名（下拉里的 recordType Chip、结果页的分组标题） */
  recordType: string;
  /** 从一行记录提取展示三件套 */
  pick: (r: any) => RecordPick;
  /** 点击跳到的路由（有详情路由跳详情，无则落列表页） */
  path: (r: any) => string;
  /** B 类（D1 关系表）：幂等预取方法（搜索时拉一次真实数据，拉完走内存） */
  ensureLoaded?: (st: any) => Promise<void>;
  /** B 类（D1 关系表）：数据真实性闸门——返回 false 时本源跳过（避免 mock 种子混入） */
  loadedGate?: (st: any) => boolean;
}

// ═══════════════════════════════════════════════════════════════
// 台账登记表（按业务域分组；★ = 本次由 12 源新纳入的台账）
// ═══════════════════════════════════════════════════════════════
export const RECORD_SOURCES: RecordSource[] = [
  // ───────── 采购域（purchase / vendor）───────────────────────
  {
    storePath: '@/stores/purchaseStore', hookKey: 'usePurchaseStore', slice: 'purchaseRequests', moduleKey: 'purchase', recordType: '采购申请',
    pick: (r) => ({ title: r.requestNo, sub: r.title, fields: [r.requestNo, r.title, r.department] }),
    path: () => '/purchase/requests',
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/purchaseStore', hookKey: 'usePurchaseStore', slice: 'purchaseOrders', moduleKey: 'purchase', recordType: '采购订单',
    pick: (r) => ({ title: r.orderNo, sub: [r.vendorName, r.status].filter(Boolean).join(' · '), fields: [r.orderNo, r.vendorName, r.status] }),
    path: (r) => `/purchase/orders/${r.id}`,
    ensureLoaded: (st) => st.loadPurchaseOrders?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/purchaseStore', hookKey: 'usePurchaseStore', slice: 'vendorQuotes', moduleKey: 'vendor', recordType: '供应商报价',
    pick: (r) => ({ title: r.quoteNo ?? r.id, sub: [r.vendorName, r.status].filter(Boolean).join(' · '), fields: [r.quoteNo, r.vendorName, r.status, r.materialCode, r.materialName] }),
    path: () => '/purchase/requests',
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/purchaseAdvancedStore', hookKey: 'usePurchaseAdvancedStore', slice: 'frameworkAgreements', moduleKey: 'purchase', recordType: '框架协议',
    pick: (r) => ({ title: r.agreementNo, sub: [r.vendorName, r.status].filter(Boolean).join(' · '), fields: [r.agreementNo, r.vendorName, r.status] }),
    path: () => '/purchase/framework',
    ensureLoaded: (st) => st.hydrate?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/purchaseReturnStore', hookKey: 'usePurchaseReturnStore', slice: 'purchaseReturns', moduleKey: 'purchase', recordType: '采购退货',
    pick: (r) => ({ title: r.returnNo, sub: [r.vendorName, r.status].filter(Boolean).join(' · '), fields: [r.returnNo, r.vendorName, r.status, r.reason] }),
    path: () => '/purchase/returns',
    ensureLoaded: (st) => st.hydrate?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/subcontractStore', hookKey: 'useSubcontractStore', slice: 'orders', moduleKey: 'purchase', recordType: '委外订单',
    pick: (r) => ({ title: r.orderNo, sub: [r.materialName, r.vendorName, r.status].filter(Boolean).join(' · '), fields: [r.orderNo, r.materialCode, r.materialName, r.vendorName, r.status] }),
    path: () => '/production/subcontract',
    ensureLoaded: (st) => st.loadOrders?.(),
    loadedGate: (st) => st.loaded !== false,
  },

  // ───────── 销售域（sales / customer）─────────────────────────
  {
    storePath: '@/stores/salesStore', hookKey: 'useSalesStore', slice: 'salesOrders', moduleKey: 'sales', recordType: '销售订单',
    pick: (r) => ({ title: r.orderNo, sub: [r.customerName, r.status].filter(Boolean).join(' · '), fields: [r.orderNo, r.customerName, r.status] }),
    path: (r) => `/sales/orders/${r.id}`,
    ensureLoaded: (st) => st.loadSalesOrders?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/salesStore', hookKey: 'useSalesStore', slice: 'prospects', moduleKey: 'sales', recordType: '意向客户',
    pick: (r) => ({ title: r.companyName, sub: [r.contactName, r.status].filter(Boolean).join(' · '), fields: [r.companyName, r.contactName, r.contactPhone, r.status] }),
    path: () => '/sales/prospects',
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/salesStore', hookKey: 'useSalesStore', slice: 'shipments', moduleKey: 'sales', recordType: '发货单',
    pick: (r) => ({ title: r.shipmentNo, sub: [r.customerName, r.status].filter(Boolean).join(' · '), fields: [r.shipmentNo, r.salesOrderNo, r.customerName, r.status] }),
    path: () => '/sales/logistics',
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/salesStore', hookKey: 'useSalesStore', slice: 'projects', moduleKey: 'sales', recordType: '销售项目',
    pick: (r) => ({ title: r.projectName, sub: [r.customerName, r.status].filter(Boolean).join(' · '), fields: [r.projectNo, r.projectName, r.customerName, r.status] }),
    path: (r) => `/sales/projects/${r.id}`,
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/salesContractStore', hookKey: 'useSalesContractStore', slice: 'contracts', moduleKey: 'sales', recordType: '销售合同',
    pick: (r) => ({ title: r.contractNo || r.name, sub: [r.name, r.customerName].filter(Boolean).join(' · '), fields: [r.contractNo, r.name, r.customerName] }),
    path: (r) => `/sales/contracts/${r.id}`,
    ensureLoaded: (st) => st.hydrateContracts?.(),
  },
  {
    storePath: '@/stores/salesAdvancedStore', hookKey: 'useSalesAdvancedStore', slice: 'quotations', moduleKey: 'sales', recordType: '销售报价',
    pick: (r) => ({ title: r.quotationNo, sub: [r.customerName, r.status].filter(Boolean).join(' · '), fields: [r.quotationNo, r.customerName, r.status] }),
    path: () => '/sales/quotation',
    ensureLoaded: (st) => st.hydrateQuotations?.(),
  },
  {
    storePath: '@/stores/salesAdvancedStore', hookKey: 'useSalesAdvancedStore', slice: 'salesInvoices', moduleKey: 'sales', recordType: '销售发票',
    pick: (r) => ({ title: r.invoiceNo, sub: [r.customerName, r.status].filter(Boolean).join(' · '), fields: [r.invoiceNo, r.salesOrderNo, r.customerName, r.status] }),
    path: () => '/sales/invoices',
    // 销售发票为 A 类本地持久化台账（persist，本机真实数据），非 B 类云端切片，不置预取与闸门
  },
  {
    storePath: '@/stores/salesReturnStore', hookKey: 'useSalesReturnStore', slice: 'salesReturns', moduleKey: 'sales', recordType: '销售退货',
    pick: (r) => ({ title: r.returnNo, sub: [r.customerName, r.status].filter(Boolean).join(' · '), fields: [r.returnNo, r.salesOrderNo, r.customerName, r.status, r.reason] }),
    path: () => '/sales/returns',
    ensureLoaded: (st) => st.hydrate?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/customerStore', hookKey: 'useCustomerStore', slice: 'customers', moduleKey: 'customer', recordType: '客户',
    pick: (c) => ({ title: `${c.code} · ${c.name}`, sub: c.shortName ? `简称 ${c.shortName}` : undefined, fields: [c.code, c.name, c.shortName] }),
    path: (c) => `/sales/customers/${c.id}`,
    ensureLoaded: (st) => st.loadCustomers?.(),
    loadedGate: (st) => st.loaded !== false,
  },

  // ───────── 生产域（production）───────────────────────────────
  {
    storePath: '@/stores/productionStore', hookKey: 'useProductionStore', slice: 'workOrders', moduleKey: 'production', recordType: '工单',
    pick: (r) => ({ title: r.orderNo, sub: [r.productName, r.status].filter(Boolean).join(' · '), fields: [r.orderNo, r.productCode, r.productName, r.status] }),
    path: (r) => `/production/orders/${r.id}`,
    ensureLoaded: (st) => st.loadWorkOrders?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/productionStore', hookKey: 'useProductionStore', slice: 'processRoutes', moduleKey: 'production', recordType: '工艺路线',
    pick: (r) => ({ title: `${r.routeNo} · ${r.name}`, sub: [r.productName, r.status].filter(Boolean).join(' · '), fields: [r.routeNo, r.name, r.productCode, r.productName, r.status] }),
    path: () => '/production/routes',
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/productionStore', hookKey: 'useProductionStore', slice: 'mrpRecommendations', moduleKey: 'production', recordType: 'MRP建议',
    pick: (r) => ({ title: r.materialName, sub: [r.materialCode, r.priority, r.type].filter(Boolean).join(' · '), fields: [r.materialCode, r.materialName, r.reason, r.priority, r.type] }),
    path: () => '/production/mrp',
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/bomStore', hookKey: 'useBOMStore', slice: 'bomList', moduleKey: 'production', recordType: 'BOM',
    pick: (r) => ({ title: `${r.bomNo} · ${r.name}`, sub: [r.productCode, r.productName].filter(Boolean).join(' / '), fields: [r.bomNo, r.name, r.productCode, r.productName] }),
    path: (r) => `/bom/${r.id}`,
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded === true, // bom 未加载态为 false，严格用 ===true
  },
  {
    storePath: '@/stores/productionOperationStore', hookKey: 'useProductionOperationStore', slice: 'workCenters', moduleKey: 'production', recordType: '工作中心',
    pick: (r) => ({ title: r.name ?? r.code, sub: [r.type, r.status].filter(Boolean).join(' · '), fields: [r.code, r.name, r.type] }),
    path: () => '/production/operation-reporting',
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/equipmentStore', hookKey: 'useEquipmentStore', slice: 'equipments', moduleKey: 'production', recordType: '设备',
    pick: (r) => ({ title: `${r.code} · ${r.name}`, sub: [r.category, r.status].filter(Boolean).join(' · '), fields: [r.code, r.name, r.category, r.status] }),
    path: () => '/production/equipment',
    ensureLoaded: (st) => st.hydrateEquipment?.(),
  },
  {
    storePath: '@/stores/equipmentStore', hookKey: 'useEquipmentStore', slice: 'maintenanceOrders', moduleKey: 'production', recordType: '保养工单',
    pick: (r) => ({ title: r.equipmentName, sub: [r.type, r.status].filter(Boolean).join(' · '), fields: [r.equipmentCode, r.equipmentName, r.type, r.status] }),
    path: () => '/production/equipment',
    ensureLoaded: (st) => st.hydrateEquipment?.(),
  },

  // ───────── 仓库域（warehouse）────────────────────────────────
  {
    storePath: '@/stores/warehouseStore', hookKey: 'useWarehouseStore', slice: 'inboundOrders', moduleKey: 'warehouse', recordType: '入库单',
    pick: (r) => ({ title: r.inboundNo, sub: [r.vendorName, r.sourceNo].filter(Boolean).join(' · '), fields: [r.inboundNo, r.vendorName, r.sourceNo] }),
    path: () => '/warehouse/inbound',
    ensureLoaded: (st) => st.loadWarehouseOrders?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/warehouseStore', hookKey: 'useWarehouseStore', slice: 'outboundOrders', moduleKey: 'warehouse', recordType: '出库单',
    pick: (r) => ({ title: r.outboundNo, sub: [r.customerName, r.vendorName, r.sourceNo].filter(Boolean).join(' · '), fields: [r.outboundNo, r.customerName, r.vendorName, r.sourceNo] }),
    path: (r) => `/warehouse/outbound/${r.id}`,
    ensureLoaded: (st) => st.loadWarehouseOrders?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/warehouseStore', hookKey: 'useWarehouseStore', slice: 'inventoryRecords', moduleKey: 'warehouse', recordType: '库存记录',
    pick: (r) => ({ title: `${r.materialCode} · ${r.materialName}`, sub: [r.warehouseName, r.locationName].filter(Boolean).join(' / '), fields: [r.materialCode, r.materialName, r.warehouseName, r.locationName] }),
    path: () => '/warehouse/inventory',
    ensureLoaded: (st) => st.loadInventoryRecords?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/warehouseStore', hookKey: 'useWarehouseStore', slice: 'batchRecords', moduleKey: 'warehouse', recordType: '批次',
    pick: (r) => ({ title: r.batchNo, sub: [r.materialName, r.status].filter(Boolean).join(' · '), fields: [r.batchNo, r.materialCode, r.materialName, r.status, r.inboundNo] }),
    path: () => '/warehouse/batch',
    ensureLoaded: (st) => st.loadBatchRecords?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/warehouseAdvancedStore', hookKey: 'useWarehouseAdvancedStore', slice: 'stockTransfers', moduleKey: 'warehouse', recordType: '库存调拨',
    pick: (r) => ({ title: r.transferNo, sub: [r.fromWarehouseName, r.toWarehouseName, r.status].filter(Boolean).join(' → '), fields: [r.transferNo, r.fromWarehouseName, r.toWarehouseName, r.status] }),
    path: () => '/warehouse/transfer',
    ensureLoaded: (st) => st.loadWarehouseAdvanced?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/warehouseAdvancedStore', hookKey: 'useWarehouseAdvancedStore', slice: 'inventoryAdjustments', moduleKey: 'warehouse', recordType: '库存调整',
    pick: (r) => ({ title: r.adjustmentNo, sub: [r.warehouseName, r.status].filter(Boolean).join(' · '), fields: [r.adjustmentNo, r.warehouseName, r.reason, r.status] }),
    path: () => '/warehouse/adjustment',
    ensureLoaded: (st) => st.loadWarehouseAdvanced?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/warehouseAdvancedStore', hookKey: 'useWarehouseAdvancedStore', slice: 'serialMasters', moduleKey: 'warehouse', recordType: '序列号',
    pick: (r) => ({ title: r.serialNo, sub: [r.materialName, r.status].filter(Boolean).join(' · '), fields: [r.serialNo, r.materialCode, r.materialName, r.status] }),
    path: () => '/warehouse/serial',
    ensureLoaded: (st) => st.loadSerialMasters?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/consignmentStore', hookKey: 'useConsignmentStore', slice: 'records', moduleKey: 'warehouse', recordType: '寄存库存',
    pick: (r) => ({ title: r.materialName ?? r.materialCode, sub: [r.vendorName, r.warehouseName].filter(Boolean).join(' · '), fields: [r.materialCode, r.materialName, r.vendorName, r.warehouseName] }),
    path: () => '/warehouse/consignment',
    ensureLoaded: (st) => st.hydrateConsignment?.(),
  },

  // ───────── 质量域（quality）──────────────────────────────────
  {
    storePath: '@/stores/qualityStore', hookKey: 'useQualityStore', slice: 'inspectionTasks', moduleKey: 'quality', recordType: '检验任务',
    pick: (r) => ({ title: r.taskNo, sub: [r.materialName, r.status].filter(Boolean).join(' · '), fields: [r.taskNo, r.materialCode, r.materialName, r.status] }),
    path: (r) => `/quality/inspection/${r.id}`,
    ensureLoaded: (st) => st.hydrate?.(),
    loadedGate: (st) => st.loaded === true,
  },
  {
    storePath: '@/stores/qualityStore', hookKey: 'useQualityStore', slice: 'inspectionStandards', moduleKey: 'quality', recordType: '检验标准',
    pick: (r) => ({ title: `${r.standardNo} · ${r.name}`, sub: [r.materialCategory, r.status].filter(Boolean).join(' · '), fields: [r.standardNo, r.name, r.materialCategory, r.status] }),
    path: () => '/quality/standards',
    ensureLoaded: (st) => st.hydrate?.(),
    loadedGate: (st) => st.loaded === true,
  },
  {
    storePath: '@/stores/qualityStore', hookKey: 'useQualityStore', slice: 'unqualifiedItems', moduleKey: 'quality', recordType: '不合格品(NCR)',
    pick: (r) => ({ title: r.itemNo, sub: [r.materialName, r.disposition, r.status].filter(Boolean).join(' · '), fields: [r.itemNo, r.materialCode, r.materialName, r.disposition, r.status, r.vendorName] }),
    path: () => '/quality/unqualified',
    ensureLoaded: (st) => st.hydrate?.(),
    loadedGate: (st) => st.loaded === true,
  },
  {
    storePath: '@/stores/qualityStore', hookKey: 'useQualityStore', slice: 'pdcaRecords', moduleKey: 'quality', recordType: 'PDCA改善',
    pick: (r) => ({ title: r.pdcaNo, sub: [r.title, r.status].filter(Boolean).join(' · '), fields: [r.pdcaNo, r.title, r.status, r.owner] }),
    path: () => '/quality/pdca',
    ensureLoaded: (st) => st.hydrate?.(),
    loadedGate: (st) => st.loaded === true,
  },
  {
    storePath: '@/stores/qualityAdvancedStore', hookKey: 'useQualityAdvancedStore', slice: 'inspectionLots', moduleKey: 'quality', recordType: '检验批',
    pick: (r) => ({ title: r.lotNo, sub: [r.materialName, r.status].filter(Boolean).join(' · '), fields: [r.lotNo, r.materialCode, r.materialName, r.sourceNo, r.status] }),
    path: () => '/quality/inspection-lot',
    ensureLoaded: (st) => st.hydrateLots?.(),
  },
  {
    storePath: '@/stores/qualityAdvancedStore', hookKey: 'useQualityAdvancedStore', slice: 'coqRecords', moduleKey: 'quality', recordType: '质量成本',
    pick: (r) => ({ title: r.period, sub: [r.category].filter(Boolean).join(' '), fields: [r.period, r.category, r.costCenter] }),
    path: () => '/quality/report',
  },
  {
    storePath: '@/stores/qualityAdvancedStore', hookKey: 'useQualityAdvancedStore', slice: 'qmVendorFeedback', moduleKey: 'quality', recordType: '供应商质量回流',
    pick: (r) => ({ title: r.vendorName ?? r.vendorId, sub: [r.lotNo, r.result].filter(Boolean).join(' · '), fields: [r.vendorName, r.vendorId, r.lotNo, r.result] }),
    path: () => '/vendor/performance',
  },
  {
    storePath: '@/stores/qualityExtensionStore', hookKey: 'useQualityExtensionStore', slice: 'eightDRecords', moduleKey: 'quality', recordType: '8D报告',
    pick: (r) => ({ title: r.code, sub: [r.title, r.status].filter(Boolean).join(' · '), fields: [r.code, r.title, r.status, r.priority] }),
    path: () => '/quality/8d',
    ensureLoaded: (st) => st.hydrateQualityExtension?.(),
  },
  {
    storePath: '@/stores/qualityExtensionStore', hookKey: 'useQualityExtensionStore', slice: 'spcCharts', moduleKey: 'quality', recordType: 'SPC控制图',
    pick: (r) => ({ title: r.name, sub: [r.characteristic, r.unit].filter(Boolean).join(' · '), fields: [r.name, r.characteristic, r.unit] }),
    path: () => '/quality/spc',
    ensureLoaded: (st) => st.hydrateQualityExtension?.(),
  },
  {
    storePath: '@/stores/fmeaStore', hookKey: 'useFMEAStore', slice: 'items', moduleKey: 'quality', recordType: 'FMEA',
    pick: (r) => ({ title: r.number, sub: [r.item, r.failureMode].filter(Boolean).join(' · '), fields: [r.number, r.item, r.function, r.failureMode, r.status] }),
    path: () => '/quality/fmea',
    ensureLoaded: (st) => st.hydrateFMEA?.(),
  },

  // ───────── 主数据（物料）──────────────────────────────────────
  {
    storePath: '@/stores/materialStore', hookKey: 'useMaterialStore', slice: 'materials', moduleKey: 'materials', recordType: '物料',
    pick: (m) => ({ title: `${m.code} · ${m.name}`, sub: [m.specification, m.categoryName].filter(Boolean).join(' / '), fields: [m.code, m.name, m.specification, m.categoryName] }),
    path: (m) => `/material/${m.id}`,
    ensureLoaded: (st) => st.loadMaterials?.(),
    loadedGate: (st) => st.loaded !== false,
  },

  // ───────── 供应商域（vendor）─────────────────────────────────
  {
    storePath: '@/stores/vendorStore', hookKey: 'useVendorStore', slice: 'vendors', moduleKey: 'vendor', recordType: '供应商',
    pick: (v) => ({ title: `${v.code} · ${v.name}`, sub: [v.shortName, v.contact].filter(Boolean).join(' / '), fields: [v.code, v.name, v.shortName, v.contact] }),
    path: (v) => `/vendor/${v.id}`,
    ensureLoaded: (st) => st.loadVendors?.(),
    loadedGate: (st) => st.loaded !== false,
  },
  {
    storePath: '@/stores/vendorPerformanceStore', hookKey: 'useVendorPerformanceStore', slice: 'records', moduleKey: 'vendor', recordType: '供应商绩效',
    pick: (r) => ({ title: r.vendorName, sub: [r.period, r.ranking].filter(Boolean).join(' · '), fields: [r.vendorName, r.vendorCode, r.period, r.ranking] }),
    path: () => '/vendor/performance',
    ensureLoaded: (st) => st.hydrate?.(),
    loadedGate: (st) => st.loaded === true,
  },

  // ───────── 财务域（finance）──────────────────────────────────
  {
    storePath: '@/stores/financeStore', hookKey: 'useFinanceStore', slice: 'vouchers', moduleKey: 'finance', recordType: '凭证',
    pick: (r) => ({ title: r.voucherNo, sub: [r.voucherType, r.status].filter(Boolean).join(' · '), fields: [r.voucherNo, r.voucherType, r.date, r.status, r.sourceNo] }),
    path: () => '/finance/vouchers',
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded === true,
  },
  {
    storePath: '@/stores/financeStore', hookKey: 'useFinanceStore', slice: 'invoices', moduleKey: 'finance', recordType: '发票',
    pick: (r) => ({ title: r.invoiceNo, sub: [r.vendorName, r.status].filter(Boolean).join(' · '), fields: [r.invoiceNo, r.vendorName, r.status, r.purchaseOrderNo] }),
    path: () => '/finance/invoices',
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded === true,
  },
  {
    storePath: '@/stores/financeStore', hookKey: 'useFinanceStore', slice: 'paymentPlans', moduleKey: 'finance', recordType: '付款计划',
    pick: (r) => ({ title: r.planNo, sub: [r.vendorName, r.status].filter(Boolean).join(' · '), fields: [r.planNo, r.vendorName, r.purchaseOrderNo, r.status] }),
    path: () => '/finance/payments',
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded === true,
  },
  {
    storePath: '@/stores/financeStore', hookKey: 'useFinanceStore', slice: 'accountEntries', moduleKey: 'finance', recordType: '会计分录',
    pick: (r) => ({ title: r.entryNo, sub: [r.description, r.voucherNo].filter(Boolean).join(' · '), fields: [r.entryNo, r.description, r.debitAccount, r.creditAccount, r.voucherNo] }),
    path: () => '/finance/entries',
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded === true,
  },
  {
    storePath: '@/stores/financeStore', hookKey: 'useFinanceStore', slice: 'taxRecords', moduleKey: 'finance', recordType: '税务记录',
    pick: (r) => ({ title: r.recordNo, sub: [r.period, r.category, r.status].filter(Boolean).join(' · '), fields: [r.recordNo, r.period, r.category, r.status] }),
    path: () => '/finance/tax',
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded === true,
  },
  {
    storePath: '@/stores/financeStore', hookKey: 'useFinanceStore', slice: 'projectAccounts', moduleKey: 'finance', recordType: '项目核算',
    pick: (r) => ({ title: r.projectName, sub: [r.customerName, r.period, r.status].filter(Boolean).join(' · '), fields: [r.accountNo, r.projectName, r.customerName, r.period, r.status] }),
    path: () => '/finance/project-accounting',
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded === true,
  },
  {
    storePath: '@/stores/financeStore', hookKey: 'useFinanceStore', slice: 'chartOfAccounts', moduleKey: 'finance', recordType: '会计科目',
    pick: (r) => ({ title: `${r.code} · ${r.name}`, sub: r.type, fields: [r.code, r.name, r.type] }),
    path: () => '/finance/chart-accounts',
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded === true,
  },
  {
    storePath: '@/stores/financeStore', hookKey: 'useFinanceStore', slice: 'reconciliations', moduleKey: 'finance', recordType: '对账单',
    pick: (r) => ({ title: r.statementNo, sub: [r.vendorName, r.period, r.status].filter(Boolean).join(' · '), fields: [r.statementNo, r.vendorName, r.period, r.status] }),
    // V3.118.0 修正：原指向 /finance/three-way（三单匹配）—— 那是"发票↔订单↔入库能不能付款"的页面，
    //   与"供应商对账单能不能认"是两件事，跳过去看到的是另一批单据，等于检索结果落到错误的页。
    path: (r) => `/finance/reconciliations?focus=${encodeURIComponent(String(r?.statementNo ?? ''))}`,
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded === true,
  },
  {
    storePath: '@/stores/cashMgmtStore', hookKey: 'useCashMgmtStore', slice: 'accounts', moduleKey: 'finance', recordType: '资金账户',
    pick: (r) => ({ title: r.accountName, sub: [r.bank, r.currency].filter(Boolean).join(' · '), fields: [r.accountNo, r.accountName, r.bank, r.currency] }),
    path: () => '/finance/cash',
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded === true,
  },
  {
    storePath: '@/stores/cashMgmtStore', hookKey: 'useCashMgmtStore', slice: 'flows', moduleKey: 'finance', recordType: '资金流水',
    pick: (r) => ({ title: r.counterparty, sub: [r.category, r.direction === 'in' ? '收款' : '付款', r.flowDate].filter(Boolean).join(' · '), fields: [r.counterparty, r.category, r.relatedDoc, r.remark] }),
    path: () => '/finance/cash',
    ensureLoaded: (st) => st.load?.(),
    loadedGate: (st) => st.loaded === true,
  },
  {
    storePath: '@/stores/arapStore', hookKey: 'useArapStore', slice: 'receivables', moduleKey: 'finance', recordType: '应收款',
    pick: (r) => ({ title: r.invoiceNo, sub: [r.customerName, r.status].filter(Boolean).join(' · '), fields: [r.invoiceNo, r.customerName, r.status, r.agingBucket] }),
    path: () => '/finance/receivables',
  },
  {
    storePath: '@/stores/arapStore', hookKey: 'useArapStore', slice: 'payables', moduleKey: 'finance', recordType: '应付款',
    pick: (r) => ({ title: r.invoiceNo, sub: [r.vendorName, r.status].filter(Boolean).join(' · '), fields: [r.invoiceNo, r.vendorName, r.status, r.agingBucket] }),
    path: () => '/finance/payables',
  },
];
