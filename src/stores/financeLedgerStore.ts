import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FixedAsset, ClosedPeriod, FixedAssetStatus, ClosingStatus } from '@/types/finance';

// ===== A6 会计期间主数据 =====
// 对标 SAP OB52 / 金蝶「会计期间」：系统预置整年 12 个会计期间作为主数据，
// 期间是凭证记账的合法性边界（已结账期间禁止任何凭证增删改）。
export const FISCAL_YEAR = 2026;

/** 生成某会计年度的 12 个会计期间（默认全部为未结账 open） */
export function buildYearPeriods(year: number): ClosedPeriod[] {
  const stamp = `${year}-01-01T00:00:00Z`;
  return Array.from({ length: 12 }, (_, i) => {
    const period = `${year}-${String(i + 1).padStart(2, '0')}`;
    return {
      id: `cl-${period}`,
      period,
      status: 'open' as ClosingStatus,
      createdAt: stamp,
      updatedAt: stamp,
      createdBy: 'system',
      updatedBy: 'system',
    } as ClosedPeriod;
  });
}

const seedClosingPeriods: ClosedPeriod[] = buildYearPeriods(FISCAL_YEAR);

/** 合并已有期间与整年期间清单（已有的优先保留，缺的补齐，按期间升序） */
function mergeYearPeriods(existing: ClosedPeriod[], year: number): ClosedPeriod[] {
  const map = new Map<string, ClosedPeriod>();
  buildYearPeriods(year).forEach((p) => map.set(p.period, p));
  existing.forEach((c) => {
    if (c && c.period) map.set(c.period, c);
  });
  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
}

const seedFixedAssets: FixedAsset[] = [
  {
    id: 'fa-001', assetCode: 'FA-2024-001', assetName: '数控激光切割机', category: '生产设备',
    originalValue: 500000, residualRate: 0.05, usefulLifeMonths: 120, startDate: '2024-01-01',
    monthlyDepreciation: Number((500000 * (1 - 0.05) / 120).toFixed(2)),
    accumulatedDepreciation: 95000, netValue: 405000, status: 'in_use',
    createdAt: '2024-01-01T09:00:00Z', updatedAt: '2024-06-30T18:00:00Z', createdBy: '王会计', updatedBy: '王会计',
  },
  {
    id: 'fa-002', assetCode: 'FA-2024-002', assetName: '总装厂房', category: '房屋及建筑物',
    originalValue: 3000000, residualRate: 0.05, usefulLifeMonths: 600, startDate: '2024-01-01',
    monthlyDepreciation: Number((3000000 * (1 - 0.05) / 600).toFixed(2)),
    accumulatedDepreciation: 114000, netValue: 2886000, status: 'in_use',
    createdAt: '2024-01-01T09:00:00Z', updatedAt: '2024-06-30T18:00:00Z', createdBy: '王会计', updatedBy: '王会计',
  },
  {
    id: 'fa-003', assetCode: 'FA-2023-018', assetName: '旧式电焊机', category: '生产设备',
    originalValue: 80000, residualRate: 0.03, usefulLifeMonths: 96, startDate: '2023-03-01',
    monthlyDepreciation: Number((80000 * (1 - 0.03) / 96).toFixed(2)),
    accumulatedDepreciation: 76000, netValue: 4000, status: 'scrapped', scrapDate: '2025-12-20',
    createdAt: '2023-03-01T09:00:00Z', updatedAt: '2025-12-20T10:00:00Z', createdBy: '王会计', updatedBy: '王会计',
  },
];

interface FinanceLedgerState {
  fixedAssets: FixedAsset[];
  closingPeriods: ClosedPeriod[];

  addFixedAsset: (asset: FixedAsset) => void;
  updateFixedAsset: (id: string, updates: Partial<FixedAsset>) => void;
  deleteFixedAsset: (id: string) => void;
  scrapFixedAsset: (id: string, scrapDate: string) => void;
  // 计提全部在用资产本月折旧，返回合计折旧额（供页面写凭证）
  deprecateAll: () => number;

  // 期末结账期间状态维护
  upsertClosing: (period: string, patch: Partial<ClosedPeriod>) => void;
  getClosing: (period: string) => ClosedPeriod | undefined;

