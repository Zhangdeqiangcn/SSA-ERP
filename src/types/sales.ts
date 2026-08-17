import { BaseEntity, ApprovalRecord } from './common';

// ==================== 意向客户 ====================
export type ProspectSource = 'web' | 'exhibition' | 'referral' | 'cold_call' | 'advertise' | 'other';
export type ProspectStatus = 'new' | 'contacted' | 'negotiating' | 'quoted' | 'won' | 'lost';

export interface Prospect extends BaseEntity {
  prospectNo: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  industry?: string;
  region?: string;
  source: ProspectSource;
  status: ProspectStatus;
  interestProducts: string[];
  estimatedValue?: number;
  probability?: number; // 成交概率 0-100
  nextFollowupDate?: string;
  followupRecords: FollowupRecord[];
  assignedTo: string;
  convertedToCustomer?: boolean;
  creditLimit?: number; // 信用额度（V2.7）
  usedCredit?: number; // 已用信用（V2.7）
  notes?: string;
}

export interface FollowupRecord {
  id: string;
  date: string;
  method: 'phone' | 'email' | 'visit' | 'meeting' | 'other';
  content: string;
  result: string;
  nextAction?: string;
  followedBy: string;
}

// ==================== 销售订单 ====================
export type SalesOrderStatus = 'draft' | 'confirmed' | 'in_production' | 'partial_shipped' | 'fully_shipped' | 'completed' | 'cancelled';
export type SalesOrderType = 'standard' | 'sample' | 'maintenance';
/** 发货方式 */
export type ShippingMode = 'standard' | 'direct_ship' | 'third_party';

// ==================== 销售价目表 / 折扣 / 促销（C5） ====================
// 阶梯量价：按数量段取更优单价（minQty 为该段起始数量，含）
export interface SalesPriceTier {
  minQty: number;
  unitPrice: number;
}

export interface SalesPriceListItem {
  id: string;
  customerId?: string;   // 客户级价目表（不填表示通用物料价）
  customerName?: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  specification?: string;
  unit?: string;
  basePrice: number;       // 基准单价（不打折）
  discountRate: number;    // 折扣率 0-100（如 10 表示按 9 折）
  effectiveFrom?: string;  // 生效起（YYYY-MM-DD），缺省不限制
  effectiveTo?: string;    // 生效止（YYYY-MM-DD），缺省不限制
  tiers?: SalesPriceTier[];// 阶梯量价（按数量升序）
  currency?: string;
  status?: 'active' | 'inactive';
}

export type SalesPromotionType = 'percent' | 'amount' | 'fixed';
// percent：单价再打 value% 折扣；amount：单价立减 value 元；fixed：单价直接定为 value
export interface SalesPromotion {
  id: string;
  name: string;
  type: SalesPromotionType;
  value: number;
  customerId?: string;   // 适用客户（不填=全部客户）
  materialId?: string;   // 适用物料（不填=全部物料）
  start?: string;        // 促销起（YYYY-MM-DD）
  end?: string;          // 促销止（YYYY-MM-DD）
  enabled: boolean;
}

// resolvePrice 返回结果
export interface ResolvedSalesPrice {
  unitPrice: number;       // 最终生效单价（含税？此处为不含税单价）
  discountRate: number;    // 命中的价目表折扣率
  promotionApplied: string | null; // 命中的促销名称（无则 null）
  finalPrice: number;      // 等同于 unitPrice（保留字段，便于扩展）
}

export interface SalesOrderItem {
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
  /** 累计已发货数量（由各出库单回写） */
  deliveredQuantity?: number;
}

export interface SalesOrder extends BaseEntity {
  orderNo: string;
  type: SalesOrderType;
  status: SalesOrderStatus;
  customerName: string;
  customerId?: string;            // A3 客户主数据引用（与 customerName 冗余，兼容旧数据）
  customerCode?: string;
  contactName?: string;
  contactPhone?: string;
  projectId?: string;
  projectNo?: string;
  projectName?: string;
  items: SalesOrderItem[];
  totalAmount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  orderDate: string;
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;
  paymentTerms?: string;
  deliveryAddress?: string;
  salesPerson: string;
  tradeTerms?: string;           // P0-11 贸易条款
  shipToAddress?: string;         // P0-11 送达方地址
  approvalRecords?: ApprovalRecord[];
  linkedWorkOrders: LinkedWorkOrder[];
  remarks?: string;
  /** 累计已发货数量（由各出库单回写汇总） */
  deliveredQuantity?: number;
  // P2-5 应收(AR)账龄支持（可选，向后兼容）
  receivedAmount?: number;    // 已收金额（本位币）
  arDueDate?: string;         // 应收到期日
  /** B1 信用卡点：是否已占用客户信用额度（提交时置 true，暂存/删除释放后置 false） */
  creditOccupied?: boolean;
  /** B1 信用卡点：本单实际占用的客户信用金额（按提交时价税合计快照） */
  creditAmount?: number;
  // P2-12 三方销售/直接发运
  /** 发货方式 */
  shippingMode?: ShippingMode;
  /** 直接发运时选择的供应商ID */
  directShipVendorId?: string;
  /** 直接发运时选择的供应商名称 */
  directShipVendorName?: string;
  /** 三方销售时的第三方公司名称 */
  thirdPartyCompanyName?: string;
  /** 关联销售合同（由合同下推生成订单时回填） */
  contractId?: string;
  /** 关联销售合同编号（冗余存储，便于列表/详情直接展示） */
  contractNo?: string;
}

