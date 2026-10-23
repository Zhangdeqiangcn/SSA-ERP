/**
 * V3.97.0 BOM Excel 导入 纯函数单测
 * 锁住强哥验收点：①必填项标识；②必填项不完整 → 导入失败 + 逐行失败原因。
 * 只测不依赖 DOM / xlsx 的二进制部分（validateRow / parseBomWorkbook / requiredHeaders）。
 */
import { describe, it, expect } from 'vitest';
import {
  parseBomWorkbook,
  validateRow,
  requiredHeaders,
  BOM_IMPORT_COLUMNS,
} from '@/pages/BOM/BOMImport';

/** 用模板列 label 构造一行原始数据（模拟 sheet_to_json 的输出） */
const row = (o: Record<string, string | number>) => {
  const r: Record<string, unknown> = {};
  BOM_IMPORT_COLUMNS.forEach((c) => { r[c.label] = o[c.key] ?? ''; });
  return r;
};

const validRow = (over: Record<string, string | number> = {}) =>
  row({
    bomNo: 'B-1', productName: '产品A', productCode: 'P-1',
    materialCode: 'M-1', materialName: '物料1', unit: '件', quantity: 5,
    ...over,
  });

describe('requiredHeaders（必填项标识）', () => {
  it('必填列 = BOM编号/产品名称/产品编码/物料编码/物料名称/单位/用量', () => {
    expect(requiredHeaders()).toEqual(
      BOM_IMPORT_COLUMNS.filter((c) => c.required).map((c) => c.label),
    );
    // 关键：表头文字确实带了「（必填）」标识，用户下载模板能直接看到
    for (const h of requiredHeaders()) expect(h).toContain('（必填）');
  });
});

describe('validateRow（逐行必填 + 数量>0 校验）', () => {
  it('完整行 → 通过', () => {
    const r = validateRow(validRow(), 2);
    expect(r.ok).toBe(true);
    expect(r.parsed?.quantity).toBe(5);
  });

  it('缺必填项（物料名称空）→ 失败且原因点名到字段+行', () => {
    const r = validateRow(validRow({ materialName: '' }), 3);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.field.includes('物料名称') && e.seq === 3)).toBe(true);
  });

  it('多个必填项缺失 → 每条都报', () => {
    const r = validateRow(row({ bomNo: 'B-9', materialCode: 'M-9', quantity: 1 }), 4);
    // 缺 产品名称/产品编码/物料名称/单位 四个必填
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(4);
    expect(r.errors.every((e) => e.seq === 4)).toBe(true);
  });

  it('有物料但用量=0 → 失败（数量必须>0）', () => {
    const r = validateRow(validRow({ quantity: 0 }), 5);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.field.includes('用量'))).toBe(true);
  });

  it('用量为负 → 失败', () => {
    const r = validateRow(validRow({ quantity: -3 }), 6);
    expect(r.ok).toBe(false);
  });
});

