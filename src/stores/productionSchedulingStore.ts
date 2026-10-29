import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { entityRepo } from '@/services/entityRepo';
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
  /** V3.66.0 P1-1：启动时从 D1 scheduling_locks 水合（主源 = D1，多用户排产共享；本地 Blob 降为离线兜底） */
  hydrateLocks: () => Promise<void>;
}

// ── V3.66.0 P1-1：排程锁 D1 化（每把锁一行，lock_key = `${workOrderId}:${operationId}` 自然键）──
const packLockRow = (l: ScheduleLock) => ({ id: l.key, lockKey: l.key, locked: l.locked ? 1 : 0, anchorDate: l.anchorDate });
const unpackLockRow = (r: any): ScheduleLock => ({ key: r.lockKey || r.id, locked: !!r.locked, anchorDate: r.anchorDate || undefined });

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
          // V3.66.0 P1-1：排程锁同步 D1（多用户共享；upsert 幂等）
          entityRepo.update('schedulingLock', key, packLockRow(next)).catch(() => {});
          return { locks: { ...s.locks, [key]: next } };
        }),
      setAnchor: (key, date) =>
        set((s) => {
          const existing = s.locks[key];
          const next: ScheduleLock = existing ? { ...existing, anchorDate: date } : { key, locked: false, anchorDate: date };
          entityRepo.update('schedulingLock', key, packLockRow(next)).catch(() => {});
          return { locks: { ...s.locks, [key]: next } };
        }),
      clearAnchor: (key) =>
        set((s) => {
          const existing = s.locks[key];
          if (!existing) return s;
          const { anchorDate: _omit, ...rest } = existing;
          void _omit;
          entityRepo.update('schedulingLock', key, { ...packLockRow(rest), anchorDate: null }).catch(() => {});
          return { locks: { ...s.locks, [key]: rest } };
        }),
      setSchedulingMode: (mode) => set({ schedulingMode: mode }),
      setRescheduleResult: (result) => set({ lastRescheduleResult: result }),

      // V3.66.0 P1-1：排程锁水合（D1 主源；空库回填本地 lock，之后 CRUD 经 D1 同步）
      hydrateLocks: async () => {
        try {
          const res = await entityRepo.list<any>('schedulingLock', { page: 1, pageSize: 500 });
          const rows: any[] = res?.data || [];
          if (rows.length === 0) {
            const local = useProductionSchedulingStore.getState().locks;
            for (const key of Object.keys(local)) {
              try { await entityRepo.create('schedulingLock', packLockRow(local[key]) as any); } catch { /* 冲突忽略 */ }
            }
            const refreshed = await entityRepo.list<any>('schedulingLock', { page: 1, pageSize: 500 });
            const r2: any[] = refreshed?.data || [];
            if (r2.length) set({ locks: Object.fromEntries(r2.map((r) => { const l = unpackLockRow(r); return [l.key, l]; })) });
            return;
          }
          set({ locks: Object.fromEntries(rows.map((r) => { const l = unpackLockRow(r); return [l.key, l]; })) });
        } catch {
          /* 离线/异常：保留本地 Blob 副本（persist 水合结果），不阻断 */
        }
      },
    }),
    { storage: backendStorage,

      name: STORE_KEY,
      version: 3,
      partialize: (state) => ({
        locks: state.locks,
        schedulingMode: state.schedulingMode,
        lastRescheduleResult: state.lastRescheduleResult,
      }),
    },
  ),
);

// ── V3.66.0 P1-1：启动水合排程锁（D1 主源，与 qualityStore 同款顶层触发）──
void useProductionSchedulingStore.getState().hydrateLocks();
