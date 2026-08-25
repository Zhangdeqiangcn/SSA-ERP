import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { Invoice, PaymentPlan, AccountEntry, FinanceStats, TaxRecord, ProjectAccount, ChartAccount } from '@/types';
import type { Voucher, VoucherItem, VoucherValidation, Reconciliation } from '@/types/finance';
import {
  entriesToVouchers,
  upsertEntriesIntoVouchers,
  flattenVoucherToEntries,
  buildReversalVoucher,
  calcVoucherTotals,
  validateVoucher,
  nextVoucherNo,
  periodOf,
} from '@/utils/voucher';

// 本地 nowStr（与门户页面一致：YYYY-MM-DD HH:MM:SS），store 内不依赖页面私有函数
const nowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
import { useFinanceLedgerStore } from '@/stores/financeLedgerStore';
import {
  invoices as mockInvoices,
  paymentPlans as mockPaymentPlans,
  accountEntries as mockAccountEntries,
  financeStats as mockFinanceStats,
  taxRecords as mockTaxRecords,
  projectAccounts as mockProjectAccounts,
} from '@/mocks/data/finance';

// 标准会计科目表（P3-1 扩展：覆盖完整报表结构，含期初余额/余额方向/报表分组）
const seedChartOfAccounts: ChartAccount[] = [
  // 资产
  { id: 'coa-1001', code: '1001', name: '库存现金', type: 'asset', isLeaf: true, balance: 10000, normalSide: 'debit', statement: 'BS', section: '流动资产' },
  { id: 'coa-1002', code: '1002', name: '银行存款', type: 'asset', isLeaf: true, balance: 600000, normalSide: 'debit', statement: 'BS', section: '流动资产' },
  { id: 'coa-1122', code: '1122', name: '应收账款', type: 'asset', isLeaf: true, balance: 120000, normalSide: 'debit', statement: 'BS', section: '流动资产' },
  { id: 'coa-1403', code: '1403', name: '原材料', type: 'asset', isLeaf: true, balance: 140000, normalSide: 'debit', statement: 'BS', section: '流动资产' },
  { id: 'coa-1405', code: '1405', name: '库存商品', type: 'asset', isLeaf: true, balance: 220000, normalSide: 'debit', statement: 'BS', section: '流动资产' },
  { id: 'coa-1601', code: '1601', name: '固定资产', type: 'asset', isLeaf: true, balance: 900000, normalSide: 'debit', statement: 'BS', section: '非流动资产' },
  { id: 'coa-1602', code: '1602', name: '累计折旧', type: 'asset', isLeaf: true, balance: 260000, normalSide: 'credit', statement: 'BS', section: '非流动资产' },
  // 负债
  { id: 'coa-2001', code: '2001', name: '短期借款', type: 'liability', isLeaf: true, balance: 200000, normalSide: 'credit', statement: 'BS', section: '流动负债' },
  { id: 'coa-2201', code: '2201', name: '物资采购（GR/IR暂估）', type: 'liability', isLeaf: true, balance: 0, normalSide: 'credit', statement: 'BS', section: '流动负债' },
  { id: 'coa-2202', code: '2202', name: '应付账款', type: 'liability', isLeaf: true, balance: 180000, normalSide: 'credit', statement: 'BS', section: '流动负债' },
  { id: 'coa-2211', code: '2211', name: '应付职工薪酬', type: 'liability', isLeaf: true, balance: 40000, normalSide: 'credit', statement: 'BS', section: '流动负债' },
  { id: 'coa-2221', code: '2221', name: '应交税费-应交增值税', type: 'liability', isLeaf: true, balance: 30000, normalSide: 'credit', statement: 'BS', section: '流动负债' },
  // 权益
  { id: 'coa-3001', code: '3001', name: '实收资本', type: 'equity', isLeaf: true, balance: 1100000, normalSide: 'credit', statement: 'BS', section: '所有者权益' },
  { id: 'coa-3103', code: '3103', name: '本年利润', type: 'equity', isLeaf: true, balance: 0, normalSide: 'credit', statement: 'BS', section: '所有者权益' },
  { id: 'coa-3104', code: '3104', name: '利润分配', type: 'equity', isLeaf: true, balance: 180000, normalSide: 'credit', statement: 'BS', section: '所有者权益' },
  // 收入
  { id: 'coa-6001', code: '6001', name: '主营业务收入', type: 'revenue', isLeaf: true, balance: 0, normalSide: 'credit', statement: 'IS', section: '营业收入' },
  // 费用
  { id: 'coa-6401', code: '6401', name: '主营业务成本', type: 'expense', isLeaf: true, balance: 0, normalSide: 'debit', statement: 'IS', section: '营业成本' },
  { id: 'coa-5001', code: '5001', name: '生产成本', type: 'expense', isLeaf: true, balance: 0, normalSide: 'debit', statement: 'IS', section: '营业成本' },
  { id: 'coa-6601', code: '6601', name: '销售费用', type: 'expense', isLeaf: true, balance: 0, normalSide: 'debit', statement: 'IS', section: '期间费用' },
  { id: 'coa-6602', code: '6602', name: '管理费用', type: 'expense', isLeaf: true, balance: 0, normalSide: 'debit', statement: 'IS', section: '期间费用' },
  { id: 'coa-6603', code: '6603', name: '财务费用', type: 'expense', isLeaf: true, balance: 0, normalSide: 'debit', statement: 'IS', section: '期间费用' },
];

