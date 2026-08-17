import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Customer } from '@/types';
import { customers as mockCustomers } from '@/mocks/data/customer';

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
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  setFilter: (filter: CustomerFilter) => void;
  resetFilter: () => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  /**
   * 信用额度占用变更（delta 可正可负）。
   * 超限额或产生负占用时拒绝变更并返回 false（硬管控的兜底）。
   */
  applyCreditDelta: (id: string, delta: number) => boolean;
}

const stamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set) => ({
      customers: [...mockCustomers],
      filter: {},
      selectedCustomer: null,
      setCustomers: (customers) => set({ customers }),
      addCustomer: (customer) => set((state) => ({ customers: [customer, ...state.customers] })),
      updateCustomer: (id, patch) =>
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: stamp() } : c
          ),
        })),
      deleteCustomer: (id) =>
        set((state) => ({ customers: state.customers.filter((c) => c.id !== id) })),
      setFilter: (filter) => set({ filter }),
      resetFilter: () => set({ filter: {} }),
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
    }),
    {
      name: 'ssa-erp-customer',
      version: 1,
      partialize: (state) => ({ customers: state.customers }),
    }
  )
);
