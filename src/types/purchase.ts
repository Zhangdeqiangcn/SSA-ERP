import { BaseEntity, ApprovalRecord } from './common';

export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type PurchaseRequestStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'ordered';
export type PurchaseOrderStatus = 'created' | 'sent' | 'vendorConfirmed' | 'confirmed' | 'partial' | 'received' | 'closed' | 'cancelled';

export interface PurchaseRequestItem {
  id: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  specification?: string;
  unit?: string;
  quantity: number;
  estimatedPrice?: number;
  estimatedAmount?: number;
  deliveryDate?: string;
  remarks?: string;
}

export interface PurchaseRequest extends BaseEntity {
  requestNo: string;
  title: string;
  applicant: string;
  department: string;
  type: 'material' | 'service';
  priority: Priority;
  reason: string;
  /** 采购申请备注（补充说明，区别于申请理由 reason） */
  remarks?: string;
  expectedDate: string;
  /** V3.102.0 申请日期（yyyy-mm-dd）：表头「期望日期」改为「申请日期」，提交/暂存时由前端实时拉取当天；历史单为空时兜底 createdAt 日期 */
  applicationDate?: string;
  status: PurchaseRequestStatus;
  items: PurchaseRequestItem[];
  approvalRecords?: ApprovalRecord[];
  /** 当前审批步骤索引（按 ApprovalFlowTab 配置驱动） */
  currentStep?: number;
  totalAmount?: number;
  projectNo?: string;
  projectName?: string;
  /** F8-3: 来源类型 */
  sourceType?: 'manual' | 'salesOrder' | 'workOrder' | 'mrp';
  /** F8-3: 来源单据编号 */
  sourceNo?: string;
  /** F8-3: 来源单据名称（便于展示） */
  sourceName?: string;
  /** 自定义字段 */
  customFields?: Record<string, unknown>;
  /** V3.94.0 归属采购员 id 列表：由物料所属分类的「采购员」责任自动归集（JSON 数组，可能多名） */
  buyerIds?: string[];
  /** V3.94.0 归属采购员姓名（逗号拼接，用于列表展示与按姓名模糊筛选） */
  buyerNames?: string;
}

/** B10 订单变更：历史版本快照（记录变更前的关键字段，支持差异对比） */
export interface PurchaseOrderVersion {
  /** 变更前版本号（变更后 version 自增 1） */
  version: number;
  changedAt: string;
  changedBy: string;
  /** 变更原因（必填，人读留痕） */
  changeReason: string;
  /** 变更前快照（当前字段被覆盖前的值） */
  snapshot: {
    expectedDeliveryDate?: string;
    items?: PurchaseOrderItem[];
    totalAmount?: number;
    paymentTerms?: string;
    tradeTerms?: string;
    deliveryAddress?: string;
    remarks?: string;
  };
}

export interface PurchaseOrderItem {
  id: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  specification?: string;
  unit?: string;
  orderedQuantity: number;
  deliveredQuantity: number;
  /** 未税单价（与 amount 一致，均为不含税口径，向后兼容） */
  unitPrice: number;
  /** 未税金额 = orderedQuantity * unitPrice */
  amount: number;
  /** A2 税价拆分：税率（百分数整数，如 13 表示 13%） */
  taxRate?: number;
  /** A2 税价拆分：行税额 = amount * taxRate / 100 */
  taxAmount?: number;
  /** A2 税价拆分：含税单价 = unitPrice * (1 + taxRate/100) */
  priceWithTax?: number;
  /** A2 税价拆分：价税合计 = amount + taxAmount */
  amountWithTax?: number;
  /** V3.104.0 行级供应商（迁移 0118 起落库；与表头主供应商二选一） */
  vendorId?: string;
  vendorName?: string;
  /** V3.104.0 行级预计交货日期（迁移 0118 起落库） */
  expectedDeliveryDate?: string;
  /** V3.104.0 行级关联项目（迁移 0118 起落库；从采购申请自动带入，行内可改） */
  projectNo?: string;
  projectName?: string;
}