/** A1 凭证保存/操作结果 */
export interface VoucherActionResult {
  ok: boolean;
  message: string;
  voucherNo?: string;
  validation?: VoucherValidation;
}

// ==================== A6 会计期间硬管控 ====================
// 对标 SAP OB52 / 金蝶「期间开关账」：目标会计期间一旦结账（closed），
// 任何凭证的新增 / 修改 / 删除 / 过账 / 冲销都必须被拒绝，
// 必须先到「财务 → 期末结账」反结账把期间打回 open 才能继续记账。
/**
 * 校验凭证日期所属期间是否允许写入。
 * @returns 允许写入返回 null；不允许返回带错误信息的 VoucherActionResult
 */
export function checkPeriodWritable(date: string, action: string): VoucherActionResult | null {
  const period = periodOf(date);
  if (!period) return null;
  const closing = useFinanceLedgerStore.getState().getClosing(period);
  if (closing?.status === 'closed') {
    return {
      ok: false,
      message: `会计期间 ${period} 已结账，禁止${action}。如需调整请先在「财务 → 期末结账」执行反结账`,
    };
  }
  return null;
}

interface FinanceState {
  invoices: Invoice[];
  paymentPlans: PaymentPlan[];
  accountEntries: AccountEntry[];
  vouchers: Voucher[];
  financeStats: FinanceStats;
  taxRecords: TaxRecord[];
  projectAccounts: ProjectAccount[];
  chartOfAccounts: ChartAccount[];

  // B7-T3：供应商门户对账单 → 主 ERP 往来对账记录
  reconciliations: Reconciliation[];
  addReconciliation: (rec: Reconciliation) => void;
  confirmReconciliation: (input: { statementNo: string; vendorId: string; vendorName?: string; period?: string; amount?: number }) => void;

  // Invoice CRUD
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;

  // PaymentPlan CRUD
  addPaymentPlan: (plan: PaymentPlan) => void;
  updatePaymentPlan: (id: string, updates: Partial<PaymentPlan>) => void;
  deletePaymentPlan: (id: string) => void;

  // AccountEntry CRUD
  addAccountEntry: (entry: AccountEntry) => void;
  updateAccountEntry: (id: string, updates: Partial<AccountEntry>) => void;
  deleteAccountEntry: (id: string) => void;

  // ChartAccount CRUD
  addChartAccount: (account: ChartAccount) => void;
  updateChartAccount: (id: string, updates: Partial<ChartAccount>) => void;

  // A1 Voucher CRUD + 状态机（制单→审核→过账→冲销）
  createVoucher: (input: {
    date: string;
    voucherType?: string;
    items: VoucherItem[];
    attachmentCount?: number;
    remark?: string;
    createdBy?: string;
    source?: Voucher['source'];
    sourceNo?: string;
  }) => VoucherActionResult;
  updateVoucher: (id: string, updates: Partial<Voucher>) => VoucherActionResult;
  deleteVoucher: (id: string) => VoucherActionResult;
  reviewVoucher: (id: string, operator?: string) => VoucherActionResult;
  unreviewVoucher: (id: string) => VoucherActionResult;
  postVoucher: (id: string, operator?: string) => VoucherActionResult;
  reverseVoucher: (id: string, operator?: string, reason?: string) => VoucherActionResult;

  // Voucher generation（自动生成凭证）
  generateVoucherFromInvoice: (invoiceId: string) => string | null;
  generateVoucherFromPayment: (paymentId: string) => string | null;