export interface LinkedWorkOrder {
  workOrderId: string;
  workOrderNo: string;
  status: string;
  productName: string;
  quantity: number;
}

// ==================== 项目管理 ====================
export type ProjectStatus = 'planning' | 'in_progress' | 'pending' | 'at_risk' | 'completed' | 'closed';
export type ExceptionSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Project extends BaseEntity {
  projectNo: string;
  projectName: string;
  customerName: string;
  customerCode?: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  contractAmount: number;
  receivedAmount: number;
  budget: number;
  actualCost: number;
  progress: number; // 0-100
  manager: string;
  team: string[];
  milestones: ProjectMilestone[];
  exceptions: ProjectException[];
  linkedOrders: string[]; // 关联的销售订单号
  description?: string;
  notes?: string;
}

export interface ProjectMilestone {
  id: string;
  name: string;
  plannedDate: string;
  actualDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  description?: string;
  deliverable?: string;
}

export interface ProjectException {
  id: string;
  exceptionNo: string;
  type: 'schedule' | 'cost' | 'quality' | 'resource' | 'customer' | 'other';
  severity: ExceptionSeverity;
  title: string;
  description: string;
  reportedBy: string;
  reportedAt: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  impactDescription?: string;
}

// ==================== 物流发货 ====================
export type ShipmentStatus = 'pending' | 'picked' | 'packed' | 'shipped' | 'in_transit' | 'delivered' | 'cancelled';
export type TransportMode = 'road' | 'rail' | 'sea' | 'air' | 'express';

export interface Shipment extends BaseEntity {
  shipmentNo: string;
  salesOrderNo: string;
  projectNo?: string;
  projectName?: string;
  customerName: string;
  status: ShipmentStatus;
  items: ShipmentItem[];
  transportMode: TransportMode;
  carrier: string;
  trackingNo?: string;
  estimatedPickupDate: string;
  estimatedDeliveryDate: string;
  actualPickupDate?: string;
  actualDeliveryDate?: string;
  originAddress: string;
  destinationAddress: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNo?: string;
  totalWeight?: number;
  totalVolume?: number;
  packageCount: number;
  freight?: number;
  insurance?: number;
  notes?: string;
}

export interface ShipmentItem {
  id: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  specification?: string;
  unit?: string;
  orderQuantity: number;
  shipQuantity: number;
  unitPrice: number;
  amount: number;
}

// ==================== 市场分析 ====================
export interface MarketData {
  id: string;
  period: string; // 月度/季度
  totalRevenue: number;
  newCustomers: number;
  conversionRate: number;
  topProducts: ProductSalesData[];
  regionalData: RegionalSalesData[];
  salesTrend: SalesTrendItem[];
}

export interface ProductSalesData {
  productCode: string;
  productName: string;
  salesVolume: number;
  salesAmount: number;
  growthRate: number;
  marketShare: number;
}

export interface RegionalSalesData {
  region: string;
  salesAmount: number;
  orderCount: number;
  customerCount: number;
  yoyGrowth: number;
}

export interface SalesTrendItem {
  month: string;
  revenue: number;
  orderCount: number;
  newCustomerCount: number;
}

// ==================== 销售合同管理（P1-13） ====================
export type ContractStatus = 'draft' | 'active' | 'suspended' | 'completed' | 'terminated';

export interface PaymentScheduleItem {
  id: string;
  stage: string;        // 里程碑名称
  percentage: number;   // 付款比例%
  amount: number;       // 金额
  dueDate?: string;     // 计划收款日
  receivedDate?: string; // 实际收款日
  received: boolean;    // 是否已收款
}

export interface ContractItem {
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
}

export interface SalesContract {
  id: string;
  contractNo: string;    // 合同编号
  name: string;           // 合同名称
  customerId: string;
  customerName: string;
  customerCode?: string;
  salesPerson?: string;
  amount: number;         // 合同总金额
  startDate: string;
  endDate: string;
  status: ContractStatus;
  items: ContractItem[];
  paymentSchedule: PaymentScheduleItem[];
  terms?: string;         // 主要条款
  attachments?: { name: string; url: string }[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== 返利管理（P2-11） ====================
export interface RebateRule {
  id: string;
  name: string;
  customerId?: string;
  customerName?: string;
  materialId?: string;
  materialName?: string;
  type: 'percent' | 'fixed';
  rate: number;
  minAmount?: number;
  validFrom?: string;
  validTo?: string;
  enabled: boolean;
}

export interface RebateSettlement {
  id: string;
  ruleId: string;
  ruleName: string;
  customerId: string;
  customerName: string;
  period: string;
  baseAmount: number;
  rebateAmount: number;
  status: 'pending' | 'settled' | 'cancelled';
  settledAt?: string;
}
