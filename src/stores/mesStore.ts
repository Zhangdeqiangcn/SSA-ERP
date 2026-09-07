import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import {
  MesConnection,
  MesDeviceStatus,
  WipTrack,
  MesOperationReport,
} from '@/types/mes';
import { mesConnections, mesDevices, mesWips, mesOperationReports } from '@/mocks/data/mes';

// V2.80.0 W1：MES 集成迁真实 D1（根治双通道）。
// 四资源 mesConnections/mesDevices/mesWips/mesOperationReports 经 entityRepo 读写；
// 移除原 persist(backendStorage) 本地存储 Blob。
// 本模块全部字段为扁平标量，无嵌套对象，故无需 JSON 列序列化。
interface MesState {
  connections: MesConnection[];
  devices: MesDeviceStatus[];
  wips: WipTrack[];
  operationReports: MesOperationReport[];
  loaded: boolean;
  load: () => Promise<void>;

  addConnection: (c: MesConnection) => Promise<void>;
  updateConnection: (id: string, updates: Partial<MesConnection>) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  /** 触发一次同步：置为 connected 并记录 lastSyncAt（模拟 MES 拉取成功），并写回 D1 */
  syncConnection: (id: string) => Promise<void>;

  addDevice: (d: MesDeviceStatus) => Promise<void>;
  updateDevice: (id: string, updates: Partial<MesDeviceStatus>) => Promise<void>;
  deleteDevice: (id: string) => Promise<void>;

  addWip: (w: WipTrack) => Promise<void>;
  updateWip: (id: string, updates: Partial<WipTrack>) => Promise<void>;
  deleteWip: (id: string) => Promise<void>;

  addOperationReport: (r: MesOperationReport) => Promise<void>;
  updateOperationReport: (id: string, updates: Partial<MesOperationReport>) => Promise<void>;
  deleteOperationReport: (id: string) => Promise<void>;
}

const CONN = 'mesConnections';
const DEV = 'mesDevices';
const WIP = 'mesWips';
const OP = 'mesOperationReports';
const flagKey = 'ssa-erp-backfilled-mes';

