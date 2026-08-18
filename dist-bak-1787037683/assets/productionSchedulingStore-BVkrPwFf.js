import { a as create, p as persist } from "./vendor-46QZWBd3.js";
import { l as backendStorage } from "./index-CcOZBoQL.js";
const STORE_KEY = "ssa-erp-scheduling";
const useProductionSchedulingStore = create()(
  persist(
    (set) => ({
      locks: {},
      schedulingMode: "forward",
      lastRescheduleResult: null,
      toggleLock: (key) => set((s) => {
        const existing = s.locks[key];
        const next = existing ? { ...existing, locked: !existing.locked } : { key, locked: true };
        return { locks: { ...s.locks, [key]: next } };
      }),
      setAnchor: (key, date) => set((s) => {
        const existing = s.locks[key];
        const next = existing ? { ...existing, anchorDate: date } : { key, locked: false, anchorDate: date };
        return { locks: { ...s.locks, [key]: next } };
      }),
      clearAnchor: (key) => set((s) => {
        const existing = s.locks[key];
        if (!existing) return s;
        const { anchorDate: _omit, ...rest } = existing;
        return { locks: { ...s.locks, [key]: rest } };
      }),
      setSchedulingMode: (mode) => set({ schedulingMode: mode }),
      setRescheduleResult: (result) => set({ lastRescheduleResult: result })
    }),
    {
      storage: backendStorage,
      name: STORE_KEY,
      version: 2,
      partialize: (state) => ({
        locks: state.locks,
        schedulingMode: state.schedulingMode,
        lastRescheduleResult: state.lastRescheduleResult
      })
    }
  )
);
export {
  useProductionSchedulingStore as u
};
