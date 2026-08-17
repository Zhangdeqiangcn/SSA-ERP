import type {
  AccountEntry,
  Voucher,
  VoucherItem,
  VoucherSource,
  VoucherStatus,
  VoucherValidation,
} from '@/types/finance';

/** 金额保留 2 位，规避浮点误差 */
export const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

/** 借贷平衡允许的最大误差（分） */
export const BALANCE_TOLERANCE = 0.005;

/** 从日期取会计期间 YYYY-MM */
export function periodOf(date: string): string {
  return (date || '').slice(0, 7);
}

/** 空分录行工厂 */
export function emptyVoucherItem(lineNo: number): VoucherItem {
  return {
    id: `VI-${Date.now()}-${lineNo}-${Math.random().toString(36).slice(2, 6)}`,
    lineNo,
    summary: '',
    accountCode: '',
    accountName: '',
    debit: 0,
    credit: 0,
    currency: 'CNY',
    exchangeRate: 1,
  };
}

/** 合计借方 / 贷方 / 差额（借-贷） */
export function calcVoucherTotals(items: VoucherItem[]): {
  totalDebit: number;
  totalCredit: number;
  difference: number;
} {
  let totalDebit = 0;
  let totalCredit = 0;
  for (const it of items || []) {
    totalDebit += Number(it.debit) || 0;
    totalCredit += Number(it.credit) || 0;
  }
  totalDebit = round2(totalDebit);
  totalCredit = round2(totalCredit);
  return { totalDebit, totalCredit, difference: round2(totalDebit - totalCredit) };
}

/** 借贷是否平衡 */
export function isBalanced(items: VoucherItem[]): boolean {
  return Math.abs(calcVoucherTotals(items).difference) < BALANCE_TOLERANCE;
}

/**
 * 凭证保存前校验：
 * 1) 至少 2 行分录
 * 2) 每行必须有科目
 * 3) 每行借贷只能填一边，且金额 > 0
 * 4) Σ借 = Σ贷（核心：借贷平衡）
 */
export function validateVoucher(input: {
  date?: string;
  items: VoucherItem[];
}): VoucherValidation {
  const errors: string[] = [];
  const items = input.items || [];
  const { totalDebit, totalCredit, difference } = calcVoucherTotals(items);

  if (!input.date) errors.push('请填写记账日期');
  if (items.length < 2) errors.push('凭证至少需要 2 行分录');

  items.forEach((it, idx) => {
    const line = it.lineNo || idx + 1;
    const d = Number(it.debit) || 0;
    const c = Number(it.credit) || 0;
    if (!it.accountName && !it.accountCode) {
      errors.push(`第 ${line} 行：请选择会计科目`);
    }
    if (d < 0 || c < 0) {
      errors.push(`第 ${line} 行：金额不能为负数`);
    }
    if (d > 0 && c > 0) {
      errors.push(`第 ${line} 行：借方和贷方只能填写一边`);
    }
    if (d === 0 && c === 0) {
      errors.push(`第 ${line} 行：借贷金额不能同时为 0`);
    }
  });

  if (totalDebit === 0 && totalCredit === 0) {
    errors.push('凭证金额不能为 0');
  } else if (Math.abs(difference) >= BALANCE_TOLERANCE) {
    errors.push(
      `借贷不平衡：借方合计 ${totalDebit.toFixed(2)}，贷方合计 ${totalCredit.toFixed(2)}，差额 ${difference.toFixed(2)}`
    );
  }

  return { valid: errors.length === 0, errors, totalDebit, totalCredit, difference };
}

