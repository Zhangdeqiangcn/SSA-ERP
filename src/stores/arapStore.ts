import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { api } from '@/services/api';
import { Receivable, Payable, AgingBucket } from '@/types';

/**
 * 应收/应付台账 store（V3.76.0 P1-1：Blob → D1 关系表）
 *
 * 迁移前：整状态 JSON 走 backendStorage（persist name 'ssa-erp-arap'）——
 *   服务端应收应付只到凭证科目层（arapPosting.ts 写 2202 应付 / 1122 应收），
 *   前台另有一份手工台账 Blob，两处对不上账（审计 P1-1「应收应付双源」）。
 * 迁移后：台账落 D1 关系表 fin_receivables / fin_payables（迁移 0100，
 *   entities.ts 注册 receivable / payable，rls.ts 组织共享 'all'），
 *   与凭证同库同 org，invoice_no 与凭证 source_no（INV-<invoice_no>）同键可对。
 *
 * 数据流：
 *   · 登录态：D1 为权威源；页面挂载时 hydrate（D1 非空即覆盖本地）；
 *   · 一次性回填：D1 两表皆空时，把旧 Blob 数据（本地 localStorage 优先、
 *     其次云端 /api/state/ssa-erp-arap）或种子写入 D1，之后纯 D1；
 *   · 未登录：本地种子兜底（离线可用，不发任何云端请求）；
 *   · CRUD：本地即时 + 登录态写穿 D1（失败不阻断界面，与家族范式一致）。
 * 旧 Blob 键 'ssa-erp-arap' 回填后原样保留不删（回滚安全垫，非破坏迁移）。
 */

/** 根据 dueDate 和 today 自动计算账龄桶 */
export function computeAging(dueDate: string, refDate?: string): AgingBucket {
  const ref = refDate ? new Date(refDate) : new Date();
  const due = new Date(dueDate);
  const diffDays = Math.floor((ref.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'current';
  if (diffDays <= 30) return '1-30';
  if (diffDays <= 60) return '31-60';
  if (diffDays <= 90) return '61-90';
  return '90+';
}

// 种子数据：4 应收 + 4 应付（与迁移前一致，仅作空库回填/未登录兜底）
const seedReceivables: Receivable[] = [
  {
    id: 'ar-seed-1', customerId: 'cust-001', customerName: '宝钢建筑科技',
    invoiceNo: 'SI-2026-0701', amount: 180000, paidAmount: 100000, balance: 80000,
    dueDate: '2026-07-31', agingBucket: computeAging('2026-07-31'),
    status: 'partial', remarks: '30%预付款已收',
  },
  {
    id: 'ar-seed-2', customerId: 'cust-002', customerName: '华建集团',
    invoiceNo: 'SI-2026-0715', amount: 240000, paidAmount: 120000, balance: 120000,
    dueDate: '2026-07-15', agingBucket: computeAging('2026-07-15'),
    status: 'partial',
  },
  {
    id: 'ar-seed-3', customerId: 'cust-003', customerName: '中钢设备',
    invoiceNo: 'SI-2026-0605', amount: 320000, paidAmount: 50000, balance: 270000,
    dueDate: '2026-06-05', agingBucket: computeAging('2026-06-05'),
    status: 'partial',
  },
  {
    id: 'ar-seed-4', customerId: 'cust-004', customerName: '东方电机',
    invoiceNo: 'SI-2026-0520', amount: 95000, paidAmount: 0, balance: 95000,
    dueDate: '2026-05-20', agingBucket: computeAging('2026-05-20'),
    status: 'overdue', remarks: '已发催款函',
  },
];

const seedPayables: Payable[] = [
  {
    id: 'ap-seed-1', vendorId: 'vend-001', vendorName: '鞍钢股份',
    invoiceNo: 'PI-2026-0801', amount: 420000, paidAmount: 0, balance: 420000,
    dueDate: '2026-09-30', agingBucket: computeAging('2026-09-30'),
    status: 'open',
  },
  {
    id: 'ap-seed-2', vendorId: 'vend-002', vendorName: '马钢集团',
    invoiceNo: 'PI-2026-0701', amount: 185000, paidAmount: 80000, balance: 105000,
    dueDate: '2026-07-31', agingBucket: computeAging('2026-07-31'),
    status: 'partial',
  },
  {
    id: 'ap-seed-3', vendorId: 'vend-003', vendorName: '首钢京唐',
    invoiceNo: 'PI-2026-0725', amount: 290000, paidAmount: 200000, balance: 90000,
    dueDate: '2026-08-31', agingBucket: computeAging('2026-08-31'),
    status: 'partial',
  },
  {
    id: 'ap-seed-4', vendorId: 'vend-004', vendorName: '河钢邯钢',
    invoiceNo: 'PI-2026-0601', amount: 130000, paidAmount: 0, balance: 130000,
    dueDate: '2026-06-01', agingBucket: computeAging('2026-06-01'),
    status: 'overdue', remarks: '供应商已催款',
  },
];

/** 旧 Blob 持久化键（zustand persist 格式 { state: { receivables, payables }, version }） */
const LEGACY_BLOB_KEY = 'ssa-erp-arap';

interface LegacyArap { receivables: Receivable[]; payables: Payable[] }

/** 读本地旧 Blob（迁移前 backendStorage 会在 localStorage 留镜像） */
function readLegacyLocal(): LegacyArap | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_BLOB_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const st = parsed?.state ?? parsed;
    if (Array.isArray(st?.receivables) || Array.isArray(st?.payables)) {
      return { receivables: st.receivables || [], payables: st.payables || [] };
    }
  } catch {
    /* 损坏的旧数据忽略，走种子 */
  }
  return null;
}

