import { BaseEntity } from './common';

/** B2：新增 subcontract —— 委外加工收货入库（对标 SAP 543 组件消耗的反向收货口径） */
/** B3：新增 production —— 生产完工入库（对标 SAP 生产收货 101，借 1405 库存商品 / 贷 5001 生产成本） */
/** B7-T1：新增 asn —— 供应商门户发货通知单（Advanced Shipping Notice）在途预告，status='in_transit' 仅登记不入库 */
export type InboundType = 'purchase' | 'return' | 'transfer' | 'subcontract' | 'production' | 'asn' | 'rework';
export type InboundStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
/** B2：新增 subcontract —— 委外发料给供应商（对标 SAP 541 移动类型） */
/** B4：新增 scrap —— 报废出库（不合格品 NCR 报废处置联动库存扣减 + 借6602管理费用/贷1403原材料|1405库存商品，对标报废损失） */
export type OutboundType = 'sale' | 'pick' | 'transfer' | 'return' | 'subcontract' | 'scrap';
export type OutboundStatus = 'pending' | 'processing' | 'picking' | 'picked' | 'packed' | 'shipped' | 'completed' | 'cancelled';
export type CheckStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
export type QualityStatus = 'qualified' | 'unqualified';

export interface InboundOrderItem {
  id: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  specification?: string;
  unit?: string;
  expectedQuantity: number;
  actualQuantity: number;
  batchNo?: string;
  locationId?: string;
  locationName?: string;
  qualityStatus: QualityStatus;
  /** A4 成本核算：入库未税单价（过账时若为空，按 sourceNo 回查采购订单行未税单价，再兜底物料现行成本） */
  unitPrice?: number;
  /** A4 成本核算：入库未税金额 = 实收数量 × unitPrice（过账时快照，供 GR/IR 暂估取数） */
  amount?: number;
  /** B2 序列号联动：本行涉及的序列号清单（serialized 物料入库时自动登记为在库） */
  serialNos?: string[];
  /** B2 HU 联动：本行归属的搬运单元（Handling Unit）ID */
  huId?: string;
  /** P1-08 保质期管理：生产日期 */
  productionDate?: string;
  /** P1-08 保质期管理：到期日（生产日期+物料保质期天数） */
  expiryDate?: string;
  /** B2-① 序列号驱动：是否强制校验序列号（serialized物料必填） */
  requireSerialNo?: boolean;
}

export interface InboundOrder extends BaseEntity {
  inboundNo: string;
  type: InboundType;
  sourceNo?: string;
  vendorId?: string;
  vendorName?: string;
  status: InboundStatus;
  warehouseId: string;
  warehouseName?: string;
  orgId?: string; // 所属组织（P2-2 多组织）
  operator: string;
  inboundDate: string;
  items: InboundOrderItem[];
  remarks?: string;
  /** 事件驱动：入库记账（更新库存）是否已执行，防止重复过账 */
  inventoryPosted?: boolean;
  /** A4 成本核算：移动平均价滚动是否已执行，防止重复滚价 */
  costPosted?: boolean;
  /** A4 成本核算：本单入库未税金额合计（过账时快照） */
  totalCost?: number;
  /** B2 委外收货：本单成品价值中「发出材料成本」部分（用于凭证贷记 1408 委托加工物资） */
  subcontractMaterialCost?: number;
  /** B7-T1 发货通知单（ASN）在途预告：关联门户发货单号，用于供应商门户发货回写主 ERP 后在入库列表可追踪 */
  asnShipmentNo?: string;
}

export interface OutboundOrderItem {
  id: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  specification?: string;
  unit?: string;
  quantity: number;
  batchNo?: string;
  locationId?: string;
  locationName?: string;
  /** A4 成本核算：结转单位成本（过账时点的移动平均价快照） */
  unitCost?: number;
  /** A4 成本核算：结转成本金额 = quantity × unitCost（COGS 凭证取数口径） */
  costAmount?: number;
  /** B2 序列号联动：本行涉及的序列号清单（serialized 物料出库时自动核销状态） */
  serialNos?: string[];
  /** B2 HU 联动：本行归属的搬运单元（Handling Unit）ID */
  huId?: string;
}

