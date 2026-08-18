import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import type { ForecastSuggestion, OcrHistoryItem } from '@/types/analytics';

interface AnalyticsState {
  forecastSuggestions: ForecastSuggestion[];
  ocrHistory: OcrHistoryItem[];
  addForecastSuggestion: (s: ForecastSuggestion) => void;
  addOcrHistory: (item: OcrHistoryItem) => void;
  clearForecastSuggestions: () => void;
  clearOcrHistory: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set) => ({
      forecastSuggestions: [],
      ocrHistory: [],
      // 注意：必须用 set(updater) 返回新数组，绝不能 setter([...list, item])（partial 合并会静默失效）
      addForecastSuggestion: (s) =>
        set((st) => ({ forecastSuggestions: [...st.forecastSuggestions, s] })),
      addOcrHistory: (item) => set((st) => ({ ocrHistory: [...st.ocrHistory, item] })),
      clearForecastSuggestions: () => set({ forecastSuggestions: [] }),
      clearOcrHistory: () => set({ ocrHistory: [] }),
    }),
    { storage: backendStorage,
     name: 'ssa-erp-analytics' }
  )
);
