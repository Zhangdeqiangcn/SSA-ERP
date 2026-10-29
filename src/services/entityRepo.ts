import { api } from './api';
import { enqueueWriteFailure } from './b2Api';
import type { PaginatedResponse } from '@/types';

// 通用实体 CRUD 客户端（根治双通道：所有业务域经此访问真实 D1 关系表）
// 后端：functions/api/entities/[resource]（会话鉴权 + org 隔离 + RLS + 审计）
//
// P0-1A（离线优先补同步）：写操作（create/update/remove）失败不再被调用方的
//   .catch(() => {}) 静默吞掉——网络中断 / 5xx 这类「用户无能为力但操作确未成功」
//   的失败会被记入 b2Api 失败队列，由 B2SyncStatus 提示 + 网络恢复后自动重放。
//   401（登录态失效，api 拦截器已跳登录）与 4xx 业务校验（用户需改数据）不入队。
export const entityRepo = {
  list: <T>(resource: string, params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<T>>(`/entities/${resource}`, params),

  get: <T>(resource: string, id: string) => api.get<T>(`/entities/${resource}/${id}`),

  create: <T>(resource: string, data: Partial<T>) =>
    api.post<T>(`/entities/${resource}`, data).catch((err: unknown) => {
      enqueueIfRetryable('POST', `/entities/${resource}`, data, err);
      throw err;
    }),

  update: <T>(resource: string, id: string, data: Partial<T>) =>
    api.put<T>(`/entities/${resource}/${id}`, data).catch((err: unknown) => {
      enqueueIfRetryable('PUT', `/entities/${resource}/${id}`, data, err);
      throw err;
    }),

  remove: (resource: string, id: string) =>
    api.delete(`/entities/${resource}/${id}`).catch((err: unknown) => {
      enqueueIfRetryable('DELETE', `/entities/${resource}/${id}`, undefined, err);
      throw err;
    }),

  /**
   * 幂等 upsert（writeRow/writeConfig 专用）：先 update，记录不存在(404)或网络/5xx 时
   * fallback create（带显式 id 建首条）。仅当「最终 create 仍失败」才入队——避免 update
   * 与 create 各记一条等效失败、重放时产生僵尸项。4xx 业务校验不 fallback、不入库。
   */
  upsert: async <T>(resource: string, id: string, data: Partial<T>) => {
    try {
      return await api.put<T>(`/entities/${resource}/${id}`, data);
    } catch (e: unknown) {
      const status = httpStatus(e);
      // 4xx 业务校验（非 404）：不 fallback，直接抛交由上层业务处理
      if (status !== undefined && status >= 400 && status < 500 && status !== 404) {
        throw e;
      }
      // 404（记录不存在）或网络/5xx：尝试 create（带显式 id 建首条）
      try {
        return await api.post<T>(`/entities/${resource}`, { ...data, id } as Partial<T>);
      } catch (e2: unknown) {
        // 最终形态仍失败（真正网络断开）：入队 create，供自动重放
        enqueueWriteFailure(
          'POST',
          `/entities/${resource}`,
          { ...data, id },
          httpStatus(e2),
          errMessage(e2),
        );
        throw e2;
      }
    }
  },
};

// ── 失败分类与入队辅助 ────────────────────────────────────────────────
/** 提取 axios/网络错误的 HTTP 状态码；网络错误（无 response）返回 undefined */
function httpStatus(err: unknown): number | undefined {
  const e = err as { response?: { status?: number } };
  if (e?.response?.status !== undefined) return e.response.status;
  return undefined; // 网络错误（有 request 无 response）→ undefined，视为可重试
}

/** 提取可读错误信息（截断避免大段 HTML 塞入内存） */
function errMessage(err: unknown): string {
  const e = err as { message?: string; response?: { data?: unknown } };
  if (typeof e?.response?.data === 'string') return e.response.data.slice(0, 200);
  return e?.message ?? '请求失败';
}

/**
 * 仅把「网络中断 / 5xx」这类可重试写失败入队；
 * 401（登录态失效，api 拦截器已跳登录）与 4xx 业务校验（用户需改数据）不入队。
 */
function enqueueIfRetryable(method: string, path: string, body: unknown, err: unknown): void {
  const status = httpStatus(err);
  if (status === 401) return; // 登录态异常，不入队
  if (status !== undefined && status >= 400 && status < 500) return; // 业务校验，不入队
  // 网络错误（undefined）或 5xx：可重试，入队
  enqueueWriteFailure(method, path, body, status, errMessage(err));
}

export default entityRepo;
