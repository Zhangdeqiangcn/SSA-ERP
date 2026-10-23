/**
 * V3.96.0 货源清单配额解析 + 默认供应商一致性校验 单测
 * 纯函数，锁住三条核心语义（强哥准确度优先）：
 *   ① 配额拆单：按 quotaPercentage 用最大余数法拆需求，各份之和 = 总量
 *   ② 一致性：货源清单含「非默认供应商」→ 拦截；默认供应商「无该物料货源」→ 拦截
 *   ③ 无可用货源 / 全需询价 的正确判定
 */
import { describe, it, expect } from 'vitest';
import {
  resolveSourcing,
  apportionQuantity,
  type SourcingInput,
} from '@/utils/automation/sourcing';
import type { SourceListItem } from '@/types';

const src = (o: Partial<SourceListItem>): SourceListItem => ({
  id: `sl-${o.materialId}-${o.vendorId}`,
  materialId: 'm',
  vendorId: 'v',
  vendorName: 'V',
  priority: 1,
  fixedVendor: false,
  status: 'active',
  ...o,
});

const base = (over: Partial<SourcingInput>): SourcingInput => ({
  defaultVendorIds: ['v1', 'v2'],
  activeSources: [],
  getActivePrice: () => 10,
  vendorNameById: { v1: '甲', v2: '乙', v3: '丙' },
  requiredQty: 100,
  ...over,
});

describe('apportionQuantity（最大余数法拆单）', () => {
  it('各份之和恒等于总量', () => {
    for (const total of [0, 1, 7, 100, 997, 10000]) {
      for (const weights of [[60, 40], [33, 33, 34], [0, 0, 0], [10, 20, 30, 40], [100, 0, 0]]) {
        const parts = apportionQuantity(total, weights);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      }
    }
  });

  it('无权重（全 0 配额）时按平均/优先级兜底，仍保总量', () => {
    const parts = apportionQuantity(10, [0, 0, 0]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10);
    expect(parts.length).toBe(3);
  });

  it('60/40 配额把 100 拆成 60/40', () => {
    expect(apportionQuantity(100, [60, 40])).toEqual([60, 40]);
  });

  it('有奇数余量时最大余数家多分（100 拆 33/33/34 权重）', () => {
    // 100 拆 3 份等权 → 33/34/33 或 34/33/33，三者之和=100
    const parts = apportionQuantity(100, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
  });
});

describe('resolveSourcing（一致性 + 配额）', () => {
  it('无可用货源 → consistent=false、noSource=true', () => {
    const r = resolveSourcing(base({ activeSources: [] }));
    expect(r.consistent).toBe(false);
    expect(r.noSource).toBe(true);
    expect(r.issues[0].kind).toBe('no_available_source');
  });

  it('货源全部在默认供应商内且有价 → 一致、按配额拆单', () => {
    const r = resolveSourcing(base({
      activeSources: [
        src({ materialId: 'm', vendorId: 'v1', vendorName: '甲', priority: 1, quotaPercentage: 60 }),
        src({ materialId: 'm', vendorId: 'v2', vendorName: '乙', priority: 2, quotaPercentage: 40 }),
      ],
      getActivePrice: (vid) => (vid === 'v1' ? 10 : undefined),
      requiredQty: 100,
    }));
    expect(r.consistent).toBe(true);
    expect(r.allNeedInquiry).toBe(false); // v1 有价
    // 60/40 拆 100 → 60/40
    const v1 = r.allocations.find((a) => a.vendorId === 'v1')!;
    const v2 = r.allocations.find((a) => a.vendorId === 'v2')!;
    expect(v1.quantity).toBe(60);
    expect(v2.quantity).toBe(40);
    expect(v1.hasValidPrice).toBe(true);
    expect(v2.hasValidPrice).toBe(false);
  });

  it('货源清单含「非默认供应商」→ 一致性拦截（强哥第 2 条）', () => {
    const r = resolveSourcing(base({
      defaultVendorIds: ['v1', 'v2'],
      activeSources: [
        src({ materialId: 'm', vendorId: 'v1', vendorName: '甲', quotaPercentage: 50 }),
        src({ materialId: 'm', vendorId: 'v3', vendorName: '丙', quotaPercentage: 50 }), // v3 不在默认集合
      ],
    }));
    expect(r.consistent).toBe(false);
    expect(r.issues.some((i) => i.kind === 'source_outside_default')).toBe(true);
  });

  it('默认供应商「无该物料生效货源」→ 一致性拦截', () => {
    const r = resolveSourcing(base({
      defaultVendorIds: ['v1', 'v2'],
      activeSources: [
        src({ materialId: 'm', vendorId: 'v1', vendorName: '甲', quotaPercentage: 100 }),
      ],
    }));
    expect(r.consistent).toBe(false);
    expect(r.issues.some((i) => i.kind === 'default_vendor_without_source')).toBe(true);
  });

  it('分类未维护默认供应商时，以货源清单为准，不判不一致', () => {
    const r = resolveSourcing(base({
      defaultVendorIds: [],
      activeSources: [
        src({ materialId: 'm', vendorId: 'v3', vendorName: '丙', quotaPercentage: 100 }),
      ],
    }));
    expect(r.consistent).toBe(true);
    expect(r.issues.length).toBe(0);
  });

  it('全需询价（货源在、都查不到价）→ consistent 可过、allNeedInquiry=true', () => {
    const r = resolveSourcing(base({
      defaultVendorIds: ['v1'], // 默认供应商=货源清单覆盖的 v1，一致性通过
      activeSources: [
        src({ materialId: 'm', vendorId: 'v1', vendorName: '甲', quotaPercentage: 100 }),
      ],
      getActivePrice: () => undefined, // 都无价
    }));
    expect(r.consistent).toBe(true);
    expect(r.allNeedInquiry).toBe(true);
    expect(r.noSource).toBe(false);
  });
});
