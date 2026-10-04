import { describe, it, expect } from 'vitest';
import { snakeToCamel } from '@/utils/case';

// ─────────────────────────────────────────────────────────────
// 通用命名转换白盒单测（FE-001 第一批）。
// snakeToCamel 是前端 any 重灾区的根（T=any 被 20+ store 当安全解析滥用），
// 因此其转换正确性必须被白盒锁死。
// ─────────────────────────────────────────────────────────────

describe('snakeToCamel 命名转换', () => {
  it('单层 snake_case → camelCase', () => {
    expect(snakeToCamel({ order_no: 1, created_at: 'x' })).toEqual({
      orderNo: 1,
      createdAt: 'x',
    });
  });

  it('嵌套对象递归转换', () => {
    expect(snakeToCamel({ a_b: { c_d: 1, e_f: { g_h: 2 } } })).toEqual({
      aB: { cD: 1, eF: { gH: 2 } },
    });
  });

  it('数组逐元素递归', () => {
    expect(snakeToCamel([{ a_b: 1 }, { c_d: 2 }])).toEqual([{ aB: 1 }, { cD: 2 }]);
  });

  it('已是 camelCase 的键保持不变', () => {
    expect(snakeToCamel({ orderNo: 1 })).toEqual({ orderNo: 1 });
  });

  it('null / undefined 原样返回', () => {
    expect(snakeToCamel(null)).toBeNull();
    expect(snakeToCamel(undefined)).toBeUndefined();
  });

  it('基本类型原样返回', () => {
    expect(snakeToCamel(42)).toBe(42);
    expect(snakeToCamel('hi')).toBe('hi');
  });

  it('Date 不被当作普通对象递归（实例保留）', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    expect(snakeToCamel(d)).toBe(d);
  });
});