export const useMesStore = create<MesState>()((set, get) => ({
  connections: [...mesConnections],
  devices: [...mesDevices],
  wips: [...mesWips],
  operationReports: [...mesOperationReports],
  loaded: false,

  load: async () => {
    try {
      const [rc, rd, rw, ro] = await Promise.all([
        entityRepo.list<MesConnection>(CONN, { page: 1, pageSize: 200 }),
        entityRepo.list<MesDeviceStatus>(DEV, { page: 1, pageSize: 200 }),
        entityRepo.list<WipTrack>(WIP, { page: 1, pageSize: 200 }),
        entityRepo.list<MesOperationReport>(OP, { page: 1, pageSize: 200 }),
      ]);
      const connections = (rc?.data || []) as MesConnection[];
      const devices = (rd?.data || []) as MesDeviceStatus[];
      const wips = (rw?.data || []) as WipTrack[];
      const operationReports = (ro?.data || []) as MesOperationReport[];
      if (
        connections.length === 0 &&
        devices.length === 0 &&
        wips.length === 0 &&
        operationReports.length === 0 &&
        !localStorage.getItem(flagKey)
      ) {
        localStorage.setItem(flagKey, '1');
        for (const c of mesConnections) { try { await entityRepo.create<MesConnection>(CONN, c); } catch { /* 尽力回填 */ } }
        for (const d of mesDevices) { try { await entityRepo.create<MesDeviceStatus>(DEV, d); } catch { /* 尽力回填 */ } }
        for (const w of mesWips) { try { await entityRepo.create<WipTrack>(WIP, w); } catch { /* 尽力回填 */ } }
        for (const r of mesOperationReports) { try { await entityRepo.create<MesOperationReport>(OP, r); } catch { /* 尽力回填 */ } }
        const [rc2, rd2, rw2, ro2] = await Promise.all([
          entityRepo.list<MesConnection>(CONN, { page: 1, pageSize: 200 }),
          entityRepo.list<MesDeviceStatus>(DEV, { page: 1, pageSize: 200 }),
          entityRepo.list<WipTrack>(WIP, { page: 1, pageSize: 200 }),
          entityRepo.list<MesOperationReport>(OP, { page: 1, pageSize: 200 }),
        ]);
        set({
          connections: (rc2?.data || []) as MesConnection[],
          devices: (rd2?.data || []) as MesDeviceStatus[],
          wips: (rw2?.data || []) as WipTrack[],
          operationReports: (ro2?.data || []) as MesOperationReport[],
          loaded: true,
        });
        return;
      }
      set({
        connections: connections.length ? connections : [...mesConnections],
        devices: devices.length ? devices : [...mesDevices],
        wips: wips.length ? wips : [...mesWips],
        operationReports: operationReports.length ? operationReports : [...mesOperationReports],
        loaded: true,
      });
    } catch {
      set({
        connections: [...mesConnections],
        devices: [...mesDevices],
        wips: [...mesWips],
        operationReports: [...mesOperationReports],
        loaded: true,
      });
    }
  },

  addConnection: async (c) => {
    set((s) => ({ connections: [...s.connections, c] }));
    try {
      const created = await entityRepo.create<MesConnection>(CONN, c);
      set((s) => ({ connections: s.connections.map((x) => (x.id === c.id ? (created as MesConnection) : x)) }));
    } catch { set((s) => ({ connections: s.connections.filter((x) => x.id !== c.id) })); }
  },
  updateConnection: async (id, u) => {
    const prev = get().connections.find((x) => x.id === id);
    set((s) => ({ connections: s.connections.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    try { await entityRepo.update<MesConnection>(CONN, id, u); }
    catch { if (prev) set((s) => ({ connections: s.connections.map((x) => (x.id === id ? prev : x)) })); }
  },
  deleteConnection: async (id) => {
    const prev = [...get().connections];
    set((s) => ({ connections: s.connections.filter((x) => x.id !== id) }));
    try { await entityRepo.remove(CONN, id); } catch { set({ connections: prev }); }
  },
  syncConnection: async (id) => {
    const prev = get().connections.find((x) => x.id === id);
    const u = { status: 'connected' as const, lastSyncAt: new Date().toISOString() };
    set((s) => ({ connections: s.connections.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    try { await entityRepo.update<MesConnection>(CONN, id, u); }
    catch { if (prev) set((s) => ({ connections: s.connections.map((x) => (x.id === id ? prev : x)) })); }
  },

  addDevice: async (d) => {
    set((s) => ({ devices: [...s.devices, d] }));
    try {
      const created = await entityRepo.create<MesDeviceStatus>(DEV, d);
      set((s) => ({ devices: s.devices.map((x) => (x.id === d.id ? (created as MesDeviceStatus) : x)) }));
    } catch { set((s) => ({ devices: s.devices.filter((x) => x.id !== d.id) })); }
  },
  updateDevice: async (id, u) => {
    const prev = get().devices.find((x) => x.id === id);
    set((s) => ({ devices: s.devices.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    try { await entityRepo.update<MesDeviceStatus>(DEV, id, u); }
    catch { if (prev) set((s) => ({ devices: s.devices.map((x) => (x.id === id ? prev : x)) })); }
  },
  deleteDevice: async (id) => {
    const prev = [...get().devices];
    set((s) => ({ devices: s.devices.filter((x) => x.id !== id) }));
    try { await entityRepo.remove(DEV, id); } catch { set({ devices: prev }); }
  },

  addWip: async (w) => {
    set((s) => ({ wips: [...s.wips, w] }));
    try {
      const created = await entityRepo.create<WipTrack>(WIP, w);
      set((s) => ({ wips: s.wips.map((x) => (x.id === w.id ? (created as WipTrack) : x)) }));
    } catch { set((s) => ({ wips: s.wips.filter((x) => x.id !== w.id) })); }
  },
  updateWip: async (id, u) => {
    const prev = get().wips.find((x) => x.id === id);
    set((s) => ({ wips: s.wips.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    try { await entityRepo.update<WipTrack>(WIP, id, u); }
    catch { if (prev) set((s) => ({ wips: s.wips.map((x) => (x.id === id ? prev : x)) })); }
  },
  deleteWip: async (id) => {
    const prev = [...get().wips];
    set((s) => ({ wips: s.wips.filter((x) => x.id !== id) }));
    try { await entityRepo.remove(WIP, id); } catch { set({ wips: prev }); }
  },

  addOperationReport: async (r) => {
    set((s) => ({ operationReports: [...s.operationReports, r] }));
    try {
      const created = await entityRepo.create<MesOperationReport>(OP, r);
      set((s) => ({ operationReports: s.operationReports.map((x) => (x.id === r.id ? (created as MesOperationReport) : x)) }));
    } catch { set((s) => ({ operationReports: s.operationReports.filter((x) => x.id !== r.id) })); }
  },
  updateOperationReport: async (id, u) => {
    const prev = get().operationReports.find((x) => x.id === id);
    set((s) => ({ operationReports: s.operationReports.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    try { await entityRepo.update<MesOperationReport>(OP, id, u); }
    catch { if (prev) set((s) => ({ operationReports: s.operationReports.map((x) => (x.id === id ? prev : x)) })); }
  },
  deleteOperationReport: async (id) => {
    const prev = [...get().operationReports];
    set((s) => ({ operationReports: s.operationReports.filter((x) => x.id !== id) }));
    try { await entityRepo.remove(OP, id); } catch { set({ operationReports: prev }); }
  },
}));
