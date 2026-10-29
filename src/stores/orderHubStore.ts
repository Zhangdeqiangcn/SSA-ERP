import { createEntityStore } from './createEntityStore';
import { channelApi } from '@/services/channelApi';
import type { NormalizedOrder } from '@/services/channels/types';

const parseOrder = (r: any): NormalizedOrder => ({
  ...r,
  lines: typeof r.lines === 'string' ? safeJson(r.lines, []) : r.lines || [],
});
const serializeOrder = (o: Partial<NormalizedOrder>): any => {
  const out: any = { ...o };
  if (Array.isArray((o as any).lines)) out.lines = JSON.stringify((o as any).lines);
  return out;
};
function safeJson(s: string, fallback: any) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

// 订单中台域：复用通用仓储工厂，调用方零改动；后端走专用 /api/order-hub。
// 订单为业务凭证，不支持删除（仅可改状态），故 remove 显式拒绝。
export const useOrderHubStore = createEntityStore<NormalizedOrder>({
  resource: 'orderHub',
  seed: [],
  stateKey: 'orders',
  backend: {
    list: () =>
      channelApi.listOrders({ page: 1, pageSize: 200 }).then((r: any) => (r?.data || r || [])),
    create: (item) => channelApi.createOrder(item as any),
    update: (id, patch) => channelApi.updateOrder(id, patch as any),
    remove: () => Promise.reject(new Error('订单中台不支持删除')),
  },
  parse: parseOrder,
  serialize: serializeOrder,
  extend: (ctx) => ({
    loadOrders: () => ctx.get().load(),
    addOrder: (o: NormalizedOrder) => ctx.primary.add(o),
    updateOrder: (id: string, patch: Partial<NormalizedOrder>) => ctx.primary.update(id, patch),
  }),
});
