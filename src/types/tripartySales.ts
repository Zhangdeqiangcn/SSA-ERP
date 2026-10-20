import { BaseEntity } from './common';

/** 三方/代销结算状态 */
export type TripartySettleStatus = 'pending' | 'partial' | 'settled';

/** 三方销售（代销结算）单据：我方将货置于三方/经销商寄售仓，按其实际销售向终端客户结算 */
export interface TripartySale extends BaseEntity {
  docNo: string;
  partyCode: string;
  partyName: string;
  customerName: string;
  customerId?: string;    // P1-6 补客户主数据外键（与 SalesOrder/SalesContract 一致，向后兼容可选）
  warehouse: string;
  materialCode: string;
  materialName: string;
  spec: string;
  quantity: number;
  unit: string;
  settlePrice: number;
  amount: number;
  settleStatus: TripartySettleStatus;
  orderDate: string;
  settleDate?: string;
  remark?: string;
}

export const TRIPARTY_SETTLE_LABELS: Record<TripartySettleStatus, string> = {
  pending: '待结算',
  partial: '部分结算',
  settled: '已结算',
};
