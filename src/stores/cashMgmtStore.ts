import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { CashAccount, CashFlow } from '@/types/cashMgmt';
import { cashAccounts, cashFlows } from '@/mocks/data/cashMgmt';

// V2.80.0 W1：资金管理迁真实 D1（根治双通道）。
// 双资源 cashAccount/cashFlow 经 entityRepo 读写，移除原 persist(backendStorage) 本地存储 Blob。
// 余额联动在本地乐观计算 + 写回账户 currentBalance；离线/Mock 兜底 + 首次空库回填（与 S&OP 同策略）。
interface CashMgmtState {
  accounts: CashAccount[];
  flows: CashFlow[];
  loaded: boolean;
  load: () => Promise<void>;
  addAccount: (a: CashAccount) => Promise<void>;
  updateAccount: (id: string, u: Partial<CashAccount>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addFlow: (f: CashFlow) => Promise<void>;
  updateFlow: (id: string, u: Partial<CashFlow>) => Promise<void>;
  deleteFlow: (id: string) => Promise<void>;
}

const ACC = 'cashAccount';
const FLW = 'cashFlow';
const flagKey = 'ssa-erp-backfilled-cashMgmt';

export const useCashMgmtStore = create<CashMgmtState>()((set, get) => ({
  accounts: [...cashAccounts],
  flows: [...cashFlows],
  loaded: false,

  load: async () => {
    try {
      const [ra, rf] = await Promise.all([
        entityRepo.list<CashAccount>(ACC, { page: 1, pageSize: 200 }),
        entityRepo.list<CashFlow>(FLW, { page: 1, pageSize: 500 }),
      ]);
      const accounts = (ra?.data || []) as CashAccount[];
      const flows = (rf?.data || []) as CashFlow[];
      if (accounts.length === 0 && flows.length === 0 && !localStorage.getItem(flagKey)) {
        localStorage.setItem(flagKey, '1');
        for (const a of cashAccounts) { try { await entityRepo.create<CashAccount>(ACC, a); } catch { /* 尽力回填 */ } }
        for (const f of cashFlows) { try { await entityRepo.create<CashFlow>(FLW, f); } catch { /* 尽力回填 */ } }
        const [ra2, rf2] = await Promise.all([
          entityRepo.list<CashAccount>(ACC, { page: 1, pageSize: 200 }),
          entityRepo.list<CashFlow>(FLW, { page: 1, pageSize: 500 }),
        ]);
        set({ accounts: (ra2?.data || []) as CashAccount[], flows: (rf2?.data || []) as CashFlow[], loaded: true });
        return;
      }
      set({
        accounts: accounts.length ? accounts : [...cashAccounts],
        flows: flows.length ? flows : [...cashFlows],
        loaded: true,
      });
    } catch {
      set({ accounts: [...cashAccounts], flows: [...cashFlows], loaded: true });
    }
  },

  addAccount: async (a) => {
    set((s) => ({ accounts: [...s.accounts, a] }));
    try {
      const created = await entityRepo.create<CashAccount>(ACC, a);
      set((s) => ({ accounts: s.accounts.map((x) => (x.id === a.id ? (created as CashAccount) : x)) }));
    } catch { set((s) => ({ accounts: s.accounts.filter((x) => x.id !== a.id) })); }
  },
  updateAccount: async (id, u) => {
    const prev = get().accounts.find((x) => x.id === id);
    set((s) => ({ accounts: s.accounts.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    try { await entityRepo.update<CashAccount>(ACC, id, u); }
    catch { if (prev) set((s) => ({ accounts: s.accounts.map((x) => (x.id === id ? prev : x)) })); }
  },
  deleteAccount: async (id) => {
    const prev = [...get().accounts];
    set((s) => ({ accounts: s.accounts.filter((x) => x.id !== id) }));
    try { await entityRepo.remove(ACC, id); } catch { set({ accounts: prev }); }
  },

  addFlow: async (f) => {
    const snapAccounts = get().accounts;
    const snapFlows = get().flows;
    set((s) => {
      const delta = f.direction === 'in' ? f.amount : -f.amount;
      const accounts = s.accounts.map((a) =>
        a.id === f.accountId
          ? { ...a, currentBalance: Math.round((a.currentBalance + delta) * 100) / 100, updatedAt: new Date().toISOString() }
          : a
      );
      return { flows: [...s.flows, f], accounts };
    });
    try {
      await entityRepo.create<CashFlow>(FLW, f);
      const acc = get().accounts.find((a) => a.id === f.accountId);
      if (acc) await entityRepo.update<CashAccount>(ACC, acc.id, { currentBalance: acc.currentBalance, updatedAt: acc.updatedAt });
    } catch { set({ accounts: snapAccounts, flows: snapFlows }); }
  },
  updateFlow: async (id, u) => {
    const prev = get().flows.find((x) => x.id === id);
    set((s) => ({ flows: s.flows.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    try { await entityRepo.update<CashFlow>(FLW, id, u); }
    catch { if (prev) set((s) => ({ flows: s.flows.map((x) => (x.id === id ? prev : x)) })); }
  },
  deleteFlow: async (id) => {
    const prev = [...get().flows];
    set((s) => ({ flows: s.flows.filter((x) => x.id !== id) }));
    try { await entityRepo.remove(FLW, id); } catch { set({ flows: prev }); }
  },
}));
