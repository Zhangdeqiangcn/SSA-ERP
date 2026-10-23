import { describe, it, expect } from 'vitest';
import { findMissingRequired, type GridColumn } from '@/components/common/MaterialLineItemsGrid';

// 采购申请明细列：期望交货时间为必填（hideable:false + required:true）
const prColumns: GridColumn[] = [
  { key: 'materialCode', label: '物料编码', materialRole: 'code', fixed: true },
  { key: 'materialName', label: '物料名称', materialRole: 'name', fixed: true },
  { key: 'quantity', label: '数量', type: 'number' },
  { key: 'estimatedAmount', label: '预估金额', type: 'readonly' },
  { key: 'deliveryDate', label: '期望交货时间', type: 'date', hideable: false, required: true },
];

describe('明细表必填校验 findMissingRequired（采购申请·期望交货时间）', () => {
  it('缺失必填列 → 定位行号 + 点名缺失列', () => {
    const rows = [
      { id: 'r1', materialCode: 'M-1', materialName: '钢板', quantity: 10, estimatedAmount: 100, deliveryDate: '' },
      { id: 'r2', materialCode: 'M-2', materialName: '螺栓', quantity: 5, estimatedAmount: 50, deliveryDate: '2026-11-01' },
    ];
    const missing = findMissingRequired(rows, prColumns);
    expect(missing).toHaveLength(1);
    expect(missing[0]).toEqual({ rowId: 'r1', index: 1, missing: ['期望交货时间'] });
  });

  it('必填列齐全 → 无缺失（可提交）', () => {
    const rows = [
      { id: 'r1', materialCode: 'M-1', materialName: '钢板', quantity: 10, estimatedAmount: 100, deliveryDate: '2026-11-01' },
    ];
    expect(findMissingRequired(rows, prColumns)).toEqual([]);
  });

  it('只读派生列（预估金额）不算必填 → 不因它缺失而拦截', () => {
    const rows = [
      { id: 'r1', materialCode: 'M-1', materialName: '钢板', quantity: 10, deliveryDate: '2026-11-01' },
    ];
    expect(findMissingRequired(rows, prColumns)).toEqual([]);
  });

  it('多行多缺 → 逐行返回', () => {
    const rows = [
      { id: 'a', deliveryDate: '' },
      { id: 'b', deliveryDate: '' },
      { id: 'c', deliveryDate: '2026-12-01' },
    ];
    const missing = findMissingRequired(rows, prColumns);
    expect(missing.map((m) => m.rowId)).toEqual(['a', 'b']);
    expect(missing.map((m) => m.index)).toEqual([1, 2]);
  });

  it('空行列表 → 无缺失', () => {
    expect(findMissingRequired([], prColumns)).toEqual([]);
  });
});
