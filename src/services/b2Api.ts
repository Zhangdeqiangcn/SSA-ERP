// B2 三岛「落 D1」双写桥接层。
//
// 设计原则（与现有前端零冲突）：
//   1. 所有请求都从内存态令牌（getSyncToken）取 token，注入 Authorization: Bearer <token>；
//      V3.91.0 起令牌不再落地明文 localStorage，生产刷新后由 HttpOnly Cookie 兜底，此处返回 null 属正常。
//   2. 未登录 / token 缺失 → 静默 return null（无会话则无「需要同步到 D1 的变更」，不计入失败）。
//   3. 前端永远以本地 zustand store 为准；本层负责「尽力把变更同步到 D1」。
//   4. 调用方（各 store）仍 fire-and-forget：在本地 set 完成之后异步调用，使用 .catch(() => {}) 兜底。
//
// ──────────────────────────────────────────────────────────────────────────
// P1 FE-002 修复：消除「系统性静默失败」。
//
// 旧设计：任何异常（响应非 2xx / fetch 抛错）都直接 `return null`，失败即放弃，
// 且前端约 54 处 `.catch(() => {})` 调用点永不感知 —— 本地状态与 D1 真相源可能
// 永久分歧而用户零察觉（如入库写入失败、本地 id 永不回写）。
//
// 新设计（**不破坏 54 处现有调用约定**）：
//   - `request()` 仍返回 `T | null`，调用点零改动；
//   - 但失败不再消失：内部记入环形缓冲 `failureLog`，并「可观测 + 可重试 + 可上报」。
//     ① 可观测：每次失败 `console.warn` 一次（轻量上报），并通知订阅者；
//     ② 可重试：`retryAll()` 按原 method/path/body 重放所有写操作（非 GET）；
//     ③ 可上报：通过 `subscribe`/`getFailures` 暴露给 UI（B2SyncStatus 状态条）。
// ──────────────────────────────────────────────────────────────────────────
//
// 注意：本文件不依赖 axios，也不用 src/services/api.ts（那个 client 用的是 'token' key 且 401 会跳登录），
// 以免双写失败影响既有登录态与导航。

import { getSyncToken, hasSession } from '@/stores/persistStorage';

const BASE = '/api';

/** 失败环形缓冲上限 */
const MAX_FAILURES = 50;

/** 单次失败记录 */
export interface B2Failure {
  /** 唯一标识，用于重试后精准移除 */
  id: string;
  /** 发生时间戳（ms） */
  ts: number;
  /** HTTP 方法（GET/POST/PUT/DELETE…） */
  method: string;
  /** 请求路径（已 encode，含 BASE 之外的部分） */
  path: string;
  /** 响应状态码；网络/超时错误时为 undefined */
  status?: number;
  /** 失败原因（HTTP 响应文本前若干字符 / 网络错误信息） */
  message: string;
  /** 请求体（写操作重放时需要）；GET/DELETE 通常为 undefined */
  body?: unknown;
}

type FailureListener = (failures: B2Failure[]) => void;

function getToken(): string | null {
  try {
    return getSyncToken();
  } catch {
    return null;
  }
}

/** 把查询参数拼成 ?a=b&c=d（空值跳过），GET 列表查询复用 */
function qs(p?: Record<string, string>): string {
  if (!p) return '';
  const s = Object.entries(p)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return s ? `?${s}` : '';
}

/** 是否已登录（有 token 即视为可尝试双写） */
export function isAuthed(): boolean {
  return hasSession();
}

// ── 失败记录环形缓冲 + 极简发布订阅 ────────────────────────────────────────
let failures: B2Failure[] = [];
const listeners = new Set<FailureListener>();

/** 取当前失败列表的快照（副本，避免外部直接改内部状态） */
export function getFailures(): B2Failure[] {
  return failures.slice();
}

/** 清空失败记录并通知订阅者（用户手动「忽略/已读」时使用） */
export function clearFailures(): void {
  failures = [];
  notify();
}

