import { describe, it, expect } from 'vitest';
import { validateNonNegative } from '../../functions/_shared/validate';

/**
 * V3.46.0 第2批③ 的守护：数量类字段非负校验。
 *
 * 由来：生产守护套件 38 的 E3 断言发现「工序报工合格数/报废数/工时填负数仍能入库
 * （201）」。服务端原本只校验必填与类型，负数能过 —— 而成品率
 * = 合格/(合格+报废) 会算出负数或 >100%，界面上看不出任何异常。
 * 对标金蝶/用友/SAP：数量的负只能由红冲（反向单据）产生，不能在原单上写负值。
 */
describe('数量非负校验（回归：负数入库导致成品率为负/超 100%）', () => {
  const TABLE = 'mes_operation_reports';

  it('拒绝负的合格数量', () => {
    const r = validateNonNegative(TABLE, { goodQuantity: -5 });
    expect(r).not.toBeNull();
    expect((r as any).status ?? 400).toBe(400);
  });

  it('拒绝负的报废数量', () => {
    expect(validateNonNegative(TABLE, { scrapQuantity: -2 })).not.toBeNull();
  });

  it('拒绝负的投入工时', () => {
    expect(validateNonNegative(TABLE, { laborHours: -1 })).not.toBeNull();
  });

  it('下划线写法同样被拒（测试/脚本可能传 snake_case）', () => {
    expect(validateNonNegative(TABLE, { good_quantity: -1 })).not.toBeNull();
  });

  it('放行 0 与正数（0 报废是完全合法的）', () => {
    expect(validateNonNegative(TABLE, { goodQuantity: 0, scrapQuantity: 0, laborHours: 0 })).toBeNull();
    expect(validateNonNegative(TABLE, { goodQuantity: 120, scrapQuantity: 3, laborHours: 8.5 })).toBeNull();
  });

  it('字段缺失/空值不误拦（留给必填校验处理）', () => {
    expect(validateNonNegative(TABLE, {})).toBeNull();
    expect(validateNonNegative(TABLE, { goodQuantity: null })).toBeNull();
    expect(validateNonNegative(TABLE, { goodQuantity: undefined })).toBeNull();
  });

  it('非数值不由此处报错（交给类型校验，避免重复口径）', () => {
    expect(validateNonNegative(TABLE, { goodQuantity: 'abc' })).toBeNull();
  });

  it('★ 未登记的表不受影响（不误伤红冲行/盘亏等合法负数场景）', () => {
    // 库存调整单的 delta_qty 为负表示盘亏，是合法业务语义
    expect(validateNonNegative('inventory_adjustments', { deltaQty: -5 })).toBeNull();
    expect(validateNonNegative('unknown_table', { goodQuantity: -5 })).toBeNull();
  });
});
