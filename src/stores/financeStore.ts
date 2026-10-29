import { create } from 'zustand';
import { voucherApi } from '@/services/w1Api';
import { financeApi, FIN_PAGE_SIZE } from '@/services/financeApi';
import { snakeToCamel } from '@/utils/case';
import { Invoice, PaymentPlan, AccountEntry, FinanceStats, TaxRecord, ProjectAccount, ChartAccount, TaxCode } from '@/types';
import type { Voucher, VoucherItem, VoucherValidation, Reconciliation, PaymentStatus } from '@/types/finance';
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
import { useVendorStore } from './vendorStore';
import { useGlobalToastStore } from '@/stores/globalToastStore';

// ==================== C1 财务域关系化（V3.8.0）====================
//
// ── 改造前的状态：一个域、两套存储 ──────────────────────────────────
// 财务域是「迁了一半」的典型，而且这一半迁得最危险：
//   · 凭证（vouchers / voucher_items）已在 V3.x「W1 根治双通道」中迁到真实 D1；
//   · 其余 7 个切片仍在 `app_state` 的 JSON 大对象里（persist name: 'ssa-erp-finance'）。
// 后果不是「慢一点」，而是**数据会分家**：换台电脑打开，凭证还在、发票没了，
// 且没有任何报错。「发票 → 凭证」的关联一头是关系、一头是 JSON，
// 外键加不上、级联删除做不了、按发票号统计应付账款根本无从下手。
//
// ── 改造后：D1 为唯一真相源，persist 整体删除 ───────────────────────
// 与 BOM 样板域同一套设计（V3.6.0）：
//   ① 数据主源 = D1 关系表，经 financeApi 读写；
//   ② **彻底移除 persist** —— backendStorage 的落点就是 app_state 那个大对象，
//      保留它等于双通道照旧（D1 写一份、Blob 再写一份），C1 白改；
//   ③ 初始值仍是 mock 种子，但**只存在于内存**，load() 成功后被 D1 数据整体覆盖。
//
// ── 为什么方法必须保持同步（这是本域与 BOM 最大的不同）───────────────
// 本 store 有 33 个业务消费方，其中大量是**同步**依赖返回值：
//   · createVoucher / reviewVoucher / postVoucher 返回 VoucherActionResult，
//     调用方立刻用 `res.ok` 决定要不要弹提示、跳不跳转；
//   · generateVoucherFromInvoice 返回 voucherNo，被写回发票的 voucherGenerated 标记；
//   · qualityStore / salesAdvancedStore / warehouseStore 等 5 个 store 直接
//     `useFinanceStore.getState().addAccountEntry(e)` 当同步调用。
// 若改成 async，这 33 处全部要动，回归风险远超收益。
// 因此保留同步签名，内部改为「乐观更新 + 异步落库 + 失败回滚 + 如实提示」：
// 界面立刻响应，网络失败时把内存状态退回去并给出可读原因。
//
// ── 一个必须说清的取舍：乐观更新下「成功提示」可能先于「真正落库」────
// 调用方拿到 ok:true 时，数据还没写进 D1。若此刻断网，状态会回滚并提示失败。
// 这是与「等网络往返再返回」之间的取舍：财务单据录入要连续操作，
// 每敲一笔等一秒会让人改用 Excel。选择乐观 + 回滚 + 明确提示，
// **失败必须是吵闹的**（回滚 + 红字提示），而不是静默的。

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

// 税码主数据（V3.96.0）：内存种子与迁移 0114 fin_tax_codes 保持一致，
// load() 成功后由 D1 数据整体覆盖；供应商审批时统驭科目/税码从下拉选择即取自此。
const seedTaxCodes: TaxCode[] = [
  { id: 'ftc-v13', code: 'V13', name: '增值税13%专票（可抵扣）', taxRate: 13, deductible: true,  remark: '一般纳税人标准税率，进项可抵扣' },
  { id: 'ftc-v9',  code: 'V9',  name: '增值税9%专票（可抵扣）',  taxRate: 9,  deductible: true,  remark: '交通运输/建筑/基础服务等' },
  { id: 'ftc-v6',  code: 'V6',  name: '增值税6%专票（可抵扣）',  taxRate: 6,  deductible: true,  remark: '现代服务/信息技术/金融等' },
  { id: 'ftc-v3',  code: 'V3',  name: '增值税3%征收率',          taxRate: 3,  deductible: true,  remark: '小规模纳税人/简易征收' },
  { id: 'ftc-v0',  code: 'V0',  name: '免税/零税率',             taxRate: 0,  deductible: false, remark: '出口/免税项目，进项不可抵扣' },
];

/** A1 凭证保存/操作结果 */
export interface VoucherActionResult {
  ok: boolean;
  message: string;
  voucherNo?: string;
  validation?: VoucherValidation;
}

