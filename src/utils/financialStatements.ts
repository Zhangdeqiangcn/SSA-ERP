import { AccountEntry, ChartAccount, Invoice, PaymentPlan } from '@/types/finance';
import { SalesOrder } from '@/types/sales';

export interface AccountBalance {
  code: string;
  name: string;
  type: ChartAccount['type'];
  normalSide: 'debit' | 'credit';
  section?: string;
  opening: number;
  debit: number;
  credit: number;
  ending: number;
}

export interface BalanceSheetLine {
  code: string;
  name: string;
  section?: string;
  amount: number;
}

export interface BalanceSheetResult {
  assets: BalanceSheetLine[];
  totalAssets: number;
  liabilities: BalanceSheetLine[];
  totalLiabilities: number;
  equity: BalanceSheetLine[];
  totalEquity: number;
  netProfit: number;
  balanced: boolean;
}

export interface IncomeStatementResult {
  revenue: BalanceSheetLine[];
  totalRevenue: number;
  expense: BalanceSheetLine[];
  totalExpense: number;
  netProfit: number;
}

export interface CashFlowSection {
  inflow: number;
  outflow: number;
  net: number;
}

export interface CashFlowResult {
  operating: CashFlowSection;
  investing: CashFlowSection;
  financing: CashFlowSection;
  totalNet: number;
}

export interface SubledgerLine {
  party: string;
  documentAmount: number;
  settledAmount: number;
  balance: number;
  dueDate?: string;
}

const CASH_ACCOUNT_CODES = ['1001', '1002']; // 库存现金 / 银行存款
const INVESTING_ACCOUNTS = ['固定资产', '累计折旧', '在建工程', '无形资产', '长期股权投资'];
const FINANCING_ACCOUNTS = ['短期借款', '长期借款', '实收资本', '应付股利', '利润分配', '长期应付款'];

function periodMatch(date: string, period?: string): boolean {
  if (!period || period === 'all') return true;
  return date.startsWith(period);
}

function normalSideOf(acc: ChartAccount): 'debit' | 'credit' {
  if (acc.normalSide) return acc.normalSide;
  return acc.type === 'asset' || acc.type === 'expense' ? 'debit' : 'credit';
}

/** 计算各科目余额：期初(chart.balance) + 期内凭证借贷净额，按科目余额方向得出期末余额。 */
export function computeAccountBalances(
  entries: AccountEntry[],
  chart: ChartAccount[],
  period?: string
): AccountBalance[] {
  // ★ V3.45.0 改为**按科目编码匹配**（对标 SAP SKT0 主数据 + 金蝶/用友科目编码）：
  //   原实现用「科目名称字符串」建 Map 再匹配，而分录侧存的是 accountName。
  //   一旦用户改了科目名，所有历史分录的 nameToCode.get() 返回 undefined，
  //   `if (row)` 为假 → **该科目金额被静默丢弃**，资产负债表/利润表/试算平衡/
  //   现金流量表同时少这笔钱且不报任何错。科目编码才是唯一的核算维度，改名只应影响显示。
  //   现在：优先用分录自带的 accountCode 精确匹配；老数据没有 code 时才回退按名称匹配。
  const nameToCode = new Map<string, string>();
  for (const acc of chart) nameToCode.set(acc.name, acc.code);

  const rows = new Map<string, AccountBalance>();
  for (const acc of chart) {
    rows.set(acc.code, {
      code: acc.code,
      name: acc.name,
      type: acc.type,
      normalSide: normalSideOf(acc),
      section: acc.section,
      opening: acc.balance,
      debit: 0,
      credit: 0,
      ending: acc.balance,
    });
  }

  /** 取分录某一侧对应的科目行：编码优先，名称兜底（兼容 V3.45.0 之前的历史分录）。 */
  const rowOf = (code?: string | null, name?: string | null): AccountBalance | undefined => {
    if (code) {
      const byCode = rows.get(code);
      if (byCode) return byCode;
    }
    if (name) return rows.get(nameToCode.get(name) || '');
    return undefined;
  };

  const periodEntries = entries.filter((e) => periodMatch(e.date, period));
  for (const e of periodEntries) {
    if (e.debitAccount) {
      const row = rowOf(e.debitAccountCode, e.debitAccount);
      if (row) row.debit += e.amount;
    }
    if (e.creditAccount) {
      const row = rowOf(e.creditAccountCode, e.creditAccount);
      if (row) row.credit += e.amount;
    }
  }

  for (const row of rows.values()) {
    row.ending =
      row.normalSide === 'debit'
        ? row.opening + (row.debit - row.credit)
        : row.opening + (row.credit - row.debit);
  }

  return Array.from(rows.values()).sort((a, b) => a.code.localeCompare(b.code));
}

