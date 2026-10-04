import { describe, it, expect } from 'vitest';
import type { AccountEntry, ChartAccount } from '@/types/finance';
import { computeTrialBalance } from '@/utils/finance';

// ─────────────────────────────────────────────────────────────
// 科目余额表纯函数白盒单测（FE-001 第二批）。
// 注意：computeTrialBalance 内部用「科目名称」做映射键（codeByName = name→code），
// 分录的 debitAccount / creditAccount 字段存的是科目名称（与 flattenVoucherToEntries 一致）。
// 资产/费用类 → 借方余额 = 借 - 贷；负债/权益/收入类 → 贷方余额 = 贷 - 借。
// 借贷方向一旦写反，报表会系统性错位，必须白盒锁死。
// ─────────────────────────────────────────────────────────────

const account = (code: string, name: string, type: ChartAccount['type']): ChartAccount =>
  ({ code, name, type }) as ChartAccount;

const entry = (debitAccount: string, creditAccount: string, amount: number): AccountEntry =>
  ({
    id: 'e',
    entryNo: '',
    date: '',
    description: '',
    debitAccount,
    creditAccount,
    amount,
    currency: 'CNY',
    voucherNo: '',
    createdBy: '',
    createdAt: '',
    updatedAt: '',
    updatedBy: '',
  }) as AccountEntry;

describe('computeTrialBalance 余额方向', () => {
  it('资产类（asset）：余额 = 借 - 贷', () => {
    const rows = computeTrialBalance(
      [entry('银行存款', '', 100), entry('', '银行存款', 40)],
      [account('1001', '银行存款', 'asset')]
    );
    const row = rows.rows.find((x) => x.code === '1001')!;
    expect(row.debit).toBe(100);
    expect(row.credit).toBe(40);
    expect(row.balance).toBe(60); // 资产：借 - 贷
  });

  it('收入类（revenue）：余额 = 贷 - 借', () => {
    const rows = computeTrialBalance(
      [entry('主营业务收入', '', 10), entry('', '主营业务收入', 50)],
      [account('6001', '主营业务收入', 'revenue')]
    );
    const row = rows.rows.find((x) => x.code === '6001')!;
    expect(row.debit).toBe(10);
    expect(row.credit).toBe(50);
    expect(row.balance).toBe(40); // 收入：贷 - 借
  });
});

describe('computeTrialBalance 合计与排序', () => {
  it('totalDebit/totalCredit 为所有科目发生额之和', () => {
    const rows = computeTrialBalance(
      [entry('银行存款', '', 100), entry('', '应付账款', 40), entry('', '主营业务收入', 50)],
      [
        account('1001', '银行存款', 'asset'),
        account('2001', '应付账款', 'liability'),
        account('6001', '主营业务收入', 'revenue'),
      ]
    );
    expect(rows.totalDebit).toBe(100);
    expect(rows.totalCredit).toBe(90); // 40 + 50
  });

  it('分录引用了科目表中不存在的科目 → 忽略（不新增行）', () => {
    const rows = computeTrialBalance(
      [entry('不存在科目', '', 100)],
      [account('1001', '银行存款', 'asset')]
    );
    expect(rows.rows.find((x) => x.code === '1001')).toBeDefined();
    expect(rows.rows.find((x) => x.code === '不存在科目')).toBeUndefined();
    expect(rows.rows).toHaveLength(1);
  });

  it('输出按科目编码升序稳定', () => {
    const rows = computeTrialBalance(
      [],
      [
        account('6001', '收入', 'revenue'),
        account('1001', '银行', 'asset'),
        account('2001', '应付', 'liability'),
      ]
    );
    expect(rows.rows.map((r) => r.code)).toEqual(['1001', '2001', '6001']);
  });
});