/** 把接口异常转成强哥看得懂的一句话（不暴露堆栈与状态码术语） */
/** 付款闸门拦截信息（来自后端 422 响应，见 functions/_shared/paymentGate.ts） */
export interface PaymentGateError {
  /** 后端判定代码，形如 THREE_WAY_MATCH_OVER_PO / _INSUFFICIENT_INBOUND / _NO_INVOICE */
  code: string;
  /** 面向业务人员的中文原因（后端已写好，直接展示） */
  message: string;
  /** 判定明细：订单金额、入库金额、发票金额、到货率、容差等 */
  detail?: Record<string, unknown>;
}

/**
 * 从异常里识别「付款闸门拦截」。
 * 判据是 HTTP 422 + code 前缀：后端专门用 422 而非 409，
 * 因为本文件对 409 有统一覆盖文案（会把具体原因冲掉）。
 */
function parsePaymentGateError(e: any): PaymentGateError | null {
  const status = e?.response?.status;
  const data = e?.response?.data;
  const code = typeof data?.code === 'string' ? data.code : '';
  if (status !== 422 || !code.startsWith('THREE_WAY_MATCH_')) return null;
  return {
    code,
    message:
      typeof data?.error === 'string' && data.error
        ? data.error
        : '三单匹配未通过，本次付款已被拦截',
    detail: data?.threeWayMatch ?? undefined,
  };
}

function readableError(e: any): string {
  const status = e?.response?.status;
  if (status === 401) return '登录已过期，请重新登录后重试';
  if (status === 403) return '当前账号没有财务的修改权限';
  if (status === 409) return '数据与服务器冲突（可能是编号重复），请刷新后重试';
  const msg = e?.response?.data?.error;
  if (typeof msg === 'string' && msg) return msg;
  if (e?.code === 'ERR_NETWORK') return '网络不可达';
  return '网络或服务器异常';
}

/** localStorage 在某些环境（隐私模式 / SSR）会抛异常，读写一律包一层 */
function flagGet(k: string): string | null {
  try { return window.localStorage.getItem(k); } catch { return null; }
}
function flagSet(k: string, v: string) {
  try { window.localStorage.setItem(k, v); } catch { /* 忽略 */ }
}

/** 首次空库回填标记：每个切片一个键，避免多端互相重复写入 */
const FLAG = {
  invoices: 'ssa-erp-fin-invoices-backfilled',
  paymentPlans: 'ssa-erp-fin-payment-plans-backfilled',
  accountEntries: 'ssa-erp-fin-account-entries-backfilled',
  taxRecords: 'ssa-erp-fin-tax-records-backfilled',
  projectAccounts: 'ssa-erp-fin-project-accounts-backfilled',
  chartOfAccounts: 'ssa-erp-fin-coa-backfilled',
  taxCodes: 'ssa-erp-fin-tax-codes-backfilled', // V3.96.0 税码主数据
};

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

// ==================== 凭证行映射（沿用 W1 既有实现）====================
const VOUCHER_BACKFILL_FLAG = 'ssa-erp-vouchers-backfilled';

/** 读取旧 app_state Blob 中遗留的 vouchers（迁移过渡期一次性回填用） */
function readLegacyVouchers(): Voucher[] {
  try {
    const raw = window.localStorage.getItem('ssa-erp-finance');
    if (raw) {
      const parsed = JSON.parse(raw);
      const st = parsed?.state;
      if (st?.vouchers && Array.isArray(st.vouchers)) return st.vouchers as Voucher[];
    }
  } catch {
    /* ignore */
  }
  return [];
}

/** D1 行（snake_case，含 items 行明细）→ 前端 Voucher（camelCase） */
function rowToVoucher(row: any): Voucher {
  const v: any = snakeToCamel(row || {});
  // 后端列 remarks(snake→camel 仍为 remarks) 映射回前端 Voucher.remark
  if (v.remarks !== undefined) { v.remark = v.remarks; delete v.remarks; }
  if (v.remark === undefined && v.description) v.remark = v.description;
  if (Array.isArray(v.items)) {
    v.items = v.items.map((it: any) => {
      const item: any = snakeToCamel(it);
      item.id = item.id || `VI-${Math.random().toString(36).slice(2, 8)}`;
      item.lineNo = item.lineNo || 0;
      return item as VoucherItem;
    });
  } else {
    v.items = [];
  }
  return v as Voucher;
}

/** 前端 Voucher → 后端 POST/PUT 载荷（remark 落 remarks 列；id 透传 VCH- 业务主键） */
function toVoucherPayload(v: Voucher) {
  return {
    id: v.id,
    voucherNo: v.voucherNo,
    voucherType: v.voucherType,
    date: v.date,
    period: v.period,
    source: v.source,
    status: v.status,
    totalDebit: v.totalDebit,
    totalCredit: v.totalCredit,
    currency: v.currency || 'CNY',
    attachmentCount: v.attachmentCount ?? 0,
    sourceNo: v.sourceNo,
    createdBy: v.createdBy,
    reviewedBy: v.reviewedBy,
    reviewedAt: v.reviewedAt,
    postedBy: v.postedBy,
    postedAt: v.postedAt,
    reversed: v.reversed ?? false,
    reversedBy: v.reversedBy,
    reversedAt: v.reversedAt,
    reversalVoucherNo: v.reversalVoucherNo,
    remark: v.remark,
    items: (v.items || []).map((it) => ({
      id: it.id,
      lineNo: it.lineNo,
      summary: it.summary,
      accountCode: it.accountCode,
      accountName: it.accountName,
      debit: it.debit,
      credit: it.credit,
      currency: it.currency || 'CNY',
      exchangeRate: it.exchangeRate || 1,
      costCenterId: it.costCenterId,
      projectId: it.projectId,
    })),
  };
}

