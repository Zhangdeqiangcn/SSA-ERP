import { AccountEntry, AccountType, ChartAccount } from '@/types/finance';

export interface TrialBalanceRow {
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
  balance: number; // 余额（正：借方余额/负：贷方余额，按科目性质）
}

export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  totalDebit: number;   // 借方发生额合计
  totalCredit: number;  // 贷方发生额合计
}

const DEBIT_NORMAL: AccountType[] = ['asset', 'expense'];

/**
 * 根据会计分录与科目表，计算科目余额表（发生额汇总）。
 * - 资产/费用类：借方余额 = 借方发生额 - 贷方发生额
 * - 负债/权益/收入类：贷方余额 = 贷方发生额 - 借方发生额
 */
export function computeTrialBalance(
  accountEntries: AccountEntry[],
  chartOfAccounts: ChartAccount[]
): TrialBalanceResult {
  const rows = new Map<string, TrialBalanceRow>();
  for (const acc of chartOfAccounts) {
    rows.set(acc.code, {
      code: acc.code,
      name: acc.name,
      type: acc.type,
      debit: 0,
      credit: 0,
      balance: 0,
    });
  }

  const codeByName = new Map<string, string>();
  for (const acc of chartOfAccounts) codeByName.set(acc.name, acc.code);

  for (const e of accountEntries) {
    if (e.debitAccount) {
      const code = codeByName.get(e.debitAccount);
      const row = code ? rows.get(code) : undefined;
      if (row) row.debit += e.amount;
    }
    if (e.creditAccount) {
      const code = codeByName.get(e.creditAccount);
      const row = code ? rows.get(code) : undefined;
      if (row) row.credit += e.amount;
    }
  }

  let totalDebit = 0;
  let totalCredit = 0;
  const resultRows: TrialBalanceRow[] = [];
  for (const row of rows.values()) {
    row.balance = DEBIT_NORMAL.includes(row.type)
      ? row.debit - row.credit
      : row.credit - row.debit;
    totalDebit += row.debit;
    totalCredit += row.credit;
    resultRows.push(row);
  }

  // 按科目编码排序，保证稳定输出
  resultRows.sort((a, b) => a.code.localeCompare(b.code));
  return { rows: resultRows, totalDebit, totalCredit };
}
