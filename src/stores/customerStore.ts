import { create } from 'zustand';
import { Customer } from '@/types';
import { customers as mockCustomers } from '@/mocks/data/customer';
import { customerApi } from '@/services/customer';

// V2.74.5：客户主数据改为直连 D1 customers（与开放网关 /api/open/customers 同源）。
// 移除原 backendStorage(app_state Blob) 持久化——app_state 不再是客户来源，消除双数据源。
// 在线时：loadCustomers 从 /api/customers 拉取，增删改经 customerApi 写回 customers。
// 离线/未登录/接口异常：回退内存中的 mockCustomers，保证页面可用（不阻塞业务）。

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

const stamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

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
  /** V2.74.5：从 D1 customers 拉取（在线）。失败回退内存 mockCustomers。首次空库做一次 legacy 回填。 */
  loadCustomers: () => Promise<void>;
}

const initialFilter: CustomerFilter = {};

export const useCustomerStore = create<CustomerState>()((set, get) => ({
  // 启动时先用 Mock 数据保证首屏可用；登录后 loadCustomers 会用 D1 数据覆盖
  customers: [...mockCustomers],
  filter: initialFilter,
  selectedCustomer: null,

  setCustomers: (customers) => set({ customers }),

  loadCustomers: async () => {
    try {
      const res = await customerApi.getCustomers({ page: 1, pageSize: 200 });
      const list = (res?.data || []) as Customer[];
      set({ customers: list });
      // 首次空库：从 legacy app_state / mockCustomers 回填一次，消除双源过渡缺口
      if (list.length === 0 && !window.localStorage.getItem(BACKFILL_FLAG)) {
        window.localStorage.setItem(BACKFILL_FLAG, '1');
        const legacy = readLegacyCustomers();
        const seed = legacy.length ? legacy : [...mockCustomers];
        for (const c of seed) {
          try {
            await customerApi.createCustomer({
              code: c.code, name: c.name, shortName: c.shortName, type: c.type, status: c.status,
              creditLevel: c.creditLevel, creditLimit: c.creditLimit, usedCredit: c.usedCredit, settlementTermDays: c.settlementTermDays,
              taxId: c.taxId, invoiceTitle: c.invoiceTitle, invoiceAddress: c.invoiceAddress, invoicePhone: c.invoicePhone,
              bankName: c.bankName, bankAccount: c.bankAccount, bankAccountName: c.bankAccountName,
              contactName: c.contactName, contactPhone: c.contactPhone, contactEmail: c.contactEmail, address: c.address,
              defaultCurrency: c.defaultCurrency, defaultTaxRate: c.defaultTaxRate, salesOrg: c.salesOrg,
              reconciliationAccount: c.reconciliationAccount, taxCode: c.taxCode, remarks: c.remarks,
            });
          } catch {
            /* 编码冲突等忽略，回填尽力而为 */
          }
        }
        // 回填后重新拉取，保证内存与 D1 一致
        const refreshed = await customerApi.getCustomers({ page: 1, pageSize: 200 });
        set({ customers: (refreshed?.data || []) as Customer[] });
      }
    } catch {
      // 离线/未登录/接口异常：保持内存 mockCustomers，不阻断 UI
    }
  },

  addCustomer: async (customer) => {
    // 乐观更新：先入内存，再写 D1
    set((state) => ({ customers: [customer, ...state.customers] }));
    try {
      const created = await customerApi.createCustomer({
        code: customer.code, name: customer.name, shortName: customer.shortName, type: customer.type, status: customer.status,
        creditLevel: customer.creditLevel, creditLimit: customer.creditLimit, usedCredit: customer.usedCredit, settlementTermDays: customer.settlementTermDays,
        taxId: customer.taxId, invoiceTitle: customer.invoiceTitle, invoiceAddress: customer.invoiceAddress, invoicePhone: customer.invoicePhone,
        bankName: customer.bankName, bankAccount: customer.bankAccount, bankAccountName: customer.bankAccountName,
        contactName: customer.contactName, contactPhone: customer.contactPhone, contactEmail: customer.contactEmail, address: customer.address,
        defaultCurrency: customer.defaultCurrency, defaultTaxRate: customer.defaultTaxRate, salesOrg: customer.salesOrg,
        reconciliationAccount: customer.reconciliationAccount, taxCode: customer.taxCode, remarks: customer.remarks,
      });
      if (created?.id && created.id !== customer.id) {
        set((state) => ({ customers: state.customers.map((c) => (c.id === customer.id ? { ...c, id: created.id } : c)) }));
      }
    } catch {
      /* 写失败：保留内存态（离线容忍） */
    }
  },

  updateCustomer: async (id, patch) => {
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === id ? { ...c, ...patch, updatedAt: stamp() } : c
      ),
    }));
    try {
      await customerApi.updateCustomer(id, patch);
    } catch {
      /* 写失败：保留内存态 */
    }
  },

  deleteCustomer: async (id) => {
    set((state) => ({
      customers: state.customers.filter((c) => c.id !== id),
    }));
    try {
      await customerApi.deleteCustomer(id);
    } catch {
      /* 写失败：保留内存态 */
    }
  },

  setFilter: (filter) => set({ filter }),
  resetFilter: () => set({ filter: initialFilter }),
  setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),

  applyCreditDelta: (id, delta) => {
    let ok = false;
    set((state) => {
      const customers = state.customers.map((c) => {
        if (c.id !== id) return c;
        let next = (c.usedCredit ?? 0) + delta;
        // B1 修正：释放超过已占用时归零而非拒绝，避免历史脏数据导致额度永久锁死
        if (next < 0) next = 0;
        if (delta > 0 && c.creditLimit != null && next > c.creditLimit) return c; // 超限额拒绝占用
        ok = true;
        return { ...c, usedCredit: next };
      });
      return { customers };
    });
    return ok;
  },
}));
