import { describe, it, expect } from 'vitest';
import { computeSupply, computeATP, isHoldActive } from '../../src/utils/supply';

/**
 * V3.47.0 第3批 3-04：可供应量统一口径 的守护测试。
 *
 * 背景（为什么这条必须有测试）：
 * 同一个物料「有多少能用」，修之前有两个算法 ——
 *   ATP 页：在库 − **质量扣留**（扣了冻结）
 *   MRP 页：直接取 `material.currentStock`（**没扣冻结**）
 *   缺料预警：又按 BOM 逐层用 currentStock（也没扣）
 * 结果：同一物料 ATP 说「可用 80」、MRP 说「可用 100」，
 * **质量扣留中的 20 件被 MRP 当成可用库存** → 计划员看着够用、
 * 下达工单后领料却领不到。这类缺陷界面完全正常，只有口径测试能挡。
 */
const rec = (materialId: string, quantity: number, warehouseId = 'wh1') =>
  ({ materialId, quantity, warehouseId } as any);
const hold = (materialId: string, quantity: number, status: string, warehouseId = 'wh1') =>
  ({ materialId, quantity, status, warehouseId } as any);

describe('computeSupply：可用量 = 在库 − 质量扣留', () => {
  it('★ 质量扣留会从可用量里扣掉（这是本项修复的核心）', () => {
    const r = computeSupply({
      material: { id: 'm1', currentStock: 100 } as any,
      inventoryRecords: [rec('m1', 100)],
      qualityHolds: [hold('m1', 20, 'pending')],
    });
    expect(r.onHand).toBe(100);
    expect(r.holdQty).toBe(20);
    expect(r.availableQty).toBe(80);
  });

  it('多仓库存求和后再扣扣留', () => {
    const r = computeSupply({
      material: { id: 'm1', currentStock: 0 } as any,
      inventoryRecords: [rec('m1', 60, 'wh1'), rec('m1', 40, 'wh2')],
      qualityHolds: [hold('m1', 30, 'pending', 'wh2')],
    });
    expect(r.onHand).toBe(100);
    expect(r.holdQty).toBe(30);
    expect(r.availableQty).toBe(70);
  });

  it('只有 passed（已放行）才释放可用量，pending/rejected 仍占用', () => {
    // 判定必须与既有 utils/atp.ts 的 `status !== 'passed'` 严格一致，
    // 两边一旦不同口径，恰好重演本函数要解决的分裂
    expect(isHoldActive({ status: 'passed' })).toBe(false);
    expect(isHoldActive({ status: 'pending' })).toBe(true);
    expect(isHoldActive({ status: 'rejected' })).toBe(true); // 判不合格同样占实物
    expect(isHoldActive({ status: undefined })).toBe(true);   // 状态缺失按占用（保守）
    expect(isHoldActive(null)).toBe(false);
  });

  it('放行后可用量恢复', () => {
    const r = computeSupply({
      material: { id: 'm1', currentStock: 100 } as any,
      inventoryRecords: [rec('m1', 100)],
      qualityHolds: [hold('m1', 20, 'passed')],
    });
    expect(r.holdQty).toBe(0);
    expect(r.availableQty).toBe(100);
  });

  it('扣留量大于在库时可用量为 0（不出负数）', () => {
    const r = computeSupply({
      material: { id: 'm1', currentStock: 0 } as any,
      inventoryRecords: [rec('m1', 10)],
      qualityHolds: [hold('m1', 30, 'pending')],
    });
    expect(r.availableQty).toBe(0);
  });

  it('★ 库存记录优先于物料主数据快照（可与流水台账对账）', () => {
    // 两者不一致时以库存记录为准 —— 快照是汇总值，出错时无法定位
    const r = computeSupply({
      material: { id: 'm1', currentStock: 999 } as any,
      inventoryRecords: [rec('m1', 100)],
    });
    expect(r.onHand).toBe(100);
    expect(r.source).toBe('inventory_records');
  });

  it('无库存记录时退回物料主数据快照并标明来源', () => {
    const r = computeSupply({ material: { id: 'm1', currentStock: 88 } as any, inventoryRecords: [] });
    expect(r.onHand).toBe(88);
    expect(r.source).toBe('material_stock');
  });

  it('不串料：只统计本物料的库存与扣留', () => {
    const r = computeSupply({
      material: { id: 'm1', currentStock: 0 } as any,
      inventoryRecords: [rec('m1', 50), rec('m2', 9999)],
      qualityHolds: [hold('m1', 10, 'pending'), hold('m2', 500, 'pending')],
    });
    expect(r.onHand).toBe(50);
    expect(r.holdQty).toBe(10);
  });

  it('空输入不抛错', () => {
    expect(computeSupply({}).availableQty).toBe(0);
    expect(computeSupply({ inventoryRecords: null, qualityHolds: null }).availableQty).toBe(0);
  });
});

