import { BaseEntity, Status, Attachment } from './common';

export interface MaterialCategory extends BaseEntity {
  parentId: string | null;
  name: string;
  /** 分类编码段（同时作为该分类下物料编码的前缀；种子数据中已存为全路径编码，如 01 / 0102 / 010201） */
  code: string;
  /** 该分类下物料的流水号位数（默认 3），合并自原「编码规则」——分类即编码规则 */
  sequenceLength?: number;
  /** 按职能维护的责任人员：role -> 用户 id 列表（如采购员/SQE/工艺工程师/研发工程师等），平时隐藏、按需维护 */
  responsiblePersons?: Record<string, string[]>;
  description?: string;
  sortOrder: number;
  level?: number;
  children?: MaterialCategory[];
}

export interface MaterialParameter {
  key: string;
  value: string;
  unit?: string;
}

export type MaterialType = 'raw' | 'semi' | 'finished' | 'purchased' | 'service';
export type MakeOrBuy = 'make' | 'buy';
export type MaterialApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected';

// 评估类（Valuation Class）：决定物料计入哪类存货科目（对标 SAP 评估类）
export type ValuationClass = 'RAW' | 'SEMI' | 'FG' | 'TRADING' | 'PACKAGING' | 'CONSUMABLE';
// 价控程序：S=标准价 / V=移动平均价
export type PriceControl = 'S' | 'V';

// 工厂维度参数（多工厂/多地点评估，对标 SAP 工厂级评估视图）
export interface PlantParam {
  plantId: string;
  plantName?: string;
  valuationClass?: ValuationClass;
  priceControl?: PriceControl;
  standardPrice?: number;
  movingAvgPrice?: number;
  safetyStock?: number;
  leadTime?: number;
  lotSize?: number;
}

export interface Material extends BaseEntity {
  code: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  specification?: string;
  model?: string;              // 型号
  unit: string;
  materialType?: MaterialType; // 物料类型（原材料/半成品/成品/外购/服务）
  makeOrBuy?: MakeOrBuy;       // 自制 / 外购
  safetyStock: number;
  minStock: number;
  maxStock: number;
  currentStock: number;
  price: number;
  currency: string;
  leadTime?: number;           // 采购提前期 LT（天）
  moq?: number;                // 最小订单量
  mpq?: number;                // 最小包装量
  defaultVendorId?: string;
  defaultVendorName?: string;
  purchaseUnit?: string;       // 采购单位（与基本单位不同的采购计量单位，如「箱」）
  // 多单位换算约定（convention）：
  // unitConversion = 1 个采购单位 等同于多少个基本单位（base unit）。
  // 即：1 [purchaseUnit] = unitConversion [unit]。
  // 例：基本单位=个，采购单位=箱，unitConversion=12 → 1 箱 = 12 个。
  unitConversion?: number;     // 1 采购单位 = N 基本单位 的换算率
  status: Status;
  remarks?: string;
  attachments?: Attachment[];
  parameters?: MaterialParameter[];
  /** 自定义字段（按设置的字段定义动态扩展，key 为字段标识） */
  customFields?: Record<string, unknown>;
  // ── 工艺属性（自制件路径审批时填写）──
  routing?: string;            // 工艺路线
  workCenter?: string;         // 工作中心
  cycleTime?: number;          // 周期时间（天）
  scrapRate?: number;          // 报废率（%）
  inspectionPoint?: string;    // 检验点
  // ── P3-3 物料评估与价控（对标 SAP 评估类/价控/工厂维度）──
  /** 评估类：决定记入哪类存货科目 */
  valuationClass?: ValuationClass;
  /** 价控程序：S=标准价 / V=移动平均价 */
  priceControl?: PriceControl;
  /** 标准价（价控 S） */
  standardPrice?: number;
  /** 移动平均价（价控 V，由出入库滚动更新） */
  movingAvgPrice?: number;
  /** A4 成本核算：库存金额（本位币未税，恒等式 stockValue ≈ currentStock × movingAvgPrice，由出入库滚动更新） */
  stockValue?: number;
  /** 标准成本（遗留/备选成本字段，与 standardPrice 并存；报表取数时兼容 `standardCost ?? cost`） */
  standardCost?: number;
  /** 单位成本（遗留/备选成本字段，与 movingAvgPrice 并存；报表取数时兼容 `standardCost ?? cost`） */
  cost?: number;
  /** 是否批次管理 */
  batchManaged?: boolean;
  /** 是否序列号管理 */
  serialized?: boolean;
  /** 工厂维度参数（多工厂评估视图） */
  plantParams?: PlantParam[];
  // ── P0-04 物料多视图扩展 ──
  // 采购视图
  /** 采购组 */
  purchasingGroup?: string;
  /** 订单单位 */
  orderUnit?: string;
  /** 采购值键 */
  purchasingValueKey?: string;
  /** 收货处理天数 */
  grProcessingDays?: number;
  // MRP 视图
  /** MRP 类型（如 PD/VB/ND） */
  mrpType?: string;
  /** MRP 控制者 */
  mrpController?: string;
  /** 批量大小 */
  lotSize?: number;
  /** 再订货点 */
  reorderPoint?: number;
  /** 计划交货天数 */
  plannedDeliveryDays?: number;
  // 销售视图
  /** 税分类 */
  taxClassification?: string;
  /** 交货单位 */
  deliveryUnit?: string;
  /** 最小订单量 */
  minOrderQty?: number;
  /** 最小交货量 */
  minDeliveryQty?: number;
  /** 科目分配组 */
  accountAssignmentGroup?: string;
  // ── P1-08 保质期管理 ──
  /** 保质期天数（0 表示无保质期限制） */
  shelfLifeDays?: number;
  /** 临期预警天数（到期前 N 天预警） */
  shelfLifeWarningDays?: number;