/** 读云端旧 Blob（换设备场景：本地无镜像时从 app_state 捞） */
async function readLegacyCloud(): Promise<LegacyArap | null> {
  try {
    const res = await readLegacyState(LEGACY_BLOB_KEY);
    const value = res?.value;
    if (typeof value !== 'string' || !value) return null;
    const parsed = JSON.parse(value);
    const st = parsed?.state ?? parsed;
    if (Array.isArray(st?.receivables) || Array.isArray(st?.payables)) {
      return { receivables: st.receivables || [], payables: st.payables || [] };
    }
  } catch {
    /* 云端无旧数据或网络异常：忽略 */
  }
  return null;
}

// 经统一 api 客户端读 /api/state/<key>（带登录令牌；401 由客户端统一处理）
async function readLegacyState(key: string): Promise<{ value?: string } | null> {
  return api.get<{ value?: string }>(`/state/${encodeURIComponent(key)}`);
}

interface ArapState {
  receivables: Receivable[];
  payables: Payable[];

  // 应收 CRUD
  addReceivable: (r: Receivable) => void;
  updateReceivable: (id: string, u: Partial<Receivable>) => void;
  deleteReceivable: (id: string) => void;

  // 应付 CRUD
  addPayable: (p: Payable) => void;
  updatePayable: (id: string, u: Partial<Payable>) => void;
  deletePayable: (id: string) => void;

  // 刷新所有账龄
  refreshAging: () => void;

  /** V3.76.0：从 D1 水合（页面挂载调用；D1 空且本地/云端有旧 Blob 数据时一次性回填） */
  hydrateArap: () => Promise<void>;
}