/** 生成下一个凭证号：记-YYYYMM-NNNN */
export function nextVoucherNo(
  existing: { voucherNo: string }[],
  date: string,
  voucherType = '记'
): string {
  const ym = (date || new Date().toISOString().slice(0, 10)).slice(0, 7).replace('-', '');
  const prefix = `${voucherType}-${ym}-`;
  let max = 0;
  for (const v of existing || []) {
    if (v.voucherNo && v.voucherNo.startsWith(prefix)) {
      const n = parseInt(v.voucherNo.slice(prefix.length), 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

/** 由分录行反推凭证头合计字段 */
export function withTotals<T extends { items: VoucherItem[] }>(v: T): T & {
  totalDebit: number;
  totalCredit: number;
} {
  const { totalDebit, totalCredit } = calcVoucherTotals(v.items);
  return { ...v, totalDebit, totalCredit };
}

/**
 * 凭证 → 扁平分录（报表兼容层）。
 * 现有三张报表 / 科目余额表 / 辅助核算 / 预算 都消费 AccountEntry，
 * 严格保持「1 行分录 = 1 条 AccountEntry」，确保取数口径与重构前完全一致。
 */
export function flattenVoucherToEntries(v: Voucher): AccountEntry[] {
  return (v.items || []).map((it) => {
    const d = Number(it.debit) || 0;
    const c = Number(it.credit) || 0;
    // 注意：红字（冲销）凭证金额为负，判定必须用「非零」而非「大于零」，
    // 否则负数行的科目会被丢弃，导致冲销后总账无法归零。
    return {
      id: `${v.id}-L${it.lineNo}`,
      entryNo: `${v.voucherNo}-${String(it.lineNo).padStart(2, '0')}`,
      date: v.date,
      description: it.summary || v.remark || '',
      debitAccount: d !== 0 ? it.accountName : '',
      creditAccount: c !== 0 ? it.accountName : '',
      amount: round2(d + c),
      currency: it.currency || v.currency || 'CNY',
      voucherNo: v.voucherNo,
      createdBy: v.createdBy,
      costCenterId: it.costCenterId,
      costCenterName: it.costCenterName,
      projectId: it.projectId,
      projectName: it.projectName,
      auxNote: it.auxNote,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      updatedBy: v.updatedBy,
    };
  }) as AccountEntry[];
}

/** 从旧扁平分录推断凭证来源 */
function inferSource(voucherNo: string): VoucherSource {
  const s = (voucherNo || '').toUpperCase();
  if (s.includes('INV') || s.includes('PUR')) return 'invoice';
  if (s.includes('PP') || s.includes('PMT') || s.includes('PAY')) return 'payment';
  if (s.includes('SALE') || s.includes('SO') || s.includes('AR')) return 'sales';
  if (s.includes('DEPR') || s.includes('ASSET')) return 'asset';
  if (s.includes('CLOSE') || s.includes('PROFIT') || s.includes('FX')) return 'closing';
  if (s.includes('OCR')) return 'ocr';
  if (s.includes('CN') || s.includes('RET')) return 'reversal';
  if (s.includes('INB') || s.includes('OUT') || s.includes('STK') || s.includes('COST'))
    return 'inventory';
  return 'manual';
}

/**
 * 存量扁平分录 → 凭证（按 voucherNo 分组）。
 * 一条旧分录若同时填了借贷双方，拆成两行；只填一边则生成一行。
 */
export function entriesToVouchers(entries: AccountEntry[]): Voucher[] {
  const groups = new Map<string, AccountEntry[]>();
  for (const e of entries || []) {
    const key = e.voucherNo || e.entryNo || e.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  const vouchers: Voucher[] = [];
  for (const [voucherNo, list] of groups) {
    const items: VoucherItem[] = [];
    let lineNo = 1;
    for (const e of list) {
      const aux = {
        costCenterId: e.costCenterId,
        costCenterName: e.costCenterName,
        projectId: e.projectId,
        projectName: e.projectName,
        auxNote: e.auxNote,
      };
      if (e.debitAccount) {
        items.push({
          id: `${e.id}-D`,
          lineNo: lineNo++,
          summary: e.description,
          accountCode: '',
          accountName: e.debitAccount,
          debit: round2(e.amount),
          credit: 0,
          currency: e.currency || 'CNY',
          exchangeRate: 1,
          ...aux,
        });
      }
      if (e.creditAccount) {
        items.push({
          id: `${e.id}-C`,
          lineNo: lineNo++,
          summary: e.description,
          accountCode: '',
          accountName: e.creditAccount,
          debit: 0,
          credit: round2(e.amount),
          currency: e.currency || 'CNY',
          exchangeRate: 1,
          ...aux,
        });
      }
    }
    if (items.length === 0) continue;

    const first = list[0];
    const { totalDebit, totalCredit } = calcVoucherTotals(items);
    vouchers.push({
      id: `VCH-${voucherNo}`,
      voucherNo,
      voucherType: '记',
      date: first.date,
      period: periodOf(first.date),
      attachmentCount: 0,
      items,
      totalDebit,
      totalCredit,
      status: 'posted' as VoucherStatus,
      source: inferSource(voucherNo),
      sourceNo: voucherNo,
      currency: first.currency || 'CNY',
      createdBy: first.createdBy || 'system',
      postedBy: first.createdBy || 'system',
      postedAt: first.createdAt,
      createdAt: first.createdAt,
      updatedAt: first.updatedAt,
      updatedBy: first.updatedBy,
    } as Voucher);
  }

  vouchers.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return vouchers;
}

/**
 * 把新增的扁平分录合并进凭证集合（兼容适配层）。
 * 业务单据仍调用 addAccountEntry 写扁平分录，这里同步维护凭证视图：
 * - 已存在同 voucherNo 的凭证 → 追加分录行并重算合计
 * - 不存在 → 新建一张「已过账」凭证
 */
export function upsertEntriesIntoVouchers(
  vouchers: Voucher[],
  newEntries: AccountEntry[]
): Voucher[] {
  const list = [...(vouchers || [])];
  const generated = entriesToVouchers(newEntries || []);
  for (const g of generated) {
    const idx = list.findIndex((v) => v.voucherNo === g.voucherNo);
    if (idx === -1) {
      list.unshift(g);
      continue;
    }
    const exist = list[idx];
    let lineNo = exist.items.length;
    const merged = [...exist.items, ...g.items.map((it) => ({ ...it, lineNo: ++lineNo }))];
    const { totalDebit, totalCredit } = calcVoucherTotals(merged);
    list[idx] = { ...exist, items: merged, totalDebit, totalCredit, updatedAt: new Date().toISOString() };
  }
  return list;
}

/**
 * 生成红字冲销凭证：借贷方向不变、金额取负（红字），
 * 保证与原凭证合并后科目发生额归零。
 */
export function buildReversalVoucher(
  origin: Voucher,
  opts: { voucherNo: string; date: string; operator: string; reason?: string }
): Voucher {
  const items: VoucherItem[] = origin.items.map((it, idx) => ({
    ...it,
    id: `${it.id}-R`,
    lineNo: idx + 1,
    summary: `红冲：${it.summary || origin.remark || ''}`.slice(0, 100),
    debit: round2(-(Number(it.debit) || 0)),
    credit: round2(-(Number(it.credit) || 0)),
  }));
  const { totalDebit, totalCredit } = calcVoucherTotals(items);
  const now = new Date().toISOString();
  return {
    id: `VCH-${opts.voucherNo}`,
    voucherNo: opts.voucherNo,
    voucherType: origin.voucherType || '记',
    date: opts.date,
    period: periodOf(opts.date),
    attachmentCount: 0,
    items,
    totalDebit,
    totalCredit,
    status: 'posted',
    source: 'reversal',
    sourceNo: origin.voucherNo,
    currency: origin.currency || 'CNY',
    createdBy: opts.operator,
    postedBy: opts.operator,
    postedAt: now,
    originalVoucherNo: origin.voucherNo,
    remark: opts.reason || `冲销凭证 ${origin.voucherNo}`,
    createdAt: now,
    updatedAt: now,
    updatedBy: opts.operator,
  } as Voucher;
}

/** 状态机允许的动作 */
export const VOUCHER_STATUS_LABEL: Record<VoucherStatus, string> = {
  draft: '制单',
  reviewed: '已审核',
  posted: '已过账',
  reversed: '已冲销',
};

export const VOUCHER_STATUS_COLOR: Record<VoucherStatus, 'default' | 'info' | 'success' | 'error'> = {
  draft: 'default',
  reviewed: 'info',
  posted: 'success',
  reversed: 'error',
};

/** 校验状态流转是否合法：draft→reviewed→posted→reversed */
export function canTransition(from: VoucherStatus, to: VoucherStatus): boolean {
  const allowed: Record<VoucherStatus, VoucherStatus[]> = {
    draft: ['reviewed'],
    reviewed: ['draft', 'posted'], // 反审核回制单
    posted: ['reversed'],
    reversed: [],
  };
  return (allowed[from] || []).includes(to);
}

/** 是否可编辑/删除 */
export function isVoucherEditable(status: VoucherStatus): boolean {
  return status === 'draft';
}
