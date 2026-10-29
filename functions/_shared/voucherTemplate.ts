/**
 * 凭证模板解析（根治审计 P0-ST-1「凭证模板建了但业务不消费」）
 * ------------------------------------------------------------------
 * V3.63.0 之前：voucher_templates / voucher_template_items 两张配置表已存在、
 * 有独立 CRUD 端点，但自动凭证（arapPosting）全走内置硬编码分录，模板从未被读取 ——
 * 改模板不生效，形同虚设。
 *
 * 现在：生成自动凭证前先查本组织「匹配 voucher_type 的默认模板」（is_default=1，按 sort_order 取首条）；
 *   命中则用模板分录行构造凭证（按 direction 归集借/贷、金额取 default_amount 或按业务量等比缩放），
 *   未命中 / 模板分录异常则回退调用方传入的内置分录（兜底，绝不因模板缺失而卡死业务）。
 *   模板行带 default_amount>0 时按业务净额等比缩放，使金额跟随真实业务而非写死。
 */
import { roundAmount } from './money';

export interface TemplateVoucherItems {
  items: { accountCode: string; accountName: string; debit: number; credit: number; ledgerBook?: string }[];
  totalDebit: number;
  totalCredit: number;
  /** 是否真正用了模板（供调用方留痕/审计） */
  fromTemplate: boolean;
}

/**
 * 查本组织匹配类型的默认凭证模板；命中返回 { items, totalDebit, totalCredit, fromTemplate:true }，
 * 未命中返回 null（调用方回退内置分录）。
 *
 * @param db D1 句柄
 * @param orgId 组织 id
 * @param voucherType 业务凭证类型（与 voucher_templates.voucher_type 匹配；空串=不限类型取首个默认模板）
 * @param fallback 兜底分录（模板未命中/借贷不平/金额异常时返回，保证业务不卡死）
 * @param scaleAmount 业务净额（可选）：模板行带 default_amount>0 时按此等比缩放
 */
export async function resolveTemplateVoucher(
  db: any,
  orgId: string,
  voucherType: string,
  fallback: { items: { accountCode?: string; accountName?: string; debit?: number; credit?: number }[] },
  scaleAmount?: number
): Promise<TemplateVoucherItems> {
  const fallbackItems: TemplateVoucherItems['items'] = (fallback.items || []).map((it) => ({
    accountCode: it.accountCode || '',
    accountName: it.accountName || '',
    debit: roundAmount(Number(it.debit) || 0),
    credit: roundAmount(Number(it.credit) || 0),
  }));
  const fallbackTotals = {
    totalDebit: roundAmount(fallbackItems.reduce((s, it) => s + it.debit, 0)),
    totalCredit: roundAmount(fallbackItems.reduce((s, it) => s + it.credit, 0)),
  };

  let tpl: any = null;
  try {
    tpl = await db
      .prepare(
        `SELECT id FROM voucher_templates WHERE org_id = ? AND is_default = 1
           ${voucherType ? 'AND voucher_type = ?' : ''}
           ORDER BY sort_order ASC, id ASC LIMIT 1`
      )
      .bind(...(voucherType ? [orgId, voucherType] : [orgId]))
      .first();
  } catch {
    tpl = null;
  }
  if (!tpl) return { items: fallbackItems, totalDebit: fallbackTotals.totalDebit, totalCredit: fallbackTotals.totalCredit, fromTemplate: false };

  let rows: any[] = [];
  try {
    rows = (await db
      .prepare(`SELECT line_no, summary, account_code, account_name, direction, default_amount, ledger_book FROM voucher_template_items WHERE template_id = ? ORDER BY line_no ASC`)
      .bind(tpl.id)
      .all()).results || [];
  } catch {
    rows = [];
  }

  // 等比缩放因子：模板行带 default_amount>0 时，按 业务净额/模板行净额 放大
  const tplDebitSum = rows.filter((r) => r.direction !== 'credit').reduce((s, r) => s + (Number(r.default_amount) || 0), 0);
  const tplCreditSum = rows.filter((r) => r.direction === 'credit').reduce((s, r) => s + (Number(r.default_amount) || 0), 0);
  const tplSum = roundAmount(tplDebitSum + tplCreditSum);
  const scale =
    typeof scaleAmount === 'number' && scaleAmount > 0 && tplSum > 0 ? scaleAmount / tplSum : 1;

  const items: TemplateVoucherItems['items'] = rows
    .filter((r) => r.account_code)
    .map((r) => {
      const base = Number(r.default_amount) || 0;
      const v = roundAmount(scale !== 1 ? base * scale : (typeof scaleAmount === 'number' && scaleAmount > 0 ? scaleAmount : base));
      return {
        accountCode: r.account_code,
        accountName: r.account_name || '',
        debit: r.direction !== 'credit' ? v : 0,
        credit: r.direction === 'credit' ? v : 0,
        ledgerBook: r.ledger_book || '0000',
      };
    });

  const totalDebit = roundAmount(items.reduce((s, it) => s + it.debit, 0));
  const totalCredit = roundAmount(items.reduce((s, it) => s + it.credit, 0));

  // 模板借贷不平或空 → 回退内置，绝不落脏凭证（与 writeVoucher 最后一道闸同口径）
  if (items.length === 0 || Math.abs(totalDebit - totalCredit) > 0.005 || totalDebit <= 0) {
    return { items: fallbackItems, totalDebit: fallbackTotals.totalDebit, totalCredit: fallbackTotals.totalCredit, fromTemplate: false };
  }
  return { items, totalDebit, totalCredit, fromTemplate: true };
}
