import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { parsePayload, writeRow, withKind, splitByKind } from './entityBackedShared';
import type { ForecastSuggestion, OcrHistoryItem } from '@/types/analytics';

interface AnalyticsState {
  forecastSuggestions: ForecastSuggestion[];
  ocrHistory: OcrHistoryItem[];
  addForecastSuggestion: (s: ForecastSuggestion) => void;
  addOcrHistory: (item: OcrHistoryItem) => void;
  clearForecastSuggestions: () => void;
  clearOcrHistory: () => void;
}

const RES = 'analyticsShared';
const KIND_FORECAST = 'forecastSuggestion';
const KIND_OCR = 'ocrHistory';

/** 双切片写穿（__kind 标记，行主键 = 各对象 id） */
const pushForecast = (s: ForecastSuggestion) => isAuthed() && writeRow(RES, s.id, withKind(KIND_FORECAST, s));
const pushOcr = (i: OcrHistoryItem) => isAuthed() && writeRow(RES, i.id, withKind(KIND_OCR, i));

/** 清空某切片：本地清空 + 后台逐个删远端（clear 为低频操作，fire-and-forget 即可） */
function clearRemote(kind: string) {
  if (!isAuthed()) return;
  void entityRepo
    .list(RES, { page: 1, pageSize: 500 })
    .then((r) => {
      const rows = parsePayload<{ id?: string; __kind?: string }>(r?.data || []);
      rows
        .filter((row) => row?.__kind === kind)
        .forEach((row) => entityRepo.remove(RES, String(row.id)).catch(() => {}));
    })
    .catch(() => {});
}

export const useAnalyticsStore = create<AnalyticsState>()(
    (set) => ({
      forecastSuggestions: [],
      ocrHistory: [],
      // 注意：必须用 set(updater) 返回新数组，绝不能 setter([...list, item])（partial 合并会静默失效）
      addForecastSuggestion: (s) => {
        set((st) => ({ forecastSuggestions: [...st.forecastSuggestions, s] }));
        pushForecast(s);
      },
      addOcrHistory: (item) => {
        set((st) => ({ ocrHistory: [...st.ocrHistory, item] }));
        pushOcr(item);
      },
      clearForecastSuggestions: () => {
        set({ forecastSuggestions: [] });
        clearRemote(KIND_FORECAST);
      },
      clearOcrHistory: () => {
        set({ ocrHistory: [] });
        clearRemote(KIND_OCR);
      },
    }),
);

// ── V3.81.0 D1 同步层：双切片（forecastSuggestions + ocrHistory）挂载水合 ──
let hydrating = false;
async function hydrateAnalytics() {
  if (!isAuthed()) return;
  hydrating = true;
  try {
    const res = await entityRepo.list(RES, { page: 1, pageSize: 500 });
    const rows = parsePayload(res?.data || []);
    if (rows.length) {
      useAnalyticsStore.setState({
        forecastSuggestions: splitByKind<ForecastSuggestion>(rows, KIND_FORECAST),
        ocrHistory: splitByKind<OcrHistoryItem>(rows, KIND_OCR),
      });
    }
  } catch {
    /* 离线/异常：保留本地态 */
  } finally {
    hydrating = false;
  }
}

// 模块加载即自动水合（未登录/离线静默兜底）
void hydrateAnalytics();
