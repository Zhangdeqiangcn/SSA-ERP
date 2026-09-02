import { CopaRecord } from '@/types/copa';

const ts = (d: number) => new Date(Date.now() + d * 86400000).toISOString();
const P = '2026-08';

function rec(dimension: CopaRecord['dimension'], key: string, label: string, revenue: number, cogs: number, d = 0): CopaRecord {
  return {
    id: `copa-${dimension}-${key}`,
    dimension, key, label, period: P, revenue, cogs,
    createdAt: ts(d), updatedAt: ts(d), createdBy: 'admin', updatedBy: 'admin',
  };
}

export const copaRecords: CopaRecord[] = [
  // 产品维度
  rec('product', 'ST-Q235B', '热轧板卷 Q235B', 3820000, 3210000),
  rec('product', 'ST-SPHC', '酸洗板 SPHC', 2150000, 1840000),
  rec('product', 'ST-Q355B', '低合金板 Q355B', 1680000, 1430000),
  rec('product', 'ST-CCSB', '船板 CCSB', 940000, 830000),
  // 客户维度
  rec('customer', 'CUST-SC', '四川建工集团', 2980000, 2520000),
  rec('customer', 'CUST-CA', '长安汽车', 2210000, 1900000),
  rec('customer', 'CUST-SX', '陕西重汽', 1560000, 1340000),
  rec('customer', 'CUST-YN', '云南交投', 1840000, 1550000),
  // 区域维度
  rec('region', 'R-CD', '西南-成都', 3360000, 2880000),
  rec('region', 'R-CQ', '西南-重庆', 2140000, 1820000),
  rec('region', 'R-XA', '西北-西安', 1730000, 1480000),
  rec('region', 'R-KM', '西南-昆明', 1460000, 1240000),
];
