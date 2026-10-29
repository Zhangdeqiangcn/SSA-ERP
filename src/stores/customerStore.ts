import { useGlobalToastStore } from '@/stores/globalToastStore';
import { createEntityStore } from './createEntityStore';
import { Customer } from '@/types';
import { customers as mockCustomers } from '@/mocks/data/customer';
import { customerApi } from '@/services/customer';

// V2.74.5：客户主数据改为直连 D1 customers（与开放网关 /api/open/customers 同源）。
// 移除原 backendStorage(app_state Blob) 持久化——app_state 不再是客户来源，消除双数据源。
// 在线时：loadCustomers 从 /api/customers 拉取，增删改经 customerApi 写回 customers。
// 离线/未登录/接口异常：回退内存中的 mockCustomers，保证页面可用（不阻塞业务）。
// V3.90.0：以上 CRUD 骨架（乐观更新+失败回滚+离线兜底+空库回填）统一收敛到通用工厂
//   createEntityStore 的「可插拔后端」能力（backend=customerApi 适配层），本文件仅保留
//   领域接口名（loadCustomers/addCustomer/...）与领域方法（applyCreditDelta），调用方零改动。

const BACKFILL_FLAG = 'ssa-erp-customer-backfilled';

function readLegacyCustomers(): Customer[] {
  try {
    const raw = window.localStorage.getItem('ssa-erp-customer');
    if (raw) {
      const parsed = JSON.parse(raw);
      const st = parsed?.state;
      if (st?.customers && Array.isArray(st.customers) && st.customers.length) return st.customers as Customer[];
    }
  } catch {
    /* ignore */
  }
  return [];
}

interface CustomerFilter {
  name?: string;
  type?: string;
  status?: string;
  creditLevel?: string;
}

interface CustomerState {
  customers: Customer[];
  filter: CustomerFilter;
  selectedCustomer: Customer | null;
  setCustomers: (customers: Customer[]) => void;
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (id: string, patch: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  setFilter: (filter: CustomerFilter) => void;
  resetFilter: () => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  /**
   * 信用额度占用变更（delta 可正可负）。
   * 超限额或产生负占用时拒绝变更并返回 false（硬管控的兜底）。
   */
  applyCreditDelta: (id: string, delta: number) => boolean;
  /** 从 D1 customers 拉取（在线）。失败回退内存 mockCustomers。首次空库做一次 legacy 回填。 */
  loadCustomers: () => Promise<void>;
}

const initialFilter: CustomerFilter = {};

export const useCustomerStore = createEntityStore<Customer>({
  resource: 'customer',
  seed: [...mockCustomers],
  stateKey: 'customers',
  backfillKey: BACKFILL_FLAG,
  // 可插拔后端：客户域专用接口，隔离于工厂的通用数据访问服务
  backend: {
    list: () => customerApi.getCustomers({ page: 1, pageSize: 200 }).then((r) => (r?.data || []) as Customer[]),
    create: (item) => customerApi.createCustomer(item as any),
    update: (id, patch) => customerApi.updateCustomer(id, patch as any),
    remove: (id) => customerApi.deleteCustomer(id),
    // 首次空库回填：优先用旧 app_state 的真实客户，其次用模拟种子（等价原 loadCustomers 逻辑）
    seed: (items) => {
      const legacy = readLegacyCustomers();
      const source = legacy.length ? legacy : items;
      return Promise.all(source.map((i) => customerApi.createCustomer(i as any).catch(() => {})));
    },
  },
  // 保留原 store 的中文告警行为（add 失败静默，与原实现一致）
  onError: (op) => {
    if (op === 'update') useGlobalToastStore.getState().showError('客户更新失败，已回滚本地数据');
    else if (op === 'remove') useGlobalToastStore.getState().showError('客户删除失败，已回滚本地数据');
  },
  // 领域接口与领域方法：委托给工厂内部 ops，保持调用方零改动
  extend: (ctx) => ({
    filter: initialFilter,
    selectedCustomer: null,
    setCustomers: (customers: any) => ctx.set({ customers }),
    setFilter: (filter: any) => ctx.set({ filter }),
    resetFilter: () => ctx.set({ filter: initialFilter }),
    setSelectedCustomer: (customer: any) => ctx.set({ selectedCustomer: customer }),
    loadCustomers: () => ctx.get().load(),
    addCustomer: (customer: Customer) => ctx.primary.add(customer),
    updateCustomer: (id: any, patch: any) => ctx.primary.update(id, patch),
    deleteCustomer: (id: any) => ctx.primary.remove(id),
    // 信用额度占用变更（本地乐观计算，不写后端）
    applyCreditDelta: (id: any, delta: any) => {
      let ok = false;
      ctx.set((state: any) => {
        const customers = state.customers.map((c: Customer) => {
          if (c.id !== id) return c;
          let next = (c.usedCredit ?? 0) + delta;
          // 释放超过已占用时归零而非拒绝，避免历史脏数据导致额度永久锁死
          if (next < 0) next = 0;
          if (delta > 0 && c.creditLimit != null && next > c.creditLimit) return c; // 超限额拒绝占用
          ok = true;
          return { ...c, usedCredit: next };
        });
        return { customers };
      });
      return ok;
    },
  }),
});
