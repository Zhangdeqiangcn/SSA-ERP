import { describe, it, expect } from 'vitest';
import type {
  VoucherItem,
  Voucher,
  VoucherStatus,
  AccountEntry,
  ChartAccount,
} from '@/types/finance';
import {
  round2,
  periodOf,
  calcVoucherTotals,
  isBalanced,
  validateVoucher,
  buildReversalVoucher,
  flattenVoucherToEntries,
  nextVoucherNo,
  canTransition,
  isVoucherEditable,
} from '@/utils/voucher';

// ─────────────────────────────────────────────────────────────
// 凭证核心纯函数白盒单测（FE-001 第二批）。
// 借贷平衡 / 校验 / 红字冲销 / 扁平分录 / 状态机 是财务模块最高风险逻辑，
// 此前零白盒保护。断言基于真实实现，作为回归基线。
// ─────────────────────────────────────────────────────────────

const item = (p: Partial<VoucherItem>): VoucherItem =>
  ({
    id: 'I1',
    lineNo: 1,
    summary: '',
    accountCode: '',
    accountName: '',
    debit: 0,
    credit: 0,
    currency: 'CNY',
    exchangeRate: 1,
    ...p,
  }) as VoucherItem;

const voucher = (p: Partial<Voucher>): Voucher =>
  ({
    id: 'V1',
    voucherNo: '记-202601-0001',
    voucherType: '记',
    date: '2026-01-15',
    period: '2026-01',
    attachmentCount: 0,
    items: [],
    totalDebit: 0,
    totalCredit: 0,
    status: 'posted',
    source: 'manual',
    sourceNo: '',
    currency: 'CNY',
    createdBy: 'u',
    postedBy: 'u',
    postedAt: '',
    createdAt: '',
    updatedAt: '',
    updatedBy: '',
    ...p,
  }) as Voucher;

describe('round2 金额两位归整', () => {
  it('整数与零', () => {
    expect(round2(100)).toBe(100);
    expect(round2(0)).toBe(0);
  });
  it('两位内原样返回（无浮点陷阱）', () => {
    expect(round2(99.99)).toBe(99.99);
    expect(round2(10.5)).toBe(10.5);
  });
  it('四舍五入到分', () => {
    expect(round2(1.999)).toBe(2);
    expect(round2(2.001)).toBe(2);
  });
  it('非数字兜底为 0', () => {
    expect(round2(NaN)).toBe(0);
    expect(round2(null as unknown as number)).toBe(0);
  });
});

describe('periodOf 会计期间', () => {
  it('取前 7 位 YYYY-MM', () => {
    expect(periodOf('2026-01-15')).toBe('2026-01');
  });
  it('空/未定义返回空串', () => {
    expect(periodOf('')).toBe('');
    expect(periodOf(undefined as unknown as string)).toBe('');
  });
});

describe('calcVoucherTotals / isBalanced 借贷合计与平衡', () => {
  it('借=贷 → 平衡', () => {
    const items = [item({ debit: 100, credit: 0 }), item({ debit: 0, credit: 100 })];
    expect(calcVoucherTotals(items)).toEqual({ totalDebit: 100, totalCredit: 100, difference: 0 });
    expect(isBalanced(items)).toBe(true);
  });
  it('借≠贷 → 不平衡', () => {
    const items = [item({ debit: 100, credit: 0 }), item({ debit: 0, credit: 90 })];
    const t = calcVoucherTotals(items);
    expect(t.totalDebit).toBe(100);
    expect(t.totalCredit).toBe(90);
    expect(t.difference).toBe(10);
    expect(isBalanced(items)).toBe(false);
  });
  it('空分录 → 全 0、平衡', () => {
    expect(calcVoucherTotals([])).toEqual({ totalDebit: 0, totalCredit: 0, difference: 0 });
    expect(isBalanced([])).toBe(true);
  });
});

