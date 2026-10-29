import type { UseBoundStore, StoreApi } from 'zustand';
import { WaveRfid, RfidEvent } from '@/types/waveRfid';
import { waveRfids, rfidEvents } from '@/mocks/data/waveRfid';
import { createEntityStore } from './createEntityStore';

// 迁统一仓储工厂（V2）：双资源 waveRfid/waveRfidTag，云端数据库主源 + 模拟兜底 + 空库回填。
// 波次明细 lines（WaveLine[]）经 parse/serialize 与 JSON 字符串互转；保留既有
// waves/rfidEvents/addWave/updateWave/addRfidEvent… 接口，调用页面无需改动；回填标记沿用旧键。
interface WaveRfidState {
  waves: WaveRfid[];
  rfidEvents: RfidEvent[];
  loaded: boolean;
  load: () => Promise<void>;
  addWave: (w: WaveRfid) => Promise<void>;
  updateWave: (id: string, u: Partial<WaveRfid>) => Promise<void>;
  deleteWave: (id: string) => Promise<void>;
  addRfidEvent: (e: RfidEvent) => Promise<void>;
  deleteRfidEvent: (id: string) => Promise<void>;
}

// lines（WaveLine[]）嵌套对象 ↔ JSON 列
const parseWave = (w: any): WaveRfid => ({
  ...w,
  lines:
    typeof w.lines === 'string'
      ? (() => { try { return JSON.parse(w.lines); } catch { return []; } })()
      : (w.lines || []),
});
const toWaveRow = (w: Partial<WaveRfid>): any => {
  const out: any = { ...w };
  if (Array.isArray((w as any).lines)) out.lines = JSON.stringify((w as any).lines);
  return out;
};

export const useWaveRfidStore = createEntityStore<WaveRfid>({
  resource: 'waveRfid',
  seed: [...waveRfids],
  stateKey: 'waves',
  parse: parseWave,
  serialize: toWaveRow,
  extraResources: [{ resource: 'waveRfidTag', seed: [...rfidEvents], stateKey: 'rfidEvents', pageSize: 500 }],
  backfillKey: 'ssa-erp-backfilled-waveRfid',
  extend: (ctx) => ({
    addWave: (w: WaveRfid) => ctx.primary.add(w),
    updateWave: (id: string, u: Partial<WaveRfid>) => ctx.primary.update(id, u),
    deleteWave: (id: string) => ctx.primary.remove(id),
    addRfidEvent: (e: RfidEvent) => ctx.extras.rfidEvents.add(e),
    deleteRfidEvent: (id: string) => ctx.extras.rfidEvents.remove(id),
  }),
}) as unknown as UseBoundStore<StoreApi<WaveRfidState>>;