/**
 * fire-and-forget upsert：先建；已存在(409)时**区分两种成因**（V3.45.0 修正）。
 *
 * ★ V3.45.0 修掉的危险逻辑：原实现对任何 409 都转而执行 `updateVoucher`（PUT 覆盖）。
 *   而 `v.id` 是**前端自造的 `VCH-<voucherNo>`**、凭证号又来自浏览器内存快照
 *   （nextVoucherNo 只看本页已加载的 500 条）⇒ 两台机器同时制单会算出同一个号、
 *   拿到同一个 id。此时 PUT 覆盖的不是"自己的旧版本"，而是**对方刚创建的凭证**，
 *   且返回成功、无任何痕迹 —— 撞号从"报错"退化为"静默覆盖他人凭证"，是最危险的一条。
 *
 *   现在：服务端 409 响应会带出冲突凭证的归属信息，只有**确认是自己这张**
 *   （id 与本地一致 = 幂等重放，例如离线后重试）才允许转 PUT；
 *   否则明确报"凭证号已被占用"，请刷新重取号，绝不覆盖。
 * 失败不再静默——告警用户（凭证是最核心数据，落库失败必须可感知）。
 */
function persistVoucher(v?: Voucher) {
  if (!v) return;
  voucherApi.createVoucher(toVoucherPayload(v)).catch((e: any) => {
    const status = e?.response?.status ?? e?.status;
    if (status === 409 || /已存在/.test(String(e?.message || ''))) {
      // 冲突方 id 与本地 id 相同 ⇒ 是本机此前已落库的同一张凭证（幂等重放），转更新安全
      const conflictId = String(e?.response?.data?.id || e?.data?.id || '');
      const isSelfReplay = !!conflictId && conflictId === v.id;
      if (isSelfReplay) {
        voucherApi.updateVoucher(v.id, toVoucherPayload(v)).catch((e2: any) => {
          useGlobalToastStore.getState().showError(`凭证 ${v.voucherNo} 更新未保存到服务器：${readableError(e2)}`);
        });
        return;
      }
      // 撞号（他机占用同号）：绝不覆盖，提示刷新重取号
      useGlobalToastStore.getState().showError(
        `凭证号 ${v.voucherNo} 已被其他凭证占用（可能由另一台电脑同时制单）。为避免覆盖他人凭证已阻止保存，请刷新后重新取号。`
      );
      return;
    }
    useGlobalToastStore.getState().showError(`凭证 ${v.voucherNo} 保存到服务器失败：${readableError(e)}`);
  });
}

/** 同上的「可等待」版本：用于需要「失败就回滚并吵闹提示」的写入路径（如手工分录落库）。 */
function persistVoucherAsync(v?: Voucher): Promise<unknown> {
  if (!v) return Promise.resolve();
  return voucherApi.createVoucher(toVoucherPayload(v)).catch((e: any) => {
    const status = e?.response?.status ?? e?.status;
    if (status === 409 || /已存在/.test(String(e?.message || ''))) {
      // ★ V3.45.0：与 persistVoucher 同一修正 —— 只有"本机同一张凭证"才转更新，
      //   他机撞号一律抛错上抛，绝不 PUT 覆盖他人凭证。
      const conflictId = String(e?.response?.data?.id || e?.data?.id || '');
      if (conflictId && conflictId === v.id) {
        return voucherApi.updateVoucher(v.id, toVoucherPayload(v));
      }
      throw new Error(
        `凭证号 ${v.voucherNo} 已被其他凭证占用（可能由另一台电脑同时制单）。为避免覆盖他人凭证已阻止保存，请刷新后重新取号。`
      );
    }
    throw e;
  });
}

// ==================== #8 报表真源切换：总账分录 = 凭证的派生视图 ====================
//
// 改造前：系统里并存「两套账」——
//   · `vouchers`（正式凭证表，V3.15.9 起有服务端借贷平衡闸门）；
//   · `fin_account_entries`（旧的会计分录明细表，**无任何校验**），
//     却是试算平衡 / 资产负债 / 利润 / 现金流 / 预算控制 / 辅助核算 / 分录列表
//     等 7 张报表的真实数据源。凭证过账时再往旧表写一份派生分录，
//     于是同一笔业务在两张表里各存一份、各自可能悄悄漂移。
//
// 改造后（强哥拍板路线 A「报表改读受保护的凭证表」）：
//   · 报表消费的 `accountEntries` 切片**不再是独立数据源**，改为由 `vouchers` 派生
//     （复用既有的 `flattenVoucherToEntries`，严格保持「1 行分录 = 1 条 AccountEntry」，
//      确保报表取数口径与改造前完全一致，报表层零改动）；
//   · 旧表 `fin_account_entries` **停止读写、保留为历史存档**（代码里不再有人写它）；
//   · 手工录入改走「手工凭证」（见 addAccountEntry），分录天然借贷平衡。
//
// 进账规则：只有**已过账**的凭证进总账。已红冲的凭证（status='reversed'）与其
//   红字伴生凭证一起保留——两者金额相反，合并后科目发生额归零，与原口径一致。
const deriveEntries = (vouchers: Voucher[]): AccountEntry[] =>
  (vouchers || [])
    .filter((v) => v.status === 'posted' || v.status === 'reversed')
    .flatMap((v) => flattenVoucherToEntries(v));