  // TaxRecord CRUD
  addTaxRecord: (record: TaxRecord) => void;
  updateTaxRecord: (id: string, updates: Partial<TaxRecord>) => void;
  deleteTaxRecord: (id: string) => void;

  // ProjectAccount CRUD
  addProjectAccount: (account: ProjectAccount) => void;
  updateProjectAccount: (id: string, updates: Partial<ProjectAccount>) => void;
  deleteProjectAccount: (id: string) => void;

  // Stats
  setFinanceStats: (stats: FinanceStats) => void;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      invoices: [...mockInvoices],
      paymentPlans: [...mockPaymentPlans],
      accountEntries: [...mockAccountEntries],
      vouchers: entriesToVouchers(mockAccountEntries),
      financeStats: { ...mockFinanceStats },
      taxRecords: [...mockTaxRecords],
      projectAccounts: [...mockProjectAccounts],
      chartOfAccounts: [...seedChartOfAccounts],
      reconciliations: [],

      // Invoice CRUD
      addInvoice: (invoice) =>
        set((state) => ({ invoices: [...state.invoices, invoice] })),
      updateInvoice: (id, updates) => {
        set((state) => ({
          invoices: state.invoices.map((o) => (o.id === id ? { ...o, ...updates } : o)),
        }));
        // 状态流转到「已验证」时自动生成凭证（仅一次）
        if (updates.status === 'verified') {
          const inv = get().invoices.find((o) => o.id === id);
          if (inv && !inv.voucherGenerated) get().generateVoucherFromInvoice(id);
        }
      },
      deleteInvoice: (id) =>
        set((state) => ({ invoices: state.invoices.filter((o) => o.id !== id) })),

