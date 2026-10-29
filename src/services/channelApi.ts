import { api } from './api';
import type {
  NormalizedOrder,
  PushInventoryInput,
  PushLogisticsInput,
  ChannelResult,
} from './channels/types';

// 前端 → SSA 后端边缘函数（平台密钥由后端持有，前端只过 SSA 自有接口）
// 拉单/推库存/回写物流统一 POST /api/channels/<platform>，由 body.action 区分。
export const channelApi = {
  // 拉单：POST /api/channels/<platform> { action: 'pull' }
  pullOrders: (platform: string, params?: { since?: string; page?: number }) =>
    api
      .post<{ data: any[] }>(`/channels/${platform}`, { action: 'pull', ...params })
      .then((r) => (r as any)?.data ?? []),

  pushInventory: (platform: string, items: PushInventoryInput[]): Promise<ChannelResult> =>
    api.post(`/channels/${platform}`, { action: 'inventory', items }),

  pushLogistics: (platform: string, input: PushLogisticsInput): Promise<ChannelResult> =>
    api.post(`/channels/${platform}`, { action: 'logistics', ...input }),

  // 订单中台（order_hub）
  listOrders: (params?: Record<string, unknown>) => api.get('/order-hub', params),
  createOrder: (order: NormalizedOrder) => api.post('/order-hub', order),
  updateOrder: (id: string, patch: Partial<NormalizedOrder>) => api.put(`/order-hub/${id}`, patch),

  // ── 电商平台「登录即连接」OAuth 配置 ──
  oauthStatus: () => api.get<{ platforms: ChannelOAuthStatus[] }>('/channels/oauth/status'),
  oauthStart: (platform: string) =>
    api.get<{ authorizeUrl: string; mock: boolean; platform: string }>('/channels/oauth/start', { platform }),
  oauthSaveApp: (platform: string, appKey: string, appSecret: string) =>
    api.post('/channels/oauth/app', { platform, appKey, appSecret }),
  oauthSaveManual: (
    platform: string,
    accessToken: string,
    opts?: { expiresIn?: number; shopId?: string; shopName?: string }
  ) => api.post('/channels/oauth/manual', { platform, accessToken, ...opts }),
  oauthDisconnect: (platform: string) => api.post('/channels/oauth/disconnect', { platform }),
};

export interface ChannelOAuthStatus {
  platform: string;
  label: string;
  status: 'connected' | 'expired' | 'disconnected' | 'coming';
  authMode: string | null;
  tokenExpire: string | null;
  shopName: string | null;
  isMock: boolean;
  hasApp: boolean;
}

export default channelApi;
