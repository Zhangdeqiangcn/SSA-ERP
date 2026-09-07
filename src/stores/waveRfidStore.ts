import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { WaveRfid, RfidEvent } from '@/types/waveRfid';
import { waveRfids, rfidEvents } from '@/mocks/data/waveRfid';

// V2.80.0 W2：波次/RFID 迁真实 D1（根治双通道）。
// 双资源 waveRfid/waveRfidTag 经 entityRepo 读写，移除原 persist(backendStorage) 本地存储 Blob。
// 波次明细 lines（WaveLine[]）以 JSON 字符串存 D1，读写时序列化/反序列化（参考 repetitiveMfgStore）。
interface WaveRfidState {
  waves: WaveRfid[];
  rfidEvents: RfidEvent[];
  loaded: boolean;
  load: () => Promise<void>;

  addWave: (w: WaveRfid) => Promise<void>;
  updateWave: (id: string, updates: Partial<WaveRfid>) => Promise<void>;
  deleteWave: (id: string) => Promise<void>;

  addRfidEvent: (e: RfidEvent) => Promise<void>;
  deleteRfidEvent: (id: string) => Promise<void>;
}

const WAVE = 'waveRfid';
const TAG = 'waveRfidTag';
const flagKey = 'ssa-erp-backfilled-waveRfid';

// lines（WaveLine[]）嵌套对象 → JSON 列
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

export const useWaveRfidStore = create<WaveRfidState>()((set, get) => ({
  waves: [...waveRfids],
  rfidEvents: [...rfidEvents],
  loaded: false,

  load: async () => {
    try {
      const [rw, rt] = await Promise.all([
        entityRepo.list<WaveRfid>(WAVE, { page: 1, pageSize: 200 }),
        entityRepo.list<RfidEvent>(TAG, { page: 1, pageSize: 500 }),
      ]);
      const waves = ((rw?.data || []) as any[]).map(parseWave);
      const rfidEvents = (rt?.data || []) as RfidEvent[];
      if (waves.length === 0 && rfidEvents.length === 0 && !localStorage.getItem(flagKey)) {
        localStorage.setItem(flagKey, '1');
        for (const w of waveRfids) { try { await entityRepo.create<WaveRfid>(WAVE, toWaveRow(w)); } catch { /* 尽力回填 */ } }
        for (const e of rfidEvents) { try { await entityRepo.create<RfidEvent>(TAG, e); } catch { /* 尽力回填 */ } }
        const [rw2, rt2] = await Promise.all([
          entityRepo.list<WaveRfid>(WAVE, { page: 1, pageSize: 200 }),
          entityRepo.list<RfidEvent>(TAG, { page: 1, pageSize: 500 }),
        ]);
        set({
          waves: ((rw2?.data || []) as any[]).map(parseWave),
          rfidEvents: (rt2?.data || []) as RfidEvent[],
          loaded: true,
        });
        return;
      }
      set({
        waves: waves.length ? waves : [...waveRfids],
        rfidEvents: rfidEvents.length ? rfidEvents : [...rfidEvents],
        loaded: true,
      });
    } catch {
      set({ waves: [...waveRfids], rfidEvents: [...rfidEvents], loaded: true });
    }
  },

  addWave: async (w) => {
    set((s) => ({ waves: [...s.waves, w] }));
    try {
      const created = await entityRepo.create<WaveRfid>(WAVE, toWaveRow(w));
      set((s) => ({ waves: s.waves.map((x) => (x.id === w.id ? (created as WaveRfid) : x)) }));
    } catch { set((s) => ({ waves: s.waves.filter((x) => x.id !== w.id) })); }
  },
  updateWave: async (id, u) => {
    const prev = get().waves.find((x) => x.id === id);
    set((s) => ({ waves: s.waves.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    try { await entityRepo.update<WaveRfid>(WAVE, id, toWaveRow(u)); }
    catch { if (prev) set((s) => ({ waves: s.waves.map((x) => (x.id === id ? prev : x)) })); }
  },
  deleteWave: async (id) => {
    const prev = [...get().waves];
    set((s) => ({ waves: s.waves.filter((x) => x.id !== id) }));
    try { await entityRepo.remove(WAVE, id); } catch { set({ waves: prev }); }
  },

  addRfidEvent: async (e) => {
    set((s) => ({ rfidEvents: [e, ...s.rfidEvents] }));
    try {
      const created = await entityRepo.create<RfidEvent>(TAG, e);
      set((s) => ({ rfidEvents: s.rfidEvents.map((x) => (x.id === e.id ? (created as RfidEvent) : x)) }));
    } catch { set((s) => ({ rfidEvents: s.rfidEvents.filter((x) => x.id !== e.id) })); }
  },
  deleteRfidEvent: async (id) => {
    const prev = [...get().rfidEvents];
    set((s) => ({ rfidEvents: s.rfidEvents.filter((x) => x.id !== id) }));
    try { await entityRepo.remove(TAG, id); } catch { set({ rfidEvents: prev }); }
  },
}));