      // PaymentPlan CRUD
      addPaymentPlan: (plan) =>
        set((state) => ({ paymentPlans: [...state.paymentPlans, plan] })),
      updatePaymentPlan: (id, updates) => {
        set((state) => ({
          paymentPlans: state.paymentPlans.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
        // 状态流转到「已付清」时自动生成凭证（仅一次）
        if (updates.status === 'paid') {
          const p = get().paymentPlans.find((x) => x.id === id);
          if (p && !p.voucherGenerated) get().generateVoucherFromPayment(id);
        }
      },
      deletePaymentPlan: (id) =>
        set((state) => ({ paymentPlans: state.paymentPlans.filter((p) => p.id !== id) })),

      // AccountEntry CRUD
      // A1 兼容适配层：业务单据仍写扁平分录，这里同步 upsert 到凭证视图
      addAccountEntry: (entry) =>
        set((state) => ({
          accountEntries: [...state.accountEntries, entry],
          vouchers: upsertEntriesIntoVouchers(state.vouchers, [entry]),
        })),
      updateAccountEntry: (id, updates) =>
        set((state) => ({
          accountEntries: state.accountEntries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),
      deleteAccountEntry: (id) =>
        set((state) => ({ accountEntries: state.accountEntries.filter((e) => e.id !== id) })),

      // ChartAccount CRUD
      addChartAccount: (account) =>
        set((state) => ({ chartOfAccounts: [...state.chartOfAccounts, account] })),
      updateChartAccount: (id, updates) =>
        set((state) => ({
          chartOfAccounts: state.chartOfAccounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      // ── B7-T3：门户对账单确认 → 主 ERP 往来对账（幂等 upsert） ──
      addReconciliation: (rec) => set((s) => ({ reconciliations: [...s.reconciliations, rec] })),
      confirmReconciliation: (input) => {
        const { statementNo, vendorId } = input;
        const existing = get().reconciliations.find((r) => r.statementNo === statementNo && r.vendorId === vendorId);
        if (existing && existing.status === 'confirmed') return; // 幂等：已确认不重复回写
        if (existing) {
          set((s) => ({
            reconciliations: s.reconciliations.map((r) =>
              r.id === existing.id ? { ...r, status: 'confirmed', confirmedAt: nowStr() } : r
            ),
          }));
        } else {
          const rec: Reconciliation = {
            id: `rec-${statementNo}-${vendorId}`,
            statementNo,
            vendorId,
            vendorName: input.vendorName || '',
            period: input.period || '',
            amount: input.amount || 0,
            status: 'confirmed',
            confirmedAt: nowStr(),
            createdAt: nowStr(),
            updatedAt: nowStr(),
            createdBy: vendorId,
            updatedBy: vendorId,
          };
          set((s) => ({ reconciliations: [...s.reconciliations, rec] }));
        }
      },

      // ==================== A1 凭证 CRUD + 状态机 ====================
      createVoucher: (input) => {
        const validation = validateVoucher({ date: input.date, items: input.items });
        if (!validation.valid) {
          return { ok: false, message: validation.errors[0], validation };
        }
        // A6 期间管控：已结账期间不得新增凭证
        const blocked = checkPeriodWritable(input.date, '新增凭证');
        if (blocked) return blocked;
        const state = get();
        const voucherType = input.voucherType || '记';
        const voucherNo = nextVoucherNo(state.vouchers, input.date, voucherType);
        const now = new Date().toISOString();
        const items = input.items.map((it, idx) => ({ ...it, lineNo: idx + 1 }));
        const { totalDebit, totalCredit } = calcVoucherTotals(items);
        const voucher: Voucher = {
          id: `VCH-${voucherNo}`,
          voucherNo,
          voucherType,
          date: input.date,
          period: periodOf(input.date),
          attachmentCount: input.attachmentCount ?? 0,
          items,
          totalDebit,
          totalCredit,
          status: 'draft',
          source: input.source || 'manual',
          sourceNo: input.sourceNo,
          currency: 'CNY',
          createdBy: input.createdBy || '当前用户',
          remark: input.remark,
          createdAt: now,
          updatedAt: now,
          updatedBy: input.createdBy || '当前用户',
        };
        set((s) => ({ vouchers: [voucher, ...s.vouchers] }));
        return { ok: true, message: `凭证 ${voucherNo} 已保存（制单）`, voucherNo, validation };
      },

      updateVoucher: (id, updates) => {
        const v = get().vouchers.find((x) => x.id === id);
        if (!v) return { ok: false, message: '凭证不存在' };
        if (v.status !== 'draft') return { ok: false, message: '仅「制单」状态的凭证可以修改，请先反审核' };
        const items = updates.items
          ? updates.items.map((it, idx) => ({ ...it, lineNo: idx + 1 }))
          : v.items;
        const date = updates.date || v.date;
        // A6 期间管控：原期间、目标期间任一已结账都不得修改
        const blockedOld = checkPeriodWritable(v.date, '修改凭证');
        if (blockedOld) return blockedOld;
        const blockedNew = checkPeriodWritable(date, '修改凭证到该期间');
        if (blockedNew) return blockedNew;
        const validation = validateVoucher({ date, items });
        if (!validation.valid) return { ok: false, message: validation.errors[0], validation };
        const { totalDebit, totalCredit } = calcVoucherTotals(items);
        set((s) => ({
          vouchers: s.vouchers.map((x) =>
            x.id === id
              ? { ...x, ...updates, date, period: periodOf(date), items, totalDebit, totalCredit, updatedAt: new Date().toISOString() }
              : x
          ),
        }));
        return { ok: true, message: `凭证 ${v.voucherNo} 已更新`, voucherNo: v.voucherNo, validation };
      },

      deleteVoucher: (id) => {
        const v = get().vouchers.find((x) => x.id === id);
        if (!v) return { ok: false, message: '凭证不存在' };
        if (v.status !== 'draft') return { ok: false, message: '仅「制单」状态的凭证可以删除' };
        // A6 期间管控：已结账期间不得删除凭证
        const blocked = checkPeriodWritable(v.date, '删除凭证');
        if (blocked) return blocked;
        set((s) => ({ vouchers: s.vouchers.filter((x) => x.id !== id) }));
        return { ok: true, message: `凭证 ${v.voucherNo} 已删除`, voucherNo: v.voucherNo };
      },

      reviewVoucher: (id, operator) => {
        const v = get().vouchers.find((x) => x.id === id);
        if (!v) return { ok: false, message: '凭证不存在' };
        if (v.status !== 'draft') return { ok: false, message: '仅「制单」状态的凭证可以审核' };
        const validation = validateVoucher({ date: v.date, items: v.items });
        if (!validation.valid) return { ok: false, message: `审核失败：${validation.errors[0]}`, validation };
        const now = new Date().toISOString();
        set((s) => ({
          vouchers: s.vouchers.map((x) =>
            x.id === id ? { ...x, status: 'reviewed', reviewedBy: operator || '当前用户', reviewedAt: now, updatedAt: now } : x
          ),
        }));
        return { ok: true, message: `凭证 ${v.voucherNo} 审核通过`, voucherNo: v.voucherNo };
      },

      unreviewVoucher: (id) => {
        const v = get().vouchers.find((x) => x.id === id);
        if (!v) return { ok: false, message: '凭证不存在' };
        if (v.status !== 'reviewed') return { ok: false, message: '仅「已审核」状态的凭证可以反审核' };
        set((s) => ({
          vouchers: s.vouchers.map((x) =>
            x.id === id ? { ...x, status: 'draft', reviewedBy: undefined, reviewedAt: undefined, updatedAt: new Date().toISOString() } : x
          ),
        }));
        return { ok: true, message: `凭证 ${v.voucherNo} 已反审核`, voucherNo: v.voucherNo };
      },

      // 过账：写入总账明细（accountEntries），报表随即取到数
      postVoucher: (id, operator) => {
        const v = get().vouchers.find((x) => x.id === id);
        if (!v) return { ok: false, message: '凭证不存在' };
        if (v.status !== 'reviewed') return { ok: false, message: '仅「已审核」状态的凭证可以过账' };
        // A6 期间管控：已结账期间不得过账（过账即写总账明细，会改变已结报表）
        const blocked = checkPeriodWritable(v.date, '过账');
        if (blocked) return blocked;
        const now = new Date().toISOString();
        const posted: Voucher = { ...v, status: 'posted', postedBy: operator || '当前用户', postedAt: now, updatedAt: now };
        const entries = flattenVoucherToEntries(posted);
        set((s) => ({
          vouchers: s.vouchers.map((x) => (x.id === id ? posted : x)),
          accountEntries: [...s.accountEntries.filter((e) => e.voucherNo !== v.voucherNo), ...entries],
        }));
        return { ok: true, message: `凭证 ${v.voucherNo} 已过账，共 ${entries.length} 条明细入账`, voucherNo: v.voucherNo };
      },

      // 冲销（红冲）：生成一张红字凭证并直接过账，原凭证标记 reversed
      reverseVoucher: (id, operator, reason) => {
        const v = get().vouchers.find((x) => x.id === id);
        if (!v) return { ok: false, message: '凭证不存在' };
        if (v.status !== 'posted') return { ok: false, message: '仅「已过账」状态的凭证可以冲销' };
        const date = new Date().toISOString().slice(0, 10);
        // A6 期间管控：红字凭证记入的期间已结账时不得冲销
        const blocked = checkPeriodWritable(date, '冲销凭证');
        if (blocked) return blocked;
        const revNo = nextVoucherNo(get().vouchers, date, v.voucherType || '记');
        const reversal = buildReversalVoucher(v, { voucherNo: revNo, date, operator: operator || '当前用户', reason });
        const revEntries = flattenVoucherToEntries(reversal);
        const now = new Date().toISOString();
        set((s) => ({
          vouchers: [
            reversal,
            ...s.vouchers.map((x) =>
              x.id === id
                ? { ...x, status: 'reversed' as const, reversed: true, reversedBy: operator || '当前用户', reversedAt: now, reversalVoucherNo: revNo, updatedAt: now }
                : x
            ),
          ],
          accountEntries: [...s.accountEntries, ...revEntries],
        }));
        return { ok: true, message: `已生成红字凭证 ${revNo} 冲销 ${v.voucherNo}`, voucherNo: revNo };
      },

      // Voucher generation — 发票校验后自动生成（A4-③ GR/IR 暂估冲销）
      // 借 GR/IR暂估(2201) 冲销收货时挂的暂估 / 借 进项税额(2221) / 贷 应付账款(2202)。
      // 与收货暂估凭证（借1403/贷2201）配对，存货只在收货时入账一次，发票校验仅冲暂估+确认应付，避免重复入账。
      generateVoucherFromInvoice: (invoiceId) => {
        const inv = get().invoices.find((i) => i.id === invoiceId);
        if (!inv || inv.voucherGenerated) return null;
        const items: VoucherItem[] = [
          {
            id: `iv-${inv.id}-grir`, lineNo: 0,
            summary: `冲采购暂估 ${inv.invoiceNo}`,
            accountCode: '2201', accountName: '物资采购（GR/IR暂估）', debit: inv.amount, credit: 0,
          },
          {
            id: `iv-${inv.id}-vat`, lineNo: 0,
            summary: `进项税额 ${inv.invoiceNo}`,
            accountCode: '2221', accountName: '应交税费-应交增值税', debit: inv.taxAmount, credit: 0,
          },
          {
            id: `iv-${inv.id}-ap`, lineNo: 0,
            summary: `应付供应商 ${inv.vendorName}`,
            accountCode: '2202', accountName: '应付账款', debit: 0, credit: inv.totalAmount,
          },
        ];
        const res = get().createVoucher({
          date: inv.invoiceDate,
          items,
          source: 'invoice',
          sourceNo: inv.invoiceNo,
          remark: `采购发票校验（冲暂估）${inv.invoiceNo}`,
          createdBy: '系统',
        });
        if (res.ok) {
          set((s) => ({
            invoices: s.invoices.map((i) => (i.id === invoiceId ? { ...i, voucherGenerated: true } : i)),
          }));
          return res.voucherNo ?? null;
        }
        return null;
      },

      // Voucher generation — 付款结清后自动生成（借应付账款，贷银行存款）
      generateVoucherFromPayment: (paymentId) => {
        const p = get().paymentPlans.find((x) => x.id === paymentId);
        if (!p || p.voucherGenerated) return null;
        const stamp = Date.now();
        const voucherNo = `V-PP-${p.planNo}-${stamp}`;
        const entries: AccountEntry[] = [
          {
            id: `ae-${stamp}-1`, entryNo: `JE${stamp}1`, date: p.paidDate || p.dueDate,
            description: `支付供应商 ${p.vendorName}`, debitAccount: '应付账款', creditAccount: '',
            amount: p.totalAmount, currency: 'CNY', voucherNo, createdBy: '系统',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            updatedBy: '系统',
          },
          {
            id: `ae-${stamp}-2`, entryNo: `JE${stamp}2`, date: p.paidDate || p.dueDate,
            description: `银行存款支付 ${p.planNo}`, debitAccount: '', creditAccount: '银行存款',
            amount: p.totalAmount, currency: 'CNY', voucherNo, createdBy: '系统',
            updatedAt: new Date().toISOString(),
            updatedBy: '系统',
            createdAt: new Date().toISOString(),
          },
        ];
        set((s) => ({
          accountEntries: [...s.accountEntries, ...entries],
          vouchers: upsertEntriesIntoVouchers(s.vouchers, entries),
          paymentPlans: s.paymentPlans.map((x) => (x.id === paymentId ? { ...x, voucherGenerated: true } : x)),
        }));
        return voucherNo;
      },

      // TaxRecord CRUD
      addTaxRecord: (record) =>
        set((state) => ({ taxRecords: [...state.taxRecords, record] })),
      updateTaxRecord: (id, updates) =>
        set((state) => ({
          taxRecords: state.taxRecords.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),
      deleteTaxRecord: (id) =>
        set((state) => ({ taxRecords: state.taxRecords.filter((r) => r.id !== id) })),

      // ProjectAccount CRUD
      addProjectAccount: (account) =>
        set((state) => ({ projectAccounts: [...state.projectAccounts, account] })),
      updateProjectAccount: (id, updates) =>
        set((state) => ({
          projectAccounts: state.projectAccounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),
      deleteProjectAccount: (id) =>
        set((state) => ({ projectAccounts: state.projectAccounts.filter((a) => a.id !== id) })),

      // Stats
      setFinanceStats: (stats) => set({ financeStats: stats }),
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-finance',
      version: 3,
      // P3-1：重置科目表与凭证种子为完整报表数据集，并清除发票/付款的凭证标记，
      // 保证三大财务报表（BS/IS/CF）有真实可取数的凭证与期初余额。
      // A1（v3）：新增凭证头+分录行结构，由存量扁平分录一次性迁移生成。
      migrate: (persisted: any, _version: number) => {
        const p = persisted || {};
        const entries = [...mockAccountEntries];
        return {
          ...p,
          chartOfAccounts: [...seedChartOfAccounts],
          accountEntries: entries,
          vouchers: entriesToVouchers(entries),
          invoices: (p.invoices ?? []).map((i: any) => ({ ...i, voucherGenerated: false })),
          paymentPlans: (p.paymentPlans ?? []).map((x: any) => ({ ...x, voucherGenerated: false })),
        };
      },
      partialize: (state) => ({
        invoices: state.invoices,
        paymentPlans: state.paymentPlans,
        accountEntries: state.accountEntries,
        vouchers: state.vouchers,
        financeStats: state.financeStats,
        taxRecords: state.taxRecords,
        projectAccounts: state.projectAccounts,
        chartOfAccounts: state.chartOfAccounts,
      }),
    }
  )
);
