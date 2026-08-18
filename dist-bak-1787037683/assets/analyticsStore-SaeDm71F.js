import { a as create, p as persist } from "./vendor-46QZWBd3.js";
import { l as backendStorage } from "./index-CcOZBoQL.js";
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