  // ── P1-06 物料生命周期 ──
  /** 生命周期状态 */
  lifecycleStatus?: 'draft' | 'active' | 'phasing_out' | 'obsolete';
  /** P2-23 GTIN 全球贸易项目代码（条形码/UPC/EAN等） */
  gtin?: string;
}

/** 物料新增审批申请（分步按角色编辑，最终批准才生成正式物料） */
export interface MaterialApplicationStepRecord {
  step: number;
  role: string;
  label: string;
  action: 'submit' | 'approve' | 'reject';
  fields?: string[];
  comment?: string;
  at: string;
}

export interface MaterialApplication {
  id: string;
  applicationNo: string;
  applicant: string;
  applicantRole: string;
  status: MaterialApprovalStatus;
  currentStep: number;        // 当前待处理步骤索引
  draft: Partial<Material>;   // 各步骤累计编辑的物料草稿字段
  stepHistory: MaterialApplicationStepRecord[];
  createdAt: string;
  updatedAt: string;
}

export type MaterialFilter = {
  code?: string;
  name?: string;
  categoryId?: string;
  status?: Status;
  materialType?: MaterialType;
  makeOrBuy?: MakeOrBuy;
  unit?: string;
  minPrice?: number;
  maxPrice?: number;
  keyword?: string; // 全局模糊查询（code/name/spec/model 子串，忽略大小写）
};

// ── P1-06 物料生命周期状态 ──
export type LifecycleStatus = 'draft' | 'active' | 'phasing_out' | 'obsolete';

// ── P1-06 工程变更单 ECM ──
export type EngineeringChangeType = 'material' | 'bom' | 'routing';
export type ECMStatus = 'draft' | 'approved' | 'implemented' | 'cancelled';

export interface EngineeringChange {
  id: string;
  changeNo: string;
  title: string;
  materialId: string;
  materialName?: string;
  fromVersion: string;
  toVersion: string;
  changeType: EngineeringChangeType;
  oldValue?: string;
  newValue?: string;
  effectiveDate: string;
  status: ECMStatus;
  approvedBy?: string;
  /**
   * P0-4 非破坏补强（V3.74.0）：关联的生产域 ECN id 列表（productionVersionStore.ecns）。
   * 两套 ECN 数据源并存时，用此字段把物料域变更与生产域变更单互相挂钩，
   * 不动旧数据、不删旧源；维护入口在 ECNList 页「关联生产ECN」。
   */
  linkedEcnIds?: string[];
  createdAt: string;
  updatedAt: string;
}

// ── V2.84.0 C9 物料替代料组 + 优先级 ──
// 建模：以主物料编码(materialCode)为锚，一组替代料按 priority(1 最高)排序；
// 互替(A↔B)由用户双向各录一行。替代类型 full=完全替代 / partial=部分替代(按 conversionRatio 折算)。
export type SubstituteType = 'full' | 'partial';

export interface MaterialSubstitute {
  id: string;
  materialCode: string;
  materialName?: string;
  substituteCode: string;
  substituteName?: string;
  /** 优先级，1 最高；同主物料组内升序即为推荐替代顺序 */
  priority: number;
  substituteType: SubstituteType;
  /** 替换比例（部分替代用，默认 1）：1 单位主物料 = conversionRatio 单位替代料 */
  conversionRatio: number;
  /** 生效起始(yyyy-MM-dd)，可选 */
  effectiveFrom?: string;
  /** 生效截止(yyyy-MM-dd)，可选 */
  effectiveTo?: string;
  /** 替代原因（如缺料、成本、交期） */
  reason?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}
