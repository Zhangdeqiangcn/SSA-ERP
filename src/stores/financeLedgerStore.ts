import { create } from 'zustand';
import { FixedAsset, ClosedPeriod, FixedAssetStatus, ClosingStatus } from '@/types/finance';
import { isAuthed } from '@/services/b2Api';
import { authHeaders } from '@/utils/authHeaders';

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

// ★ V3.17.1 #13 彻底服务端化：fixedAssets 不再存 KV / 不再内置种子，
//   初始为空，由 loadFixedAssets() 从 /api/fixed-assets 拉取（首次访问后端惰性回填 KV 存量）。



interface FinanceLedgerState {
  fixedAssets: FixedAsset[];
  closingPeriods: ClosedPeriod[];

  // ★ V3.17.1 服务端镜像：以下操作均异步打到 /api/fixed-assets
  loadFixedAssets: () => Promise<void>;
  addFixedAsset: (asset: FixedAsset) => Promise<void>;
  updateFixedAsset: (id: string, updates: Partial<FixedAsset>) => Promise<void>;
  deleteFixedAsset: (id: string) => Promise<void>;
  scrapFixedAsset: (id: string, scrapDate: string) => Promise<void>;
  // 计提全部在用资产本月折旧：调用服务端 /depreciate，返回合计折旧额与凭证号（服务端已生成凭证）
  deprecateAll: () => Promise<{ total: number; voucherNo: string | null; duplicated: boolean }>;

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

  // ★ V3.82.0 去双源：closingPeriods 不再是整块 blob 共享（根治多人 409），
  //   登录态从服务端 /api/finance/closing-periods 水合（权威结账态）+ 结账/反结账写穿。
  /** 从服务端水合结账状态（服务端 open/closed 态覆盖 12 期骨架；profit_closed 中间态保留本地） */
  loadClosingPeriods: () => Promise<void>;
}

/** V3.82.0 去双源 / V3.83.0 三态：结账写穿服务端（fire-and-forget，登录态；失败不阻断本地乐观更新）。
 *   支持 closed（最终结账）与 profit_closed（损益中间态，action=profit_close 跳过硬检查）。 */
function syncClosingToServer(period: string, patch: Partial<ClosedPeriod>): void {
  if (!isAuthed() || (patch.status !== 'closed' && patch.status !== 'profit_closed')) return;
  const action = patch.status === 'profit_closed' ? 'profit_close' : 'close';
  void fetch('/api/finance/closing-periods', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      period,
      action,
      profitVoucherNo: patch.profitVoucherNo,
      fxVoucherNo: patch.fxVoucherNo,
      // 本地已做损益/汇兑结转的完整性判断，服务端最终结账（closed）仍跑结账前检查；
      // 中间态 profit_closed 跳过硬检查。传 force 避免服务端检查把已本地结掉的期间打回。
      force: action === 'close',
    }),
  }).catch(() => { /* 离线/无权限：本地乐观态仍生效，服务端稍后或他端同步 */ });
}

function syncReopenToServer(period: string, operator: string, reason: string): void {
  if (!isAuthed()) return;
  void fetch('/api/finance/closing-periods', {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ period, reason: reason || `反结账（${operator}）` }),
  }).catch(() => { /* 离线/无 finance.delete 权限：本地已打回 open */ });
}

