import { a2 as create, a3 as persist } from "./vendor-C0Ken1ns.js";
import { l as backendStorage } from "./index-hTLNcGoC.js";
const useAnalyticsStore = create()(
  persist(
    (set) => ({
      forecastSuggestions: [],
      ocrHistory: [],
      // 注意：必须用 set(updater) 返回新数组，绝不能 setter([...list, item])（partial 合并会静默失效）
      addForecastSuggestion: (s) => set((st) => ({ forecastSuggestions: [...st.forecastSuggestions, s] })),
      addOcrHistory: (item) => set((st) => ({ ocrHistory: [...st.ocrHistory, item] })),
      clearForecastSuggestions: () => set({ forecastSuggestions: [] }),
      clearOcrHistory: () => set({ ocrHistory: [] })
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-analytics"
    }
  )
);
export {
  useAnalyticsStore as u
};
