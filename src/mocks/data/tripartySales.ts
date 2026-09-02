import { TripartySale } from '@/types/tripartySales';

const ts = (d: number) => new Date(Date.now() + d * 86400000).toISOString();

export const tripartySales: TripartySale[] = [
  {
    id: 'tps-001', docNo: 'TPS-2026-001', partyCode: 'DL-018', partyName: '成都鑫源钢材贸易', customerName: '四川建工集团',
    warehouse: '成都寄售仓', materialCode: 'ST-Q235B-001', materialName: '热轧板卷 Q235B', spec: '3.0*1250*C',
    quantity: 120, unit: '吨', settlePrice: 3850, amount: 462000, settleStatus: 'pending',
    orderDate: '2026-08-12', remark: '经销商代销，按实销结算', createdAt: ts(-10), updatedAt: ts(0), createdBy: 'admin', updatedBy: 'admin',
  },
  {
    id: 'tps-002', docNo: 'TPS-2026-002', partyCode: 'DL-024', partyName: '重庆华菱物资', customerName: '长安汽车冲压件',
    warehouse: '重庆寄售仓', materialCode: 'ST-SPHC-002', materialName: '酸洗板 SPHC', spec: '2.0*1000*C',
    quantity: 80, unit: '吨', settlePrice: 4020, amount: 321600, settleStatus: 'partial',
    orderDate: '2026-08-05', settleDate: '2026-08-20', remark: '已结算 50 吨', createdAt: ts(-12), updatedAt: ts(-1), createdBy: 'admin', updatedBy: 'admin',
  },
  {
    id: 'tps-003', docNo: 'TPS-2026-003', partyCode: 'DL-031', partyName: '西安金鼎商贸', customerName: '陕西重汽',
    warehouse: '西安寄售仓', materialCode: 'ST-Q355B-003', materialName: '低合金板 Q355B', spec: '4.0*1500*C',
    quantity: 60, unit: '吨', settlePrice: 4250, amount: 255000, settleStatus: 'settled',
    orderDate: '2026-07-28', settleDate: '2026-08-18', remark: '全量结算完成', createdAt: ts(-20), updatedAt: ts(-3), createdBy: 'admin', updatedBy: 'admin',
  },
];