describe('parseBomWorkbook（分组 + 同 BOM 一致性 + 原子失败）', () => {
  it('两个 BOM、各自多行 → 正确分组，0 错误', () => {
    const rows = [
      validRow(),
      validRow({ materialCode: 'M-2', materialName: '物料2', quantity: 8 }), // 同 B-1 第二条
      validRow({ bomNo: 'B-2', productName: '产品B', productCode: 'P-2', materialCode: 'M-3', materialName: '物料3', quantity: 1 }),
    ];
    const r = parseBomWorkbook(rows, []);
    expect(r.errors).toHaveLength(0);
    expect(r.boms).toHaveLength(2);
    const b1 = r.boms.find((b) => b.bomNo === 'B-1')!;
    expect(b1.items.length).toBe(2);
    expect(b1.header.productCode).toBe('P-1');
  });

  it('必填缺失 → 有错误 → 该批不导入（调用方据此原子失败）', () => {
    const rows = [validRow(), validRow({ bomNo: 'B-2', productName: '产品B', productCode: 'P-2', materialName: '' })];
    const r = parseBomWorkbook(rows, []);
    expect(r.errors.length).toBeGreaterThan(0);
    // B-2 那行缺物料名称 → 不成行；B-1 仍 1 条（但整批因有错误被拒）
  });

  it('同 BOM 内产品编码不一致 → 报一致性错误', () => {
    const rows = [
      validRow({ bomNo: 'B-1', productCode: 'P-1' }),
      validRow({ bomNo: 'B-1', productCode: 'P-9' }), // 同 BOM 编码冲突
    ];
    const r = parseBomWorkbook(rows, []);
    expect(r.errors.some((e) => e.reason.includes('产品编码') && e.reason.includes('不一致'))).toBe(true);
  });

  it('可选字段留空走默认（版本/来源/废品率）', () => {
    const r = parseBomWorkbook([validRow({ version: '', source: '', scrapRate: '' })], []);
    expect(r.errors).toHaveLength(0);
    expect(r.boms[0].header.version).toBe('V1.0');
    expect(r.boms[0].items[0].source).toBe('purchase');
    expect(r.boms[0].items[0].scrapRate).toBe(0);
  });

  it('物料编码能回填到 materialId（按 code 命中物料主数据）', () => {
    const r = parseBomWorkbook([validRow({ materialCode: 'MAT-001' })], [{ id: 'mat-real', code: 'MAT-001' }]);
    expect(r.boms[0].items[0].materialId).toBe('mat-real');
  });

  // ── V3.99.0：物料主数据存在性校验（查不到 → 阻断）──
  it('物料编码在系统主数据中不存在 → 该行报错、整批不导入', () => {
    // materials 里只有 M-1，而本行填 M-999（查不到）→ 阻断
    const rows = [validRow({ materialCode: 'M-999' })];
    const r = parseBomWorkbook(rows, [{ id: 'mat-1', code: 'M-1' }]);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors.some((e) => e.reason.includes('物料主数据中不存在'))).toBe(true);
  });

  it('缺必填（物料名称）→ 先报必填缺失（存在性校验在必填通过后才跑）', () => {
    const rows = [validRow({ materialCode: 'M-999', materialName: '' })];
    const r = parseBomWorkbook(rows, [{ id: 'mat-1', code: 'M-1' }]);
    // 必填缺失会先拦截，存在性校验此时不触发（fail-fast），但整批仍被拒
    expect(r.errors.some((e) => e.field.includes('物料名称'))).toBe(true);
  });

  it('必填齐全但主数据查不到 → 报「物料主数据中不存在」', () => {
    // 全部必填齐全，仅物料编码 M-999 不在主数据 → 触发存在性校验
    const rows = [validRow({ materialCode: 'M-999', materialName: '幽灵物料' })];
    const r = parseBomWorkbook(rows, [{ id: 'mat-1', code: 'M-1' }]);
    expect(r.errors.some((e) => e.reason.includes('物料主数据中不存在'))).toBe(true);
  });

  // ── V3.99.0：多级嵌套（父件物料编码）──
  it('两级嵌套：子件挂在父件下，level 正确', () => {
    const rows = [
      validRow({ materialCode: 'M-1', materialName: '组件', source: '自制' }),          // 顶层
      validRow({ materialCode: 'M-2', materialName: '子件', parentMaterialCode: 'M-1', source: '外购' }), // 挂在 M-1 下
    ];
    const r = parseBomWorkbook(rows, [{ id: 'mat-1', code: 'M-1' }, { id: 'mat-2', code: 'M-2' }]);
    expect(r.errors).toHaveLength(0);
    const top = r.boms[0].items[0];
    expect(top.level).toBe(1);
    expect(top.materialCode).toBe('M-1');
    expect(top.children?.length).toBe(1);
    expect(top.children![0].level).toBe(2);
    expect(top.children![0].materialCode).toBe('M-2');
  });

  it('三级嵌套：层层挂接', () => {
    const rows = [
      validRow({ materialCode: 'M-1', materialName: '顶层' }),
      validRow({ materialCode: 'M-2', materialName: '中层', parentMaterialCode: 'M-1' }),
      validRow({ materialCode: 'M-3', materialName: '底层', parentMaterialCode: 'M-2' }),
    ];
    const r = parseBomWorkbook(rows, [
      { id: 'm1', code: 'M-1' }, { id: 'm2', code: 'M-2' }, { id: 'm3', code: 'M-3' },
    ]);
    expect(r.errors).toHaveLength(0);
    const top = r.boms[0].items[0];
    expect(top.children?.[0].children?.[0].materialCode).toBe('M-3');
    expect(top.children?.[0].children?.[0].level).toBe(3);
  });

  it('父件物料编码在本 BOM 中不存在 → 阻断', () => {
    const rows = [
      validRow({ materialCode: 'M-1', materialName: '顶层' }),
      validRow({ materialCode: 'M-2', materialName: '子件', parentMaterialCode: 'M-404' }), // 父件查无
    ];
    const r = parseBomWorkbook(rows, [
      { id: 'm1', code: 'M-1' }, { id: 'm2', code: 'M-2' },
    ]);
    expect(r.errors.some((e) => e.reason.includes('父件物料编码'))).toBe(true);
  });

  it('父件指向自身 → 阻断', () => {
    const r = parseBomWorkbook(
      [validRow({ materialCode: 'M-1', materialName: 'A', parentMaterialCode: 'M-1' })],
      [{ id: 'm1', code: 'M-1' }],
    );
    expect(r.errors.some((e) => e.field.includes('父件物料编码'))).toBe(true);
  });

  it('环（A→B→A）→ 阻断', () => {
    const rows = [
      validRow({ materialCode: 'M-1', materialName: 'A', parentMaterialCode: 'M-2' }),
      validRow({ materialCode: 'M-2', materialName: 'B', parentMaterialCode: 'M-1' }),
    ];
    const r = parseBomWorkbook(rows, [{ id: 'm1', code: 'M-1' }, { id: 'm2', code: 'M-2' }]);
    expect(r.errors.some((e) => e.reason.includes('环') || e.reason.includes('重复挂接') || e.reason.includes('父件物料编码'))).toBe(true);
  });
});