/** 订阅失败列表变化；返回取消订阅函数。订阅时立即推送一次当前快照。 */
export function subscribe(cb: FailureListener): () => void {
  listeners.add(cb);
  // 立即推送当前状态，使挂载组件能反映既有失败
  try {
    cb(getFailures());
  } catch {
    /* 订阅回调异常不应影响桥接层 */
  }
  return () => {
    listeners.delete(cb);
  };
}

/** 内部通知：向所有订阅者推送最新快照 */
function notify(): void {
  const snapshot = getFailures();
  listeners.forEach((cb) => {
    try {
      cb(snapshot);
    } catch {
      /* 单个订阅者异常不影响其他订阅者 */
    }
  });
}

/** 记录一次失败（写入环形缓冲 + console.warn + 通知） */
function recordFailure(p: Omit<B2Failure, 'id' | 'ts'>): void {
  const rec: B2Failure = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    ...p,
  };
  failures.push(rec);
  if (failures.length > MAX_FAILURES) {
    // 环形缓冲：超出上限丢弃最旧的
    failures.splice(0, failures.length - MAX_FAILURES);
  }
  // 轻量上报：开发者在控制台即可看到双写失败（可观测）
  const statusText = p.status !== undefined ? ` (HTTP ${p.status})` : '';
  // eslint-disable-next-line no-console
  console.warn(`[b2Api] D1 同步失败：${p.method} ${p.path}${statusText} - ${p.message}`);
  notify();
}

/**
 * 把一次「可重试的写失败」安全入队（供 entityRepo 等统一写入口复用）。
 * 与 recordFailure 的区别：
 *   - 自带「同 path + 同 body」去重：已 pending 的不重复入队，仅刷新 ts 与最新错误，
 *     否则 writeRow 的「update 失败 fallback create」会写入两条等效失败，重放时产生僵尸项。
 *   - 仅用于「网络中断 / 5xx」这类用户无能为力、但应被自动重放的失败；
 *     401（登录态失效）与 4xx（业务校验）由调用方自行判断，不应调本函数。
 * @param method HTTP 方法
 * @param path 请求路径（含 /api 之外的部分，如 /entities/material）
 * @param body 请求体（重放时需要）
 * @param status 响应状态码；网络错误时为 undefined
 * @param message 失败原因
 */
export function enqueueWriteFailure(
  method: string,
  path: string,
  body?: unknown,
  status?: number,
  message = '请求失败',
): void {
  const key = `${method} ${path} :: ${hashBody(body)}`;
  const dup = failures.find((f) => `${f.method} ${f.path} :: ${hashBody(f.body)}` === key);
  if (dup) {
    // 已存在等效 pending：仅刷新时间戳与最新错误信息，不重复入队
    dup.ts = Date.now();
    if (status !== undefined) dup.status = status;
    dup.message = message;
    notify();
    return;
  }
  recordFailure({ method, path, status, message, body });
}

/** 请求体稳定哈希（用于去重判断）：JSON 归一后比较 */
function hashBody(body?: unknown): string {
  if (body === undefined || body === null) return '';
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
}

/** 底层请求：执行 fetch 并返回结构化结果，**不**记录失败（记录交由上层决定） */
async function rawRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status?: number; data?: T | null; errorText?: string; silent?: boolean }> {
  if (!hasSession()) {
    // 无会话（未登录 / 已登出）：本应无「需要同步到 D1 的变更」，按设计意图静默（不计入失败环形缓冲）。
    return { ok: false, status: 401, errorText: '未登录（缺少会话）', silent: true };
  }
  const token = getToken();
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      // 截取响应文本前 200 字符，避免把大段 HTML/报错塞进内存
      return { ok: false, status: res.status, errorText: text.slice(0, 200) };
    }
    if (res.status === 204) return { ok: true, status: 204, data: null };
    if (!text) return { ok: true, data: null };
    try {
      return { ok: true, data: JSON.parse(text) as T };
    } catch {
      // 响应体非 JSON（例如纯文本 200）——视为成功但无结构化数据
      return { ok: true, data: null };
    }
  } catch (e) {
    // 网络错误 / 超时：fetch 抛 TypeError（如 Failed to fetch）
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, status: undefined, errorText: message };
  }
}

