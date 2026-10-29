import { api } from './api';

// 前端 → SSA 后端物流面单接口（建单取号 / 列表 / 轨迹查询 / 轨迹回写 / 承运商列表）
// 约定：GET /api/logistics 列表；POST /api/logistics 建单；
//      GET /api/logistics/providers 承运商；POST /api/logistics/track 轨迹回写。
export const logisticsApi = {
  listProviders: () =>
    api.get('/logistics/providers').then((r: any) => r?.data ?? r ?? []),
  createWaybill: (payload: any) => api.post('/logistics', payload),
  listWaybills: (params?: any) =>
    api.get('/logistics', params || {}).then((r: any) => r?.data ?? r ?? []),
  getTrack: (waybillNo: string) =>
    api.get('/logistics/track', { waybillNo }).then((r: any) => r?.data ?? r ?? []),
  pushTrack: (payload: any) => api.post('/logistics/track', payload),
};

export default logisticsApi;
