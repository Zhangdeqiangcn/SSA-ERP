import { describe, it, expect } from 'vitest';
import { resolveBOM, topLevelItems, flattenBomLeaves } from '../../src/utils/bomResolver';
import { nestItems, flattenItems } from '../../functions/api/bom/index';
import type { BOMHeader, BOMItem } from '../../src/types/bom';

/**
 * V3.46.0 第2批④ BOM 嵌套树重建 + 唯一解析函数 的守护测试。
 *
 * 背景（为什么这两处必须有测试）：
 *  · 读端不重建 children 时，界面**看不出任何异常**（顶层行都在），
 *    但工单领料会把「子装配」当实物料领走、其子件一分不领 → 缺料与成本双错。
 *  · BOM 解析散落 4 处且口径不同，同一工单在领料页与成本页可能挂不同 BOM。
 * 这两类都是"界面正常、数字错"，只有纯函数测试能挡住。
 */

const mkBOM = (over: Partial<BOMHeader>): BOMHeader => ({
  id: 'bom-x',
  bomNo: 'BOM-X',
  name: 'x',
  type: 'production',
  status: 'released',
  productId: 'p1',
  productCode: 'PRD-1',
  productName: '产品1',
  version: 'V1',
  effectiveDate: '2026-01-01',
  currency: 'CNY',
  createdAt: '2026-01-01T00:00:00Z',
  ...over,
} as BOMHeader);

describe('resolveBOM：唯一 BOM 解析口径', () => {
  it('优先已发布版本（草稿 BOM 不能用于领料）', () => {
    const list = [
      mkBOM({ id: 'draft', status: 'draft', createdAt: '2026-09-01T00:00:00Z' }),
      mkBOM({ id: 'rel', status: 'released', createdAt: '2026-01-01T00:00:00Z' }),
    ];
    expect(resolveBOM(list, 'PRD-1')?.id).toBe('rel');
  });

  it('★ 不按数组顺序取第一张（EBOM/MBOM 同 productCode 的老坑）', () => {
    // 已发布的那张排在数组**后面**——无排序的 find 必然拿到 draft
    const list = [
      mkBOM({ id: 'ebom', status: 'draft', createdAt: '2026-01-01T00:00:00Z' }),
      mkBOM({ id: 'mbom', status: 'released', createdAt: '2026-01-02T00:00:00Z' }),
    ];
    expect(resolveBOM(list, 'PRD-1')?.id).toBe('mbom');
  });

  it('★ 无匹配时返回 undefined，绝不返回别的产品的 BOM', () => {
    const list = [mkBOM({ id: 'a', productCode: 'PRD-A' })];
    expect(resolveBOM(list, 'PRD-NOT-EXIST')).toBeUndefined();
    // MTOCreate 原来是 `find(...) || bomList[0]` —— 会无声拿 PRD-A 去建工单
    expect(resolveBOM(list, 'PRD-NOT-EXIST', { allowAnyFallback: false })).toBeUndefined();
  });

  it('显式 bomId 优先于编码匹配（工单已挂载时不猜）', () => {
    const list = [
      mkBOM({ id: 'by-code', status: 'released' }),
      mkBOM({ id: 'by-id', status: 'draft' }),
    ];
    expect(resolveBOM(list, 'PRD-1', { bomId: 'by-id' })?.id).toBe('by-id');
  });

  it('尊重有效期：未生效/已过期版本不命中', () => {
    const list = [
      mkBOM({ id: 'future', effectiveDate: '2027-01-01' }),
      mkBOM({ id: 'expired', effectiveDate: '2020-01-01', expiryDate: '2021-01-01' }),
      mkBOM({ id: 'valid', effectiveDate: '2026-01-01', expiryDate: '2026-12-31' }),
    ];
    expect(resolveBOM(list, 'PRD-1', { asOf: '2026-06-15' })?.id).toBe('valid');
  });

  it('主 BOM 优先于替代 BOM；替代之间按 priority 升序', () => {
    const list = [
      mkBOM({ id: 'alt-p9', isAlternate: true, priority: 9 }),
      mkBOM({ id: 'alt-p1', isAlternate: true, priority: 1 }),
      mkBOM({ id: 'main' }),
    ];
    expect(resolveBOM(list, 'PRD-1')?.id).toBe('main');
    // 全是替代 BOM 时按 priority
    const onlyAlt = [mkBOM({ id: 'alt-p9', isAlternate: true, priority: 9 }), mkBOM({ id: 'alt-p1', isAlternate: true, priority: 1 })];
    expect(resolveBOM(onlyAlt, 'PRD-1')?.id).toBe('alt-p1');
  });

  it('同优先级按创建时间倒序（新版本优先）', () => {
    const list = [
      mkBOM({ id: 'old', createdAt: '2026-01-01T00:00:00Z' }),
      mkBOM({ id: 'new', createdAt: '2026-08-01T00:00:00Z' }),
    ];
    expect(resolveBOM(list, 'PRD-1')?.id).toBe('new');
  });

  it('空列表与空编码不抛错', () => {
    expect(resolveBOM([], 'PRD-1')).toBeUndefined();
    expect(resolveBOM(undefined, 'PRD-1')).toBeUndefined();
    expect(resolveBOM([mkBOM({})], '')).toBeUndefined();
  });
});