  // ===== A6 会计期间主数据 =====
  /** 反结账：把已结账/已损益结转的期间打回 open，并清空结账痕迹 */
  openPeriod: (period: string, operator?: string) => { ok: boolean; message: string };
  /** 期间是否已结账（凭证写入硬管控依据） */
  isPeriodClosed: (period: string) => boolean;
  /** 补齐某会计年度的 12 个期间（幂等） */
  ensureYearPeriods: (year: number) => void;
}

export const useFinanceLedgerStore = create<FinanceLedgerState>()(
  persist(
    (set, get) => ({
      fixedAssets: [...seedFixedAssets],
      closingPeriods: [...seedClosingPeriods],

      addFixedAsset: (asset) => set((s) => ({ fixedAssets: [...s.fixedAssets, asset] })),
      updateFixedAsset: (id, updates) =>
        set((s) => ({
          fixedAssets: s.fixedAssets.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),
      deleteFixedAsset: (id) =>
        set((s) => ({ fixedAssets: s.fixedAssets.filter((a) => a.id !== id) })),
      scrapFixedAsset: (id, scrapDate) =>
        set((s) => ({
          fixedAssets: s.fixedAssets.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: 'scrapped' as FixedAssetStatus,
                  scrapDate,
                  netValue: 0,
                  updatedAt: new Date().toISOString(),
                  updatedBy: '当前用户',
                }
              : a
          ),
        })),

      deprecateAll: () => {
        let total = 0;
        const next = get().fixedAssets.map((a) => {
          if (a.status !== 'in_use') return a;
          const dep = a.monthlyDepreciation;
          total += dep;
          const accumulated = a.accumulatedDepreciation + dep;
          const net = Math.max(0, a.originalValue - accumulated);
          return { ...a, accumulatedDepreciation: accumulated, netValue: net, updatedAt: new Date().toISOString() };
        });
        set({ fixedAssets: next });
        return Number(total.toFixed(2));
      },

      upsertClosing: (period, patch) =>
        set((s) => {
          const idx = s.closingPeriods.findIndex((c) => c.period === period);
          if (idx >= 0) {
            const list = [...s.closingPeriods];
            list[idx] = { ...list[idx], ...patch };
            return { closingPeriods: list };
          }
          const created: ClosedPeriod = {
            id: `cl-${period}-${Date.now()}`,
            period,
            status: patch.status ?? 'open',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: '当前用户',
            updatedBy: '当前用户',
            ...patch,
          };
          return {
            closingPeriods: [...s.closingPeriods, created].sort((a, b) =>
              a.period.localeCompare(b.period)
            ),
          };
        }),
      getClosing: (period) => get().closingPeriods.find((c) => c.period === period),

      // ===== A6 会计期间主数据 =====
      openPeriod: (period, operator = '当前用户') => {
        const target = get().closingPeriods.find((c) => c.period === period);
        if (!target) return { ok: false, message: `期间 ${period} 不存在于会计日历` };
        if (target.status === 'open') return { ok: false, message: `期间 ${period} 当前已是未结账状态` };
        set((s) => ({
          closingPeriods: s.closingPeriods.map((c) =>
            c.period === period
              ? {
                  ...c,
                  status: 'open' as ClosingStatus,
                  closedBy: undefined,
                  closedAt: undefined,
                  profitVoucherNo: undefined,
                  fxVoucherNo: undefined,
                  updatedAt: new Date().toISOString(),
                  updatedBy: operator,
                }
              : c
          ),
        }));
        return { ok: true, message: `期间 ${period} 已反结账，可继续记账` };
      },

      isPeriodClosed: (period) =>
        get().closingPeriods.find((c) => c.period === period)?.status === 'closed',

      ensureYearPeriods: (year) =>
        set((s) => ({ closingPeriods: mergeYearPeriods(s.closingPeriods, year) })),
    }),
    {
      name: 'ssa-erp-finance-ledger',
      version: 2,
      partialize: (state) => ({
        fixedAssets: state.fixedAssets,
        closingPeriods: state.closingPeriods,
      }),
      // v1 -> v2：旧版本 closingPeriods 为空数组（用时才创建），
      // A6 起改为整年 12 期主数据预置，迁移时补齐缺失期间、保留已有结账状态。
      migrate: (persisted: any, version: number) => {
        if (!persisted) return persisted;
        if (version < 2) {
          const existing: ClosedPeriod[] = Array.isArray(persisted.closingPeriods)
            ? persisted.closingPeriods
            : [];
          persisted.closingPeriods = mergeYearPeriods(existing, FISCAL_YEAR);
        }
        return persisted;
      },
    }
  )
);
