import { api } from './api';

// 前端 → SSA 后端仓储执行接口（波次 / 拣货 / 配货 / 发货校验）
// 约定：GET /api/fulfillment?kind=wave|pick|pack|ship 列表；POST 建波次；
//      POST /api/fulfillment/pick 拣货确认；/pack 打包；/ship-check 发货校验。
export const fulfillmentApi = {
  listWaves: () =>
    api.get('/fulfillment', { kind: 'wave' }).then((r: any) => r?.data ?? r ?? []),
  createWave: (payload: any) => api.post('/fulfillment', { kind: 'wave', ...payload }),
  updateWave: (id: string, patch: any) => api.put(`/fulfillment/${id}`, { kind: 'wave', ...patch }),

  listPickTasks: (waveId?: string) =>
    api
      .get('/fulfillment', { kind: 'pick', ...(waveId ? { waveId } : {}) })
      .then((r: any) => r?.data ?? r ?? []),
  confirmPick: (payload: { taskId: string; pickedQty: number; status: string }) =>
    api.post('/fulfillment/pick', payload),

  listPackRecords: (waveId?: string) =>
    api
      .get('/fulfillment', { kind: 'pack', ...(waveId ? { waveId } : {}) })
      .then((r: any) => r?.data ?? r ?? []),
  packOrder: (payload: any) => api.post('/fulfillment/pack', payload),

  listShipChecks: () =>
    api.get('/fulfillment', { kind: 'ship' }).then((r: any) => r?.data ?? r ?? []),
  checkShip: (payload: any) => api.post('/fulfillment/ship-check', payload),
};

export default fulfillmentApi;