export const useFinanceLedgerStore = create<FinanceLedgerState>()(
  (set, get) => ({
      fixedAssets: [],
      closingPeriods: [...seedClosingPeriods],

      loadFixedAssets: async () => {
        try {
          const res = await fetch('/api/fixed-assets');
          if (res.ok) {
            const r = await res.json();
            set({ fixedAssets: Array.isArray(r.data) ? r.data : [] });
          }
        } catch {
          /* 离线/未登录：保留内存态，登录后再拉 */
        }
      },
      addFixedAsset: async (asset) => {
        try {
          const res = await fetch('/api/fixed-assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(asset),
          });
          if (res.ok) {
            const r = await res.json();
            const created = r.data;
            set((s) => ({ fixedAssets: [...s.fixedAssets.filter((a) => a.id !== created.id), created] }));
            return;
          }
        } catch {
          /* 落库失败：本地兜底，待同步 */
        }
        set((s) => ({ fixedAssets: [...s.fixedAssets, asset] }));
      },
      updateFixedAsset: async (id, updates) => {
        try {
          const res = await fetch('/api/fixed-assets', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates }),
          });
          if (res.ok) {
            const r = await res.json();
            set((s) => ({ fixedAssets: s.fixedAssets.map((a) => (a.id === id ? r.data : a)) }));
            return;
          }
        } catch {
          /* 落库失败：本地兜底 */
        }
        set((s) => ({ fixedAssets: s.fixedAssets.map((a) => (a.id === id ? { ...a, ...updates } : a)) }));
      },
      deleteFixedAsset: async (id) => {
        try {
          await fetch('/api/fixed-assets?id=' + encodeURIComponent(id), { method: 'DELETE' });
        } catch {
          /* 忽略网络错误，仍本地移除 */
        }
        set((s) => ({ fixedAssets: s.fixedAssets.filter((a) => a.id !== id) }));
      },
      scrapFixedAsset: async (id, scrapDate) => {
        const patch = {
          status: 'scrapped' as FixedAssetStatus,
          scrapDate,
          netValue: 0,
          updatedAt: new Date().toISOString(),
          updatedBy: '当前用户',
        };
        try {
          const res = await fetch('/api/fixed-assets', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...patch }),
          });
          if (res.ok) {
            const r = await res.json();
            set((s) => ({ fixedAssets: s.fixedAssets.map((a) => (a.id === id ? r.data : a)) }));
            return;
          }
        } catch {
          /* 落库失败：本地兜底 */
        }
        set((s) => ({ fixedAssets: s.fixedAssets.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
      },

      // ★ V3.17.1 服务端权威计提：调用 /api/fixed-assets/depreciate，
      //   服务端更新累计折旧并生成折旧凭证（借6602/贷1602），返回合计折旧额与凭证号。
      deprecateAll: async () => {
        try {
          const res = await fetch('/api/fixed-assets/depreciate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });
          if (res.ok) {
            const r = await res.json();
            const d = r.data || {};
            if (Array.isArray(d.assets)) set({ fixedAssets: d.assets });
            return { total: Number(d.total || 0), voucherNo: d.voucherNo || null, duplicated: !!d.duplicated };
          }
        } catch {
          /* 落库失败 */
        }
        return { total: 0, voucherNo: null, duplicated: false };
      },

      upsertClosing: (period, patch) => {
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
        });
        // V3.82.0 去双源：结账态写穿服务端（fire-and-forget），他端 loadClosingPeriods 可见
        const merged = get().closingPeriods.find((c) => c.period === period);
        if (merged) syncClosingToServer(period, merged);
      },
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
        // V3.82.0 去双源：反结账写穿服务端（fire-and-forget，需 finance.delete 权限）
        syncReopenToServer(period, operator, `由 ${operator} 反结账，解除凭证锁定`);
        return { ok: true, message: `期间 ${period} 已反结账，可继续记账` };
      },

      isPeriodClosed: (period) =>
        get().closingPeriods.find((c) => c.period === period)?.status === 'closed',

      ensureYearPeriods: (year) =>
        set((s) => ({ closingPeriods: mergeYearPeriods(s.closingPeriods, year) })),

      // V3.82.0：从服务端水合结账状态（权威 open/closed 态覆盖 12 期骨架）。
      // 未登录/离线静默兜底（保留 12 期骨架本地态）。
      loadClosingPeriods: async () => {
        if (!isAuthed()) return;
        try {
          const res = await fetch('/api/finance/closing-periods', {
            headers: authHeaders(),
          });
          if (!res.ok) return;
          const r = await res.json();
          const rows: any[] = Array.isArray(r?.data) ? r.data : [];
          if (!rows.length) return;
          // 服务端行（snake_case）映射为 ClosedPeriod，仅覆盖 12 期骨架里对应期间的状态
          const serverMap = new Map<string, Partial<ClosedPeriod>>();
          rows.forEach((row) => {
            if (!row?.period) return;
            serverMap.set(row.period, {
              status: (row.status || 'open') as ClosingStatus,
              closedBy: row.closed_by ?? undefined,
              closedAt: row.closed_at ?? undefined,
              profitVoucherNo: row.profit_voucher_no ?? undefined,
              fxVoucherNo: row.fx_voucher_no ?? undefined,
            });
          });
          set((s) => ({
            closingPeriods: s.closingPeriods.map((c) => {
              const sv = serverMap.get(c.period);
              return sv ? { ...c, ...sv } : c;
            }),
          }));
        } catch {
          /* 离线/异常：保留本地骨架态 */
        }
      },
    })
);

// V3.82.0：模块加载即自动水合结账状态（未登录/离线静默兜底）
void useFinanceLedgerStore.getState().loadClosingPeriods();