/** 资产负债表：资产（含备抵抵减）+ 负债 + 权益（含本期净利，保证平衡）。 */
export function buildBalanceSheet(
  entries: AccountEntry[],
  chart: ChartAccount[],
  period?: string
): BalanceSheetResult {
  const balances = computeAccountBalances(entries, chart, period);
  const byCode = new Map(balances.map((b) => [b.code, b]));

  const assetRows: BalanceSheetLine[] = [];
  let totalAssets = 0;
  for (const b of balances.filter((b) => b.type === 'asset')) {
    // 备抵科目（normalSide=credit，如累计折旧）以负数抵减资产
    const amount = b.normalSide === 'credit' ? -b.ending : b.ending;
    assetRows.push({ code: b.code, name: b.name, section: b.section, amount });
    totalAssets += amount;
  }

  const liabilityRows: BalanceSheetLine[] = [];
  let totalLiabilities = 0;
  for (const b of balances.filter((b) => b.type === 'liability')) {
    liabilityRows.push({ code: b.code, name: b.name, section: b.section, amount: b.ending });
    totalLiabilities += b.ending;
  }

  // 本年利润（权益内）由利润表计算，避免结账前不平衡
  const { netProfit } = buildIncomeStatement(entries, chart, period);
  const equityRows: BalanceSheetLine[] = [];
  let equityBase = 0;
  for (const b of balances.filter((b) => b.type === 'equity')) {
    if (b.code === '3103') continue; // 本年利润单独以本期净利列示
    equityRows.push({ code: b.code, name: b.name, section: b.section, amount: b.ending });
    equityBase += b.ending;
  }
  equityRows.push({ code: '3103', name: '本年利润（本期净利）', section: '所有者权益', amount: netProfit });
  const totalEquity = equityBase + netProfit;

  return {
    assets: assetRows,
    totalAssets,
    liabilities: liabilityRows,
    totalLiabilities,
    equity: equityRows,
    totalEquity,
    netProfit,
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  };
}

/** 利润表：收入 - 费用 = 净利润。 */
export function buildIncomeStatement(
  entries: AccountEntry[],
  chart: ChartAccount[],
  period?: string
): IncomeStatementResult {
  const balances = computeAccountBalances(entries, chart, period);
  const revenue: BalanceSheetLine[] = [];
  let totalRevenue = 0;
  for (const b of balances.filter((b) => b.type === 'revenue')) {
    revenue.push({ code: b.code, name: b.name, section: b.section, amount: b.ending });
    totalRevenue += b.ending;
  }
  const expense: BalanceSheetLine[] = [];
  let totalExpense = 0;
  for (const b of balances.filter((b) => b.type === 'expense')) {
    expense.push({ code: b.code, name: b.name, section: b.section, amount: b.ending });
    totalExpense += b.ending;
  }
  return { revenue, totalRevenue, expense, totalExpense, netProfit: totalRevenue - totalExpense };
}

