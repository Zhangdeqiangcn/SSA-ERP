import { BaseEntity, Attachment, ApprovalRecord } from './common';

export type InspectionType = 'incoming' | 'process' | 'final';
export type InspectionStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'conditional_pass';
export type UnqualifiedDisposition = 'rework' | 'scrap' | 'conditional_accept' | 'return_vendor';
export type PDCAStatus = 'plan' | 'do' | 'check' | 'act' | 'closed' | 'open' | 'in_progress' | 'verified';

export interface InspectionTask extends BaseEntity {
  taskNo: string;
  type: InspectionType;
  status: InspectionStatus;
  materialId: string;
  materialCode: string;
  materialName: string;
  batchNo: string;
  quantity: number;
  sampleQuantity: number;
  /** B9：AQL 抽样方案（GB/T 2828.1）。接入检验任务后自动写入，消除数据孤岛。 */
  aql?: number;                 // 接收质量限（%）
  inspectionLevel?: string;     // 检验水平：S-1..S-4 / I / II / III
  aqlCode?: string;             // 样本量字码
  aqlAc?: number;               // 接收数
  aqlRe?: number;               // 拒收数
  vendorId?: string;
  vendorName?: string;
  /** P0-3：关联的检验批 id（id 级互引，与 InspectionLot.inspectionTaskId 双向绑定） */
  inspectionLotId?: string;
  purchaseOrderNo?: string;
  workOrderNo?: string;
  projectNo?: string;
  projectName?: string;
  inspectionStandardId: string;
  inspectionStandardName: string;
  assignedTo: string;
  plannedDate: string;
  completedDate?: string;
  passedQuantity?: number;
  failedQuantity?: number;
  defectItems?: InspectionDefect[];
  conclusion?: string;
  attachments?: Attachment[];
}

export interface InspectionDefect {
  id: string;
  defectCode: string;
  defectName: string;
  quantity: number;
  severity: 'critical' | 'major' | 'minor';
  description?: string;
}

export interface InspectionStandard extends BaseEntity {
  standardNo: string;
  name: string;
  materialCategory: string;
  version: string;
  status: 'active' | 'inactive';
  inspectionItems: InspectionItem[];
  description?: string;
}

export interface InspectionItem {
  id: string;
  name: string;
  method: string;
  spec: string;
  unit: string;
  lowerLimit?: number;
  upperLimit?: number;
  isCritical: boolean;
}

export type UnqualifiedStatus = 'open' | 'capa_raised' | 'closed';

export interface UnqualifiedItem extends BaseEntity {
  itemNo: string;
  inspectionTaskId: string;
  inspectionTaskNo: string;
  materialCode: string;
  materialName: string;
  batchNo: string;
  defectQuantity: number;
  defectDescription: string;
  disposition: UnqualifiedDisposition;
  dispositionStatus: 'pending' | 'in_progress' | 'completed';
  /** B4：报废(scrap)处置联动生成的出库单号（供库存/凭证联动追溯与 E2E 断言） */
  linkedOutboundNo?: string;
  /** B4：返工(rework)处置联动生成的入库单号（供库存/凭证联动追溯与 E2E 断言） */
  linkedInboundNo?: string;
  /** B4：实际处置方式（用户从处置弹窗选择，可能与预设 disposition 不同，如 rework/scrap/concession 等） */
  actualDisposition?: string;
  /** B7-T2：质量异常来源（区别于内部 inspection 等；'vendor' 表示供应商门户上报）
   *  V3.66.0 P0-3 加 'production_complaint'（生产侧报废投诉追责供应商） */
  /** P0-1：采购退货触发的来料质量 NCR（与销售退货客户侧 NCR 对称闭环，补齐采购侧质量闭环缺角） */
  source?: 'inspection' | 'customer_complaint' | 'internal_audit' | 'vendor' | 'production_complaint' | 'inbound';
  /** B7-T2：回写主 ERP 时对端门户问题单 id，用于幂等守卫与双向追溯 */
  portalIssueId?: string;
  /** B7-T2：是否由供应商在门户主动上报 */
  vendorReported?: boolean;
  /** V3.66.0 P0-3/P0-4：质量追责链的供应商归属（生产投诉/客户退货追责时锚定 vendor） */
  vendorId?: string;
  vendorName?: string;
  // NCR 闭环状态：open(未关闭) → capa_raised(已发起CAPA) → closed(已关闭)
  status?: UnqualifiedStatus;
  responsiblePerson: string;
  dueDate: string;
  completedDate?: string;
  attachments?: Attachment[];
  approvalRecords?: ApprovalRecord[];
}