describe('computeATP：可承诺量 = 可用量 − 销售承诺（ATP 专有）', () => {
  it('可用量再扣未发运销售承诺', () => {
    const r = computeATP({
      material: { id: 'm1', currentStock: 0 } as any,
      inventoryRecords: [rec('m1', 100)],
      qualityHolds: [hold('m1', 20, 'pending')],
      committedQty: 30,
    });
    expect(r.availableQty).toBe(80);
    expect(r.committedQty).toBe(30);
    expect(r.atpQty).toBe(50);
  });

  it('承诺量大于可用量时为 0（不承诺负数）', () => {
    const r = computeATP({
      material: { id: 'm1', currentStock: 0 } as any,
      inventoryRecords: [rec('m1', 10)],
      committedQty: 99,
    });
    expect(r.atpQty).toBe(0);
  });

  it('★ MRP 不用这个函数（不扣销售承诺，否则同一份库存被扣两次）', () => {
    // 该断言是口径边界的文档化：computeSupply 不含承诺量，
    // MRP 用它、销售用 computeATP，两条路径各自语义明确
    const s = computeSupply({
      material: { id: 'm1', currentStock: 0 } as any,
      inventoryRecords: [rec('m1', 100)],
    });
    expect(s.availableQty).toBe(100); // 供应量里没有"承诺"这个概念
  });
});

/**
 * ★ V3.113.3 P0-3：质量冻结量统一到库存台账后的口径守护。
 *
 * 背景：旧版 frozen_quantity 全链路无人写、无人读，导致两套口径分裂 ——
 *   ATP 页用「前端扣留数组」算可用量，库存台账 frozen_quantity 恒为 0，
 *   界面「库存查询」的冻结数量列永远显示 0，审计对不上。
 * 修复后：后端把冻结量落到 inventory_records.frozen_quantity，
 *   前端可用量优先取台账冻结量，并与扣留数组取较大者（任一来源显示有扣留都不可当可用）。
 */
describe('V3.113.3 P0-3 冻结量口径统一', () => {
  it('台账 frozen_quantity 优先：台账有冻结时按台账扣', () => {
    const r = computeSupply({
      material: { id: 'm1', currentStock: 100 } as any,
      // 台账已有冻结 30（后端 P0-3 写入），扣留数组此刻为空（前端未水合）
      inventoryRecords: [{ materialId: 'm1', quantity: 100, frozenQuantity: 30 } as any],
      qualityHolds: [],
    });
    expect(r.holdQty).toBe(30);
    expect(r.availableQty).toBe(70);
  });

  it('台账与扣留数组取较大者（任一来源显示有扣留都不可当可用）', () => {
    const r = computeSupply({
      material: { id: 'm1', currentStock: 100 } as any,
      inventoryRecords: [{ materialId: 'm1', quantity: 100, frozenQuantity: 10 } as any],
      qualityHolds: [hold('m1', 25, 'pending')],
    });
    expect(r.holdQty).toBe(25);
    expect(r.availableQty).toBe(75);
  });

  it('released（后端放行口径）释放可用量 —— 与前端旧状态名 passed 等价', () => {
    expect(isHoldActive({ status: 'released' })).toBe(false);
    expect(isHoldActive({ status: 'passed' })).toBe(false);
    expect(isHoldActive({ status: 'active' })).toBe(true);
    expect(isHoldActive({ status: 'pending' })).toBe(true);
  });

  it('放行后可用量恢复', () => {
    const r = computeSupply({
      material: { id: 'm1', currentStock: 100 } as any,
      inventoryRecords: [{ materialId: 'm1', quantity: 100, frozenQuantity: 0 } as any],
      qualityHolds: [hold('m1', 20, 'released')],
    });
    expect(r.holdQty).toBe(0);
    expect(r.availableQty).toBe(100);
  });
});
