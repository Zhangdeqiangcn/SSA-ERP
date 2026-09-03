// B2 三岛「落 D1」双写桥接层。
//
// 设计原则（与现有前端零冲突）：
//   1. 所有请求都从 localStorage('ssa-erp-auth-token') 取 token，注入 Authorization: Bearer <token>。
//   2. 未登录 / token 缺失 / fetch 抛错 / 响应非 2xx → 一律静默 return null，绝不抛异常、不阻塞前端。
//   3. 前端永远以本地 zustand store 为准；本层只负责「尽力把变更同步到 D1」，失败即放弃。
//   4. 调用方（各 store）应当 fire-and-forget：在本地 set 完成之后异步调用，使用 .catch(() => {}) 兜底。
//
// 注意：本文件不依赖 axios，也不用 src/services/api.ts（那个 client 用的是 'token' key 且 401 会跳登录），
// 以免双写失败影响既有登录态与导航。

const TOKEN_KEY = 'ssa-erp-auth-token';
const BASE = '/api';

function getToken(): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

/** 是否已登录（有 token 即视为可尝试双写） */
export function isAuthed(): boolean {
  return !!getToken();
}

/** 通用安全请求：任何异常都返回 null，不向上抛。 */
async function request<T = unknown>(method: string, path: string, body?: unknown): Promise<T | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    if (res.status === 204) return null;
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      // 响应体非 JSON（例如纯文本 200）——视为成功但无结构化数据
      return null;
    }
  } catch {
    return null;
  }
}

type IdResult = { id?: string } | null;

export const b2Api = {
  // ── 序列号 / HU ──
  postSerial: (p: Record<string, unknown>) =>
    request<IdResult>('POST', '/serial-numbers', p),
  putSerial: (id: string, p: Record<string, unknown>) =>
    request('PUT', `/serial-numbers/${encodeURIComponent(id)}`, p),
  deleteSerial: (id: string) =>
    request('DELETE', `/serial-numbers/${encodeURIComponent(id)}`),
  // 核销端点（备选；本改造优先用「逐条 PUT 同步」以完全对齐前端取号结果）
  consumeSerials: (p: Record<string, unknown>) =>
    request<{ consumed?: string[] } | null>('POST', '/serial-numbers/consume', p),

  // ── 委外 ──
  postSubcontract: (p: Record<string, unknown>) =>
    request<IdResult>('POST', '/subcontracts', p),
  putSubcontract: (id: string, p: Record<string, unknown>) =>
    request('PUT', `/subcontracts/${encodeURIComponent(id)}`, p),
  deleteSubcontract: (id: string) =>
    request('DELETE', `/subcontracts/${encodeURIComponent(id)}`),

  // ── 工单领料 ──
  postPicking: (p: Record<string, unknown>) =>
    request('POST', '/work-orders/picking', p),
  putPicking: (id: string, p: Record<string, unknown>) =>
    request('PUT', `/work-orders/picking/${encodeURIComponent(id)}`, p),
  deletePicking: (id: string) =>
    request('DELETE', `/work-orders/picking/${encodeURIComponent(id)}`),

  // ── 出库单 / 入库单 ──
  postOutbound: (p: Record<string, unknown>) =>
    request<IdResult>('POST', '/outbound-orders', p),
  postInbound: (p: Record<string, unknown>) =>
    request<IdResult>('POST', '/inbound-orders', p),

  // 仓库战役：读 / 改 / 删（直连真实 D1，根治 app_state Blob 双通道）
  getInbounds: () => request('GET', '/inbound-orders?pageSize=200'),
  getInbound: (id: string) => request('GET', `/inbound-orders/${encodeURIComponent(id)}`),
  getOutbounds: () => request('GET', '/outbound-orders?pageSize=200'),
  getOutbound: (id: string) => request('GET', `/outbound-orders/${encodeURIComponent(id)}`),
  putInbound: (id: string, p: Record<string, unknown>) =>
    request('PUT', `/inbound-orders/${encodeURIComponent(id)}`, p),
  deleteInbound: (id: string) =>
    request('DELETE', `/inbound-orders/${encodeURIComponent(id)}`),
  putOutbound: (id: string, p: Record<string, unknown>) =>
    request('PUT', `/outbound-orders/${encodeURIComponent(id)}`, p),
  deleteOutbound: (id: string) =>
    request('DELETE', `/outbound-orders/${encodeURIComponent(id)}`),
};

export default b2Api;
