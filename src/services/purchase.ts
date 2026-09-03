import { api } from './api';
import { PurchaseRequest, PurchaseOrder, VendorQuote, PaginatedResponse } from '@/types';

export const purchaseApi = {
  // Purchase Request CRUD
  getPurchaseRequests: (params?: { page?: number; pageSize?: number; status?: string; priority?: string }) =>
    api.get<PaginatedResponse<PurchaseRequest>>('/purchase-requests', params),

  getPurchaseRequest: (id: string) =>
    api.get<PurchaseRequest>(`/purchase-requests/${id}`),

  createPurchaseRequest: (data: Partial<PurchaseRequest>) =>
    api.post<PurchaseRequest>('/purchase-requests', data),

  updatePurchaseRequest: (id: string, data: Partial<PurchaseRequest>) =>
    api.put<PurchaseRequest>(`/purchase-requests/${id}`, data),

  deletePurchaseRequest: (id: string) =>
    api.delete(`/purchase-requests/${id}`),

  // Approval
  approvePurchaseRequest: (id: string, comments?: string) =>
    api.post<PurchaseRequest>(`/purchase-requests/${id}/approve`, { comments }),

  rejectPurchaseRequest: (id: string, reason: string) =>
    api.post<PurchaseRequest>(`/purchase-requests/${id}/reject`, { reason }),

  // Purchase Order CRUD
  getPurchaseOrders: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get<PaginatedResponse<PurchaseOrder>>('/purchase-orders', params),

  getPurchaseOrder: (id: string) =>
    api.get<PurchaseOrder>(`/purchase-orders/${id}`),

  createPurchaseOrder: (data: Partial<PurchaseOrder>) =>
    api.post<PurchaseOrder>('/purchase-orders', data),

  updatePurchaseOrder: (id: string, data: Partial<PurchaseOrder>) =>
    api.put<PurchaseOrder>(`/purchase-orders/${id}`, data),

  deletePurchaseOrder: (id: string) =>
    api.delete(`/purchase-orders/${id}`),

  // Price Compare
  getQuotes: (requestId: string) =>
    api.get<VendorQuote[]>(`/purchase-requests/${requestId}/quotes`),

  submitQuote: (requestId: string, data: Partial<VendorQuote>) =>
    api.post<VendorQuote>(`/purchase-requests/${requestId}/quotes`, data),

  compareQuotes: (requestId: string) =>
    api.get<{ request: PurchaseRequest; quotes: VendorQuote[] }>(`/purchase-requests/${requestId}/compare`),
};

export default purchaseApi;
