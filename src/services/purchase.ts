import { api } from './api';
import { PurchaseRequest, PurchaseOrder, VendorQuote, PaginatedResponse } from '@/types';

/**
 * 专用父子表端点通道（C1 采购域 · V3.11.0）。
 *
 * ── 为什么要单独一组 ────────────────────────────────────────────
 * `purchaseApi` 下面那些 `/purchase-requests` 方法**是历史悬空的存根**：
 * 后端从来没有 `functions/api/purchase-requests/`，调用必然 404。
 * 它们也**不带嵌套子数组语义**（`items` 传进去会被后端当普通字段）。
 * 因此本轮新建这一组，走 `_shared/parentChild.ts` 驱动的真实端点，
 * 语义完整（含「不传 items = 保持 / 传 [] = 清空」）。
 *
 * 与 salesDomainApi 保持**同一组方法名**（list/create/update/remove），
 * 让 store 层不必关心某个切片走哪条通道 —— 将来换通道只改这里一处。
 */
export interface CrudApi<T> {
  list: (params?: Record<string, unknown>) => Promise<PaginatedResponse<T>>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<unknown>;
}

function viaEndpoint<T>(base: string): CrudApi<T> {
  return {
    list: (params) => api.get<PaginatedResponse<T>>(base, params),
    create: (data) => api.post<T>(base, data),
    update: (id, data) => api.put<T>(`${base}/${id}`, data),
    remove: (id) => api.delete(`${base}/${id}`),
  };
}

/**
 * 采购域关系化通道（两个切片，各自都带 items 子数组）。
 *
 * ★ 路径选择说明：报价用独立的 `/vendor-quotes` 而非
 *   `/purchase-requests/:id/quotes` —— 理由见
 *   `functions/api/vendor-quotes/index.ts` 文件头（报价是一等业务实体，
 *   requestId 只是查询条件，不必做成路径层级）。
 */
export const purchaseDomainApi = {
  requests: viaEndpoint<PurchaseRequest>('/purchase-requests'),
  quotes: viaEndpoint<VendorQuote>('/vendor-quotes'),
};

/**
 * 拉全量时一页最多取多少条。
 *
 * 采购申请与报价实测极小（`ssa-erp-purchase` 全键 4798 字节，
 * 两个切片合计 5 + 2 条），但会随使用持续增长，因此留足余量避免漏行。
 * 与 salesApi 的 SALES_PAGE_SIZE / financeApi 的 FIN_PAGE_SIZE 同义。
 */
export const PURCHASE_PAGE_SIZE = 500;

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