describe('nestItems：平铺行 → 嵌套树（后端读端）', () => {
  // 用真实列名（snake_case）模拟 D1 返回行
  const row = (id: string, parent: string | null, level: number, seq = 0) => ({
    id, bom_id: 'B1', parent_item_id: parent, level, sequence: seq,
    material_code: 'M-' + id, material_name: '物料' + id, quantity: 1,
  });

  it('★ 三层嵌套被正确重建（此前被压平 → 子装配当实物料领）', () => {
    const rows = [row('a', null, 1), row('b', 'a', 2), row('c', 'b', 3)];
    const tree = nestItems(rows);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('a');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe('b');
    expect(tree[0].children[0].children[0].id).toBe('c');
  });

  it('行数守恒：重建前后明细总数一致（不丢行）', () => {
    const rows = [row('a', null, 1), row('b', 'a', 2), row('c', 'b', 3), row('d', null, 1, 1)];
    const count = (arr: any[]): number => arr.reduce((s, x) => s + 1 + count(x.children || []), 0);
    expect(count(nestItems(rows))).toBe(rows.length);
  });

  it('孤儿行提到顶层而不是被丢弃（丢弃=静默数据损失）', () => {
    const rows = [row('a', null, 1), row('orphan', 'deleted-parent-id', 2)];
    const tree = nestItems(rows);
    expect(tree).toHaveLength(2);
    expect(tree.map((x) => x.id).sort()).toEqual(['a', 'orphan']);
  });

  it('循环引用被截断，不无限递归', () => {
    // 脏数据：a→b→a
    const rows = [row('a', 'b', 2), row('b', 'a', 2)];
    const tree = nestItems(rows);
    // 至少不应爆栈，且所有行都还在
    const count = (arr: any[]): number => arr.reduce((s, x) => s + 1 + count(x.children || []), 0);
    expect(count(tree)).toBe(2);
  });

  it('顶层顺序保持入参顺序（SQL 已按 level,sequence 排好，不二次排序）', () => {
    const rows = [row('z', null, 1, 2), row('y', null, 1, 1), row('x', null, 1, 0)];
    expect(nestItems(rows).map((x) => x.id)).toEqual(['z', 'y', 'x']);
  });

  it('★ round-trip：写侧 flattenItems → 读侧 nestItems 还原原始树形', () => {
    const original: any[] = [
      { id: 'a', materialCode: 'M1', quantity: 2, children: [
        { id: 'b', materialCode: 'M2', quantity: 4, children: [
          { id: 'c', materialCode: 'M3', quantity: 6 },
        ] },
      ] },
    ];
    const flat = flattenItems(original);
    expect(flat).toHaveLength(3);                       // 展平为 3 行
    expect(flat.map((r) => r.level)).toEqual([1, 2, 3]);
    expect(flat[1].parentItemId).toBe('a');            // 父子关系已落库

    const back = nestItems(flat);
    expect(back).toHaveLength(1);
    expect(back[0].children[0].id).toBe('b');
    expect(back[0].children[0].children[0].id).toBe('c');
  });
});

describe('flattenBomLeaves：子装配展开为实物料', () => {
  const leaf = (code: string, qty: number): BOMItem => ({ id: code, bomId: 'B', level: 1, sequence: 0, materialId: code, materialCode: code, materialName: code, unit: '个', quantity: qty, scrapRate: 0 } as BOMItem);

  it('子装配自身不作为实物料，展开其子件', () => {
    const items: any[] = [
      { ...leaf('SUB', 1), children: [leaf('M1', 2), leaf('M2', 3)] },
      leaf('M3', 4),
    ];
    const leaves = flattenBomLeaves(items);
    expect(leaves.map((l) => l.materialCode)).toEqual(['M1', 'M2', 'M3']);
  });

  it('带出原始层级 __level，便于对账（子装配件 level 2）', () => {
    const items: any[] = [{ ...leaf('SUB', 1), level: 1, children: [{ ...leaf('M1', 2), level: 2 }] }];
    expect(flattenBomLeaves(items)[0].__level).toBe(2);
  });

  it('空输入返回空数组', () => {
    expect(flattenBomLeaves(undefined)).toEqual([]);
    expect(flattenBomLeaves([])).toEqual([]);
  });
});

describe('topLevelItems：区分「无 BOM」与「BOM 无明细」', () => {
  it('无 BOM → undefined；有 BOM 无明细 → []', () => {
    expect(topLevelItems(undefined)).toBeUndefined();
    expect(topLevelItems(mkBOM({ id: 'b' }))).toBeUndefined();          // items 缺失
    expect(topLevelItems(mkBOM({ id: 'b', items: [] }))).toBeUndefined();  // 空数组视为无明细
    const withItems = mkBOM({ id: 'b', items: [{ id: 'i1' } as BOMItem] });
    expect(topLevelItems(withItems)).toHaveLength(1);
  });
});
