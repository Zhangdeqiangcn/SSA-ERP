import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { CashAccount, CashFlow } from '@/types/cashMgmt';
import { cashAccounts, cashFlows } from '@/mocks/data/cashMgmt';

interface CashMgmtState {
  accounts: CashAccount[];
  flows: CashFlow[];
  addAccount: (a: CashAccount) => void;
  updateAccount: (id: string, u: Partial<CashAccount>) => void;
  deleteAccount: (id: string) => void;
  addFlow: (f: CashFlow) => void;
  updateFlow: (id: string, u: Partial<CashFlow>) => void;
  deleteFlow: (id: string) => void;
}

const addArr = <T,>(l: T[], i: T) => [...l, i];
const updateArr = <T extends { id: string }>(l: T[], id: string, u: Partial<T>) =>
  l.map((x) => (x.id === id ? { ...x, ...u } : x));
const deleteArr = <T extends { id: string }>(l: T[], id: string) => l.filter((x) => x.id !== id);

export const useCashMgmtStore = create<CashMgmtState>()(
  persist(
    (set) => ({
      accounts: [...cashAccounts],
      flows: [...cashFlows],

      addAccount: (a) => set((s) => ({ accounts: addArr(s.accounts, a) })),
      updateAccount: (id, u) => set((s) => ({ accounts: updateArr(s.accounts, id, u) })),
      deleteAccount: (id) => set((s) => ({ accounts: deleteArr(s.accounts, id) })),

      addFlow: (f) =>
        set((s) => {
          const delta = f.direction === 'in' ? f.amount : -f.amount;
          const accounts = s.accounts.map((a) =>
            a.id === f.accountId
              ? { ...a, currentBalance: Math.round((a.currentBalance + delta) * 100) / 100, updatedAt: new Date().toISOString() }
              : a
          );
          return { flows: addArr(s.flows, f), accounts };
        }),
      updateFlow: (id, u) => set((s) => ({ flows: updateArr(s.flows, id, u) })),
      deleteFlow: (id) => set((s) => ({ flows: deleteArr(s.flows, id) })),
    }),
    {
      storage: backendStorage,
      name: 'ssa-erp-cash-mgmt',
      version: 1,
      partialize: (s) => ({ accounts: s.accounts, flows: s.flows }),
    }
  )
);
