import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TAX_RATE,
  calcLineTax,
  calcTaxTotals,
  normalizeOrderTax,
  type TaxLineInput,
} from '@/utils/tax';

/**
 * P0-2 采购税价拆分 + P0-4 退货税额 专项回归测试（A2 税价拆分口径）。
 * 锁定三件事：
 *  ① 未税录入：税额 = 未税金额 × 税率/100，含税单价 = 未税单价 ×(1+税率/100)；
 *  ② 含税录入：反算未税额，且 数量×含税单价 == 价税合计（无分位漂移）；
 *  ③ 退货税额：按行税率现算 Σ(金额×税率/100)，**绝不写死 0**（P0-4 真 bug 收口）。
 */

const net = (over: Partial<TaxLineInput> = {}): TaxLineInput => ({
  quantity: 10,
  price: 100,
  taxRate: 13,
  taxIncluded: false,
  ...over,
});

describe('calcLineTax 单行税价（未税录入）', () => {
  it('税额 = 未税金额 × 税率/100', () => {
    const r = calcLineTax(net());
    expect(r.amount).toBe(1000); // 10 × 100
    expect(r.taxAmount).toBe(130); // 1000 × 13%
    expect(r.priceWithTax).toBeCloseTo(113, 4); // 100 × 1.13
    expect(r.amountWithTax).toBe(1130); // 1000 + 130
  });

  it('默认税率兜底为 13%（DEFAULT_TAX_RATE）', () => {
    const r = calcLineTax(net({ taxRate: undefined }));
    expect(r.taxRate).toBe(DEFAULT_TAX_RATE);
    expect(r.taxAmount).toBe(130);
  });

  it('零税率 → 税额为 0、含税单价等于未税单价', () => {
    const r = calcLineTax(net({ taxRate: 0 }));
    expect(r.taxAmount).toBe(0);
    expect(r.priceWithTax).toBe(100);
    expect(r.amountWithTax).toBe(1000);
  });

  it('数量为 0 → 全部为 0（不产生虚增税）', () => {
    const r = calcLineTax(net({ quantity: 0 }));
    expect(r.amount).toBe(0);
    expect(r.taxAmount).toBe(0);
  });
});

describe('calcLineTax 单行税价（含税录入，反算未税）', () => {
  it('由含税单价反算未税额，价税合计守恒', () => {
    const r = calcLineTax(net({ taxIncluded: true, price: 113 }));
    expect(r.amountWithTax).toBe(1130); // 10 × 113
    // 113 / 1.13 = 100 未税单价
    expect(r.unitPrice).toBeCloseTo(100, 4);
    expect(r.amount).toBeCloseTo(1000, 2);
    expect(r.taxAmount).toBeCloseTo(130, 2);
  });

  it('含税反算税额 = 价税合计 − 未税金额（不漂移）', () => {
    const r = calcLineTax(net({ taxIncluded: true, price: 226 }));
    expect(r.amountWithTax).toBe(2260);
    expect(r.taxAmount).toBeCloseTo(2260 - 2000, 2);
  });
});

describe('calcTaxTotals 多行汇总', () => {
  it('未税/税额/价税合计分别求和', () => {
    const t = calcTaxTotals([
      { amount: 1000, taxRate: 13 },
      { amount: 2000, taxRate: 13 },
    ]);
    expect(t.totalAmount).toBe(3000);
    expect(t.totalTaxAmount).toBe(390);
    expect(t.grandTotal).toBe(3390);
  });

  it('行缺税额时按 amount×taxRate 现算', () => {
    const t = calcTaxTotals([{ amount: 1000, taxRate: 13, taxAmount: undefined }]);
    expect(t.totalTaxAmount).toBe(130);
  });

  it('行缺税率时按默认 13% 兜底', () => {
    const t = calcTaxTotals([{ amount: 1000, taxRate: undefined }]);
    expect(t.totalTaxAmount).toBe(130);
  });
});

describe('normalizeOrderTax 存量订单税价补齐', () => {
  it('为缺字段的存量行补齐 taxAmount/priceWithTax/amountWithTax', () => {
    const o = normalizeOrderTax({
      totalAmount: 3000,
      items: [{ orderedQuantity: 10, unitPrice: 100, taxRate: 13 }],
    });
    const it0 = (o.items as any[])[0];
    expect(it0.taxAmount).toBe(130);
    expect(it0.priceWithTax).toBeCloseTo(113, 4);
    expect(it0.amountWithTax).toBe(1130);
    expect(o.totalTaxAmount).toBe(130);
    expect(o.grandTotal).toBe(3130);
  });
});

// ── P0-4 退货税额：锁定「按行税率现算、绝不写死 0」──
// 复刻 purchaseReturnStore.completeReturn 的 apTax 计算口径：
//   每行税额 = amount × (该行税率或默认税率) / 100；合计 = Σ 行税额。
const computeReturnTax = (
  items: Array<{ amount: number; taxRate?: number }>,
  defaultRate = DEFAULT_TAX_RATE,
): number =>
  Math.round(
    items.reduce((s, it) => s + (it.amount * (it.taxRate ?? defaultRate)) / 100, 0) * 100,
  ) / 100;

describe('P0-4 退货税额计算（非写死 0）', () => {
  it('含税采购退货：税额按 13% 正确计提，不等于 0', () => {
    const apTax = computeReturnTax([{ amount: 5000, taxRate: 13 }]);
    expect(apTax).toBe(650);
    expect(apTax).not.toBe(0);
  });

  it('混合税率行：逐行计提后求和', () => {
    const apTax = computeReturnTax([
      { amount: 2000, taxRate: 13 },
      { amount: 1000, taxRate: 9 },
    ]);
    expect(apTax).toBe(260 + 90);
  });

  it('零税率退货：税额为 0（合理，而非代码缺陷）', () => {
    const apTax = computeReturnTax([{ amount: 1000, taxRate: 0 }]);
    expect(apTax).toBe(0);
  });

  it('缺税率退货：按默认 13% 兜底计提，不为 0', () => {
    const apTax = computeReturnTax([{ amount: 8000 }]);
    expect(apTax).toBe(1040);
  });
});
