import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import type { Webhook, WebhookLog, ApiEndpoint, WebhookEvent } from '@/types';

const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const now = () => new Date().toISOString();

// OpenAPI 风格的服务端 API 注册表（文档/目录），描述 SSA ERP 对外暴露的接口
export const API_REGISTRY: ApiEndpoint[] = [
  { method: 'GET', path: '/api/v1/materials', module: '物料', description: '查询物料主数据（支持过滤/分页）' },
  { method: 'POST', path: '/api/v1/materials', module: '物料', description: '创建物料主数据' },
  { method: 'GET', path: '/api/v1/sales-orders', module: '销售', description: '查询销售订单列表' },
  { method: 'POST', path: '/api/v1/sales-orders', module: '销售', description: '创建销售订单' },
  { method: 'GET', path: '/api/v1/purchase-orders', module: '采购', description: '查询采购订单列表' },
  { method: 'POST', path: '/api/v1/purchase-orders', module: '采购', description: '创建采购订单' },
  { method: 'GET', path: '/api/v1/inventory', module: '仓储', description: '查询实时库存' },
  { method: 'GET', path: '/api/v1/reports', module: '报表', description: '获取报表数据集' },
  { method: 'POST', path: '/api/v1/webhooks', module: '集成', description: '注册事件 Webhook 订阅' },
];

interface IntegrationState {
  webhooks: Webhook[];
  webhookLogs: WebhookLog[];
  addWebhook: (w: Omit<Webhook, 'id' | 'createdAt'>) => void;
  updateWebhook: (id: string, patch: Partial<Omit<Webhook, 'id' | 'createdAt'>>) => void;
  deleteWebhook: (id: string) => void;
  triggerWebhook: (event: WebhookEvent, payload: Record<string, unknown>) => void;
}

// 按 Webhook 鉴权配置构建请求头
function buildAuthHeaders(w: Webhook): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const authType = w.authType ?? 'none';
  if (authType === 'bearer' && w.authToken) {
    headers['Authorization'] = `Bearer ${w.authToken}`;
  } else if (authType === 'basic' && w.authUser) {
    const basic = typeof btoa === 'function'
      ? btoa(`${w.authUser}:${w.authPass ?? ''}`)
      : Buffer.from(`${w.authUser}:${w.authPass ?? ''}`).toString('base64');
    headers['Authorization'] = `Basic ${basic}`;
  }
  return headers;
}

// 单次投递（含失败重试）；返回最终日志条目
async function deliverWebhook(w: Webhook, event: WebhookEvent, payload: Record<string, unknown>): Promise<WebhookLog> {
  const headers = buildAuthHeaders(w);
  const body = JSON.stringify({ event, payload });
  const maxRetry = Math.max(0, w.retry ?? 0);
  let lastError = '';
  let resp: Response | null = null;
  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    try {
      resp = await fetch(w.url, { method: 'POST', headers, body });
      if (resp.ok) break;
      lastError = `HTTP ${resp.status}`;
    } catch (e) {
      lastError = String(e);
    }
  }
  const ok = !!resp?.ok;
  return {
    id: uid('whl'),
    webhookId: w.id,
    webhookName: w.name,
    event,
    status: ok ? 'success' : 'failed',
    detail: ok ? `HTTP ${resp!.status}` : `重试 ${maxRetry} 次仍失败：${lastError}`,
    at: now(),
  };
}

export const useIntegrationStore = create<IntegrationState>()(
  persist(
    (set, get) => ({
      webhooks: [
        {
          id: 'wh-seed-1',
          name: '示例-销售订单通知',
          url: 'https://example.com/hooks/sales',
          events: ['sales.order.created'],
          enabled: true,
          createdAt: now(),
          authType: 'none',
          retry: 0,
        },
      ],
      webhookLogs: [],
      addWebhook: (w) =>
        set((s) => ({ webhooks: [...s.webhooks, { ...w, id: uid('wh'), createdAt: now() }] })),
      updateWebhook: (id, patch) =>
        set((s) => ({ webhooks: s.webhooks.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
      deleteWebhook: (id) => set((s) => ({ webhooks: s.webhooks.filter((w) => w.id !== id) })),
      triggerWebhook: (event, payload) => {
        const targets = get().webhooks.filter((w) => w.enabled && w.events.includes(event));
        targets.forEach((w) => {
          const logId = uid('whl');
          set((s) => ({
            webhookLogs: [
              {
                id: logId,
                webhookId: w.id,
                webhookName: w.name,
                event,
                status: 'pending',
                detail: '发送中…',
                at: now(),
              },
              ...s.webhookLogs,
            ],
          }));
          deliverWebhook(w, event, payload)
            .then((log) =>
              set((s) => ({
                webhookLogs: s.webhookLogs.map((l) =>
                  l.id === logId
                    ? { ...l, status: log.status, detail: log.detail, at: log.at }
                    : l,
                ),
              })),
            );
        });
      },
    }),
    { storage: backendStorage,
     name: 'ssa-erp-integration' },
  ),
);
