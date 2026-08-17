/**
 * 显示偏好 Store（P4-2 主题与显示中心）
 * 持久化到 localStorage（键：ssa-erp-display）。
 * 覆盖：明/暗主题、主题色、密度、字号、高对比。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';
export type PrimaryColor = 'blue' | 'green' | 'indigo';
export type Density = 'compact' | 'comfortable' | 'cozy';
export type FontSize = 'small' | 'medium' | 'large';

export interface DisplayPrefs {
  mode: ThemeMode;
  primary: PrimaryColor;
  density: Density;
  fontSize: FontSize;
  highContrast: boolean;
}

export const DEFAULT_DISPLAY_PREFS: DisplayPrefs = {
  mode: 'light',
  primary: 'blue',
  density: 'comfortable',
  fontSize: 'medium',
  highContrast: false,
};

export const PRIMARY_OPTIONS: { value: PrimaryColor; label: string; main: string }[] = [
  { value: 'blue', label: '经典蓝', main: '#3B82F6' },
  { value: 'green', label: '自然绿', main: '#10B981' },
  { value: 'indigo', label: '靛青紫', main: '#6366F1' },
];

export const DENSITY_OPTIONS: { value: Density; label: string; desc: string }[] = [
  { value: 'compact', label: '紧凑', desc: '信息密度最高，适合大屏多任务' },
  { value: 'comfortable', label: '适中', desc: '推荐默认，平衡可读与密度' },
  { value: 'cozy', label: '宽松', desc: '留白更多，长时间录入更舒适' },
];

export const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
];

interface DisplayState extends DisplayPrefs {
  setMode: (m: ThemeMode) => void;
  setPrimary: (p: PrimaryColor) => void;
  setDensity: (d: Density) => void;
  setFontSize: (f: FontSize) => void;
  setHighContrast: (b: boolean) => void;
  reset: () => void;
}

export const useDisplayStore = create<DisplayState>()(
  persist(
    (set) => ({
      ...DEFAULT_DISPLAY_PREFS,
      setMode: (mode) => set({ mode }),
      setPrimary: (primary) => set({ primary }),
      setDensity: (density) => set({ density }),
      setFontSize: (fontSize) => set({ fontSize }),
      setHighContrast: (highContrast) => set({ highContrast }),
      reset: () => set({ ...DEFAULT_DISPLAY_PREFS }),
    }),
    { name: 'ssa-erp-display', version: 1 }
  )
);
