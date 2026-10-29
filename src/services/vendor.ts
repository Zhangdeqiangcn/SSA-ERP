import { api } from './api';
import { Vendor, VendorRatingRecord, PaginatedResponse } from '@/types';

export const vendorApi = {
  // Vendor CRUD
  getVendors: (params?: { page?: number; pageSize?: number; name?: string; type?: string; status?: string }) =>
    api.get<PaginatedResponse<Vendor>>('/vendors', params),

  getVendor: (id: string) =>
    api.get<Vendor>(`/vendors/${id}`),

  createVendor: (data: Partial<Vendor>) =>
    api.post<Vendor>('/vendors', data),

  updateVendor: (id: string, data: Partial<Vendor>) =>
    api.put<Vendor>(`/vendors/${id}`, data),

  deleteVendor: (id: string) =>
    api.delete(`/vendors/${id}`),

  // V3.66.0 P1-3：已用信用额度相对原子更新（服务端权威值，根治「本地读→算→写」丢更新竞态）
  creditDelta: (id: string, delta: number, reason?: string) =>
    api.post<{ ok: boolean; usedCredit: number; creditLimit: number | null; delta: number }>(
      `/vendors/${id}/credit-delta`,
      { delta, reason },
    ),

  // Approval
  getPendingApprovals: () =>
    api.get<Vendor[]>('/vendors/pending-approvals'),

  approveVendor: (id: string, comments?: string) =>
    api.post<Vendor>(`/vendors/${id}/approve`, { comments }),

  rejectVendor: (id: string, reason: string) =>
    api.post<Vendor>(`/vendors/${id}/reject`, { reason }),

  // Blacklist
  getBlacklistedVendors: () =>
    api.get<Vendor[]>('/vendors/blacklist'),

  addToBlacklist: (id: string, reason: string) =>
    api.post<Vendor>(`/vendors/${id}/blacklist`, { reason }),

  removeFromBlacklist: (id: string) =>
    api.post<Vendor>(`/vendors/${id}/unblacklist`),

  // Rating
  getVendorRatings: (vendorId: string) =>
    api.get<VendorRatingRecord[]>(`/vendors/${vendorId}/ratings`),

  rateVendor: (vendorId: string, data: { rating: number; criteria: Record<string, number>; remarks?: string }) =>
    api.post<VendorRatingRecord>(`/vendors/${vendorId}/rate`, data),

  getAllRatings: () =>
    api.get<VendorRatingRecord[]>('/vendors/ratings'),
};

export default vendorApi;
