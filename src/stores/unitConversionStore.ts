import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 单位换算规则单一数据源（全面 store 化 · V2.14）
 * ------------------------------------------------------------
 * 将多单位换算规则从 UnitConversionTab 的 localStorage `ssa-erp-unit-conversions`
 * 收敛到唯一 zustand persist store。首次启动从旧键迁移（若有用户自定义），
 * 否则播种默认 6 条规则。
 */

export interface UnitRule {
  id: string;
  fromUnit: string;
  toUnit: string;
  factor: number; // 1 fromUnit = factor toUnit
}

export const DEFAULT_UNIT_RULES: UnitRule[] = [
  { id: 'u1', fromUnit: '箱', toUnit: '个', factor: 12 },
  { id: 'u2', fromUnit: '吨', toUnit: '公斤', factor: 1000 },
  { id: 'u3', fromUnit: '米', toUnit: '厘米', factor: 100 },
  { id: 'u4', fromUnit: '千只', toUnit: '只', factor: 1000 },
  { id: 'u5', fromUnit: '卷', toUnit: '米', factor: 50 },
  { id: 'u6', fromUnit: '捆', toUnit: '根', factor: 20 },
];

const seedRules = (): UnitRule[] => {
  try {
    const raw = localStorage.getItem('ssa-erp-unit-conversions');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.removeItem('ssa-erp-unit-conversions');
        return parsed as UnitRule[];
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_UNIT_RULES.map((r) => ({ ...r }));
};

/** 纯函数：按规则换算（支持正/反向），无路径返回 null */
export function convertUnit(value: number, from: string, to: string, rules: UnitRule[]): number | null {
  if (from === to) return value;
  const direct = rules.find((r) => r.fromUnit === from && r.toUnit === to);
  if (direct) return value * direct.factor;
  const rev = rules.find((r) => r.fromUnit === to && r.toUnit === from);
  if (rev) return value / rev.factor;
  return null;
}

interface UnitConversionState {
  rules: UnitRule[];
  setRules: (rules: UnitRule[]) => void;
  addRule: (rule: Omit<UnitRule, 'id'>) => void;
  updateRule: (id: string, patch: Partial<Omit<UnitRule, 'id'>>) => void;
  removeRule: (id: string) => void;
  resetRules: () => void;
}

export const useUnitConversionStore = create<UnitConversionState>()(
  persist(
    (set) => ({
      rules: seedRules(),
      setRules: (rules) => set({ rules }),
      addRule: (rule) =>
        set((state) => ({ rules: [...state.rules, { ...rule, id: `u-${Date.now()}` }] })),
      updateRule: (id, patch) =>
        set((state) => ({
          rules: state.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      removeRule: (id) => set((state) => ({ rules: state.rules.filter((r) => r.id !== id) })),
      resetRules: () => set({ rules: DEFAULT_UNIT_RULES.map((r) => ({ ...r })) }),
    }),
    { name: 'ssa-erp-unit-conversions', version: 1 }
  )
);
