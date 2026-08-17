import { BaseEntity } from './common';

export type CustomerStatus = 'active' | 'inactive' | 'blacklisted';
export type CustomerType = 'direct' | 'distributor' | 'agent' | 'end_user';
export type CreditLevel = 'AAA' | 'AA' | 'A' | 'B' | 'C';

/**
 * 客户主数据（A3 新增）
 * 目标：将销售订单从「自由文本 customerName」升级为引用结构化客户主数据，
 * 并承载信用管控所需的授信额度 / 已用额度 / 账期，以及开票与银行信息。
 */
export interface Customer extends BaseEntity {
  code: string;                 // 客户编码（如 C001）
  name: string;                 // 客户名称（企业全称）
  shortName?: string;
  type: CustomerType;
  status: CustomerStatus;

  // ── 信用管控 ──
  creditLevel?: CreditLevel;
  creditLimit?: number;         // 信用额度（授信上限）
  usedCredit?: number;          // 已用信用（由销售订单提交时回写占用，删除/取消时释放）
  settlementTermDays?: number;  // 账期天数

  // ── 开票信息 ──
  taxId?: string;               // 纳税人识别号
  invoiceTitle?: string;        // 发票抬头
  invoiceAddress?: string;       // 开票地址
  invoicePhone?: string;         // 开票电话
  bankName?: string;             // 开户银行
  bankAccount?: string;          // 银行账号
  bankAccountName?: string;      // 开户名称

  // ── 联系人 / 地址 ──
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;

  // ── 默认交易选项 ──
  defaultCurrency?: string;
  defaultTaxRate?: number;

  // ── 销售组织与会计（P0-10） ──
  salesOrg?: string;             // 销售组织
  reconciliationAccount?: string; // 统驭科目
  taxCode?: string;              // 税码

  remarks?: string;
}
