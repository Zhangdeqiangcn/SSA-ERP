import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { ProductionLine, RepetitiveMfgPeriod } from '@/types/repetitiveMfg';
import { productionLines, repetitivePeriods } from '@/mocks/data/repetitiveMfg';

// V2.80.0 W1：重复制造迁真实 D1（根治双通道）。
// 双资源 repMfgLine/repMfgPeriod 经 entityRepo 读写；倒冲明细 backflushItems 以 JSON 字符串存 D1，读写时序列化/反序列化。
// 移除原 persist(backendStorage) 本地存储 Blob。
interface RepetitiveMfgState {
  lines: ProductionLine[];
  periods: RepetitiveMfgPeriod[];
  loaded: boolean;
  load: () => Promise<void>;
  addLine: (l: ProductionLine) => Promise<void>;
  updateLine: (id: string, u: Partial<ProductionLine>) => Promise<void>;
  deleteLine: (id: string) => Promise<void>;
  addPeriod: (p: RepetitiveMfgPeriod) => Promise<void>;
  updatePeriod: (id: string, u: Partial<RepetitiveMfgPeriod>) => Promise<void>;
  deletePeriod: (id: string) => Promise<void>;
  /** 产量报工：按产出数量回写周期产量并倒冲各物料耗用（同步签名，D1 写即发即弃，下次 load 校正） */
  reportProduction: (periodId: string, goodQty: number, scrapQty: number) => boolean;
}

const LINE = 'repMfgLine';
const PERIOD = 'repMfgPeriod';
const flagKey = 'ssa-erp-backfilled-repMfg';

const parsePeriod = (p: any): RepetitiveMfgPeriod => ({
  ...p,
  backflushItems:
    typeof p.backflushItems === 'string'
      ? (() => { try { return JSON.parse(p.backflushItems); } catch { return []; } })()
      : (p.backflushItems || []),
});

const toPeriodRow = (p: Partial<RepetitiveMfgPeriod>): any => {
  const out: any = { ...p };
  if (Array.isArray((p as any).backflushItems)) out.backflushItems = JSON.stringify((p as any).backflushItems);
  return out;
};

export const useRepetitiveMfgStore = create<RepetitiveMfgState>()((set, get) => ({
  lines: [...productionLines],
  periods: [...repetitivePeriods],
  loaded: false,

  load: async () => {
    try {
      const [rl, rp] = await Promise.all([
        entityRepo.list<ProductionLine>(LINE, { page: 1, pageSize: 200 }),
        entityRepo.list<RepetitiveMfgPeriod>(PERIOD, { page: 1, pageSize: 200 }),
      ]);
      const lines = (rl?.data || []) as ProductionLine[];
      const periods = ((rp?.data || []) as any[]).map(parsePeriod);
      if (lines.length === 0 && periods.length === 0 && !localStorage.getItem(flagKey)) {
        localStorage.setItem(flagKey, '1');
        for (const l of productionLines) { try { await entityRepo.create<ProductionLine>(LINE, l); } catch { /* 尽力回填 */ } }
        for (const p of repetitivePeriods) { try { await entityRepo.create<RepetitiveMfgPeriod>(PERIOD, toPeriodRow(p)); } catch { /* 尽力回填 */ } }
        const [rl2, rp2] = await Promise.all([
          entityRepo.list<ProductionLine>(LINE, { page: 1, pageSize: 200 }),
          entityRepo.list<RepetitiveMfgPeriod>(PERIOD, { page: 1, pageSize: 200 }),
        ]);
        set({
          lines: (rl2?.data || []) as ProductionLine[],
          periods: ((rp2?.data || []) as any[]).map(parsePeriod),
          loaded: true,
        });
        return;
      }
      set({
        lines: lines.length ? lines : [...productionLines],
        periods: periods.length ? periods : [...repetitivePeriods],
        loaded: true,
      });
    } catch {
      set({ lines: [...productionLines], periods: [...repetitivePeriods], loaded: true });
    }
  },

  addLine: async (l) => {
    set((s) => ({ lines: [...s.lines, l] }));
    try {
      const created = await entityRepo.create<ProductionLine>(LINE, l);
      set((s) => ({ lines: s.lines.map((x) => (x.id === l.id ? (created as ProductionLine) : x)) }));
    } catch { set((s) => ({ lines: s.lines.filter((x) => x.id !== l.id) })); }
  },
  updateLine: async (id, u) => {
    const prev = get().lines.find((x) => x.id === id);
    set((s) => ({ lines: s.lines.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    try { await entityRepo.update<ProductionLine>(LINE, id, u); }
    catch { if (prev) set((s) => ({ lines: s.lines.map((x) => (x.id === id ? prev : x)) })); }
  },
  deleteLine: async (id) => {
    const prev = [...get().lines];
    set((s) => ({ lines: s.lines.filter((x) => x.id !== id) }));
    try { await entityRepo.remove(LINE, id); } catch { set({ lines: prev }); }
  },

  addPeriod: async (p) => {
    set((s) => ({ periods: [...s.periods, p] }));
    try {
      const created = await entityRepo.create<RepetitiveMfgPeriod>(PERIOD, toPeriodRow(p));
      set((s) => ({ periods: s.periods.map((x) => (x.id === p.id ? (created as any) : x)) }));
    } catch { set((s) => ({ periods: s.periods.filter((x) => x.id !== p.id) })); }
  },
  updatePeriod: async (id, u) => {
    const prev = get().periods.find((x) => x.id === id);
    set((s) => ({ periods: s.periods.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    try { await entityRepo.update<RepetitiveMfgPeriod>(PERIOD, id, toPeriodRow(u)); }
    catch { if (prev) set((s) => ({ periods: s.periods.map((x) => (x.id === id ? prev : x)) })); }
  },
  deletePeriod: async (id) => {
    const prev = [...get().periods];
    set((s) => ({ periods: s.periods.filter((x) => x.id !== id) }));
    try { await entityRepo.remove(PERIOD, id); } catch { set({ periods: prev }); }
  },

  reportProduction: (periodId, goodQty, scrapQty) => {
    const period = get().periods.find((p) => p.id === periodId);
    if (!period || period.status === 'closed') return false;
    const backflushItems = period.backflushItems.map((it) => ({
      ...it,
      consumedQty: Math.round((it.consumedQty + it.stdQty * goodQty) * 1000) / 1000,
    }));
    set((s) => ({
      periods: s.periods.map((p) =>
        p.id === periodId
          ? {
              ...p,
              producedQty: p.producedQty + goodQty,
              scrapQty: p.scrapQty + scrapQty,
              backflushItems,
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    }));
    // 即发即弃写 D1（失败不阻断 UI，下次 load 校正）
    entityRepo.update<RepetitiveMfgPeriod>(PERIOD, periodId, toPeriodRow({
      producedQty: period.producedQty + goodQty,
      scrapQty: period.scrapQty + scrapQty,
      backflushItems,
      updatedAt: new Date().toISOString(),
    })).catch(() => {});
    return true;
  },
}));
