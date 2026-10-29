import type { UseBoundStore, StoreApi } from 'zustand';
import { CashAccount, CashFlow } from '@/types/cashMgmt';
import { cashAccounts, cashFlows } from '@/mocks/data/cashMgmt';
import { createEntityStore } from './createEntityStore';

// 迁统一仓储工厂（V2）：双资源 cashAccount/cashFlow，云端数据库主源 + 模拟兜底 + 空库回填。
// 余额联动在本地乐观计算并写回账户 currentBalance（跨资源逻辑放 extend 钩子，复用工厂回滚）。
// 保留既有 accounts/flows/addAccount/addFlow… 接口，调用页面无需改动；回填标记沿用旧键。
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

export const useCashMgmtStore = createEntityStore<CashAccount>({
  resource: 'cashAccount',
  seed: [...cashAccounts],
  stateKey: 'accounts',
  extraResources: [{ resource: 'cashFlow', seed: [...cashFlows], stateKey: 'flows', pageSize: 500 }],
  backfillKey: 'ssa-erp-backfilled-cashMgmt',
  extend: (ctx) => ({
    addAccount: (a: CashAccount) => ctx.primary.add(a),
    updateAccount: (id: string, u: Partial<CashAccount>) => ctx.primary.update(id, u),
    deleteAccount: (id: string) => ctx.primary.remove(id),
    // 记一笔流水：本地乐观更新流水 + 联动账户余额，失败整体回滚
    addFlow: async (f: CashFlow) => {
      const snap = { accounts: [...ctx.get().accounts], flows: [...ctx.get().flows] };
      ctx.set((s: any) => {
        const delta = f.direction === 'in' ? f.amount : -f.amount;
        const accounts = s.accounts.map((a: CashAccount) =>
          a.id === f.accountId
            ? { ...a, currentBalance: Math.round((a.currentBalance + delta) * 100) / 100, updatedAt: new Date().toISOString() }
            : a
        );
        return { flows: [...s.flows, f], accounts };
      });
      try {
        await ctx.extras.flows.add(f);
        const acc = ctx.get().accounts.find((a: CashAccount) => a.id === f.accountId);
        if (acc) await ctx.primary.update(acc.id, { currentBalance: acc.currentBalance, updatedAt: acc.updatedAt });
      } catch {
        ctx.set(snap);
      }
    },
    updateFlow: (id: string, u: Partial<CashFlow>) => ctx.extras.flows.update(id, u),
    deleteFlow: (id: string) => ctx.extras.flows.remove(id),
  }),
}) as unknown as UseBoundStore<StoreApi<CashMgmtState>>;
