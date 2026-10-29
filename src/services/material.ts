import { api, apiClient } from './api';
import { Material, MaterialCategory, MaterialFilter, PaginatedResponse } from '@/types';

export const materialApi = {
  // Material CRUD
  getMaterials: (params?: MaterialFilter & { page?: number; pageSize?: number }) =>
    api.get<PaginatedResponse<Material>>('/materials', params),

  getMaterial: (id: string) =>
    api.get<Material>(`/materials/${id}`),

  createMaterial: (data: Partial<Material>) =>
    api.post<Material>('/materials', data),

  updateMaterial: (id: string, data: Partial<Material>) =>
    api.put<Material>(`/materials/${id}`, data),

  deleteMaterial: (id: string) =>
    api.delete(`/materials/${id}`),

  // Category CRUD
  getCategories: () =>
    api.get<MaterialCategory[]>('/material-categories'),

  getCategory: (id: string) =>
    api.get<MaterialCategory>(`/material-categories/${id}`),

  createCategory: (data: Partial<MaterialCategory>) =>
    api.post<MaterialCategory>('/material-categories', data),

  updateCategory: (id: string, data: Partial<MaterialCategory>) =>
    api.put<MaterialCategory>(`/material-categories/${id}`, data),

  deleteCategory: (id: string) =>
    api.delete(`/material-categories/${id}`),

  // Generate code（按分类层级前缀 + 流水号，由前端 codeGenerator 生成）
  generateCode: (categoryId: string) =>
    api.get<{ code: string }>(`/materials/generate-code?categoryId=${categoryId}`),

  // Import/Export
  importMaterials: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<{ success: number; failed: number; errors?: string[] }>(
      '/materials/import',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then((res: { data: { success: number; failed: number; errors?: string[] } }) => res.data);
  },

  exportMaterials: (params?: MaterialFilter) =>
    api.get<Blob>('/materials/export', { ...params, responseType: 'blob' } as Record<string, unknown>),
};

export default materialApi;
