import { a2 as create, a3 as persist } from "./vendor-C0Ken1ns.js";
import { l as backendStorage, p as customers } from "./index-hTLNcGoC.js";
const stamp = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
const useCustomerStore = create()(
  persist(
    (set) => ({
      customers: [...customers],
      filter: {},
      selectedCustomer: null,
      setCustomers: (customers2) => set({ customers: customers2 }),
      addCustomer: (customer) => set((state) => ({ customers: [customer, ...state.customers] })),
      updateCustomer: (id, patch) => set((state) => ({
        customers: state.customers.map(
          (c) => c.id === id ? { ...c, ...patch, updatedAt: stamp() } : c
        )
      })),
      deleteCustomer: (id) => set((state) => ({ customers: state.customers.filter((c) => c.id !== id) })),
      setFilter: (filter) => set({ filter }),
      resetFilter: () => set({ filter: {} }),
      setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),
      applyCreditDelta: (id, delta) => {
        let ok = false;
        set((state) => {
          const customers2 = state.customers.map((c) => {
            if (c.id !== id) return c;
            let next = (c.usedCredit ?? 0) + delta;
            if (next < 0) next = 0;
            if (delta > 0 && c.creditLimit != null && next > c.creditLimit) return c;
            ok = true;
            return { ...c, usedCredit: next };
          });
          return { customers: customers2 };
        });
        return ok;
      }
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-customer",
      version: 1,
      partialize: (state) => ({ customers: state.customers })
    }
  )
);
export {
  useCustomerStore as u
};
