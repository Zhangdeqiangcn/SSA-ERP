import { describe, it, expect } from 'vitest';
import {
  roundAmount,
  roundPrice,
  getUnitCost,
  getStockValue,
  rollInMovingAverage,
  rollOutMovingAverage,
  normalizeMaterialCost,
} from '@/utils/cost';

// ─────────────────────────────────────────────────────────────
// A4 成本核算核心纯函数白盒单测（FE-001 第一批）。
// 这些是金额/移动平均滚动的高风险逻辑，此前无任何白盒保护。
// 断言基于真实实现行为，作为回归基线；浮点分位边界已显式标注。
// ─────────────────────────────────────────────────────────────

describe('roundAmount 金额精度（保留 2 位小数）', () => {
  it('正常四舍五入', () => {
    expect(roundAmount(12.345)).toBe(12.35);
    expect(roundAmount(12.344)).toBe(12.34);
  });
  it('非数字兜底为 0（不抛、不 NaN）', () => {
    expect(roundAmount(undefined as unknown as number)).toBe(0);
    expect(roundAmount(null as unknown as number)).toBe(0);
    expect(roundAmount(NaN)).toBe(0);
    expect(roundAmount('abc' as unknown as number)).toBe(0);
  });
  it('整数与零', () => {
    expect(roundAmount(100)).toBe(100);
    expect(roundAmount(0)).toBe(0);
  });
});

describe('roundPrice 单价精度（保留 4 位小数）', () => {
  it('保留 4 位', () => {
    expect(roundPrice(1.23456)).toBe(1.2346);
    expect(roundPrice(1.23454)).toBe(1.2345);
  });
});

describe('getUnitCost 现行成本单价优先级', () => {
  it('移动平均价 > 标准价 > 采购价', () => {
    expect(getUnitCost({ movingAvgPrice: 5, standardPrice: 3, price: 2 })).toBe(5);
    expect(getUnitCost({ movingAvgPrice: 0, standardPrice: 3, price: 2 })).toBe(3);
    expect(getUnitCost({ price: 2 })).toBe(2);
  });
  it('全缺失或空返回 0', () => {
    expect(getUnitCost({})).toBe(0);
    expect(getUnitCost(null)).toBe(0);
  });
});

describe('getStockValue 库存金额兜底', () => {
  it('已有 stockValue 直接返回', () => {
    expect(getStockValue({ stockValue: 99 })).toBe(99);
  });
  it('缺失按 数量 × 现行单价 兜底', () => {
    expect(getStockValue({ currentStock: 10, price: 5 })).toBe(50);
  });
});

describe('rollInMovingAverage 入库滚动（移动平均价滚动）', () => {
  it('恒等式：新金额 = 原金额 + 入库数量 × 单价', () => {
    const r = rollInMovingAverage(10, 100, 5, 20);
    expect(r.quantity).toBe(15);
    expect(r.stockValue).toBe(200); // 100 + 5*20
    expect(r.movingAvgPrice).toBeCloseTo(200 / 15, 4); // 13.3333
  });
  it('原库存为 0 时退化为本次进价（避免除零）', () => {
    const r = rollInMovingAverage(0, 0, 4, 10);
    expect(r.quantity).toBe(4);
    expect(r.stockValue).toBe(40);
    expect(r.movingAvgPrice).toBe(10);
  });
  it('负进价/负数量被当作 0（不产生负库存）', () => {
    const r = rollInMovingAverage(10, 100, -5, -20);
    expect(r.quantity).toBe(10);
    expect(r.stockValue).toBe(100);
    expect(r.movingAvgPrice).toBeCloseTo(10, 4);
  });
});

describe('rollOutMovingAverage 出库结转 + 卡 0 策略', () => {
  it('正常结转：数量/金额减少，单价不变', () => {
    const r = rollOutMovingAverage(10, 100, 3, 10);
    expect(r.quantity).toBe(7);
    expect(r.stockValue).toBe(70); // 100 - 30
    expect(r.costAmount).toBe(30);
    expect(r.unitCost).toBe(10);
    expect(r.movingAvgPrice).toBe(10);
  });
  it('超发（出库量 > 库存）：数量/金额卡 0，但成本仍按真实量计提', () => {
    // 强哥 2026-09-20 拍板的「两账本都卡 0」策略：卡 0 后成本不丢。
    const r = rollOutMovingAverage(10, 100, 15, 10);
    expect(r.quantity).toBe(0); // max(0, 10-15)
    expect(r.stockValue).toBe(0); // max(0, 100-150)
    expect(r.costAmount).toBe(150); // 仍按 15×10 计提
    expect(r.movingAvgPrice).toBe(10);
  });
  it('缺省单价按原均价推算', () => {
    const r = rollOutMovingAverage(10, 100, 2); // 原均价 10
    expect(r.unitCost).toBe(10);
    expect(r.costAmount).toBe(20);
    expect(r.stockValue).toBe(80);
  });
});

describe('normalizeMaterialCost 成本字段规范化', () => {
  it('补齐缺失的 movingAvgPrice 与 stockValue', () => {
    const m = normalizeMaterialCost({ code: 'M1', currentStock: 10, price: 5 });
    expect(m.movingAvgPrice).toBe(5);
    expect(m.stockValue).toBe(50);
  });
  it('已有值不被覆盖', () => {
    const m = normalizeMaterialCost({ currentStock: 10, movingAvgPrice: 8, stockValue: 80 });
    expect(m.movingAvgPrice).toBe(8);
    expect(m.stockValue).toBe(80);
  });
});
