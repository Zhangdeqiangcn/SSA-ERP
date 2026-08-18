import { a as create, p as persist } from "./vendor-DGU5TO-x.js";
import { l as backendStorage } from "./index-DeeqqmHA.js";
const today = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
function computeAging(dueDate, refDate) {
  const ref = /* @__PURE__ */ new Date();
  const due = new Date(dueDate);
  const diffDays = Math.floor((ref.getTime() - due.getTime()) / (1e3 * 60 * 60 * 24));
  if (diffDays <= 0) return "current";
  if (diffDays <= 30) return "1-30";
  if (diffDays <= 60) return "31-60";
  if (diffDays <= 90) return "61-90";
  return "90+";
}
today();
const seedReceivables = [
  {
    id: "ar-seed-1",
    customerId: "cust-001",
    customerName: "宝钢建筑科技",
    invoiceNo: "SI-2026-0701",
    amount: 18e4,
    paidAmount: 1e5,
    balance: 8e4,
    dueDate: "2026-07-31",
    agingBucket: computeAging("2026-07-31"),
    status: "partial",
    remarks: "30%预付款已收"
  },
  {
    id: "ar-seed-2",
    customerId: "cust-002",
    customerName: "华建集团",
    invoiceNo: "SI-2026-0715",
    amount: 24e4,
    paidAmount: 12e4,
    balance: 12e4,
    dueDate: "2026-07-15",
    agingBucket: computeAging("2026-07-15"),
    status: "partial"
  },
  {
    id: "ar-seed-3",
    customerId: "cust-003",
    customerName: "中钢设备",
    invoiceNo: "SI-2026-0605",
    amount: 32e4,
    paidAmount: 5e4,
    balance: 27e4,
    dueDate: "2026-06-05",
    agingBucket: computeAging("2026-06-05"),
    status: "partial"
  },
  {
    id: "ar-seed-4",
    customerId: "cust-004",
    customerName: "东方电机",
    invoiceNo: "SI-2026-0520",
    amount: 95e3,
    paidAmount: 0,
    balance: 95e3,
    dueDate: "2026-05-20",
    agingBucket: computeAging("2026-05-20"),
    status: "overdue",
    remarks: "已发催款函"
  }
];
const seedPayables = [
  {
    id: "ap-seed-1",
    vendorId: "vend-001",
    vendorName: "鞍钢股份",
    invoiceNo: "PI-2026-0801",
    amount: 42e4,
    paidAmount: 0,
    balance: 42e4,
    dueDate: "2026-09-30",
    agingBucket: computeAging("2026-09-30"),
    status: "open"
  },
  {
    id: "ap-seed-2",
    vendorId: "vend-002",
    vendorName: "马钢集团",
    invoiceNo: "PI-2026-0701",
    amount: 185e3,
    paidAmount: 8e4,
    balance: 105e3,
    dueDate: "2026-07-31",
    agingBucket: computeAging("2026-07-31"),
    status: "partial"
  },
  {
    id: "ap-seed-3",
    vendorId: "vend-003",
    vendorName: "首钢京唐",
    invoiceNo: "PI-2026-0725",
    amount: 29e4,
    paidAmount: 2e5,
    balance: 9e4,
    dueDate: "2026-08-31",
    agingBucket: computeAging("2026-08-31"),
    status: "partial"
  },
  {
    id: "ap-seed-4",
    vendorId: "vend-004",
    vendorName: "河钢邯钢",
    invoiceNo: "PI-2026-0601",
    amount: 13e4,
    paidAmount: 0,
    balance: 13e4,
    dueDate: "2026-06-01",
    agingBucket: computeAging("2026-06-01"),
    status: "overdue",
    remarks: "供应商已催款"
  }
];
const useArapStore = create()(
  persist(
    (set, get) => ({
      receivables: [...seedReceivables],
      payables: [...seedPayables],
      addReceivable: (r) => set((s) => ({ receivables: [...s.receivables, { ...r, agingBucket: computeAging(r.dueDate) }] })),
      updateReceivable: (id, u) => set((s) => ({
        receivables: s.receivables.map(
          (x) => x.id === id ? { ...x, ...u, agingBucket: computeAging(u.dueDate ?? x.dueDate) } : x
        )
      })),
      deleteReceivable: (id) => set((s) => ({ receivables: s.receivables.filter((x) => x.id !== id) })),
      addPayable: (p) => set((s) => ({ payables: [...s.payables, { ...p, agingBucket: computeAging(p.dueDate) }] })),
      updatePayable: (id, u) => set((s) => ({
        payables: s.payables.map(
          (x) => x.id === id ? { ...x, ...u, agingBucket: computeAging(u.dueDate ?? x.dueDate) } : x
        )
      })),
      deletePayable: (id) => set((s) => ({ payables: s.payables.filter((x) => x.id !== id) })),
      refreshAging: () => set((s) => ({
        receivables: s.receivables.map((x) => ({ ...x, agingBucket: computeAging(x.dueDate) })),
        payables: s.payables.map((x) => ({ ...x, agingBucket: computeAging(x.dueDate) }))
      }))
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-arap",
      version: 1,
      partialize: (state) => ({
        receivables: state.receivables,
        payables: state.payables
      })
    }
  )
);
export {
  useArapStore as u
};