/** 通用安全请求：失败可观测（记录到 failureLog），但仍返回 null，不向上抛、不阻塞前端。 */
async function request<T = unknown>(method: string, path: string, body?: unknown): Promise<T | null> {
  const result = await rawRequest<T>(method, path, body);
  if (!result.ok && !result.silent) {
    recordFailure({
      method,
      path,
      status: result.status,
      message: result.errorText ?? '请求失败',
      body,
    });
  }
  return (result.data ?? null) as T | null;
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

  // ── 库存记录（权威源，W6 整改：前端展示改消费后端 inventory_records）──
  getInventoryRecords: <T = unknown>(params?: Record<string, string>) =>
    request<T>('GET', `/inventory-records${qs(params)}`),
  // ── 库存调整单（W1 整改：盘点差异走真实调整单过账）──
  postAdjustment: (p: Record<string, unknown>) =>
    request<{ id?: string } | null>('POST', '/inventory-adjustments', p),
  putAdjustment: (id: string, p: Record<string, unknown>) =>
    request('PUT', `/inventory-adjustments/${encodeURIComponent(id)}`, p),

  // ── 仓库主数据（W4 整改：后端化，统一权威源 + RLS + 审计）──
  getWarehouses: <T = unknown>(params?: Record<string, string>) =>
    request<T>('GET', `/warehouses${qs(params)}`),
  postWarehouse: (p: Record<string, unknown>) =>
    request<{ id?: string } | null>('POST', '/warehouses', p),
  putWarehouse: (id: string, p: Record<string, unknown>) =>
    request('PUT', `/warehouses/${encodeURIComponent(id)}`, p),
  deleteWarehouse: (id: string) =>
    request('DELETE', `/warehouses/${encodeURIComponent(id)}`),

  // ── FE-002 新增：失败可观测 / 可重试 / 可上报 ──
  /** 订阅失败列表变化，返回取消订阅函数 */
  subscribe,
  /** 取当前失败记录快照 */
  getFailures,
  /** 清空失败记录 */
  clearFailures,
  /**
   * 重放所有写操作（非 GET）失败记录：按原 method/path/body 重新发起请求。
   * 成功则该条移除；失败则保留（更新 ts 与最新错误）。读取（GET）失败不重放。
   * @returns 重放统计
   */
  retryAll,
  /** 统一写入口（entityRepo）把「可重试写失败」入队时使用（自带 path+body 去重） */
  enqueueWriteFailure,
};

/**
 * 重放所有写操作（非 GET）失败记录：按原 method/path/body 重新发起请求。
 * 成功则该条移除；失败则保留（更新 ts 与最新错误）。读取（GET）失败不重放。
 */
async function retryAll(): Promise<{ retried: number; succeeded: number; failed: number }> {
  const pending = failures.slice();
  const kept: B2Failure[] = [];
  let retried = 0;
  let succeeded = 0;
  let failed = 0;

  for (const f of pending) {
    // 读取失败不参与「本地修改未同步」重放
    if (f.method === 'GET' || f.method === 'HEAD') {
      kept.push(f);
      continue;
    }
    retried += 1;
    const result = await rawRequest(f.method, f.path, f.body);
    if (result.ok) {
      succeeded += 1;
      // 成功：该条移除（不进入 kept）
    } else {
      failed += 1;
      // 失败：保留并更新时间戳与最新错误
      kept.push({
        ...f,
        ts: Date.now(),
        status: result.status,
        message: result.errorText ?? f.message,
      });
    }
  }

  // 重放后可能仍有残留（失败项），保持在环形缓冲上限内
  failures = kept.slice(-MAX_FAILURES);
  notify();
  return { retried, succeeded, failed };
}

export default b2Api;
