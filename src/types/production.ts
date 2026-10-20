import { BaseEntity } from './common';

export type WorkOrderStatus = 'draft' | 'released' | 'in_progress' | 'completed' | 'closed';
export type ProcessRouteStatus = 'draft' | 'active' | 'obsolete';

export interface ProcessRoute extends BaseEntity {
  routeNo: string;
  name: string;
  productCode: string;
  productName: string;
  version: string;
  status: ProcessRouteStatus;
  totalLeadTime: number; // 小时
  operations: Operation[];
}

export interface Operation {
  id: string;
  sequence: number;
  operationCode: string;
  operationName: string;
  workCenter: string;
  setupTime: number;    // 准备时间（分钟）
  runTime: number;      // 运行时间（分钟/件）
  waitTime: number;     // 等待时间（小时）
  description?: string;
  skills?: string[];
}

export interface WorkOrder extends BaseEntity {
  orderNo: string;
  orgId?: string;        // 归属组织（C3 数据权限：新建时打 currentOrgId，无则遗留数据）
  status: WorkOrderStatus;
  productCode: string;
  productName: string;
  bomId: string;
  bomNo: string;
  routeId: string;
  routeNo: string;
  plannedQuantity: number;
  completedQuantity: number;
  scrapQuantity: number;
  qualifiedQuantity?: number;  // 合格数量（B3 完工回写：completedQuantity - scrapQuantity）
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  workshop: string;
  supervisor: string;
  projectNo?: string;
  projectName?: string;
  progress?: WorkOrderProgress[];
  note?: string;
  // ── P2-3 成本归集（可选，向后兼容）──
  costCenterId?: string;
  actualLaborCost?: number;
  actualMaterialCost?: number;
  actualMachineCost?: number;
  actualTotalCost?: number;
  // ── V3.62.0 边界①：折旧与制造费用（工单 manual 录入，完工结转含入 5001）──
  depreciationCost?: number;
  overheadCost?: number;
  /** B2-② 领料联动：本工单已领料明细（防重复领料） */
  issuedMaterials?: IssuedMaterial[];
  // ── V3.20.0 差距13 倒冲发料（可选，由服务端写入，前端只读展示）──
  /** 原料是否已按物料清单自动倒冲扣账（对应 work_orders.inventory_posted） */
  inventoryPosted?: boolean;
  /** 倒冲生成的出库单号（对应 work_orders.backflush_outbound_no），可从工单直追到扣料单据 */
  backflushOutboundNo?: string;
  /** P1-10 委外闭环：本工单已下达委外的数量（由 subcontractStore 收货回写累加，前端只读展示） */
  outsourcedQty?: number;
}

/** B2-② 工单领料明细 */
export interface IssuedMaterial {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  issuedAt: string;
  outboundNo: string; // 关联的出库单号
}

/** 工作中心（产能主数据，P2-3 从 CapacityScheduling 的 localStorage 迁入独立 store） */
export interface WorkCenter {
  id: string;
  name: string;
  capacityHours: number; // 日可用产能（小时）
  description?: string;
}

/** 工序报工记录（P2-3 核心：车间执行层数据采集） */
export interface OperationReport {
  id: string;
  workOrderId: string;
  workOrderNo: string;
  operationId: string;
  operationName: string;
  workCenter: string;       // 原始工序工作中心名称
  operator: string;         // 操作工
  startTime: string;        // 开工时间（ISO）
  endTime: string;          // 完工时间（ISO）
  goodQuantity: number;     // 合格数
  scrapQuantity: number;    // 报废数
  laborHours?: number;      // 实际工时（缺省按 工序标准工时×合格数 推算）
  note?: string;
  /** V3.66.0 P0-3：生产投诉追责——本次报废的责任供应商（选了才推门户/NCR，不选不影响报工） */
  vendorId?: string;
  vendorName?: string;
  reportedAt: string;       // 上报时间（ISO）
}

export interface WorkOrderProgress {
  operationId: string;
  operationName: string;
  status: 'pending' | 'in_progress' | 'completed';
  completedQuantity: number;
  startTime?: string;
  endTime?: string;
  operator?: string;
}

export interface MRPRecommendation {
  id: string;
  materialCode: string;
  materialName: string;
  currentStock: number;
  safetyStock: number;
  requiredQuantity: number;
  onOrderQuantity: number;
  suggestedQuantity: number;
  unit: string;
  suggestedDate: string;
  reason: string;
  type: 'purchase' | 'manufacture';
  priority: 'urgent' | 'high' | 'normal';
}