/**
 * 拉取一个切片：成功返回数组，失败返回 null（调用方据此保留内存种子）。
 *
 * 空库回填只在**本设备第一次**发生（flag 落 localStorage）：
 * 否则多端会互相重复写入，也会让用户「删空了又长回来」——像灵异事件。
 */
async function pullSlice<T>(
  api: { list: (p?: Record<string, unknown>) => Promise<any>; create: (d: any) => Promise<any> },
  seed: T[],
  flagKey: string
): Promise<T[] | null> {
  try {
    const res = await api.list({ page: 1, pageSize: FIN_PAGE_SIZE });
    const list = (res?.data || []) as T[];
    if (list.length === 0 && !flagGet(flagKey)) {
      flagSet(flagKey, '1');
      for (const item of seed) {
        try { await api.create(item); } catch { /* 编号冲突等单条失败不阻断其余回填 */ }
      }
      const again = await api.list({ page: 1, pageSize: FIN_PAGE_SIZE });
      return (again?.data || []) as T[];
    }
    // list 为 0 且已回填过 = 用户确实把数据删空了，如实返回空数组，不再塞种子
    return list;
  } catch {
    return null;
  }
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
  taxCodes: TaxCode[]; // V3.96.0 税码主数据

  // C1：D1 同步状态（页面可据此显示加载态 / 失败原因）
  loaded: boolean;
  syncError: string;
  /** V3.19.0 付款闸门：最近一次被三单匹配拦下的原因。
   *  与 syncError 分开保存，是因为付款拦截要携带结构化信息（判定代码 + 具体差多少），
   *  而 syncError 只是给人看的一行字。页面据此弹出可解释的提示，而不是笼统一句「保存失败」。 */
  paymentGateError: PaymentGateError | null;
  clearPaymentGateError: () => void;

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
  /** B11 逐期付款：标记某期已付，重算计划已付/状态；全部付清后释放预付款占用信用 */
  payInstallment: (planId: string, installmentId: string) => void;

  // AccountEntry CRUD
  addAccountEntry: (entry: AccountEntry) => void;
  updateAccountEntry: (id: string, updates: Partial<AccountEntry>) => void;
  deleteAccountEntry: (id: string) => void;

  // ChartAccount CRUD
  addChartAccount: (account: ChartAccount) => void;
  updateChartAccount: (id: string, updates: Partial<ChartAccount>) => void;

  // V3.96.0 TaxCode（税码主数据）CRUD
  addTaxCode: (code: TaxCode) => void;
  updateTaxCode: (id: string, updates: Partial<TaxCode>) => void;
  deleteTaxCode: (id: string) => void;

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
  /** 从 D1 vouchers 拉取凭证（在线）；失败回退内存。首次空库回填一次。 */
  loadVouchers: () => Promise<void>;

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

  /** C1：从 D1 拉取全部切片（凭证走 voucherApi，其余走 financeApi）。失败保留内存种子并记原因。 */
  load: () => Promise<void>;
}