export const useArapStore = create<ArapState>()((set, get) => ({
  receivables: [...seedReceivables],
  payables: [...seedPayables],

  addReceivable: (r) => {
    const row = { ...r, agingBucket: computeAging(r.dueDate) };
    set((s) => ({ receivables: [...s.receivables, row] }));
    if (isAuthed()) void entityRepo.create('receivable', row as any).catch(() => {});
  },
  updateReceivable: (id, u) => {
    let updated: Receivable | undefined;
    set((s) => ({
      receivables: s.receivables.map((x) => {
        if (x.id !== id) return x;
        updated = { ...x, ...u, agingBucket: computeAging(u.dueDate ?? x.dueDate) };
        return updated;
      }),
    }));
    if (updated && isAuthed()) void entityRepo.update('receivable', id, updated as any).catch(() => {});
  },
  deleteReceivable: (id) => {
    set((s) => ({ receivables: s.receivables.filter((x) => x.id !== id) }));
    if (isAuthed()) void entityRepo.remove('receivable', id).catch(() => {});
  },

  addPayable: (p) => {
    const row = { ...p, agingBucket: computeAging(p.dueDate) };
    set((s) => ({ payables: [...s.payables, row] }));
    if (isAuthed()) void entityRepo.create('payable', row as any).catch(() => {});
  },
  updatePayable: (id, u) => {
    let updated: Payable | undefined;
    set((s) => ({
      payables: s.payables.map((x) => {
        if (x.id !== id) return x;
        updated = { ...x, ...u, agingBucket: computeAging(u.dueDate ?? x.dueDate) };
        return updated;
      }),
    }));
    if (updated && isAuthed()) void entityRepo.update('payable', id, updated as any).catch(() => {});
  },
  deletePayable: (id) => {
    set((s) => ({ payables: s.payables.filter((x) => x.id !== id) }));
    if (isAuthed()) void entityRepo.remove('payable', id).catch(() => {});
  },

  refreshAging: () =>
    set((s) => ({
      receivables: s.receivables.map((x) => ({ ...x, agingBucket: computeAging(x.dueDate) })),
      payables: s.payables.map((x) => ({ ...x, agingBucket: computeAging(x.dueDate) })),
    })),

  hydrateArap: async () => {
    if (!isAuthed()) return; // 未登录：本地种子兜底，不发云端请求
    try {
      const [arRes, apRes] = await Promise.all([
        entityRepo.list<Receivable>('receivable', { page: 1, pageSize: 500 }),
        entityRepo.list<Payable>('payable', { page: 1, pageSize: 500 }),
      ]);
      const arRows = arRes?.data || [];
      const apRows = apRes?.data || [];

      if (arRows.length === 0 && apRows.length === 0) {
        // ── 一次性回填：D1 空 → 旧 Blob（本地优先、云端兜底）或种子 ──
        const legacy = readLegacyLocal() || (await readLegacyCloud());
        const srcAr = legacy?.receivables?.length ? legacy.receivables : seedReceivables;
        const srcAp = legacy?.payables?.length ? legacy.payables : seedPayables;
        for (const r of srcAr) {
          try { await entityRepo.create('receivable', r as any); } catch { /* 冲突忽略 */ }
        }
        for (const p of srcAp) {
          try { await entityRepo.create('payable', p as any); } catch { /* 冲突忽略 */ }
        }
        const [ar2, ap2] = await Promise.all([
          entityRepo.list<Receivable>('receivable', { page: 1, pageSize: 500 }),
          entityRepo.list<Payable>('payable', { page: 1, pageSize: 500 }),
        ]);
        set({
          receivables: (ar2?.data || []).map(normalizeAr),
          payables: (ap2?.data || []).map(normalizeAp),
        });
        return;
      }

      // D1 有数据：以 D1 为准覆盖本地（账龄按当前日期重算，展示派生值）
      set({
        receivables: arRows.map(normalizeAr),
        payables: apRows.map(normalizeAp),
      });
    } catch {
      // 离线或后端异常：保留本地种子态，不阻断界面
    }
  },
}));

/** D1 行 → 前端类型（账龄是展示派生值，按当前日期重算而非信任库内旧桶） */
function normalizeAr(row: any): Receivable {
  const dueDate = row.dueDate || row.due_date || '';
  return { ...row, dueDate, agingBucket: computeAging(dueDate) } as Receivable;
}
function normalizeAp(row: any): Payable {
  const dueDate = row.dueDate || row.due_date || '';
  return { ...row, dueDate, agingBucket: computeAging(dueDate) } as Payable;
}
