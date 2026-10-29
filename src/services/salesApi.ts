// 销售域数据访问层（C1 关系化 · V3.9.0）
//
// ── 本域没有平表切片，全部走专用父子表端点 ────────────────────────
// 财务域的 5 个平表切片可以走通用实体路由 /api/entities/:resource（后端零新增代码）。
// 销售域则相反：待迁的三个切片**每一个都带嵌套数组**
//   · 意向客户 → followupRecords: FollowupRecord[]（跟进记录）
//   · 发货单   → items: ShipmentItem[]（货品明细）
//   · 项目     → milestones[] + exceptions[]（两个真正的子表）
// 通用路由只挑已登记列，嵌套数组会被**静默丢弃**且返回 201 成功。
// 因此三个切片全部走 `_shared/parentChild.ts` 驱动的专用端点。
//
// 与 financeApi 保持**同一组方法名**（list/create/update/remove），
// 让 store 层不必关心某个切片走哪条通道 —— 将来换通道只改这里一处。
import { api } from './api';
import type { PaginatedResponse } from '@/types';

export interface CrudApi<T> {
  list: (params?: Record<string, unknown>) => Promise<PaginatedResponse<T>>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<unknown>;
}

/** 专用父子表端点通道（带嵌套数组的切片） */
function viaEndpoint<T>(base: string): CrudApi<T> {
  return {
    list: (params) => api.get<PaginatedResponse<T>>(base, params),
    create: (data) => api.post<T>(base, data),
    update: (id, data) => api.put<T>(`${base}/${id}`, data),
    remove: (id) => api.delete(`${base}/${id}`),
  };
}

export const salesDomainApi = {
  prospects: viaEndpoint<any>('/sales-prospects'),
  shipments: viaEndpoint<any>('/shipments'),
  projects: viaEndpoint<any>('/projects'),
};

/**
 * 拉全量时一页最多取多少条。
 *
 * 销售数据实测极小（`ssa-erp-sales` 全键 10668 字节，三个切片合计约 10.4 KB），
 * 但意向客户与跟进记录会随使用缓慢增长，因此留足余量避免漏行。
 * 与 financeApi 的 FIN_PAGE_SIZE 同值同义。
 */
export const SALES_PAGE_SIZE = 500;
