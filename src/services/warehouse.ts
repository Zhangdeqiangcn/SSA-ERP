import { api } from './api';
import { InboundOrder, OutboundOrder, CheckTask, InventoryRecord, InventoryAlert, PaginatedResponse } from '@/types';

export const warehouseApi = {
  // Inbound Orders
  getInboundOrders: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get<PaginatedResponse<InboundOrder>>('/inbound-orders', params),

  getInboundOrder: (id: string) =>
    api.get<InboundOrder>(`/inbound-orders/${id}`),

  createInboundOrder: (data: Partial<InboundOrder>) =>
    api.post<InboundOrder>('/inbound-orders', data),

  updateInboundOrder: (id: string, data: Partial<InboundOrder>) =>
    api.put<InboundOrder>(`/inbound-orders/${id}`, data),

  completeInbound: (id: string, data: { items: { itemId: string; actualQuantity: number; qualityStatus: string }[] }) =>
    api.post<InboundOrder>(`/inbound-orders/${id}/complete`, data),

  // Outbound Orders
  getOutboundOrders: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get<PaginatedResponse<OutboundOrder>>('/outbound-orders', params),

  getOutboundOrder: (id: string) =>
    api.get<OutboundOrder>(`/outbound-orders/${id}`),

  createOutboundOrder: (data: Partial<OutboundOrder>) =>
    api.post<OutboundOrder>('/outbound-orders', data),

  updateOutboundOrder: (id: string, data: Partial<OutboundOrder>) =>
    api.put<OutboundOrder>(`/outbound-orders/${id}`, data),

  completeOutbound: (id: string) =>
    api.post<OutboundOrder>(`/outbound-orders/${id}/complete`),

  // Check Tasks
  getCheckTasks: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get<PaginatedResponse<CheckTask>>('/check-tasks', params),

  getCheckTask: (id: string) =>
    api.get<CheckTask>(`/check-tasks/${id}`),

  createCheckTask: (data: Partial<CheckTask>) =>
    api.post<CheckTask>('/check-tasks', data),

  updateCheckTaskItem: (taskId: string, itemId: string, data: { countQuantity: number; remarks?: string }) =>
    api.patch<CheckTask>(`/check-tasks/${taskId}/items/${itemId}`, data),

  completeCheckTask: (taskId: string) =>
    api.post<CheckTask>(`/check-tasks/${taskId}/complete`),

  // Inventory
  getInventory: (params?: { page?: number; pageSize?: number; materialId?: string; warehouseId?: string }) =>
    api.get<PaginatedResponse<InventoryRecord>>('/inventory', params),

  getInventoryAlerts: () =>
    api.get<InventoryAlert[]>('/inventory/alerts'),
};

export default warehouseApi;