export const useFinanceStore = create<FinanceState>()((set, get) => {
  /**
   * 乐观更新壳：立刻改内存 → 异步落库 → 成功清错误、失败回滚并给出可读原因。
   * 与 BOM 样板域同一套语义：失败必须是吵闹的（回滚 + 提示），不能静默。
   */
  const commit = (
    apply: () => void,
    rollback: () => void,
    persist: () => Promise<unknown>,
    failMsg: string
  ) => {
    apply();
    void (async () => {
      try {
        await persist();
        set({ syncError: '', paymentGateError: null });
      } catch (e: any) {
        rollback();
        const gate = parsePaymentGateError(e);
        if (gate) {
          // 付款闸门拦截是「可解释的业务拒绝」，不是系统故障。
          // 必须把「为什么被拦、差多少」原样带到界面上；
          // 若压成一句「保存到服务器失败」，用户只会反复重试而不知道要改什么。
          set({ syncError: gate.message, paymentGateError: gate });
        } else {
          set({ syncError: `${failMsg}：${readableError(e)}` });
        }
      }
    })();
  };

  return {
      invoices: [...mockInvoices],
      paymentPlans: [...mockPaymentPlans],
      // #8：accountEntries 仅为「离线种子」，load() 成功后由凭证派生覆盖（见 deriveEntries）
      accountEntries: [...mockAccountEntries],
      vouchers: entriesToVouchers(mockAccountEntries),
      financeStats: { ...mockFinanceStats },
      taxRecords: [...mockTaxRecords],
      projectAccounts: [...mockProjectAccounts],
      chartOfAccounts: [...seedChartOfAccounts],
      taxCodes: [...seedTaxCodes],
      reconciliations: [],
      loaded: false,
      syncError: '',
      paymentGateError: null,
      clearPaymentGateError: () => set({ paymentGateError: null }),

      // Invoice CRUD
      addInvoice: (invoice) =>
        commit(
          () => set((state) => ({ invoices: [...state.invoices, invoice] })),
          () => set((state) => ({ invoices: state.invoices.filter((o) => o.id !== invoice.id) })),
          () => financeApi.invoices.create(invoice),
          `发票「${invoice.invoiceNo || invoice.id}」保存到服务器失败，已撤回`
        ),
      updateInvoice: (id, updates) => {
        const prev = get().invoices.find((o) => o.id === id);
        commit(
          () => set((state) => ({ invoices: state.invoices.map((o) => (o.id === id ? { ...o, ...updates } : o)) })),
          () => { if (prev) set((state) => ({ invoices: state.invoices.map((o) => (o.id === id ? prev : o)) })); },
          () => financeApi.invoices.update(id, updates),
          `发票「${prev?.invoiceNo || id}」修改未保存`
        );
        // 状态流转到「已验证」时自动生成凭证（仅一次）
        if (updates.status === 'verified') {
          const inv = get().invoices.find((o) => o.id === id);
          if (inv && !inv.voucherGenerated) get().generateVoucherFromInvoice(id);
        }
      },
      deleteInvoice: (id) => {
        const prev = [...get().invoices];
        commit(
          () => set((state) => ({ invoices: state.invoices.filter((o) => o.id !== id) })),
          () => set({ invoices: prev }),
          () => financeApi.invoices.remove(id),
          '发票删除失败'
        );
      },

      // PaymentPlan CRUD
      addPaymentPlan: (plan) => {
        // B11：含预付款的分批计划 → 创建时占用供应商信用额度
        let finalPlan = plan;
        if (plan.installments && plan.installments.length > 0 && plan.vendorId) {
          const advance = plan.installments
            .filter((i) => i.type === 'advance')
            .reduce((s, i) => s + i.amount, 0);
          if (advance > 0) {
            const ok = useVendorStore.getState().applyVendorCreditDelta(plan.vendorId, advance);
            if (ok) {
              finalPlan = { ...plan, advanceAmount: advance, advanceOccupied: true };
            }
          }
        }
        const saved = finalPlan;
        commit(
          () => set((state) => ({ paymentPlans: [...state.paymentPlans, saved] })),
          () => set((state) => ({ paymentPlans: state.paymentPlans.filter((p) => p.id !== saved.id) })),
          // 走专用端点：installments 是嵌套数组，通用实体路由会静默丢弃
          () => financeApi.paymentPlans.create(saved),
          `付款计划「${saved.planNo || saved.id}」保存到服务器失败，已撤回`
        );
      },
      updatePaymentPlan: (id, updates) => {
        const prev = get().paymentPlans.find((p) => p.id === id);
        commit(
          () => set((state) => ({ paymentPlans: state.paymentPlans.map((p) => (p.id === id ? { ...p, ...updates } : p)) })),
          () => { if (prev) set((state) => ({ paymentPlans: state.paymentPlans.map((p) => (p.id === id ? prev : p)) })); },
          () => financeApi.paymentPlans.update(id, updates),
          `付款计划「${prev?.planNo || id}」修改未保存`
        );
        // 状态流转到「已付清」时自动生成凭证（仅一次）
        if (updates.status === 'paid') {
          const p = get().paymentPlans.find((x) => x.id === id);
          if (p && !p.voucherGenerated) get().generateVoucherFromPayment(id);
        }
      },
      deletePaymentPlan: (id) => {
        const prev = [...get().paymentPlans];
        commit(
          () => set((state) => ({ paymentPlans: state.paymentPlans.filter((p) => p.id !== id) })),
          () => set({ paymentPlans: prev }),
          () => financeApi.paymentPlans.remove(id),
          '付款计划删除失败'
        );
      },

      // B11 逐期付款：标记某期已付，重算计划已付/状态；全部付清后释放预付款占用信用
      payInstallment: (planId, installmentId) => {
        const plan = get().paymentPlans.find((p) => p.id === planId);
        if (!plan || !plan.installments) return;
        const installments = plan.installments.map((i) =>
          i.id === installmentId && i.status !== 'paid'
            ? { ...i, status: 'paid' as PaymentStatus, paidDate: new Date().toISOString().split('T')[0] }
            : i
        );
        const paidAmount = installments
          .filter((i) => i.status === 'paid')
          .reduce((s, i) => s + i.amount, 0);
        const allPaid = installments.every((i) => i.status === 'paid');
        const now = new Date().toISOString();
        const updates: Partial<PaymentPlan> = {
          installments,
          paidAmount,
          status: allPaid ? 'paid' : 'partial',
          paidDate: allPaid ? now.split('T')[0] : plan.paidDate,
          updatedAt: now,
        };
        // 全部付清 → 释放预付款占用信用
        if (allPaid && plan.advanceOccupied && plan.advanceAmount && plan.vendorId) {
          useVendorStore.getState().applyVendorCreditDelta(plan.vendorId, -plan.advanceAmount);
          updates.advanceOccupied = false;
        }
        const prev = plan;
        commit(
          () => set((state) => ({ paymentPlans: state.paymentPlans.map((p) => (p.id === planId ? { ...p, ...updates } : p)) })),
          () => set((state) => ({ paymentPlans: state.paymentPlans.map((p) => (p.id === planId ? prev : p)) })),
          // 必须整包带 installments 一起更新：分期是子表行，只改父表会丢掉逐期记录
          () => financeApi.paymentPlans.update(planId, updates),
          `付款计划「${plan.planNo || planId}」付款登记未保存`
        );
        // 状态流转到「已付清」时自动生成凭证（仅一次）
        if (allPaid && !plan.voucherGenerated) get().generateVoucherFromPayment(planId);
      },

      // AccountEntry CRUD（#8 改造后：accountEntries 是凭证的派生视图，不再是独立数据源）
      // 业务单据仍按「凭证号」把分录 upsert 进凭证视图——多条单边分录共享同一
      // voucherNo 时会被合并成一张平衡凭证；**不再写旧表 fin_account_entries**。
      addAccountEntry: (entry) => {
        const prevEntries = get().accountEntries;
        const prevVouchers = get().vouchers;
        commit(
          () => set((state) => {
            const vouchers = upsertEntriesIntoVouchers(state.vouchers, [entry]);
            return { vouchers, accountEntries: deriveEntries(vouchers) };
          }),
          () => set({ accountEntries: prevEntries, vouchers: prevVouchers }),
          () => persistVoucherAsync(get().vouchers.find((x) => x.voucherNo === entry.voucherNo)),
          `分录「${entry.entryNo || entry.id}」保存到服务器失败，已撤回`
        );
      },
      // 分录由凭证派生，不能单独改 / 删——要改分录请改它所属的凭证。
      // （改造前这两个方法只被旧的分录列表页使用，现已无调用方；保留签名并给出
      //   明确提示，避免未来误用后「改了却看不见效果」。）
      updateAccountEntry: (id) => {
        const e = get().accountEntries.find((x) => x.id === id);
        set({ syncError: `总账分录由凭证派生，不能单独修改${e?.voucherNo ? `；请修改凭证 ${e.voucherNo}` : ''}` });
      },
      deleteAccountEntry: (id) => {
        const e = get().accountEntries.find((x) => x.id === id);
        set({ syncError: `总账分录由凭证派生，不能单独删除${e?.voucherNo ? `；请删除或红冲凭证 ${e.voucherNo}` : ''}` });
      },

      // ChartAccount CRUD
      addChartAccount: (account) =>
        commit(
          () => set((state) => ({ chartOfAccounts: [...state.chartOfAccounts, account] })),
          () => set((state) => ({ chartOfAccounts: state.chartOfAccounts.filter((a) => a.id !== account.id) })),
          () => financeApi.chartOfAccounts.create(account),
          `科目「${account.code || account.id}」保存到服务器失败，已撤回`
        ),
      updateChartAccount: (id, updates) => {
        const prev = get().chartOfAccounts.find((a) => a.id === id);
        commit(
          () => set((state) => ({ chartOfAccounts: state.chartOfAccounts.map((a) => (a.id === id ? { ...a, ...updates } : a)) })),
          () => { if (prev) set((state) => ({ chartOfAccounts: state.chartOfAccounts.map((a) => (a.id === id ? prev : a)) })); },
          () => financeApi.chartOfAccounts.update(id, updates),
          `科目「${prev?.code || id}」修改未保存`
        );
      },

      // V3.96.0 税码主数据 CRUD（走通用实体路由 finTaxCode，乐观更新 + 异步落库 + 失败回滚）
      addTaxCode: (code) =>
        commit(
          () => set((state) => ({ taxCodes: [...state.taxCodes, code] })),
          () => set((state) => ({ taxCodes: state.taxCodes.filter((c) => c.id !== code.id) })),
          () => financeApi.taxCodes.create(code),
          `税码「${code.code || code.id}」保存到服务器失败，已撤回`
        ),
      updateTaxCode: (id, updates) => {
        const prev = get().taxCodes.find((c) => c.id === id);
        commit(
          () => set((state) => ({ taxCodes: state.taxCodes.map((c) => (c.id === id ? { ...c, ...updates } : c)) })),
          () => { if (prev) set((state) => ({ taxCodes: state.taxCodes.map((c) => (c.id === id ? prev : c)) })); },
          () => financeApi.taxCodes.update(id, updates),
          `税码「${prev?.code || id}」修改未保存`
        );
      },
      deleteTaxCode: (id) => {
        const prev = [...get().taxCodes];
        commit(
          () => set((state) => ({ taxCodes: state.taxCodes.filter((c) => c.id !== id) })),
          () => set({ taxCodes: prev }),
          () => financeApi.taxCodes.remove(id),
          '税码删除失败'
        );
      },

      // ── B7-T3：门户对账单确认 → 主 ERP 往来对账（幂等 upsert） ──
      // 说明：reconciliations 是**会话内**的对账动作记录，不落库、不跨设备，
      // 与改造前一致（原本就在 partialize 之外），故保持纯内存。
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
        // fire-and-forget 写 D1（凭证自 V3.x 起已以 D1 为唯一真相源）
        persistVoucher(voucher);
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
        persistVoucher(get().vouchers.find((x) => x.id === id));
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
        // 乐观删除：失败回滚（删除无副作用，回滚安全）+ 告警
        voucherApi.deleteVoucher(id).catch((e: any) => {
          set((s) => ({ vouchers: [v, ...s.vouchers] }));
          useGlobalToastStore.getState().showError(`凭证 ${v.voucherNo} 删除未同步到服务器：${readableError(e)}`);
        });
        return { ok: true, message: `凭证 ${v.voucherNo} 已删除`, voucherNo: v.voucherNo };
      },

      loadVouchers: async () => {
        try {
          const res = await voucherApi.getVouchers({ page: 1, pageSize: 500 });
          const list = ((res?.data || []) as any[]).map(rowToVoucher);
          // #8：总账分录随凭证一起派生刷新（报表真源 = vouchers）
          set({ vouchers: list, accountEntries: deriveEntries(list) });
          // 首次空库：从 legacy app_state / 内存(含 mock 派生) 回填 D1 一次，消除双源过渡缺口
          if (list.length === 0 && !flagGet(VOUCHER_BACKFILL_FLAG)) {
            flagSet(VOUCHER_BACKFILL_FLAG, '1');
            const legacy = readLegacyVouchers();
            const seed = legacy.length ? legacy : get().vouchers;
            await Promise.all(seed.map((v) => voucherApi.createVoucher(toVoucherPayload(v)).catch(() => {})));
            const refreshed = await voucherApi.getVouchers({ page: 1, pageSize: 500 });
            const refreshedList = ((refreshed?.data || []) as any[]).map(rowToVoucher);
            set({ vouchers: refreshedList, accountEntries: deriveEntries(refreshedList) });
          }
        } catch {
          // 离线/未登录/接口异常：保留内存（initializer 已用 mock 派生），不阻断 UI
        }
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
        persistVoucher(get().vouchers.find((x) => x.id === id));
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
        persistVoucher(get().vouchers.find((x) => x.id === id));
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
        set((s) => {
          const vouchers = s.vouchers.map((x) => (x.id === id ? posted : x));
          // #8：分录由凭证派生（过账即进总账），不再往旧表 fin_account_entries 另写一份
          return { vouchers, accountEntries: deriveEntries(vouchers) };
        });
        persistVoucher(posted);
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
        const now = new Date().toISOString();
        set((s) => {
          const vouchers = [
            reversal,
            ...s.vouchers.map((x) =>
              x.id === id
                ? { ...x, status: 'reversed' as const, reversed: true, reversedBy: operator || '当前用户', reversedAt: now, reversalVoucherNo: revNo, updatedAt: now }
                : x
            ),
          ];
          // #8：红冲后总账由凭证派生——原凭证(reversed)与其红字伴生凭证金额相反，
          //     合并后科目发生额归零，与原口径一致；不再往旧表追加。
          return { vouchers, accountEntries: deriveEntries(vouchers) };
        });
        persistVoucher(reversal);
        persistVoucher(get().vouchers.find((x) => x.id === id));
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
          const marked = { voucherGenerated: true };
          set((s) => ({
            invoices: s.invoices.map((i) => (i.id === invoiceId ? { ...i, ...marked } : i)),
          }));
          // 标记也要落库，否则刷新后同一张发票会重复生成凭证
          financeApi.invoices.update(invoiceId, marked).catch((e: any) => {
            useGlobalToastStore.getState().showError(`发票 ${inv.invoiceNo} 的凭证生成标记未同步到服务器：${readableError(e)}`);
          });
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
        set((s) => {
          // #8：分录由凭证派生，不再写旧表 fin_account_entries
          const vouchers = upsertEntriesIntoVouchers(s.vouchers, entries);
          return {
            vouchers,
            accountEntries: deriveEntries(vouchers),
            paymentPlans: s.paymentPlans.map((x) => (x.id === paymentId ? { ...x, voucherGenerated: true } : x)),
          };
        });
        const affected = get().vouchers.find((x) => x.voucherNo === voucherNo);
        if (affected) persistVoucher(affected);
        financeApi.paymentPlans.update(paymentId, { voucherGenerated: true }).catch((e: any) => {
          useGlobalToastStore.getState().showError(`付款计划 ${p.planNo} 的凭证生成标记未同步到服务器：${readableError(e)}`);
        });
        return voucherNo;
      },

      // TaxRecord CRUD
      addTaxRecord: (record) =>
        commit(
          () => set((state) => ({ taxRecords: [...state.taxRecords, record] })),
          () => set((state) => ({ taxRecords: state.taxRecords.filter((r) => r.id !== record.id) })),
          () => financeApi.taxRecords.create(record),
          `税务记录「${record.recordNo || record.id}」保存到服务器失败，已撤回`
        ),
      updateTaxRecord: (id, updates) => {
        const prev = get().taxRecords.find((r) => r.id === id);
        commit(
          () => set((state) => ({ taxRecords: state.taxRecords.map((r) => (r.id === id ? { ...r, ...updates } : r)) })),
          () => { if (prev) set((state) => ({ taxRecords: state.taxRecords.map((r) => (r.id === id ? prev : r)) })); },
          () => financeApi.taxRecords.update(id, updates),
          `税务记录「${prev?.recordNo || id}」修改未保存`
        );
      },
      deleteTaxRecord: (id) => {
        const prev = [...get().taxRecords];
        commit(
          () => set((state) => ({ taxRecords: state.taxRecords.filter((r) => r.id !== id) })),
          () => set({ taxRecords: prev }),
          () => financeApi.taxRecords.remove(id),
          '税务记录删除失败'
        );
      },

      // ProjectAccount CRUD
      addProjectAccount: (account) =>
        commit(
          () => set((state) => ({ projectAccounts: [...state.projectAccounts, account] })),
          () => set((state) => ({ projectAccounts: state.projectAccounts.filter((a) => a.id !== account.id) })),
          // 走专用端点：costItems 是嵌套数组，通用实体路由会静默丢弃
          () => financeApi.projectAccounts.create(account),
          `项目核算「${account.accountNo || account.id}」保存到服务器失败，已撤回`
        ),
      updateProjectAccount: (id, updates) => {
        const prev = get().projectAccounts.find((a) => a.id === id);
        commit(
          () => set((state) => ({ projectAccounts: state.projectAccounts.map((a) => (a.id === id ? { ...a, ...updates } : a)) })),
          () => { if (prev) set((state) => ({ projectAccounts: state.projectAccounts.map((a) => (a.id === id ? prev : a)) })); },
          () => financeApi.projectAccounts.update(id, updates),
          `项目核算「${prev?.accountNo || id}」修改未保存`
        );
      },
      deleteProjectAccount: (id) => {
        const prev = [...get().projectAccounts];
        commit(
          () => set((state) => ({ projectAccounts: state.projectAccounts.filter((a) => a.id !== id) })),
          () => set({ projectAccounts: prev }),
          () => financeApi.projectAccounts.remove(id),
          '项目核算删除失败'
        );
      },

      // Stats
      // 说明：financeStats 是**展示用的汇总数字**，全项目无人调用 setFinanceStats 更新它，
      // 界面上显示的应付总额/本月已付/逾期金额实际是 mock 里的固定值（已作为缺陷记录）。
      // 本轮保持内存态不改，避免数字突然跳变造成困惑；待后端聚合接口落地后再改为真算。
      setFinanceStats: (stats) => set({ financeStats: stats }),

      // ==================== C1：从 D1 拉取全部切片 ====================
      load: async () => {
        // #8：accountEntries 不再从旧表 fin_account_entries 拉取——真源改为 vouchers，
        //     在下面 loadVouchers() 之后按凭证派生（deriveEntries）。
        const [inv, plans, taxes, projects, coa, tcs] = await Promise.all([
          pullSlice<Invoice>(financeApi.invoices, mockInvoices, FLAG.invoices),
          pullSlice<PaymentPlan>(financeApi.paymentPlans, mockPaymentPlans, FLAG.paymentPlans),
          pullSlice<TaxRecord>(financeApi.taxRecords, mockTaxRecords, FLAG.taxRecords),
          pullSlice<ProjectAccount>(financeApi.projectAccounts, mockProjectAccounts, FLAG.projectAccounts),
          pullSlice<ChartAccount>(financeApi.chartOfAccounts, seedChartOfAccounts, FLAG.chartOfAccounts),
          pullSlice<TaxCode>(financeApi.taxCodes, seedTaxCodes, FLAG.taxCodes),
        ]);

        const patch: Partial<FinanceState> = {};
        // pullSlice 返回 null = 拉取失败 → 保留内存种子，不覆盖（避免把有内容的表刷成空）
        if (inv) patch.invoices = inv;
        if (plans) patch.paymentPlans = plans;
        if (taxes) patch.taxRecords = taxes;
        if (projects) patch.projectAccounts = projects;
        if (coa) patch.chartOfAccounts = coa;
        if (tcs) patch.taxCodes = tcs;

        const failed = [inv, plans, taxes, projects, coa, tcs].filter((x) => x === null).length;
        set({
          ...patch,
          loaded: true,
          syncError:
            failed === 6
              ? '无法从服务器读取财务数据：网络或登录状态异常（当前显示的是本机示例数据）'
              : failed > 0
                ? `财务数据部分切片读取失败（${failed}/6），未成功的已保留本机数据`
                : '',
        });

        // 凭证沿用既有 D1 通道；loadVouchers 内部会同步派生 accountEntries
        await get().loadVouchers();
      },
  };
});