/** 现金流量表（直接法）：按现金/银行存款分录的对方科目分类为经营/投资/筹资活动。 */
export function buildCashFlowStatement(
  entries: AccountEntry[],
  chart: ChartAccount[],
  period?: string
): CashFlowResult {
  const nameToCode = new Map(chart.map((c) => [c.name, c.code]));
  const periodEntries = entries.filter((e) => periodMatch(e.date, period));

  const section = (): CashFlowSection => ({ inflow: 0, outflow: 0, net: 0 });
  const result: CashFlowResult = { operating: section(), investing: section(), financing: section(), totalNet: 0 };

  for (const e of periodEntries) {
    // ★ V3.45.0 与 computeAccountBalances 同一修法：现金/对方科目一律按**编码**判定，
    //   名称仅作历史数据兜底。否则改科目名会让现金流量表整行漏掉该笔现金收支。
    const debitCode = e.debitAccountCode
      || (e.debitAccount ? nameToCode.get(e.debitAccount) : undefined);
    const creditCode = e.creditAccountCode
      || (e.creditAccount ? nameToCode.get(e.creditAccount) : undefined);
    const debitIsCash = debitCode && CASH_ACCOUNT_CODES.includes(debitCode);
    const creditIsCash = creditCode && CASH_ACCOUNT_CODES.includes(creditCode);
    if (!debitIsCash && !creditIsCash) continue;

    const counterparty = debitIsCash ? e.creditAccount : e.debitAccount;
    let bucket: CashFlowSection = result.operating;
    if (counterparty && INVESTING_ACCOUNTS.includes(counterparty)) bucket = result.investing;
    else if (counterparty && FINANCING_ACCOUNTS.includes(counterparty)) bucket = result.financing;

    if (debitIsCash) {
      bucket.inflow += e.amount;
      bucket.net += e.amount;
    } else {
      bucket.outflow += e.amount;
      bucket.net -= e.amount;
    }
  }

  result.totalNet = result.operating.net + result.investing.net + result.financing.net;
  return result;
}

/** 应付账款明细账：按供应商汇总发票金额与已付金额。 */
export function buildAPSubledger(invoices: Invoice[], payments: PaymentPlan[]): SubledgerLine[] {
  const byVendor = new Map<string, SubledgerLine>();
  const ensure = (vendor: string): SubledgerLine => {
    if (!byVendor.has(vendor)) {
      byVendor.set(vendor, { party: vendor, documentAmount: 0, settledAmount: 0, balance: 0 });
    }
    return byVendor.get(vendor)!;
  };
  for (const inv of invoices) {
    if (inv.status === 'cancelled') continue;
    const row = ensure(inv.vendorName);
    row.documentAmount += inv.totalAmount;
  }
  for (const p of payments) {
    const row = ensure(p.vendorName);
    row.settledAmount += p.paidAmount;
  }
  const lines = Array.from(byVendor.values()).map((r) => ({
    ...r,
    balance: r.documentAmount - r.settledAmount,
  }));
  lines.sort((a, b) => b.balance - a.balance);
  return lines;
}

/** 应收账款明细账：按客户汇总销售订单金额与已收金额（跨模块取销售数据）。 */
export function buildARSubledger(salesOrders: SalesOrder[]): SubledgerLine[] {
  const byCustomer = new Map<string, SubledgerLine>();
  const ensure = (customer: string): SubledgerLine => {
    if (!byCustomer.has(customer)) {
      byCustomer.set(customer, { party: customer, documentAmount: 0, settledAmount: 0, balance: 0 });
    }
    return byCustomer.get(customer)!;
  };
  for (const so of salesOrders) {
    const row = ensure(so.customerName);
    row.documentAmount += so.totalAmount;
    row.settledAmount += so.receivedAmount || 0;
  }
  const lines = Array.from(byCustomer.values()).map((r) => ({
    ...r,
    balance: r.documentAmount - r.settledAmount,
  }));
  lines.sort((a, b) => b.balance - a.balance);
  return lines;
}
