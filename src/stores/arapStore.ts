import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { Receivable, Payable, AgingBucket } from '@/types';

const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const today = () => new Date().toISOString().slice(0, 10);

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

const now = today();

// 种子数据：4 应收 + 4 应付
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
}

export const useArapStore = create<ArapState>()(
  persist(
    (set, get) => ({
      receivables: [...seedReceivables],
      payables: [...seedPayables],

      addReceivable: (r) => set((s) => ({ receivables: [...s.receivables, { ...r, agingBucket: computeAging(r.dueDate) }] })),
      updateReceivable: (id, u) =>
        set((s) => ({
          receivables: s.receivables.map((x) =>
            x.id === id
              ? { ...x, ...u, agingBucket: computeAging(u.dueDate ?? x.dueDate) }
              : x
          ),
        })),
      deleteReceivable: (id) => set((s) => ({ receivables: s.receivables.filter((x) => x.id !== id) })),

      addPayable: (p) => set((s) => ({ payables: [...s.payables, { ...p, agingBucket: computeAging(p.dueDate) }] })),
      updatePayable: (id, u) =>
        set((s) => ({
          payables: s.payables.map((x) =>
            x.id === id
              ? { ...x, ...u, agingBucket: computeAging(u.dueDate ?? x.dueDate) }
              : x
          ),
        })),
      deletePayable: (id) => set((s) => ({ payables: s.payables.filter((x) => x.id !== id) })),

      refreshAging: () =>
        set((s) => ({
          receivables: s.receivables.map((x) => ({ ...x, agingBucket: computeAging(x.dueDate) })),
          payables: s.payables.map((x) => ({ ...x, agingBucket: computeAging(x.dueDate) })),
        })),
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-arap',
      version: 1,
      partialize: (state) => ({
        receivables: state.receivables,
        payables: state.payables,
      }),
    }
  )
);
