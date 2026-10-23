/**
 * 物料查找列「手敲编码/名称 → 回车或失焦自动提交」防回退测试。
 * 根因背景（V3.103.1）：共享组件 MaterialLineItemsGrid 的 Autocomplete 原先未配
 * autoHighlight/autoSelect，手敲后回车/点别处不会提交，名称/规格/单位/单价不回填。
 * 修复依赖 filterMaterialOptions 的「精确编码优先」排序——autoHighlight 高亮的
 * 必须是用户敲的那一个，autoSelect 提交的才是对的。
 */
import { describe, it, expect } from 'vitest';
import {
  filterMaterialOptions, findMissingRequired, applyComputeRow,
  GridColumn, MaterialLite,
} from '@/components/common/MaterialLineItemsGrid';

const materials: MaterialLite[] = [
  { id: 'm1', code: 'MAT-SEM-001', name: '半导体晶圆', specification: '12英寸', unit: '片', price: 4200 },
  { id: 'm2', code: 'MAT-SEM-002', name: '半导体封装壳体', specification: 'QFN', unit: '个', price: 12.5 },
  { id: 'm3', code: 'MAT-STEEL-001', name: '冷轧钢板', specification: '1.5mm', unit: '吨', price: 5100 },
  { id: 'm4', code: 'MAT-2', name: '半导体硅片', specification: '8英寸', unit: '片', price: 2100 },
];

describe('filterMaterialOptions：物料查找列排序（回车/失焦自动提交的正确性基础）', () => {
  it('空输入返回全部选项', () => {
    expect(filterMaterialOptions(materials, '')).toHaveLength(4);
    expect(filterMaterialOptions(materials, '   ')).toHaveLength(4);
  });

  it('精确编码命中排第一（autoHighlight 高亮的就是它）', () => {
    const out = filterMaterialOptions(materials, 'MAT-SEM-001');
    expect(out[0].id).toBe('m1');
  });

  it('精确编码优先于其他模糊命中', () => {
    // "MAT-SEM-001" 里包含 "SEM-001"，多个选项模糊命中时精确编码仍第一
    const out = filterMaterialOptions(materials, 'mat-sem-001');
    expect(out[0].id).toBe('m1');
  });

  it('精确名称命中排第一', () => {
    const out = filterMaterialOptions(materials, '冷轧钢板');
    expect(out[0].id).toBe('m3');
  });

  it('编码模糊命中优先于名称模糊命中', () => {
    // "sem" 同时命中编码(MAT-SEM-*)与名称(半导体*)，编码命中在前
    const out = filterMaterialOptions(materials, 'sem');
    expect(out[0].code).toBe('MAT-SEM-001');
    expect(out.map((m) => m.id)).not.toContain('m3'); // MAT-STEEL 不含 sem
  });

  it('大小写不敏感', () => {
    const out = filterMaterialOptions(materials, 'mat-steel-001');
    expect(out[0].id).toBe('m3');
  });

  it('无命中返回空数组（不误导 autoSelect 提交错误物料）', () => {
    expect(filterMaterialOptions(materials, '不存在的物料')).toEqual([]);
  });
});

describe('applyComputeRow：computeRow 派生计算合并语义（V3.103.1 关键修复防回退）', () => {
  it('部分补丁返回（如仅 estimatedAmount）不丢整行字段——采购申请曾因替换语义清空行数据', () => {
    const row = { id: 'r1', materialId: 'm1', materialCode: 'M-1', materialName: '钢板', unit: '吨', quantity: 2, estimatedPrice: 100 };
    const out = applyComputeRow(row, (r) => ({ estimatedAmount: (r.quantity || 0) * (r.estimatedPrice || 0) }));
    expect(out.estimatedAmount).toBe(200);
    expect(out.materialId).toBe('m1');
    expect(out.materialName).toBe('钢板');
    expect(out.quantity).toBe(2);
  });

  it('整行返回（其余 5 张单据的契约）行为不变', () => {
    const row = { id: 'r1', quantity: 3, unitPrice: 10 };
    const out = applyComputeRow(row, (r) => ({ ...r, amount: (r.quantity || 0) * (r.unitPrice || 0) }));
    expect(out.amount).toBe(30);
    expect(out.quantity).toBe(3);
  });

  it('computeRow 未传或返回空值时原样保留行', () => {
    const row = { id: 'r1', quantity: 1 };
    expect(applyComputeRow(row)).toBe(row);
    expect(applyComputeRow(row, undefined)).toBe(row);
    expect(applyComputeRow(row, () => ({} as any))).toEqual(row);
  });
});

describe('findMissingRequired：必填列校验（防误伤回归）', () => {
  const cols: GridColumn[] = [
    { key: 'materialCode', label: '物料编码', required: true },
    { key: 'quantity', label: '数量', required: true, type: 'number' },
    { key: 'estimatedPrice', label: '预估单价' },
    { key: 'amount', label: '金额', type: 'readonly' },
  ];

  it('缺必填列逐行点名', () => {
    const rows = [
      { id: 'r1', materialCode: 'M1', quantity: 10 },
      { id: 'r2', materialCode: '', quantity: '' },
    ];
    const out = findMissingRequired(rows, cols);
    expect(out).toHaveLength(1);
    expect(out[0].rowId).toBe('r2');
    expect(out[0].missing).toContain('物料编码');
    expect(out[0].missing).toContain('数量');
  });

  it('未标注 required 的列不校验、只读列不校验', () => {
    const rows = [{ id: 'r1', materialCode: 'M1', quantity: 1 }];
    expect(findMissingRequired(rows, cols)).toHaveLength(0);
  });
});
