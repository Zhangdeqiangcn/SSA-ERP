import { createEntityStore } from './createEntityStore';
import type { UseBoundStore, StoreApi } from 'zustand';
import { logisticsApi } from '@/services/logisticsApi';
import { deriveWaybillStatus, validateWaybillRequest, type TrackEvent, type WaybillRequest } from '@/services/logistics';

export interface Waybill {
  id: string;
  carrier?: string;
  waybillNo?: string;
  orderHubId?: string;
  packNo?: string;
  waveId?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  weight?: number;
  labelUrl?: string;
  status?: string; // created/printed/dispatched/intransit/signed/exception
  mock?: boolean;
  createdAt?: string;
}
export interface TrackRecord {
  id: string;
  carrier?: string;
  waybillNo?: string;
  eventTime?: string;
  status?: string;
  location?: string;
  description?: string;
}

interface LogisticsState {
  waybills: Waybill[];
  tracks: TrackRecord[];
  providers: { code: string; label: string; isConfigured: boolean }[];
  loaded: boolean;
  load: () => Promise<void>;
  loadProviders: () => Promise<void>;
  createWaybill: (req: WaybillRequest) => Promise<any>;
  pushTrack: (payload: { waybillNo: string; carrier: string; payload: any }) => Promise<any>;
  getTrack: (waybillNo: string) => Promise<void>;
}

const parseWaybill = (w: any): Waybill => ({
  ...w,
  mock: !!w.mock,
});

// 物流面单层：复用通用仓储工厂，主资源 waybill + 附属资源 track。
// 建单取号与轨迹回写走后端权威执行（含承运商适配器调用），前端 extend 负责编排。
export const useLogisticsStore = createEntityStore<Waybill>({
  resource: 'waybill',
  seed: [],
  stateKey: 'waybills',
  parse: parseWaybill,
  backend: {
    list: () => logisticsApi.listWaybills(),
    create: (item) => logisticsApi.createWaybill(item),
    update: () => Promise.reject(new Error('运单不支持直接改')),
    remove: () => Promise.reject(new Error('运单不支持删除')),
  },
  extraResources: [
    {
      resource: 'track',
      seed: [],
      stateKey: 'tracks',
      backend: { list: () => Promise.resolve([]) },
    },
  ],
  extend: (ctx) => ({
    loadLogistics: async () => {
      await ctx.get().load();
    },
    loadProviders: async () => {
      const ps: any = await logisticsApi.listProviders();
      ctx.set({ providers: ps });
    },
    createWaybill: async (req: WaybillRequest) => {
      const v = validateWaybillRequest(req);
      if (!v.ok) throw new Error(v.error);
      const r: any = await logisticsApi.createWaybill(req);
      await ctx.get().load();
      return r;
    },
    pushTrack: async (payload: { waybillNo: string; carrier: string; payload: any }) => {
      const r: any = await logisticsApi.pushTrack(payload);
      return r;
    },
    getTrack: async (waybillNo: string) => {
      const ts: any = await logisticsApi.getTrack(waybillNo);
      ctx.set({ tracks: (ts || []).map((t: any) => ({ ...t })) });
    },
  }),
}) as unknown as UseBoundStore<StoreApi<LogisticsState>>;

export { deriveWaybillStatus };
export type { TrackEvent };