export interface OutboundOrder extends BaseEntity {
  outboundNo: string;
  type: OutboundType;
  sourceNo?: string;
  customerId?: string;
  customerName?: string;
  /** 退供应商出库（采购退货）对应的供应商信息 */
  vendorId?: string;
  vendorName?: string;
  status: OutboundStatus;
  warehouseId: string;
  warehouseName?: string;
  orgId?: string; // 所属组织（P2-2 多组织）
  operator: string;
  outboundDate: string;
  items: OutboundOrderItem[];
  remarks?: string;
  /** 事件驱动：出库记账（扣减库存）是否已执行，防止重复过账 */
  inventoryPosted?: boolean;
  /** A4-② 成本核算：出库 COGS 凭证是否已生成，防止重复结转成本 */
  cogsPosted?: boolean;
  /** P1-07 拣配：拣配人 */
  picker?: string;
  /** P1-07 拣配：包装方式 */
  packagingMethod?: 'carton' | 'wooden' | 'pallet' | 'bare';
  /** P1-07 拣配：件数 */
  packageCount?: number;
  /** P1-07 拣配：重量(kg) */
  weight?: number;
  /** P1-07 拣配：体积(m³) */
  volume?: number;
  /** P1-07 拣配：快递公司 */
  expressCompany?: string;
  /** P1-07 拣配：快递单号 */
  expressNo?: string;
  /** P1-07 拣配：拣配开始时间 */
  pickingStartedAt?: string;
  /** P1-07 拣配：拣配完成时间 */
  pickingFinishedAt?: string;
  /** P1-07 拣配：包装完成时间 */
  packedAt?: string;
  /** P1-07 拣配：发货时间 */
  shippedAt?: string;
}

export interface CheckTaskItem {
  id: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  locationId?: string;
  locationName?: string;
  bookQuantity: number;
  countQuantity?: number;
  difference?: number;
  remarks?: string;
  adjusted?: boolean;
}

export interface CheckTask extends BaseEntity {
  taskNo: string;
  warehouseId: string;
  warehouseName?: string;
  orgId?: string; // 所属组织（P2-2 多组织）
  type: 'full' | 'partial';
  status: CheckStatus;
  startDate: string;
  endDate?: string;
  operator: string;
  items: CheckTaskItem[];
  differenceAmount?: number;
  remarks?: string;
  blindMode?: boolean; // P1-21 盲盘模式（隐藏账面数量）
}

export interface InventoryRecord {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  specification?: string;
  warehouseId: string;
  warehouseName?: string;
  locationId?: string;
  locationName?: string;
  orgId?: string; // 所属组织（P2-2 多组织）
  quantity: number;
  availableQuantity: number;
  frozenQuantity: number;
  unit: string;
  lastInboundDate?: string;
  lastOutboundDate?: string;
  /** P1-08 保质期状态 */
  shelfLifeStatus?: 'normal' | 'expiring' | 'expired';
}

export interface InventoryAlert {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  type: 'low_stock' | 'overstock' | 'expiring' | 'frozen';
  currentQuantity: number;
  threshold: number;
  severity: 'warning' | 'critical';
  createdAt: string;
}

// ==================== 批次管理（V2.7 新增，对标 SAP/用友/金蝶 批次/序列号）====================
export type BatchStatus = 'normal' | 'expiring' | 'expired' | 'locked';

export interface BatchRecord {
  id: string;
  batchNo: string;
  materialId?: string; // P2-2 补：便于与出入库行精确匹配
  materialCode: string;
  materialName: string;
  warehouseId: string;
  warehouseName?: string;
  locationId?: string; // P2-2 库位
  orgId?: string; // P2-2 多组织
  quantity: number;
  productionDate?: string;
  expiryDate?: string;
  inboundNo?: string;
  inboundDate: string;
  supplierName?: string;
  status: BatchStatus;
  locked?: boolean;
}

// ==================== 成品入库（V2.8 类型上提至 @/types，统一来源）====================
export interface FinishedGoodsInbound {
  id: string;
  inboundNo: string;          // FIN-
  workOrderId: string;
  workOrderNo: string;
  productId: string;
  productCode: string;
  productName: string;
  specification: string;
  unit: string;
  plannedQty: number;
  actualQty: number;
  qualifiedQty: number;
  rejectedQty: number;
  batchNo: string;
  warehouseId: string;
  warehouseName: string;
  locationId?: string;
  locationName?: string;
  orgId?: string; // 所属组织（P2-2 多组织）
  inspectionTaskId?: string;  // 关联检验单
  status: 'pending' | 'inspecting' | 'completed' | 'partial';
  operator: string;
  inboundDate: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// ==================== P1-21 循环盘点 ====================
export type AbcClass = 'A' | 'B' | 'C';
export type CycleFrequency = 'weekly' | 'monthly' | 'quarterly';

export interface CyclePlanItem {
  id: string;
  materialCategory: string;
  abcClass: AbcClass;
  frequency: CycleFrequency;
  lastCheckDate: string;
  nextCheckDate: string;
  warehouseKeeper: string;
  responsibleWarehouse: string;
}

