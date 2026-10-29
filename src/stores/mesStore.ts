import { createEntityStore } from './createEntityStore';
import {
  MesConnection,
  MesDeviceStatus,
  WipTrack,
  MesOperationReport,
} from '@/types/mes';
import { mesConnections, mesDevices, mesWips, mesOperationReports } from '@/mocks/data/mes';
import { UseBoundStore, StoreApi } from 'zustand';

// V2.80.0 W1：MES 集成迁真实 D1（根治双通道）。
// V3.90.0：以上 CRUD 骨架（乐观更新+失败回滚+离线兜底+空库回填）统一收敛到通用工厂
//   createEntityStore（entityRepo 主源）。四资源 mesConnections(主键)/mesDevices/mesWips/
//   mesOperationReports 经 extraResources 管理；全部字段扁平标量无需序列化。
//   领域方法 syncConnection（走可插拔扩展点 mesSyncExecutor 后写回 D1）保留在 extend，行为不变。

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
  /** 触发一次同步：走可插拔扩展点 mesSyncExecutor（默认模拟、不真调外部 MES），置状态并记录 lastSyncAt，写回 D1 */
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

// ── 真实 MES 同步扩展点（可插拔）──────────────────────
// 默认「模拟」实现：不真正调用外部 MES 系统，仅返回 connected + 时间戳，
// 让 UI「同步」按钮行为可见、可预期（不产生副作用数据）。
// 接入真实外部 MES 时，替换本常量为真实拉取逻辑（按 conn.endpoint/protocol/apiKey
// 调 REST/OPC-UA/MQTT 拉取设备/WIP/报工并回填 devices/wips/operationReports），
// syncConnection 写回 D1 的主流程不变。
const mesSyncExecutor: (conn: MesConnection) => Promise<{ status: 'connected' | 'error'; lastSyncAt: string }> =
  async () => ({ status: 'connected', lastSyncAt: new Date().toISOString() });

export const useMesStore = createEntityStore<MesConnection>({
  resource: 'mesConnections',
  seed: [...mesConnections],
  stateKey: 'connections',
  backfillKey: 'ssa-erp-backfilled-mes',
  // 其余三资源：扁平标量，无序列化，独立回填
  extraResources: [
    { resource: 'mesDevices', stateKey: 'devices', seed: [...mesDevices], backfill: true },
    { resource: 'mesWips', stateKey: 'wips', seed: [...mesWips], backfill: true },
    { resource: 'mesOperationReports', stateKey: 'operationReports', seed: [...mesOperationReports], backfill: true },
  ],
  // 领域接口与领域方法：委托给工厂内部 ops，保持调用方零改动
  extend: (ctx) => ({
    addConnection: (c: any) => ctx.primary.add(c),
    updateConnection: (id: any, u: any) => ctx.primary.update(id, u),
    deleteConnection: (id: any) => ctx.primary.remove(id),
    // 同步：走可插拔扩展点（默认模拟）后，乐观更新 + 写回 D1（失败回滚，与原行为一致）
    syncConnection: async (id: any) => {
      const prev = (ctx.get() as any).connections.find((x: MesConnection) => x.id === id);
      const u: Partial<MesConnection> = prev
        ? await mesSyncExecutor(prev).then((r) => ({ status: r.status, lastSyncAt: r.lastSyncAt }))
        : { status: 'connected', lastSyncAt: new Date().toISOString() };
      await ctx.primary.update(id, u);
    },
    addDevice: (d: any) => ctx.extras.devices.add(d),
    updateDevice: (id: any, u: any) => ctx.extras.devices.update(id, u),
    deleteDevice: (id: any) => ctx.extras.devices.remove(id),
    addWip: (w: any) => ctx.extras.wips.add(w),
    updateWip: (id: any, u: any) => ctx.extras.wips.update(id, u),
    deleteWip: (id: any) => ctx.extras.wips.remove(id),
    addOperationReport: (r: any) => ctx.extras.operationReports.add(r),
    updateOperationReport: (id: any, u: any) => ctx.extras.operationReports.update(id, u),
    deleteOperationReport: (id: any) => ctx.extras.operationReports.remove(id),
  }),
}) as unknown as UseBoundStore<StoreApi<MesState>>;
