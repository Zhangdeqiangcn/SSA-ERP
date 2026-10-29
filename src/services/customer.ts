import { api } from './api';
import { Customer, PaginatedResponse } from '@/types';

// 客户主数据 CRUD（直连 D1 customers，会话鉴权）
// V2.74.5 起与开放网关 /api/open/customers 同源，消除 app_state Blob 双源。
export const customerApi = {
  getCustomers: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<Customer>>('/customers', params),

  getCustomer: (id: string) =>
    api.get<Customer>(`/customers/${id}`),

  createCustomer: (data: Partial<Customer>) =>
    api.post<Customer>('/customers', data),

  updateCustomer: (id: string, data: Partial<Customer>) =>
    api.put<Customer>(`/customers/${id}`, data),

  deleteCustomer: (id: string) =>
    api.delete(`/customers/${id}`),
};

export default customerApi;
