import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  /** 经直接汇率或基准币种换算，无法换算返回 null */
  convert: (amount: number, from: string, to: string) => number | null;
}

export const useFxStore = create<FxState>()(
  persist(
    (set, get) => ({
      baseCurrency: 'CNY',
      rates: [],
      setBaseCurrency: (c) => set({ baseCurrency: c }),
      upsertRate: (r) =>
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
        }),
      removeRate: (id) => set((s) => ({ rates: s.rates.filter((x) => x.id !== id) })),
      setRates: (r) => set({ rates: r }),
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
