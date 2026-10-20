/**
 * 价格管理模块类型定义
 * 流程：询价单 → 供应商报价 → 比价单 → 价格审批 → 价目表
 */
import { Attachment } from './common';

// ── 询价单 ───────────────────────────────────────────────
export interface PriceInquiryItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  quantity: number;
  requiredDate: string;      // 需求日期
  estimatedPrice?: number;   // 预估单价
  estimatedAmount?: number;  // 预估金额
  sourceRequestId?: string;  // 来源采购申请ID
  sourceRequestNo?: string;  // 来源采购申请单号
  remarks?: string;
  attachments?: Attachment[]; // 该物料对应的询价附件
}

export interface PriceInquiry {
  id: string;
  inquiryNo: string;         // 询价单号 IQ20240501...
  title: string;
  inquiryDate: string;       // 询价日期
  inquirer: string;          // 询价人
  department: string;        // 询价部门
  items: PriceInquiryItem[];
  targetVendorIds: string[]; // 目标供应商ID列表
  targetVendorNames: string[];
  deadline: string;          // 报价截止日期
  currency: string;          // 币种 CNY/USD
  status: 'draft' | 'published' | 'closed' | 'compared' | 'quotation_received'; // 草稿/已发布/已截止/已生成比价单/已收到供应商报价
  totalEstimatedAmount: number;
  remarks?: string;
  attachments?: Attachment[]; // 询价单级（集中）附件
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  /** B5 门户回写：供应商提交报价后关联的报价单 */
  vendorQuotationId?: string;
  vendorQuotationNo?: string;
}

// ── 供应商报价单 ─────────────────────────────────────────
export interface VendorQuotationItem {
  id: string;
  inquiryItemId: string;     // 对应询价单项ID
  materialId: string;
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  quantity: number;
  unitPrice: number;         // 报价单价
  amount: number;            // 报价金额
  deliveryDays: number;     // 交货天数
  deliveryDate?: string;     // 预计交期
  remarks?: string;
}

export interface VendorQuotation {
  id: string;
  quotationNo: string;       // 报价单号 VQ20240501...
  inquiryId: string;         // 关联询价单ID
  inquiryNo: string;         // 关联询价单号
  vendorId: string;
  vendorName: string;
  vendorContact?: string;
  vendorPhone?: string;
  quotationDate: string;     // 报价日期
  items: VendorQuotationItem[];
  totalAmount: number;
  validUntil: string;        // 报价有效期
  paymentTerms?: string;     // 付款条件
  deliveryTerms?: string;    // 交货条件
  currency: string;          // 币种
  status: 'draft' | 'submitted';  // 草稿/已提交
  remarks?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── 比价单（自动汇总）─────────────────────────────────────
export interface PriceComparisonMaterialItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  quantity: number;
  quotations: PriceComparisonVendorQuote[]; // 各供应商报价对比
  /** 最低价供应商ID */
  lowestVendorId: string;
  /** 最低价供应商名称 */
  lowestVendorName: string;
  /** 最低单价 */
  lowestUnitPrice: number;
  /** 最低总价 */
  lowestAmount: number;
  /** 选定供应商ID（采购员选择后设置） */
  selectedVendorId?: string;
  /** 选定供应商名称 */
  selectedVendorName?: string;
  /** 选定单价 */
  selectedUnitPrice?: number;
  /** 选定总价 */
  selectedAmount?: number;
}

export interface PriceComparisonVendorQuote {
  vendorId: string;
  vendorName: string;
  quotationId: string;
  quotationNo: string;
  unitPrice: number;
  amount: number;
  deliveryDays: number;
  deliveryDate?: string;
  paymentTerms?: string;
  remarks?: string;
  isLowest: boolean;         // 是否最低价
}

export interface PriceComparison {
  id: string;
  comparisonNo: string;      // 比价单号 PC20240501...
  inquiryId: string;
  inquiryNo: string;
  title: string;
  comparisonDate: string;    // 比价日期
  items: PriceComparisonMaterialItem[];
  participatingVendors: string[]; // 参与报价的供应商名称
  totalLowestAmount: number; // 全线最低总价
  totalSelectedAmount?: number; // 选定总价
  status: 'pending' | 'selected' | 'approved' | 'rejected'; // 待选定/已选定/已审批/已驳回
  selector?: string;         // 选定人
  selectedAt?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

// ── 价格审批单 ───────────────────────────────────────────
export interface PriceApprovalItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  quantity: number;
  selectedVendorId: string;
  selectedVendorName: string;
  selectedUnitPrice: number;
  selectedAmount: number;
  deliveryDays: number;
  deliveryDate?: string;
  paymentTerms?: string;
}

export interface PriceApprovalRecord {
  id: string;
  approver: string;
  action: 'approve' | 'reject';
  comments?: string;
  operatedAt: string;
  nodeName: string;
}

export interface PriceApproval {
  id: string;
  approvalNo: string;        // 审批单号 PA20240501...
  comparisonId: string;
  comparisonNo: string;
  inquiryId: string;
  inquiryNo: string;
  title: string;
  applicant: string;         // 申请人（采购员）
  applicationDate: string;
  items: PriceApprovalItem[];
  totalAmount: number;
  approvalRecords: PriceApprovalRecord[];
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'; // 待审批/审批中/已通过/已驳回
  remarks?: string;
  currency?: string;         // 币种（缺省 CNY）
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  currentStep?: number;       // 当前审批步骤索引（统一审批引擎多步推进用，B7-1）
}

// ── 价目表 ───────────────────────────────────────────────
export interface PriceListItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  vendorId: string;
  vendorName: string;
  unitPrice: number;
  currency: string;          // 币种
  effectiveDate: string;     // 生效日期
  expiryDate?: string;       // 失效日期（空=长期有效）
  sourceApprovalId: string;  // 来源审批单ID
  sourceApprovalNo: string;  // 来源审批单号
  paymentTerms?: string;
  deliveryDays: number;
  minOrderQty?: number;      // 最小起订量
  status: 'active' | 'expired' | 'frozen'; // 有效/已过期/已冻结
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  // 回写主数据标志位（B6：审批通过即回写物料标准价）
  writtenBack?: boolean;   // 是否已回写物料主数据 standardPrice
  syncedAt?: string;       // 回写时间
  erpPriceId?: string;     // 回写对应的 ERP 物料价 ID
  parentId?: string;       // P1-14 上一版价目表项引用（历史价/协议价版本链，向后兼容可选）
}