export interface PDCARecord extends BaseEntity {
  pdcaNo: string;
  title: string;
  status: PDCAStatus;
  source: 'inspection' | 'customer_complaint' | 'internal_audit' | 'other';
  relatedItemId?: string;
  priority: 'high' | 'medium' | 'low';
  // Plan
  problemDescription: string;
  rootCause?: string;
  targetDate: string;
  // Do
  actionItems?: ActionItem[];
  // Check
  checkResult?: string;
  checkDate?: string;
  // Act
  standardizationActions?: string;
  // CAPA fields
  correctiveAction?: string;       // 纠正措施
  preventiveAction?: string;       // 预防措施
  verificationResult?: string;     // 验证结果
  closedDate?: string;
  owner: string;
}

export interface ActionItem {
  id: string;
  description: string;
  owner: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface QualityStats {
  totalInspections: number;
  passedInspections: number;
  passRate: number;
  pendingInspections: number;
  openUnqualified: number;
  openPDCA: number;
  monthlyPassRate: { month: string; rate: number }[];
  defectDistribution: { type: string; count: number }[];
}

// ── P3-4 质量深化：8D / 质量 SPC 控制图 / 实验室与检验设备 ──
export type EightDStatus = 'open' | 'in_progress' | 'closed';
export interface EightDRecord extends BaseEntity {
  code: string; // 8D 编号
  title: string;
  sourceType: 'unqualified' | 'inspection' | 'customer_complaint' | 'internal_audit' | 'other';
  sourceId?: string; // 关联不合格品 / 检验批 / 客诉
  sourceNo?: string;
  priority: 'high' | 'medium' | 'low';
  status: EightDStatus;
  owner: string;
  team: string[]; // D1 团队
  d0?: string; // 准备 / 紧急响应
  d1?: string; // 组建团队
  d2?: string; // 问题描述
  d3?: string; // 临时遏制措施
  d4?: string; // 根因分析
  d5?: string; // 永久纠正措施
  d6?: string; // 实施与验证
  d7?: string; // 预防再发生
  d8?: string; // 表彰与关闭
  dueDate?: string;
  closedDate?: string;
}

export interface SpcSubgroup {
  id: string;
  label: string; // 子组号 / 时间
  values: number[];
}

export interface SpcChart extends BaseEntity {
  name: string;
  characteristic: string; // 质量特性
  unit: string;
  subgroupSize: number; // n
  usl?: number; // 规格上限
  lsl?: number; // 规格下限
  subgroups: SpcSubgroup[];
}

export type LabEquipmentStatus = 'in_use' | 'calibrating' | 'idle' | 'scrapped';
export type LabEquipmentType = 'gauge' | 'cmm' | 'spectrometer' | 'hardness' | 'balance' | 'other';
export interface LabEquipment extends BaseEntity {
  equipmentNo: string;
  name: string;
  type: LabEquipmentType;
  model?: string;
  manufacturer?: string;
  location?: string;
  custodian?: string;
  calibrationCycleDays: number;
  lastCalibrationDate: string; // YYYY-MM-DD
  nextCalibrationDate: string; // YYYY-MM-DD
  status: LabEquipmentStatus;
  accuracy?: string;
  note?: string;
}