// ==================== P3-2 生产深化 ====================

/** 生产版本：物料 + BOM + 工艺路线 的组合（对标 SAP 生产版本 / 金蝶 生产用料清单版本） */
export type ProductionVersionStatus = 'draft' | 'active' | 'obsolete';
export interface ProductionVersion extends BaseEntity {
  version: string;             // 版本号，如 V1.0
  materialId: string;
  materialCode: string;
  materialName: string;
  bomId: string;
  bomNo: string;
  routeId: string;
  routeNo: string;
  status: ProductionVersionStatus;
  effectiveDate: string;       // 生效日期
  note?: string;
}

/** 工程变更单 ECN：接 BOM（变更后写入新版本号并切换 BOM 状态） */
export type ECNStatus = 'draft' | 'released';
export interface ECN extends BaseEntity {
  changeNo: string;            // 变更单号，如 ECN-2026-001
  title: string;
  reason: string;             // 变更原因
  materialId: string;
  materialCode?: string;
  materialName?: string;
  bomId: string;              // 受影响 BOM
  bomNo?: string;
  oldVersion: string;         // 变更前版本
  newVersion: string;         // 变更后版本
  effectiveDate: string;      // 生效切换日期
  status: ECNStatus;
  releasedAt?: string;
  note?: string;
  /**
   * P0-4 非破坏补强（V3.74.0）：关联的物料域工程变更 id 列表（ecnStore.ecns）。
   * 与 EngineeringChange.linkedEcnIds 互为对侧，两侧方法任选其一调用即双向落库；
   * 维护入口在 ProductionVersions 页「工程变更 ECN」区「关联ECM」。
   */
  linkedChangeIds?: string[];
}

/** 委外加工：工序委外 / 整体委外 + 发料回收 */
export type SubcontractType = 'process' | 'whole';
/** B2：新增 received —— 委外成品已收货回厂（发料 issued → 收货 received → 关闭 closed） */
export type SubcontractStatus = 'draft' | 'issued' | 'received' | 'returned' | 'closed';
export interface SubcontractIssueItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  qty: number;
}
export interface SubcontractOrder extends BaseEntity {
  orderNo: string;
  type: SubcontractType;
  materialId: string;
  materialCode: string;
  materialName: string;
  vendorId: string;
  vendorName: string;
  qty: number;
  bomId?: string;
  sourceWorkOrderId?: string;   // 关联的内部工单（工序委外出处）
  issueItems: SubcontractIssueItem[]; // 委外发料明细（发料回收）
  status: SubcontractStatus;
  planDate: string;
  note?: string;
  /** B2：单件加工费（未税），委外收货时据此计提加工费应付并计入成品成本 */
  processFee?: number;
  /** B2：累计已收货数量（支持分次收货） */
  receivedQty?: number;
  /** B2：委外发料生成的出库单号（回链留痕，防重复发料） */
  issueOutboundNo?: string;
  /** B2：委外收货生成的入库单号列表（回链留痕） */
  receiptInboundNos?: string[];
}

/** 设备 / 工装 / 模具 主数据（并入资产保养） */
export type EquipmentCategory = 'machine' | 'tool' | 'mold';
export type EquipmentStatus = 'in_use' | 'idle' | 'scrapped';
export interface Equipment extends BaseEntity {
  code: string;               // 设备编号
  name: string;
  category: EquipmentCategory;
  workCenterId?: string;
  workCenterName?: string;
  status: EquipmentStatus;
  nextMaintenanceDate?: string;
  note?: string;
}

/** 保养工单 */
export type MaintenanceStatus = 'planned' | 'done';
export interface MaintenanceOrder extends BaseEntity {
  equipmentId: string;
  equipmentName: string;
  equipmentCode: string;
  type: string;               // 保养类型（日常/定期/大修）
  date: string;
  cost: number;
  status: MaintenanceStatus;
  note?: string;
}

/** 详细工序排程锁：按 工单:工序 维度记录锁定与手工锚定开始日 */
export interface ScheduleLock {
  key: string;                // `${workOrderId}:${operationId}`
  locked: boolean;
  anchorDate?: string;        // 手工指定的计划开始日
}