export interface PurchaseOrder extends BaseEntity {
  orderNo: string;
  requestId?: string;
  sourceRequestIds?: string[];
  vendorId: string;
  vendorName?: string;
  contact?: string;
  phone?: string;
  status: PurchaseOrderStatus;
  /** 采购类型：物料 / 服务 */
  purchaseType?: 'material' | 'service';
  orderDate: string;
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;
  items: PurchaseOrderItem[];
  /** 未税总额（不含税），历史字段口径不变 */
  totalAmount: number;
  /** A2 税价拆分：币种（默认 CNY） */
  currency?: string;
  /** A2 税价拆分：对本位币汇率（CNY 为 1） */
  exchangeRate?: number;
  /** A2 税价拆分：录入价是否为含税价（true=按含税单价反算未税） */
  taxIncluded?: boolean;
  /** A2 税价拆分：税额合计 = Σ 行税额 */
  totalTaxAmount?: number;
  /** A2 税价拆分：价税合计 = totalAmount + totalTaxAmount */
  grandTotal?: number;
  paymentTerms?: string;
  tradeTerms?: string;
  /** V3.104.0 交付条件（迁移 0118 起落库；此前表单有输入框但未持久化） */
  deliveryTerms?: string;
  deliveryAddress?: string;
  remarks?: string;
  projectNo?: string;
  projectName?: string;
  /** 累计已收货数量（由各入库单回写汇总），便于列表/详情快速展示 */
  deliveredQuantity?: number;
  /** B1 信用卡点：是否已占用供应商信用额度（提交时置 true，收货释放/取消释放后置 false） */
  creditOccupied?: boolean;
  /** B1 信用卡点：本单实际占用的信用金额（按提交时价税合计快照，释放时按此金额回退） */
  creditAmount?: number;
  /** B1 信用卡点：本单累计已释放的信用金额（收货按交货进度释放，幂等防重） */
  creditReleasedAmount?: number;
  /** B5 门户回写：供应商门户确认订单后回写的状态字段 */
  confirmedBy?: string;
  confirmedAt?: string;
  confirmedNote?: string;
  /** B5 门户回写：供应商确认的交期（独立列，不修改原expectedDeliveryDate） */
  vendorConfirmedDate?: string;
  /** B10 订单变更：当前版本号（初始 1，每次变更 +1，变更留痕可追溯） */
  version?: number;
  /** B10 订单变更：历史版本快照（变更前记录，最新在前），支撑差异对比与审计 */
  history?: PurchaseOrderVersion[];
  /** 自定义字段 */
  customFields?: Record<string, unknown>;
  /** P2-06 寄售采购：采购模式 */
  orderMode?: 'standard' | 'consignment';
}

export interface VendorQuote {
  id: string;
  requestId: string;
  vendorId: string;
  vendorName?: string;
  items: QuoteItem[];
  totalAmount: number;
  validUntil: string;
  remarks?: string;
  submittedAt: string;
}

export interface QuoteItem {
  materialId: string;
  materialName?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

// ==================== 采购信息记录（P0-05） ====================
export interface PurchaseInfoRecord {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorCode?: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  specification?: string;
  unit?: string;
  unitPrice: number;
  currency?: string; // 默认 'CNY'
  validFrom?: string; // YYYY-MM-DD
  validTo?: string;   // YYYY-MM-DD
  minQty?: number;
  leadTime?: number;  // 交货天数
  purchasingGroup?: string; // 采购组
  status: 'active' | 'expired' | 'frozen';
}

// ==================== 货源清单（P0-06） ====================
export interface SourceListItem {
  id: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  vendorId: string;
  vendorName: string;
  vendorCode?: string;
  priority: number;
  validFrom?: string;
  validTo?: string;
  fixedVendor: boolean;
  quotaPercentage?: number;
  status: 'active' | 'inactive';
  remarks?: string;
}

// ==================== 条件技术引擎（P1-04） ====================
export type ConditionType = 'price' | 'discount' | 'freight' | 'tax' | 'surcharge';
export type CalculationRule = 'fixed' | 'percentage' | 'quantity_based' | 'tiered';
export interface ConditionRecord {
  id: string; conditionType: ConditionType; vendorId?: string; materialId?: string;
  vendorName?: string; materialName?: string; fromDate?: string; toDate?: string;
  rate: number; currency?: string; unit?: string; scaleBasis?: string; // 计费基础
  calcRule: CalculationRule; priority: number; active: boolean;
}

// ==================== 寄售采购（P2-06） ====================
export interface ConsignmentStock {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorCode?: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  specification?: string;
  unit?: string;
  agreedUnitPrice?: number;   // 约定结算单价
  consignedQty: number;        // 寄存数量（供应商已送货）
  consumedQty: number;         // 已消耗数量（已用于生产/销售）
  balanceQty: number;          // 结存数量 = consignedQty - consumedQty
  warehouseId?: string;
  warehouseName?: string;
}
