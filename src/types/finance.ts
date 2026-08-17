import { BaseEntity } from './common';

export type InvoiceStatus = 'draft' | 'submitted' | 'verified' | 'paid' | 'cancelled';
export type InvoiceType = 'vat_special' | 'vat_normal' | 'receipt';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Invoice extends BaseEntity {
  invoiceNo: string;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  vendorName: string;
  vendorTaxNo: string;
  purchaseOrderNo: string;
  invoiceDate: string;
  receivedDate: string;
  amount: number;       // 不含税金额
  taxRate: number;      // 税率
  taxAmount: number;    // 税额
  totalAmount: number;  // 含税总额
  verifiedBy?: string;
  verifiedAt?: string;
  note?: string;
  voucherGenerated?: boolean; // 是否已自动/手动生成凭证
  // P2-5 多币种支持（可选，向后兼容）
  currency?: string;          // 原币代码，如 USD；缺省视为本位币 CNY
  exchangeRate?: number;      // 原币→本位币汇率（1 原币 = exchangeRate CNY）
}

export interface PaymentPlan extends BaseEntity {
  planNo: string;
  vendorName: string;
  purchaseOrderNo: string;
  invoiceNo: string;
  totalAmount: number;
  paidAmount: number;
  status: PaymentStatus;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: string;
  bankAccount?: string;
  note?: string;
  voucherGenerated?: boolean; // 是否已生成付款凭证
  // P2-5 多币种支持（可选，向后兼容）
  currency?: string;          // 原币代码，缺省 CNY
  exchangeRate?: number;      // 原币→本位币汇率
}

// ==================== 往来对账（B7-T3 供应商门户对账单回写主 ERP） ====================
export interface Reconciliation extends BaseEntity {
  statementNo: string;       // 对账单号（门户 VendorStatement.statementNo）
  vendorId: string;          // 供应商 id（统一身份源）
  vendorName: string;
  period: string;            // 对账周期（对应 statementPeriod）
  amount: number;            // 对账金额（明细金额合计）
  status: 'pending' | 'confirmed';
  confirmedAt?: string;      // 供应商确认时间
}

// ==================== 科目表 ====================
export interface ChartAccount {
  id: string;
  code: string;          // 科目编码
  name: string;          // 科目名称
  type: AccountType;     // 科目类别
  parentCode?: string;   // 上级科目编码
  isLeaf: boolean;       // 是否末级科目
  balance: number;       // 期初余额（期初借方/贷方占用数，正值；方向由 normalSide 决定）
  // P3-1 报表深化（可选，向后兼容）
  normalSide?: 'debit' | 'credit';   // 余额方向：资产/费用=借；负债/权益/收入/备抵=贷
  statement?: 'BS' | 'IS' | 'CF';    // 所属报表：资产负债表/利润表/现金流量表
  section?: string;                  // 报表内分组（如 流动资产/非流动资产/流动负债/所有者权益/营业收入/营业成本/期间费用）
}

// ==================== 固定资产 ====================
export type FixedAssetStatus = 'in_use' | 'idle' | 'scrapped';

export interface FixedAsset extends BaseEntity {
  assetCode: string;       // 资产编码
  assetName: string;       // 资产名称
  category: string;        // 类别（房屋/设备/运输工具…）
  originalValue: number;   // 原值
  residualRate: number;    // 残值率（0~1）
  usefulLifeMonths: number; // 预计使用年限（月）
  startDate: string;       // 入账日期
  monthlyDepreciation: number; // 月折旧额（直线法）
  accumulatedDepreciation: number; // 累计折旧
  netValue: number;        // 净值 = 原值 - 累计折旧
  status: FixedAssetStatus;
  scrapDate?: string;      // 报废日期
  note?: string;
}

// ==================== 期末结账 ====================
export type ClosingStatus = 'open' | 'profit_closed' | 'closed';

export interface ClosedPeriod extends BaseEntity {
  period: string;          // 期间，如 2026-01
  status: ClosingStatus;   // open=未结 / profit_closed=已损益结转 / closed=已结账
  closedBy?: string;       // 结账人
  closedAt?: string;       // 结账时间
  profitVoucherNo?: string; // 损益结转凭证号
  fxVoucherNo?: string;     // 汇兑损益结转凭证号
}

export interface AccountEntry extends BaseEntity {
  entryNo: string;
  date: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  currency: string;
  voucherNo: string;
  createdBy: string;
  // P2-5 辅助核算维度（可选）
  costCenterId?: string;
  costCenterName?: string;
  projectId?: string;
  projectName?: string;
  auxNote?: string;
}

// ==================== A1 凭证结构（凭证头 + 分录行） ====================
/**
 * 凭证状态机：draft 制单 → reviewed 已审核 → posted 已过账 → reversed 已冲销
 * - draft：可任意修改/删除
 * - reviewed：已审核，需反审核才能改
 * - posted：已过账，进入总账（明细账 accountEntries 由已过账凭证派生）
 * - reversed：已冲销（红冲），由一张新的红字凭证抵消
 */
export type VoucherStatus = 'draft' | 'reviewed' | 'posted' | 'reversed';

