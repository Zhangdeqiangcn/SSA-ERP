import { api } from './api';

// W1 根治双通道：销售订单 / 工单 / 凭证 直连真实 D1 关系表（会话鉴权）。
// 后端 GET/POST 返回 snake_case 行（含 items），前端用 snakeToCamel 统一映射为前端 camelCase 形状。
export const salesApi = {
  getSalesOrders: (params?: Record<string, unknown>) => api.get<any>('/sales-orders', params),
  getSalesOrder: (id: string) => api.get<any>(`/sales-orders/${id}`),
  createSalesOrder: (data: any) => api.post<any>('/sales-orders', data),
  updateSalesOrder: (id: string, data: any) => api.put<any>(`/sales-orders/${id}`, data),
  deleteSalesOrder: (id: string) => api.delete(`/sales-orders/${id}`),
};

export const workOrderApi = {
  getWorkOrders: (params?: Record<string, unknown>) => api.get<any>('/work-orders', params),
  getWorkOrder: (id: string) => api.get<any>(`/work-orders/${id}`),
  createWorkOrder: (data: any) => api.post<any>('/work-orders', data),
  updateWorkOrder: (id: string, data: any) => api.put<any>(`/work-orders/${id}`, data),
  deleteWorkOrder: (id: string) => api.delete(`/work-orders/${id}`),
};

export const voucherApi = {
  getVouchers: (params?: Record<string, unknown>) => api.get<any>('/vouchers', params),
  getVoucher: (id: string) => api.get<any>(`/vouchers/${id}`),
  createVoucher: (data: any) => api.post<any>('/vouchers', data),
  updateVoucher: (id: string, data: any) => api.put<any>(`/vouchers/${id}`, data),
  deleteVoucher: (id: string) => api.delete(`/vouchers/${id}`),
};
