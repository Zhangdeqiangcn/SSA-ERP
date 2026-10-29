// 汇率走云端 /api/fx（D1 fx_rates 表，带 org_id 组织隔离）。
// 背景（B 类 P1-2 汇率双源 + P1-12 组织隔离泄漏点）：原 fxStore 纯 localStorage、
// 不上云、不带 org_id，同一浏览器多组织共享一份汇率且永不同步云端；
// 后端已有按 org_id 隔离的 fx_rates 表。本 service 让前端改走云端，
// 本地 persist 仅作离线兜底（未登录 / 拉取失败时保留本地种子）。
import { api } from './api';

/** 云端汇率行（与后端 GET /api/fx 返回结构对齐，camelCase） */
export interface FxRateRemote {
  id: string;
  base: string;
  quote: string;
  rate: number;
  source: string;
  updatedAt: string;
}

export const fxApi = {
  /** 拉取本组织某基准币种的全部汇率（带 org_id 隔离） */
  list: (base = 'CNY'): Promise<FxRateRemote[]> =>
    api.get<{ data: FxRateRemote[] }>('/api/fx', { base }).then((r) => r.data || []),

  /** 手工设置 / 更新一条汇率（后端按 org_id + base + quote upsert，含审计） */
  upsert: (r: { base: string; quote: string; rate: number; source?: string }): Promise<{ ok: boolean }> =>
    api.post<{ ok: boolean }>('/api/fx', r),
};