/** 凭证来源：手工制单 / 各业务单据自动生成 */
export type VoucherSource =
  | 'manual'        // 手工制单
  | 'invoice'       // 采购发票
  | 'payment'       // 付款
  | 'receipt'       // 收款
  | 'sales'         // 销售出库/开票
  | 'inventory'     // 出入库
  | 'asset'         // 固定资产（折旧/报废）
  | 'closing'       // 期末结转
  | 'ocr'           // OCR 智能凭证
  | 'reversal'      // 红冲凭证
  | 'production'    // 生产完工入库（借 1405 库存商品 / 贷 5001 生产成本，对标 SAP 生产收货 101）
  | 'scrap';        // B4 报废出库（借 6602 管理费用 / 贷 1403 原材料|1405 库存商品，对标报废损失）

/** 凭证分录行（借贷记账法：一行只能是借方或贷方之一） */
export interface VoucherItem {
  id: string;
  lineNo: number;             // 行号，从 1 开始
  summary: string;            // 摘要
  accountCode: string;        // 科目编码
  accountName: string;        // 科目名称
  debit: number;              // 借方金额（本位币），非借方填 0
  credit: number;             // 贷方金额（本位币），非贷方填 0
  currency?: string;          // 原币种，默认 CNY
  exchangeRate?: number;      // 汇率，默认 1
  originalAmount?: number;    // 原币金额
  // 辅助核算维度
  costCenterId?: string;
  costCenterName?: string;
  projectId?: string;
  projectName?: string;
  auxNote?: string;
}

/** 凭证（凭证头 + 分录行） */
export interface Voucher extends BaseEntity {
  voucherNo: string;          // 凭证号，如 记-2026-01-0001
  voucherType: string;        // 凭证字：记/收/付/转
  date: string;               // 记账日期
  period: string;             // 会计期间 YYYY-MM
  attachmentCount: number;    // 附单据数
  items: VoucherItem[];       // 分录行
  totalDebit: number;         // 借方合计
  totalCredit: number;        // 贷方合计
  status: VoucherStatus;
  source: VoucherSource;
  sourceNo?: string;          // 来源单据号
  currency?: string;          // 主币种
  createdBy: string;          // 制单人
  reviewedBy?: string;        // 审核人
  reviewedAt?: string;
  postedBy?: string;          // 过账人
  postedAt?: string;
  reversedBy?: string;        // 冲销人
  reversedAt?: string;
  reversalVoucherNo?: string; // 冲销生成的红字凭证号
  originalVoucherNo?: string; // 若本身是红字凭证，指向被冲销的原凭证
  reversed?: boolean;          // 是否已被冲销
  remark?: string;
}

/** 凭证校验结果 */
export interface VoucherValidation {
  valid: boolean;
  errors: string[];
  totalDebit: number;
  totalCredit: number;
  difference: number;         // 借 - 贷
}

export interface FinanceStats {
  totalPayable: number;       // 应付账款总额
  overdueAmount: number;      // 逾期金额
  thisMonthPaid: number;      // 本月已付
  thisMonthInvoice: number;   // 本月开票
  pendingVerify: number;      // 待验证发票数
}

// ==================== 税务核算 ====================
export type TaxPeriod = 'monthly' | 'quarterly' | 'annual';
export type TaxCategory = 'vat' | 'corporate_income' | 'personal_income' | 'stamp' | 'property' | 'other';

export interface TaxRecord extends BaseEntity {
  recordNo: string;
  period: string;
  periodType: TaxPeriod;
  category: TaxCategory;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  deductedAmount: number;
  actualPayable: number;
  paidAmount: number;
  paymentDate?: string;
  status: 'pending' | 'calculated' | 'paid' | 'reported';
  remarks?: string;
}

// ==================== 项目核算 ====================
export interface ProjectCostItem {
  id: string;
  category: 'material' | 'labor' | 'equipment' | 'outsource' | 'overhead' | 'other';
  description: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
}

export interface ProjectAccount extends BaseEntity {
  accountNo: string;
  projectId: string;
  projectNo: string;
  projectName: string;
  customerName: string;
  period: string; // 核算期间
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
  costItems: ProjectCostItem[];
  revenue: number;
  grossProfit: number;
  grossMargin: number;
  status: 'draft' | 'submitted' | 'approved';
  preparedBy: string;
  approvedBy?: string;
  remarks?: string;
}

// ==================== 应收/应付管理（P1-12） ====================
export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';
export interface Receivable {
  id: string; customerId: string; customerName: string;
  invoiceNo: string; amount: number; paidAmount: number;
  balance: number; dueDate: string; agingBucket: AgingBucket;
  status: 'open' | 'partial' | 'overdue' | 'closed'; remarks?: string;
}
export interface Payable {
  id: string; vendorId: string; vendorName: string;
  invoiceNo: string; amount: number; paidAmount: number;
  balance: number; dueDate: string; agingBucket: AgingBucket;
  status: 'open' | 'partial' | 'overdue' | 'closed'; paymentDate?: string; remarks?: string;
}
