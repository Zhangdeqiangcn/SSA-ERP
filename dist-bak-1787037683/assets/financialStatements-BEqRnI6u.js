const CASH_ACCOUNT_CODES = ["1001", "1002"];
const INVESTING_ACCOUNTS = ["固定资产", "累计折旧", "在建工程", "无形资产", "长期股权投资"];
const FINANCING_ACCOUNTS = ["短期借款", "长期借款", "实收资本", "应付股利", "利润分配", "长期应付款"];
function periodMatch(date, period) {
  if (!period || period === "all") return true;
  return date.startsWith(period);
}
function normalSideOf(acc) {
  if (acc.normalSide) return acc.normalSide;
  return acc.type === "asset" || acc.type === "expense" ? "debit" : "credit";
}
function computeAccountBalances(entries, chart, period) {
  const nameToCode = /* @__PURE__ */ new Map();
  for (const acc of chart) nameToCode.set(acc.name, acc.code);
  const rows = /* @__PURE__ */ new Map();
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
      ending: acc.balance
    });
  }
  const periodEntries = entries.filter((e) => periodMatch(e.date, period));
  for (const e of periodEntries) {
    if (e.debitAccount) {
      const code = nameToCode.get(e.debitAccount);
      const row = code ? rows.get(code) : void 0;
      if (row) row.debit += e.amount;
    }
    if (e.creditAccount) {
      const code = nameToCode.get(e.creditAccount);
      const row = code ? rows.get(code) : void 0;
      if (row) row.credit += e.amount;
    }
  }
  for (const row of rows.values()) {
    row.ending = row.normalSide === "debit" ? row.opening + (row.debit - row.credit) : row.opening + (row.credit - row.debit);
  }
  return Array.from(rows.values()).sort((a, b) => a.code.localeCompare(b.code));
}
function buildBalanceSheet(entries, chart, period) {
  const balances = computeAccountBalances(entries, chart, period);
  new Map(balances.map((b) => [b.code, b]));
  const assetRows = [];
  let totalAssets = 0;
  for (const b of balances.filter((b2) => b2.type === "asset")) {
    const amount = b.normalSide === "credit" ? -b.ending : b.ending;
    assetRows.push({ code: b.code, name: b.name, section: b.section, amount });
    totalAssets += amount;
  }
  const liabilityRows = [];
  let totalLiabilities = 0;
  for (const b of balances.filter((b2) => b2.type === "liability")) {
    liabilityRows.push({ code: b.code, name: b.name, section: b.section, amount: b.ending });
    totalLiabilities += b.ending;
  }
  const { netProfit } = buildIncomeStatement(entries, chart, period);
  const equityRows = [];
  let equityBase = 0;
  for (const b of balances.filter((b2) => b2.type === "equity")) {
    if (b.code === "3103") continue;
    equityRows.push({ code: b.code, name: b.name, section: b.section, amount: b.ending });
    equityBase += b.ending;
  }
  equityRows.push({ code: "3103", name: "本年利润（本期净利）", section: "所有者权益", amount: netProfit });
  const totalEquity = equityBase + netProfit;
  return {
    assets: assetRows,
    totalAssets,
    liabilities: liabilityRows,
    totalLiabilities,
    equity: equityRows,
    totalEquity,
    netProfit,
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
  };
}
function buildIncomeStatement(entries, chart, period) {
  const balances = computeAccountBalances(entries, chart, period);
  const revenue = [];
  let totalRevenue = 0;
  for (const b of balances.filter((b2) => b2.type === "revenue")) {
    revenue.push({ code: b.code, name: b.name, section: b.section, amount: b.ending });
    totalRevenue += b.ending;
  }
  const expense = [];
  let totalExpense = 0;
  for (const b of balances.filter((b2) => b2.type === "expense")) {
    expense.push({ code: b.code, name: b.name, section: b.section, amount: b.ending });
    totalExpense += b.ending;
  }
  return { revenue, totalRevenue, expense, totalExpense, netProfit: totalRevenue - totalExpense };
}
function buildCashFlowStatement(entries, chart, period) {
  const nameToCode = new Map(chart.map((c) => [c.name, c.code]));
  const periodEntries = entries.filter((e) => periodMatch(e.date, period));
  const section = () => ({ inflow: 0, outflow: 0, net: 0 });
  const result = { operating: section(), investing: section(), financing: section(), totalNet: 0 };
  for (const e of periodEntries) {
    const debitCode = e.debitAccount ? nameToCode.get(e.debitAccount) : void 0;
    const creditCode = e.creditAccount ? nameToCode.get(e.creditAccount) : void 0;
    const debitIsCash = debitCode && CASH_ACCOUNT_CODES.includes(debitCode);
    const creditIsCash = creditCode && CASH_ACCOUNT_CODES.includes(creditCode);
    if (!debitIsCash && !creditIsCash) continue;
    const counterparty = debitIsCash ? e.creditAccount : e.debitAccount;
    let bucket = result.operating;
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
function buildAPSubledger(invoices, payments) {
  const byVendor = /* @__PURE__ */ new Map();
  const ensure = (vendor) => {
    if (!byVendor.has(vendor)) {
      byVendor.set(vendor, { party: vendor, documentAmount: 0, settledAmount: 0, balance: 0 });
    }
    return byVendor.get(vendor);
  };
  for (const inv of invoices) {
    if (inv.status === "cancelled") continue;
    const row = ensure(inv.vendorName);
    row.documentAmount += inv.totalAmount;
  }
  for (const p of payments) {
    const row = ensure(p.vendorName);
    row.settledAmount += p.paidAmount;
  }
  const lines = Array.from(byVendor.values()).map((r) => ({
    ...r,
    balance: r.documentAmount - r.settledAmount
  }));
  lines.sort((a, b) => b.balance - a.balance);
  return lines;
}
function buildARSubledger(salesOrders) {
  const byCustomer = /* @__PURE__ */ new Map();
  const ensure = (customer) => {
    if (!byCustomer.has(customer)) {
      byCustomer.set(customer, { party: customer, documentAmount: 0, settledAmount: 0, balance: 0 });
    }
    return byCustomer.get(customer);
  };
  for (const so of salesOrders) {
    const row = ensure(so.customerName);
    row.documentAmount += so.totalAmount;
    row.settledAmount += so.receivedAmount || 0;
  }
  const lines = Array.from(byCustomer.values()).map((r) => ({
    ...r,
    balance: r.documentAmount - r.settledAmount
  }));
  lines.sort((a, b) => b.balance - a.balance);
  return lines;
}
export {
  buildIncomeStatement as a,
  buildBalanceSheet as b,
  buildCashFlowStatement as c,
  buildAPSubledger as d,
  buildARSubledger as e
};
