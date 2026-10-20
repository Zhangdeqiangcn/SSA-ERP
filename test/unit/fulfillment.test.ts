import { describe, it, expect } from 'vitest';
import { buildPickTasks, applyPick, checkShipment, type PickTask } from '@/services/fulfillment';
import type { NormalizedOrderLine } from '@/services/channels/types';

const line = (sku: string, quantity: number, name?: string, barcode?: string): NormalizedOrderLine =>
  ({ lineNo: '1', platformSku: sku, sku, name: name ?? sku, quantity, unitPrice: 10, taxRate: 0.13, taxAmount: 1.3, amount: 10, totalAmount: 11.3, discountAmount: 0, barcode } as NormalizedOrderLine);

describe('P1-5 仓储执行层 · 波次拆拣货任务', () => {
  it('同一 SKU 跨订单合并应拣数量', () => {
    const orders = [
      { id: 'OH1', lines: [line('A', 2), line('B', 1)] },
      { id: 'OH2', lines: [line('A', 3), line('C', 5)] },
    ];
    const tasks = buildPickTasks(orders);
    expect(tasks).toHaveLength(3);
    const a = tasks.find((t) => t.materialCode === 'A')!;
    expect(a.requiredQty).toBe(5); // 2 + 3 合并
    expect(a.orderHubId).toBe('OH1'); // 首单锚定
    expect(tasks.find((t) => t.materialCode === 'B')!.requiredQty).toBe(1);
  });
});

describe('P1-5 仓储执行层 · 拣货确认强校验（绝不静默吞错）', () => {
  const task: PickTask = {
    id: 'T1', materialCode: 'A', requiredQty: 5, pickedQty: 0, status: 'pending', barcode: 'BC123',
  };

  it('正常拣货累计并更新状态', () => {
    const r = applyPick(task, 5);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.task.pickedQty).toBe(5);
      expect(r.task.status).toBe('done');
    }
  });

  it('条码不符必须拒绝', () => {
    const r = applyPick(task, 1, 'WRONG');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('条码不符');
  });

  it('超出应拣数量必须拒绝', () => {
    const r = applyPick(task, 6);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('超出应拣数量');
  });

  it('非正数拒绝', () => {
    const r = applyPick(task, 0);
    expect(r.ok).toBe(false);
  });

  it('分步拣货：先拣 3 后拣 2 最终 done', () => {
    const r1 = applyPick(task, 3);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.task.status).toBe('picking');
    const r2 = applyPick(r1.task, 2);
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.task.status).toBe('done');
  });
});

describe('P1-5 仓储执行层 · 发货校验强校验（不静默放行）', () => {
  const lines = [line('A', 2), line('B', 1, 'B品', 'BCB')];

  it('完全匹配通过', () => {
    const res = checkShipment(lines, [
      { materialCode: 'A', quantity: 2 },
      { materialCode: 'B', quantity: 1, barcode: 'BCB' },
    ]);
    expect(res.pass).toBe(true);
    expect(res.mismatches).toHaveLength(0);
  });

  it('漏扫一件报 missing', () => {
    const res = checkShipment(lines, [{ materialCode: 'A', quantity: 2 }]);
    expect(res.pass).toBe(false);
    expect(res.mismatches.some((m) => m.materialCode === 'B' && m.type === 'missing')).toBe(true);
  });

  it('多扫一件报 extra', () => {
    const res = checkShipment(lines, [
      { materialCode: 'A', quantity: 2 },
      { materialCode: 'B', quantity: 1 },
      { materialCode: 'C', quantity: 1 },
    ]);
    expect(res.pass).toBe(false);
    expect(res.mismatches.some((m) => m.type === 'extra')).toBe(true);
  });

  it('数量错报 qty', () => {
    const res = checkShipment(lines, [
      { materialCode: 'A', quantity: 1 },
      { materialCode: 'B', quantity: 1 },
    ]);
    expect(res.pass).toBe(false);
    expect(res.mismatches.some((m) => m.materialCode === 'A' && m.type === 'qty')).toBe(true);
  });

  it('条码不符报 barcode', () => {
    const res = checkShipment(lines, [
      { materialCode: 'A', quantity: 2 },
      { materialCode: 'B', quantity: 1, barcode: 'WRONG_B' },
    ]);
    expect(res.pass).toBe(false);
    expect(res.mismatches.some((m) => m.type === 'barcode')).toBe(true);
  });
});