describe('validateVoucher 保存前校验（核心：借贷平衡 + 行级规则）', () => {
  it('合法凭证（2 行、借贷平衡、有科目、有日期）→ valid', () => {
    const r = validateVoucher({
      date: '2026-01-15',
      items: [
        item({ accountName: '银行存款', debit: 100, credit: 0 }),
        item({ accountName: '主营业务收入', debit: 0, credit: 100 }),
      ],
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });
  it('借贷不平衡 → 报错且含差额说明', () => {
    const r = validateVoucher({
      date: '2026-01-15',
      items: [
        item({ accountName: 'A', debit: 100, credit: 0 }),
        item({ accountName: 'B', debit: 0, credit: 90 }),
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('借贷不平衡'))).toBe(true);
  });
  it('少于 2 行 → 报错', () => {
    const r = validateVoucher({ date: '2026-01-15', items: [item({ accountName: 'A', debit: 1, credit: 1 })] });
    expect(r.errors.some((e) => e.includes('至少需要 2 行'))).toBe(true);
  });
  it('缺记账日期 → 报错', () => {
    const r = validateVoucher({ items: [item({ debit: 1, credit: 1 }), item({ debit: 1, credit: 1 })] });
    expect(r.errors.some((e) => e.includes('记账日期'))).toBe(true);
  });
  it('负数金额 → 报错（不能为负；红冲走专用通道，不在此放行）', () => {
    const r = validateVoucher({
      date: '2026-01-15',
      items: [item({ accountName: 'A', debit: -1, credit: 0 }), item({ accountName: 'B', debit: 0, credit: -1 })],
    });
    expect(r.errors.some((e) => e.includes('不能为负数'))).toBe(true);
  });
  it('一行同时填借贷 → 报错', () => {
    const r = validateVoucher({
      date: '2026-01-15',
      items: [item({ accountName: 'A', debit: 5, credit: 5 }), item({ accountName: 'B', debit: 0, credit: 10 })],
    });
    expect(r.errors.some((e) => e.includes('只能填写一边'))).toBe(true);
  });
  it('一行借贷全 0 → 报错', () => {
    const r = validateVoucher({
      date: '2026-01-15',
      items: [item({ accountName: 'A', debit: 0, credit: 0 }), item({ accountName: 'B', debit: 0, credit: 0 })],
    });
    expect(r.errors.some((e) => e.includes('不能同时为 0'))).toBe(true);
  });
  it('无科目 → 报错', () => {
    const r = validateVoucher({
      date: '2026-01-15',
      items: [item({ debit: 1, credit: 0 }), item({ debit: 0, credit: 1 })],
    });
    expect(r.errors.some((e) => e.includes('会计科目'))).toBe(true);
  });
});

describe('buildReversalVoucher 红字冲销（金额取负、平衡不变）', () => {
  it('冲销凭证借贷方向不变、金额取负、仍平衡', () => {
    const origin = voucher({
      items: [
        item({ id: 'A', summary: '采购', accountName: '原材料', debit: 100, credit: 0 }),
        item({ id: 'B', summary: '应付', accountName: '应付账款', debit: 0, credit: 100 }),
      ],
    });
    const rev = buildReversalVoucher(origin, { voucherNo: '记-202601-9999', date: '2026-02-01', operator: 'u' });
    expect(rev.status).toBe('posted');
    expect(rev.source).toBe('reversal');
    expect(rev.originalVoucherNo).toBe(origin.voucherNo);
    expect(rev.items[0].debit).toBe(-100);
    expect(rev.items[1].credit).toBe(-100);
    // 冲销后合并原凭证 → 发生额归零（平衡不变）
    expect(isBalanced(rev.items)).toBe(true);
    expect(rev.totalDebit).toBe(-100);
    expect(rev.totalCredit).toBe(-100);
  });
});

describe('flattenVoucherToEntries 扁平分录（红字非零判定）', () => {
  it('每行生成一条分录，借方/贷方按非零判定填入科目', () => {
    const v = voucher({
      items: [
        item({ id: 'A', summary: '采购', accountName: '原材料', debit: 100, credit: 0 }),
        item({ id: 'B', summary: '应付', accountName: '应付账款', debit: 0, credit: 100 }),
      ],
    });
    const rows = flattenVoucherToEntries(v);
    expect(rows).toHaveLength(2);
    expect(rows[0].debitAccount).toBe('原材料');
    expect(rows[0].creditAccount).toBe('');
    expect(rows[1].creditAccount).toBe('应付账款');
    expect(rows[1].debitAccount).toBe('');
  });
  it('红字行（金额为负）也必须保留科目，否则冲销后总账无法归零', () => {
    const v = voucher({
      items: [item({ id: 'R', summary: '红冲', accountName: '主营业务收入', debit: -50, credit: 0 })],
    });
    const rows = flattenVoucherToEntries(v);
    expect(rows).toHaveLength(1);
    // ★ 关键：d !== 0（负数也非零）→ 科目不应被丢弃
    expect(rows[0].debitAccount).toBe('主营业务收入');
    expect(rows[0].amount).toBe(-50);
  });
});

describe('nextVoucherNo 凭证号生成（序列递增）', () => {
  it('空集合 → 0001', () => {
    expect(nextVoucherNo([], '2026-01-15')).toBe('记-202601-0001');
  });
  it('已有当月凭证 → 取最大序号 +1', () => {
    expect(nextVoucherNo([{ voucherNo: '记-202601-0005' }], '2026-01-15')).toBe('记-202601-0006');
  });
  it('其它月份不影响本年本月序列', () => {
    expect(nextVoucherNo([{ voucherNo: '记-202512-0099' }], '2026-01-15')).toBe('记-202601-0001');
  });
});

describe('canTransition 凭证状态机（draft→reviewed→posted→reversed）', () => {
  const ok: [VoucherStatus, VoucherStatus][] = [
    ['draft', 'reviewed'],
    ['reviewed', 'draft'],
    ['reviewed', 'posted'],
    ['posted', 'reversed'],
  ];
  it.each(ok)('允许 %s → %s', (from, to) => expect(canTransition(from, to)).toBe(true));
  const bad: [VoucherStatus, VoucherStatus][] = [
    ['draft', 'posted'],
    ['draft', 'reversed'],
    ['posted', 'draft'],
    ['reversed', 'draft'],
    ['reversed', 'posted'],
  ];
  it.each(bad)('禁止 %s → %s', (from, to) => expect(canTransition(from, to)).toBe(false));
});

describe('isVoucherEditable 仅草稿可编辑', () => {
  it('draft → true，其余 false', () => {
    expect(isVoucherEditable('draft')).toBe(true);
    expect(isVoucherEditable('reviewed')).toBe(false);
    expect(isVoucherEditable('posted')).toBe(false);
    expect(isVoucherEditable('reversed')).toBe(false);
  });
});
