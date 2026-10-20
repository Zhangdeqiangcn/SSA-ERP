import { BaseEntity } from './common';

// ============================================================
// P3-3 供应链深化：跨模块单据与高级供应链类型
// 覆盖：销售报价/开票/退货/ATP、采购框架协议/退货、仓储转储/调整/序列号、
//       质量检验批/COQ/批次追溯/QM评级回流、物料变更记录
// ============================================================

// ───────────────────── 销售报价单 ─────────────────────
export interface QuotationItem {
  id: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  specification?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  deliveryDate?: string;
  remarks?: string;
}

export interface Quotation extends BaseEntity {
  quotationNo: string;
  customerName: string;
  customerCode?: string;
  customerId?: string;    // P1-6 补客户主数据外键（向后兼容可选）
  status: 'draft' | 'submitted' | 'approved' | 'lost' | 'converted';
  validUntil: string;
  currency: string;
  items: QuotationItem[];
  totalAmount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  salesPerson: string;
  remarks?: string;
  sourceProspectId?: string;
  convertedOrderId?: string;
  convertedOrderNo?: string;
}

// ───────────────────── 销售开票（应收）─────────────────────
export interface SalesInvoiceItem {
  id: string;
  materialId?: string;
  materialCode?: string;
  materialName?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
}

export interface SalesInvoice extends BaseEntity {
  invoiceNo: string;
  invoiceType: 'sales' | 'credit_note'; // 销售发票 / 红字（退货）
  salesOrderNo: string;
  customerName: string;
  status: 'draft' | 'issued' | 'cancelled';
  invoiceDate: string;
  currency: string;
  items: SalesInvoiceItem[];
  amount: number; // 不含税
  taxAmount: number;
  totalAmount: number;
  linkedReturnNo?: string;
  voucherNo?: string;
}

// ───────────────────── 销售退货 ─────────────────────
export interface SalesReturnItem {
  id: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  reason?: string;
}

export interface SalesReturn extends BaseEntity {
  returnNo: string;
  salesOrderNo: string;
  customerName: string;
  status: 'draft' | 'approved' | 'completed' | 'cancelled';
  returnDate: string;
  reason: string;
  items: SalesReturnItem[];
  totalAmount: number;
  creditNoteNo?: string;
  /** V3.64.0 P0-3：该销售退货触发的采购退货单号（质量类退货追责供应商，可为空） */
  linkedPurchaseReturnNo?: string;
}

// ───────────────────── 采购框架协议 ─────────────────────
export interface FrameworkAgreementItem {
  id: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  unit?: string;
  ceilingPrice: number;
  committedQty: number;
}

export interface FrameworkRelease {
  id: string;
  releaseNo: string;
  date: string;
  amount: number;
  poNo?: string;
  note?: string;
}

export interface FrameworkAgreement extends BaseEntity {
  agreementNo: string;
  vendorId: string;
  vendorName: string;
  status: 'active' | 'expired' | 'closed';
  startDate: string;
  endDate: string;
  currency: string;
  totalCeiling: number; // 协议总额上限
  releasedAmount: number; // 已释放金额
  items: FrameworkAgreementItem[];
  releases: FrameworkRelease[];
  remarks?: string;
}

// ───────────────────── 采购退货 ─────────────────────
export interface PurchaseReturnItem {
  id: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  reason?: string;
}

export interface PurchaseReturn extends BaseEntity {
  returnNo: string;
  purchaseOrderNo: string;
  vendorId: string;
  vendorName: string;
  status: 'draft' | 'approved' | 'completed' | 'cancelled';
  returnDate: string;
  reason: string;
  items: PurchaseReturnItem[];
  totalAmount: number;
  voucherNo?: string;
  /** V3.64.0 P0-3：该采购退货对应的销售退货来源单号（客户退货追责供应商，可为空） */
  linkedSalesReturnNo?: string;
}

// ───────────────────── 跨组织转储 ─────────────────────
export interface StockTransferItem {
  id: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  unit?: string;
  quantity: number;
  batchNo?: string;
  locationId?: string;
}

export interface StockTransfer extends BaseEntity {
  transferNo: string;
  fromWarehouseId: string;
  fromWarehouseName?: string;
  toWarehouseId: string;
  toWarehouseName?: string;
  fromOrgId?: string;
  toOrgId?: string;
  status: 'draft' | 'shipped' | 'received' | 'completed' | 'cancelled';
  transferDate: string;
  items: StockTransferItem[];
  remarks?: string;
}

// ───────────────────── 库存调整单 ─────────────────────
export interface InventoryAdjustmentItem {
  id: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  unit?: string;
  locationId?: string;
  bookQty: number;
  actualQty: number;
  deltaQty: number;
  reason?: string;
}

