/**
 * A2 税价拆分公共计算工具
 * ------------------------------------------------------------------
 * 统一口径（与销售模块 SalesOrderForm 保持一致）：
 *  - 税率一律用「百分数整数」表达：13 表示 13%
 *  - 未税金额 amount        = 数量 × 未税单价
 *  - 行税额   taxAmount     = amount × taxRate / 100
 *  - 含税单价 priceWithTax  = 未税单价 × (1 + taxRate/100)
 *  - 价税合计 amountWithTax = amount + taxAmount
 *  - 含税录入时（taxIncluded=true）由含税单价反算未税单价，差额进税额，保证
 *    「数量 × 含税单价 == 价税合计」不出现分位漂移。
 */

/** 默认增值税率（一般纳税人 13%） */
export const DEFAULT_TAX_RATE = 13;

/** 保留 2 位小数（四舍五入，规避浮点误差） */
export const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

/** 保留 6 位小数（单价反算场景，避免单价被过早截断） */
export const round6 = (n: number): number => Math.round((Number(n) || 0) * 1e6) / 1e6;

export interface TaxLineInput {
  /** 数量 */
  quantity: number;
  /** 录入单价：taxIncluded=false 时为未税单价，true 时为含税单价 */
  price: number;
  /** 税率（百分数整数） */
  taxRate?: number;
  /** 录入价是否含税 */
  taxIncluded?: boolean;
}

export interface TaxLineResult {
  /** 未税单价 */
  unitPrice: number;
  /** 未税金额 */
  amount: number;
  /** 税率（百分数整数） */
  taxRate: number;
  /** 行税额 */
  taxAmount: number;
  /** 含税单价 */
  priceWithTax: number;
  /** 价税合计 */
  amountWithTax: number;
}

/**
 * 单行税价计算：含税/未税双向换算。
 */
export const calcLineTax = ({
  quantity,
  price,
  taxRate = DEFAULT_TAX_RATE,
  taxIncluded = false,
}: TaxLineInput): TaxLineResult => {
  const qty = Number(quantity) || 0;
  const p = Number(price) || 0;
  const rate = Number(taxRate) || 0;
  const factor = 1 + rate / 100;

  if (taxIncluded) {
    // 以含税价为准：先算含税合计，再反推未税
    const priceWithTax = round6(p);
    const amountWithTax = round2(qty * priceWithTax);
    const unitPrice = round6(factor === 0 ? p : p / factor);
    const amount = round2(factor === 0 ? amountWithTax : amountWithTax / factor);
    return {
      unitPrice,
      amount,
      taxRate: rate,
      taxAmount: round2(amountWithTax - amount),
      priceWithTax,
      amountWithTax,
    };
  }

  // 以未税价为准
  const unitPrice = round6(p);
  const amount = round2(qty * unitPrice);
  const taxAmount = round2((amount * rate) / 100);
  return {
    unitPrice,
    amount,
    taxRate: rate,
    taxAmount,
    priceWithTax: round6(unitPrice * factor),
    amountWithTax: round2(amount + taxAmount),
  };
};

export interface TaxTotalsResult {
  /** 未税总额 */
  totalAmount: number;
  /** 税额合计 */
  totalTaxAmount: number;
  /** 价税合计 */
  grandTotal: number;
}

/**
 * 汇总多行的未税 / 税额 / 价税合计。
 * 行上缺税字段时按 amount + taxRate 现算，保证兼容存量数据。
 */
export const calcTaxTotals = (
  items: Array<{ amount?: number; taxRate?: number; taxAmount?: number; amountWithTax?: number }>,
): TaxTotalsResult => {
  let totalAmount = 0;
  let totalTaxAmount = 0;
  (items || []).forEach((it) => {
    const amount = Number(it.amount) || 0;
    const rate = it.taxRate === undefined ? DEFAULT_TAX_RATE : Number(it.taxRate) || 0;
    const taxAmount = it.taxAmount === undefined ? round2((amount * rate) / 100) : Number(it.taxAmount) || 0;
    totalAmount += amount;
    totalTaxAmount += taxAmount;
  });
  totalAmount = round2(totalAmount);
  totalTaxAmount = round2(totalTaxAmount);
  return { totalAmount, totalTaxAmount, grandTotal: round2(totalAmount + totalTaxAmount) };
};

/**
 * 为存量采购订单补齐税价字段（迁移 / mock 种子共用）。
 * 约定：默认视存量录入价为「未税价」（taxIncluded=false），因此原 totalAmount 展示不变。
 */
export const normalizeOrderTax = <
  T extends {
    items?: Array<Record<string, unknown>>;
    totalAmount?: number;
    currency?: string;
    exchangeRate?: number;
    taxIncluded?: boolean;
    totalTaxAmount?: number;
    grandTotal?: number;
  },
>(
  order: T,
  defaultTaxRate = DEFAULT_TAX_RATE,
): T => {
  const taxIncluded = order.taxIncluded ?? false;
  const items = (order.items || []).map((raw) => {
    const it = raw as Record<string, unknown>;
    const rate = it.taxRate === undefined ? defaultTaxRate : (Number(it.taxRate) || 0);
    const qty = Number(it.orderedQuantity ?? it.quantity ?? 0) || 0;
    const calc = calcLineTax({
      quantity: qty,
      price: Number(it.unitPrice) || 0,
      taxRate: rate,
      taxIncluded: false, // 存量单价按未税解读，保证 amount 不变
    });
    return {
      ...it,
      taxRate: rate,
      taxAmount: it.taxAmount === undefined ? calc.taxAmount : Number(it.taxAmount) || 0,
      priceWithTax: it.priceWithTax === undefined ? calc.priceWithTax : Number(it.priceWithTax) || 0,
      amountWithTax: it.amountWithTax === undefined ? calc.amountWithTax : Number(it.amountWithTax) || 0,
    };
  });
  const totals = calcTaxTotals(items as Array<{ amount?: number; taxRate?: number; taxAmount?: number }>);
  return {
    ...order,
    currency: order.currency || 'CNY',
    exchangeRate: order.exchangeRate ?? 1,
    taxIncluded,
    items,
    // 未税总额保持原值（若原本缺失则用汇总值）
    totalAmount: order.totalAmount === undefined ? totals.totalAmount : order.totalAmount,
    totalTaxAmount: order.totalTaxAmount === undefined ? totals.totalTaxAmount : order.totalTaxAmount,
    grandTotal:
      order.grandTotal === undefined
        ? round2((order.totalAmount === undefined ? totals.totalAmount : order.totalAmount) + totals.totalTaxAmount)
        : order.grandTotal,
  } as T;
};
