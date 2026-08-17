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
