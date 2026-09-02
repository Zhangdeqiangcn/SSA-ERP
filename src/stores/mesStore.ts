import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import {
  MesConnection,
  MesDeviceStatus,
  WipTrack,
  MesOperationReport,
} from '@/types/mes';
import { mesConnections, mesDevices, mesWips, mesOperationReports } from '@/mocks/data/mes';

interface MesState {
  connections: MesConnection[];
  devices: MesDeviceStatus[];
  wips: WipTrack[];
  operationReports: MesOperationReport[];

  addConnection: (c: MesConnection) => void;
  updateConnection: (id: string, updates: Partial<MesConnection>) => void;
  deleteConnection: (id: string) => void;
  /** 触发一次同步：置为 connected 并记录 lastSyncAt（模拟 MES 拉取成功） */
  syncConnection: (id: string) => void;

  addDevice: (d: MesDeviceStatus) => void;
  updateDevice: (id: string, updates: Partial<MesDeviceStatus>) => void;
  deleteDevice: (id: string) => void;

  addWip: (w: WipTrack) => void;
  updateWip: (id: string, updates: Partial<WipTrack>) => void;
  deleteWip: (id: string) => void;

  addOperationReport: (r: MesOperationReport) => void;
  updateOperationReport: (id: string, updates: Partial<MesOperationReport>) => void;
  deleteOperationReport: (id: string) => void;
}

const addArr = <T,>(list: T[], item: T) => [...list, item];
const updateArr = <T extends { id: string }>(list: T[], id: string, u: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...u } : x));
const deleteArr = <T extends { id: string }>(list: T[], id: string) =>
  list.filter((x) => x.id !== id);

export const useMesStore = create<MesState>()(
  persist(
    (set) => ({
      connections: [...mesConnections],
      devices: [...mesDevices],
      wips: [...mesWips],
      operationReports: [...mesOperationReports],

      addConnection: (c) => set((s) => ({ connections: addArr(s.connections, c) })),
      updateConnection: (id, u) => set((s) => ({ connections: updateArr(s.connections, id, u) })),
      deleteConnection: (id) => set((s) => ({ connections: deleteArr(s.connections, id) })),
      syncConnection: (id) =>
        set((s) => ({
          connections: s.connections.map((c) =>
            c.id === id ? { ...c, status: 'connected', lastSyncAt: new Date().toISOString() } : c
          ),
        })),

      addDevice: (d) => set((s) => ({ devices: addArr(s.devices, d) })),
      updateDevice: (id, u) => set((s) => ({ devices: updateArr(s.devices, id, u) })),
      deleteDevice: (id) => set((s) => ({ devices: deleteArr(s.devices, id) })),

      addWip: (w) => set((s) => ({ wips: addArr(s.wips, w) })),
      updateWip: (id, u) => set((s) => ({ wips: updateArr(s.wips, id, u) })),
      deleteWip: (id) => set((s) => ({ wips: deleteArr(s.wips, id) })),

      addOperationReport: (r) => set((s) => ({ operationReports: addArr(s.operationReports, r) })),
      updateOperationReport: (id, u) => set((s) => ({ operationReports: updateArr(s.operationReports, id, u) })),
      deleteOperationReport: (id) => set((s) => ({ operationReports: deleteArr(s.operationReports, id) })),
    }),
    {
      storage: backendStorage,
      name: 'ssa-erp-mes',
      version: 1,
      partialize: (state) => ({
        connections: state.connections,
        devices: state.devices,
        wips: state.wips,
        operationReports: state.operationReports,
      }),
    }
  )
);
