import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { WaveRfid, RfidEvent } from '@/types/waveRfid';
import { waveRfids, rfidEvents } from '@/mocks/data/waveRfid';

interface WaveRfidState {
  waves: WaveRfid[];
  rfidEvents: RfidEvent[];

  addWave: (w: WaveRfid) => void;
  updateWave: (id: string, updates: Partial<WaveRfid>) => void;
  deleteWave: (id: string) => void;

  addRfidEvent: (e: RfidEvent) => void;
  deleteRfidEvent: (id: string) => void;
}

const addArr = <T,>(list: T[], item: T) => [...list, item];
const updateArr = <T extends { id: string }>(list: T[], id: string, u: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...u } : x));
const deleteArr = <T extends { id: string }>(list: T[], id: string) =>
  list.filter((x) => x.id !== id);

export const useWaveRfidStore = create<WaveRfidState>()(
  persist(
    (set) => ({
      waves: [...waveRfids],
      rfidEvents: [...rfidEvents],

      addWave: (w) => set((s) => ({ waves: addArr(s.waves, w) })),
      updateWave: (id, u) => set((s) => ({ waves: updateArr(s.waves, id, u) })),
      deleteWave: (id) => set((s) => ({ waves: deleteArr(s.waves, id) })),

      addRfidEvent: (e) => set((s) => ({ rfidEvents: [e, ...s.rfidEvents] })),
      deleteRfidEvent: (id) => set((s) => ({ rfidEvents: deleteArr(s.rfidEvents, id) })),
    }),
    {
      storage: backendStorage,
      name: 'ssa-erp-wave-rfid',
      version: 1,
      partialize: (state) => ({ waves: state.waves, rfidEvents: state.rfidEvents }),
    }
  )
);
