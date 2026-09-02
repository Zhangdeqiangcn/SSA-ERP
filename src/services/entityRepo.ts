import { api } from './api';
import type { PaginatedResponse } from '@/types';

// 通用实体 CRUD 客户端（根治双通道：所有业务域经此访问真实 D1 关系表）
// 后端：functions/api/entities/[resource]（会话鉴权 + org 隔离 + RLS + 审计）
export const entityRepo = {
  list: <T>(resource: string, params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<T>>(`/entities/${resource}`, params),

  get: <T>(resource: string, id: string) => api.get<T>(`/entities/${resource}/${id}`),

  create: <T>(resource: string, data: Partial<T>) => api.post<T>(`/entities/${resource}`, data),

  update: <T>(resource: string, id: string, data: Partial<T>) =>
    api.put<T>(`/entities/${resource}/${id}`, data),

  remove: (resource: string, id: string) => api.delete(`/entities/${resource}/${id}`),
};

export default entityRepo;
