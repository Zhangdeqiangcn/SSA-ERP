// 生产域数据访问层（C1 关系化 · V3.12.0）
//
// ── ★ 同一个 store、两条不同通道（本域最需要注意的一点）─────────────
// `useProductionStore` 待迁的两个切片**结构不同，通道也不同**：
//   · processRoutes      —— 带嵌套 `operations[]`（每行还带 `skills[]`）
//                           → 专用父子表端点 /api/process-routes
//   · mrpRecommendations —— 13 个字段全是标量的**平表**
//                           → 通用实体路由 /api/entities/mrpRecommendation
//
// 判据是「**有没有嵌套**」，不是「属不属于同一个域」：
// 通用路由的 pickSnake 只挑登记过的列，嵌套数组会被**静默丢弃且返回 201**；
// 而给一张平表再写两个端点文件，等于把同一套逻辑抄第二份。
//
// 两条通道对 store 层**暴露同一组方法名**（list/create/update/remove），
// 让调用方不必关心某个切片走哪条路 —— 将来换通道只改本文件一处。
//
// ── 第三个切片 workOrders 不在这里 ────────────────────────────────
// 它早在 W1（V2.75.x）就直连 D1 了，走 `w1Api.workOrderApi`。
// 本轮**不碰**（重复建表/建端点 = 双源）。
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

/** 通用实体路由通道（平表切片，后端零新增代码） */
function viaEntity<T>(resource: string): CrudApi<T> {
  return {
    list: (params) => api.get<PaginatedResponse<T>>(`/entities/${resource}`, params),
    create: (data) => api.post<T>(`/entities/${resource}`, data),
    update: (id, data) => api.put<T>(`/entities/${resource}/${id}`, data),
    remove: (id) => api.delete(`/entities/${resource}/${id}`),
  };
}

export const PRODUCTION_PAGE_SIZE = 200;

export const productionDomainApi = {
  processRoutes: viaEndpoint<any>('/process-routes'),
  mrpRecommendations: viaEntity<any>('mrpRecommendation'),
};
