import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ScheduleLock } from '@/types/production';

const STORE_KEY = 'ssa-erp-scheduling';

export type SchedulingMode = 'forward' | 'backward';

export interface ConflictInfo {
  workCenter: string;
  date: string;
  orderIds: string[];
  loadPercent: number;
  suggestionMoveDays: number;
}

export interface RescheduleResult {
  timestamp: string;
  mode: SchedulingMode;
  resolvedCount: number;
  remainingConflicts: ConflictInfo[];
}

interface SchedulingState {
  locks: Record<string, ScheduleLock>;
  /** P1-20 排程模式偏好：正排(forward) / 倒排(backward) */
  schedulingMode: SchedulingMode;
  /** P1-20 最近一次重排结果 */
  lastRescheduleResult: RescheduleResult | null;
  toggleLock: (key: string) => void;
  setAnchor: (key: string, date: string) => void;
  clearAnchor: (key: string) => void;
  setSchedulingMode: (mode: SchedulingMode) => void;
  setRescheduleResult: (result: RescheduleResult) => void;
}

export const useProductionSchedulingStore = create<SchedulingState>()(
  persist(
    (set) => ({
      locks: {},
      schedulingMode: 'forward',
      lastRescheduleResult: null,

      toggleLock: (key) =>
        set((s) => {
          const existing = s.locks[key];
          const next: ScheduleLock = existing
            ? { ...existing, locked: !existing.locked }
            : { key, locked: true };
          return { locks: { ...s.locks, [key]: next } };
        }),
      setAnchor: (key, date) =>
        set((s) => {
          const existing = s.locks[key];
          const next: ScheduleLock = existing ? { ...existing, anchorDate: date } : { key, locked: false, anchorDate: date };
          return { locks: { ...s.locks, [key]: next } };
        }),
      clearAnchor: (key) =>
        set((s) => {
          const existing = s.locks[key];
          if (!existing) return s;
          const { anchorDate: _omit, ...rest } = existing;
          void _omit;
          return { locks: { ...s.locks, [key]: rest } };
        }),
      setSchedulingMode: (mode) => set({ schedulingMode: mode }),
      setRescheduleResult: (result) => set({ lastRescheduleResult: result }),
    }),
    {
      name: STORE_KEY,
      version: 2,
      partialize: (state) => ({
        locks: state.locks,
        schedulingMode: state.schedulingMode,
        lastRescheduleResult: state.lastRescheduleResult,
      }),
    },
  ),
);
