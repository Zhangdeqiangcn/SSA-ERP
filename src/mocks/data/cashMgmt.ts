import { CashAccount, CashFlow } from '@/types/cashMgmt';

const ts = (d: number) => new Date(Date.now() + d * 86400000).toISOString();

export const cashAccounts: CashAccount[] = [
  { id: 'acc-001', accountNo: '5100-001', accountName: '人民币基本户', bank: '工行成都高新支行', currency: 'CNY', openingBalance: 3200000, currentBalance: 3865000, remark: '主营收支', createdAt: ts(-30), updatedAt: ts(0), createdBy: 'admin', updatedBy: 'admin' },
  { id: 'acc-002', accountNo: '5100-002', accountName: '人民币一般户', bank: '建行成都天府支行', currency: 'CNY', openingBalance: 1500000, currentBalance: 1180000, remark: '货款专用', createdAt: ts(-30), updatedAt: ts(0), createdBy: 'admin', updatedBy: 'admin' },
  { id: 'acc-003', accountNo: '4403-001', accountName: '美元结算户', bank: '中行成都分行', currency: 'USD', openingBalance: 200000, currentBalance: 215000, remark: '进口采购', createdAt: ts(-30), updatedAt: ts(0), createdBy: 'admin', updatedBy: 'admin' },
];

export const cashFlows: CashFlow[] = [
  { id: 'cf-001', accountId: 'acc-001', direction: 'in', category: '销售回款', counterparty: '四川建工集团', amount: 980000, flowDate: '2026-08-15', relatedDoc: 'INV-2026-0815', remark: 'Q235B 货款', createdAt: ts(-10), updatedAt: ts(-10), createdBy: 'admin', updatedBy: 'admin' },
  { id: 'cf-002', accountId: 'acc-001', direction: 'out', category: '原料采购', counterparty: '攀钢国贸', amount: 1240000, flowDate: '2026-08-12', relatedDoc: 'PO-2026-0388', remark: '热轧卷采购', createdAt: ts(-12), updatedAt: ts(-12), createdBy: 'admin', updatedBy: 'admin' },
  { id: 'cf-003', accountId: 'acc-002', direction: 'in', category: '销售回款', counterparty: '长安汽车', amount: 760000, flowDate: '2026-08-18', relatedDoc: 'INV-2026-0831', remark: '酸洗板货款', createdAt: ts(-6), updatedAt: ts(-6), createdBy: 'admin', updatedBy: 'admin' },
  { id: 'cf-004', accountId: 'acc-002', direction: 'out', category: '运费支付', counterparty: '德邦物流', amount: 86000, flowDate: '2026-08-20', relatedDoc: 'FR-2026-0092', remark: '成都-重庆', createdAt: ts(-4), updatedAt: ts(-4), createdBy: 'admin', updatedBy: 'admin' },
];