export interface InventoryAdjustment extends BaseEntity {
  adjustmentNo: string;
  warehouseId: string;
  warehouseName?: string;
  status: 'draft' | 'posted' | 'cancelled';
  reason: string;
  date: string;
  items: InventoryAdjustmentItem[];
  totalDeltaQty: number;
  voucherNo?: string;
}

// ───────────────────── 质检扣留（质检库存状态）─────────────────────
export interface QualityHold {
  id: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  warehouseId: string;
  warehouseName?: string;
  batchNo?: string;
  quantity: number;
  status: 'pending' | 'passed' | 'rejected';
  sourceInboundNo?: string;
  holdDate: string;
  releaseDate?: string;
  inspector?: string;
  reason?: string;
}

// ───────────────────── 序列号 / HU 主数据 ─────────────────────
export interface SerialMaster extends BaseEntity {
  serialNo: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  batchNo?: string;
  warehouseId?: string;
  huId?: string; // 处理单元（Handling Unit）
  status: 'in_stock' | 'shipped' | 'scrapped' | 'in_transit';
  inboundDate?: string;
  outboundDate?: string;
  customerName?: string;
  remarks?: string;
  /** B2 序列号轨迹：一物一码全生命周期流转记录（收货→领料→委外→发货） */
  movements?: SerialMovement[];
}

/** B2：序列号单次流转事件 */
export interface SerialMovement {
  /** inbound=采购/委外收货入库；issue=生产领料出库；subcontract=委外发料；delivery=销售发货；transfer=调拨 */
  type: 'inbound' | 'issue' | 'subcontract' | 'delivery' | 'transfer';
  /** 触发单据号（入库单号/出库单号） */
  docNo: string;
  /** 发生日期 */
  date: string;
  /** 流转后状态 */
  status: 'in_stock' | 'shipped' | 'scrapped' | 'in_transit';
  /** 备注（仓库名/客户名/供应商名等） */
  note?: string;
}

// ───────────────────── 检验批（自动生成）─────────────────────
export interface InspectionLot extends BaseEntity {
  lotNo: string;
  sourceType: 'inbound' | 'production' | 'manual';
  sourceNo?: string; // 入库单号 / 工单号
  materialId: string;
  materialCode: string;
  materialName: string;
  batchNo?: string;
  quantity: number;
  vendorId?: string;
  vendorName?: string;
  inspectionTaskNo?: string;
  /** P0-3：关联的手工检验任务 id（id 级互引，与 inspectionTaskNo 展示号并存），根治「自动建批 vs 手工建任务」对齐缺失 */
  inspectionTaskId?: string;
  status: 'pending' | 'in_inspection' | 'passed' | 'failed';
  createdFrom: string;
}

// ───────────────────── 质量成本 COQ ─────────────────────
export type COQCategory = 'prevention' | 'appraisal' | 'internal_failure' | 'external_failure';

export interface COQRecord extends BaseEntity {
  period: string; // 如 2026-07
  category: COQCategory;
  costCenter?: string;
  amount: number;
  note?: string;
}

// ───────────────────── QM → 供应商评级回流 ─────────────────────
export interface QmVendorFeedback {
  id: string;
  vendorId: string;
  vendorName?: string;
  lotNo: string;
  result: 'pass' | 'fail';
  date: string;
  note?: string;
}

// ───────────────────── 批次追溯 ─────────────────────
export interface BatchTraceNode {
  batchNo: string;
  materialCode: string;
  materialName: string;
  inboundNo?: string;
  inboundDate?: string;
  supplierName?: string;
  quantity: number;
  status: string;
  inspectionLotNo?: string;
  inspectionResult?: string;
  outboundNo?: string;
  customerName?: string;
}

// ───────────────────── 物料变更记录 ─────────────────────
export interface MaterialChangeField {
  field: string;
  oldValue: string;
  newValue: string;
}

/** P1-16 物料变更受影响对象（BOM / 工单 / 在制 / 出入库等），供变更记录反查下游 */
export interface MaterialChangeAffected {
  type: 'bom' | 'workOrder' | 'wip' | 'inbound' | 'outbound';
  id: string;
  no?: string;
}

export interface MaterialChangeDoc extends BaseEntity {
  changeNo: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  changeType: 'create' | 'update' | 'status' | 'price' | 'valuation' | 'other';
  fields: MaterialChangeField[];
  reason: string;
  operator: string;
  affectedObjects?: MaterialChangeAffected[]; // P1-16 受影响对象反查入口（非破坏补强，可选）
}

// ───────────────────── ATP 结果 ─────────────────────
export interface ATPResult {
  materialId: string;
  materialCode: string;
  materialName: string;
  warehouseId?: string;
  warehouseName?: string;
  date: string;
  onHand: number;
  committed: number;
  incoming: number;
  availableQty: number;
}
