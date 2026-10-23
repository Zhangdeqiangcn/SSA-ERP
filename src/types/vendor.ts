import { BaseEntity, Attachment } from './common';

export type VendorStatus = 'registered' | 'pending' | 'approved' | 'rejected' | 'blacklisted';
export type VendorType = 'manufacturer' | 'trader' | 'agent';

export interface Vendor extends BaseEntity {
  code: string;
  name: string;
  shortName?: string;
  type: VendorType;
  contact: string;
  phone: string;
  email?: string;
  address?: string;
  status: VendorStatus;
  qualificationFiles?: Attachment[];
  qualificationExpiry?: string;
  rating?: number;
  blacklistReason?: string;
  blacklistedAt?: string;
  blacklistReasonHistory?: BlacklistHistory[];
  creditLevel?: string;
  taxId?: string;
  bankAccount?: string;
  creditLimit?: number; // 信用额度（授信上限）
  usedCredit?: number;   // 已用信用（占用额度）
  /** B5 门户回写：供应商在门户提交的待审资料（甲方审核后并入主数据） */
  profilePending?: Record<string, unknown>;
  profilePendingAt?: string;
  profilePendingBy?: string;
  /** B5：甲方审核并入主数据的操作人 */
  profileReviewedBy?: string;

  // ── 采购组织与会计（P0-10） ──
  salesOrg?: string;             // 采购组织
  reconciliationAccount?: string; // 统驭科目
  taxCode?: string;              // 税码
  /** V3.94.0 自定义字段（按设置的字段定义动态扩展，如「供应商类别」用于采购申请自动询价匹配），key 为字段标识 */
  customFields?: Record<string, unknown>;
}

export interface BlacklistHistory {
  reason: string;
  operator: string;
  operatedAt: string;
}

export interface VendorRatingRecord {
  id: string;
  vendorId: string;
  rating: number;
  type: 'manual' | 'auto';
  evaluator?: string;
  criteria: Record<string, number>;
  remarks?: string;
  createdAt: string;
}

// ── 供应商注册申请（准入审批流程）─────────────────────────
export type ApplicationStatus = 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'supplement';

export interface VendorApplication {
  id: string;
  applicationNo: string;           // VA-YYYYMMDDNNN
  companyName: string;             // 企业全称
  unifiedCode: string;             // 统一社会信用代码
  businessLicense: string;         // 营业执照号
  legalRepresentative: string;     // 法定代表人
  registeredCapital: string;       // 注册资本（万元）
  contact: string;                 // 联系人
  contactPhone: string;            // 联系电话
  contactEmail: string;            // 联系邮箱
  address: string;                 // 注册地址
  supplyCategories: string[];      // 供货类目
  mainProducts: string;            // 主要产品
  annualRevenue?: string;          // 年销售额（万元）
  certifications?: string[];      // 认证列表
  bankName: string;                // 开户银行
  bankAccount: string;             // 银行账号
  bankAccountName: string;         // 账户名称
  taxId?: string;                  // 纳税人识别号
  taxRate?: string;                // 增值税税率
  qualificationExpiry?: string;    // 资质有效期
  // ── 组织与会计（V3.96.0 调整：注册时不再由供应商填，改由采购/财务在审批环节指定）──
  salesOrg?: string;              // 采购组织（供应商可在注册时填，用于把申请路由到对应采购条线）
  reconciliationAccount?: string; // 统驭科目（财务视角，供应商不了解，由采购/财务审批时从会计科目表选择）
  taxCode?: string;               // 税码（财务视角，供应商不了解，由采购/财务审批时从税码主数据选择）
  // ── 定向邀请（V3.100.0）：供应商经采购员邀请链接注册，自动归属 ──
  inviteCode?: string;            // 邀请码
  buyerId?: string;               // 邀请/归属采购员 id（服务端权威，弱定向审核依据）
  buyerName?: string;             // 邀请采购员姓名（冗余快照）
  attachments: { name: string; url: string; type: string }[];
  status: ApplicationStatus;
  reviewerId?: string;
  reviewedAt?: string;
  reviewComment?: string;
  approvalRecords?: { approver: string; action: string; comment: string; at: string }[];
  currentStep?: number;
  stepHistory?: { step: number; role: string; label: string; action: string; comment?: string; at: string }[];
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== 供应商绩效考核（P1-09） ====================
export interface VendorPerformance {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorCode?: string;
  period: string; // 评估周期如 "2026-Q3"
  qualityScore: number;   // 质量分 0-100
  deliveryScore: number;  // 交期分 0-100
  priceScore: number;     // 价格分 0-100
  serviceScore: number;   // 服务分 0-100
  totalScore: number;     // 加权总分
  ranking?: string;       // A/B/C/D
  remarks?: string;
  evaluatedBy?: string;
  evaluatedAt?: string;
  createdAt: string;
}
