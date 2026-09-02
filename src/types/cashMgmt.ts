import { BaseEntity } from './common';

export type CashFlowDirection = 'in' | 'out';

/** 资金账户 */
export interface CashAccount extends BaseEntity {
  accountNo: string;
  accountName: string;
  bank: string;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  remark?: string;
}

/** 资金流水（收款/付款） */
export interface CashFlow extends BaseEntity {
  accountId: string;
  direction: CashFlowDirection;
  category: string;
  counterparty: string;
  amount: number;
  flowDate: string;
  relatedDoc?: string;
  remark?: string;
}

export const CASH_FLOW_LABELS: Record<CashFlowDirection, string> = {
  in: '收款',
  out: '付款',
};
