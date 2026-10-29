import { createEntityStore } from './createEntityStore';
import { ProductionLine, RepetitiveMfgPeriod } from '@/types/repetitiveMfg';
import { productionLines, repetitivePeriods } from '@/mocks/data/repetitiveMfg';
import { useGlobalToastStore } from '@/stores/globalToastStore';
import { UseBoundStore, StoreApi } from 'zustand';

// V2.80.0 W1：重复制造迁真实 D1（根治双通道）。
// V3.90.0：以上 CRUD 骨架（乐观更新+失败回滚+离线兜底+空库回填）统一收敛到通用工厂
//   createEntityStore（entityRepo 主源）。双资源 repMfgLine(主键)/repMfgPeriod(periods) 经 extraResources
//   管理；倒冲明细 backflushItems 的 JSON 序列化/反序列化经 parse/serialize 隔离。
//   领域方法 reportProduction（乐观本地+fire-and-forget 写 D1+失败告警）保留在 extend，行为不变。

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

// ── 倒冲明细 JSON 序列化/反序列化（periods 资源专属）──────────────
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

export const useRepetitiveMfgStore = createEntityStore<ProductionLine>({
  resource: 'repMfgLine',
  seed: [...productionLines],
  stateKey: 'lines',
  backfillKey: 'ssa-erp-backfilled-repMfg',
  // 第二资源：生产周期（含嵌套 JSON 字段，parse/serialize 隔离序列化细节）
  extraResources: [
    {
      resource: 'repMfgPeriod',
      stateKey: 'periods',
      seed: [...repetitivePeriods],
      parse: parsePeriod,
      serialize: toPeriodRow,
      backfill: true,
    },
  ],
  // 领域接口与领域方法：委托给工厂内部 ops，保持调用方零改动
  extend: (ctx) => ({
    addLine: (l: any) => ctx.primary.add(l),
    updateLine: (id: any, u: any) => ctx.primary.update(id, u),
    deleteLine: (id: any) => ctx.primary.remove(id),
    addPeriod: (p: any) => ctx.extras.periods.add(p),
    updatePeriod: (id: any, u: any) => ctx.extras.periods.update(id, u),
    deletePeriod: (id: any) => ctx.extras.periods.remove(id),
    // 产量报工：乐观本地更新 + fire-and-forget 写 D1 + 失败告警（沿用原逻辑，不丢跨字段）
    reportProduction: (periodId: any, goodQty: any, scrapQty: any) => {
      const period = (ctx.get() as any).periods.find((p: RepetitiveMfgPeriod) => p.id === periodId);
      if (!period || period.status === 'closed') return false;
      const backflushItems = period.backflushItems.map((it: any) => ({
        ...it,
        consumedQty: Math.round((it.consumedQty + it.stdQty * goodQty) * 1000) / 1000,
      }));
      ctx.set((s: any) => ({
        periods: s.periods.map((p: RepetitiveMfgPeriod) =>
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
      // 写 D1（失败不阻断 UI，但需告警，下次 load 校正）
      ctx.repo
        .update<RepetitiveMfgPeriod>('repMfgPeriod', periodId, toPeriodRow({
          producedQty: period.producedQty + goodQty,
          scrapQty: period.scrapQty + scrapQty,
          backflushItems,
          updatedAt: new Date().toISOString(),
        }))
        .catch(() => { useGlobalToastStore.getState().showError('报工数据同步失败，刷新后可能回退'); });
      return true;
    },
  }),
}) as unknown as UseBoundStore<StoreApi<RepetitiveMfgState>>;
