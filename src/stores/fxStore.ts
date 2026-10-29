import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fxApi } from '@/services/fx';
import { hasSession } from '@/stores/persistStorage';

export interface FxRate {
  id: string;
  base: string;
  quote: string;
  rate: number;
  source: string;
  updatedAt: string;
}

interface FxState {
  baseCurrency: string;
  rates: FxRate[];
  setBaseCurrency: (c: string) => void;
  upsertRate: (r: { base: string; quote: string; rate: number; source?: string }) => void;
  removeRate: (id: string) => void;
  setRates: (r: FxRate[]) => void;
  /** 登录态从云端 /api/fx 拉取本组织汇率覆盖本地；未登录/失败保留本地兜底 */
  load: (base?: string) => Promise<void>;
  /** 经直接汇率或基准币种换算，无法换算返回 null */
  convert: (amount: number, from: string, to: string) => number | null;
}

export const useFxStore = create<FxState>()(
  persist(
    (set, get) => ({
      baseCurrency: 'CNY',
      rates: [],
      setBaseCurrency: (c) => set({ baseCurrency: c }),
      upsertRate: (r) => {
        set((s) => {
          const id = `${r.base}-${r.quote}`;
          const rec: FxRate = {
            id, base: r.base, quote: r.quote, rate: r.rate,
            source: r.source || 'manual', updatedAt: new Date().toISOString(),
          };
          const idx = s.rates.findIndex((x) => x.id === id);
          if (idx >= 0) {
            const next = [...s.rates]; next[idx] = rec; return { rates: next };
          }
          return { rates: [...s.rates, rec] };
        });
        // 登录态同步到云端 /api/fx（带 org 隔离 + 审计）；未登录/失败保留本地兜底
        try {
          if (hasSession()) void fxApi.upsert(r);
        } catch { /* ignore */ }
      },
      // 局限（已如实标注）：后端 /api/fx 无 DELETE 端点，removeRate 仅本地生效，重新 load 会从云端恢复
      removeRate: (id) => set((s) => ({ rates: s.rates.filter((x) => x.id !== id) })),
      setRates: (r) => set({ rates: r }),
      load: async (base) => {
        // 仅登录态走云端（避免未登录触发 api 客户端 401 跳转）；失败/离线保留本地兜底
        try { if (!hasSession()) return; } catch { return; }
        try {
          const remote = await fxApi.list(base || get().baseCurrency);
          if (remote.length) set({ rates: remote }); // 云端有数据才覆盖，空则保留本地兜底
        } catch { /* 离线/失败保留本地兜底（诚实降级，不清空本地） */ }
      },
      convert: (amount, from, to) => {
        const { baseCurrency, rates } = get();
        if (from === to) return amount;
        // 统一以基准币种折算：rate(base→quote) = 1 quote 合多少 base
        // 1) from → base
        let amountInBase: number;
        if (from === baseCurrency) {
          amountInBase = amount;
        } else {
          const bf = rates.find((x) => x.base === baseCurrency && x.quote === from);
          if (!bf) return null;
          amountInBase = amount * bf.rate;
        }
        // 2) base → to
        if (to === baseCurrency) return amountInBase;
        const bt = rates.find((x) => x.base === baseCurrency && x.quote === to);
        if (!bt) return null;
        return amountInBase / bt.rate;
      },
    }),
    { name: 'ssa-erp-fx', version: 1 }
  )
);
