import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { parsePayload, writeRow, withKind, splitByKind } from './entityBackedShared';
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

const RES = 'integrationShared';
const KIND_WEBHOOK = 'webhook';
const KIND_LOG = 'webhookLog';

/** 双切片写穿（__kind 标记，行主键 = 各对象 id） */
const pushWh = (w: Webhook) => isAuthed() && writeRow(RES, w.id, withKind(KIND_WEBHOOK, w));
const pushLog = (l: WebhookLog) => isAuthed() && writeRow(RES, l.id, withKind(KIND_LOG, l));

export const useIntegrationStore = create<IntegrationState>()(
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
      addWebhook: (w) => {
        const rec: Webhook = { ...w, id: uid('wh'), createdAt: now() };
        set((s) => ({ webhooks: [...s.webhooks, rec] }));
        pushWh(rec);
      },
      updateWebhook: (id, patch) => {
        let updated: Webhook | undefined;
        set((s) => ({
          webhooks: s.webhooks.map((w) => {
            if (w.id !== id) return w;
            updated = { ...w, ...patch };
            return updated;
          }),
        }));
        if (updated) pushWh(updated);
      },
      deleteWebhook: (id) => {
        set((s) => ({ webhooks: s.webhooks.filter((w) => w.id !== id) }));
        if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
      },
      triggerWebhook: (event, payload) => {
        const targets = get().webhooks.filter((w) => w.enabled && w.events.includes(event));
        targets.forEach((w) => {
          const logId = uid('whl');
          const pending: WebhookLog = {
            id: logId,
            webhookId: w.id,
            webhookName: w.name,
            event,
            status: 'pending',
            detail: '发送中…',
            at: now(),
          };
          set((s) => ({ webhookLogs: [pending, ...s.webhookLogs] }));
          pushLog(pending);
          deliverWebhook(w, event, payload)
            .then((log) => {
              const next: WebhookLog = { ...log };
              set((s) => ({
                webhookLogs: s.webhookLogs.map((l) =>
                  l.id === logId
                    ? { ...l, status: log.status, detail: log.detail, at: log.at }
                    : l,
                ),
              }));
              pushLog(next);
            });
        });
      },
    }),
);

// ── V3.81.0 D1 同步层：双切片（webhooks + webhookLogs）挂载水合 ──
let hydrating = false;
async function hydrateIntegration() {
  if (!isAuthed()) return;
  hydrating = true;
  try {
    const res = await entityRepo.list(RES, { page: 1, pageSize: 500 });
    const rows = parsePayload(res?.data || []);
    if (rows.length) {
      useIntegrationStore.setState({
        webhooks: splitByKind<Webhook>(rows, KIND_WEBHOOK),
        webhookLogs: splitByKind<WebhookLog>(rows, KIND_LOG),
      });
    }
  } catch {
    /* 离线/异常：保留本地态 */
  } finally {
    hydrating = false;
  }
}

void hydrateIntegration();
