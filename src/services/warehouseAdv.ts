// 仓库高级三切片专用服务（W2 收尾：根治双通道）。
// 直连真实 D1 stock_transfers / inventory_adjustments / quality_holds（与已迁域同源），
// 替代原 warehouseAdvancedStore 的 app_state Blob 持久化。行表为 snake_case，这里统一转 camelCase。
import { api } from './api';
import type { StockTransfer, StockTransferItem, InventoryAdjustment, InventoryAdjustmentItem, QualityHold } from '@/types/supplyChain';

// ── stock_transfers ──
function rowToTransfer(r: Record<string, unknown>): StockTransfer {
  return {
    id: r.id as string,
    transferNo: (r.transfer_no as string) || '',
    fromWarehouseId: (r.from_warehouse_id as string) || '',
    fromWarehouseName: (r.from_warehouse_name as string) || undefined,
    toWarehouseId: (r.to_warehouse_id as string) || '',
    toWarehouseName: (r.to_warehouse_name as string) || undefined,
    fromOrgId: (r.from_org_id as string) || undefined,
    toOrgId: (r.to_org_id as string) || undefined,
    status: (r.status as StockTransfer['status']) || 'draft',
    transferDate: (r.transfer_date as string) || '',
    remarks: (r.remarks as string) || undefined,
    items: (Array.isArray(r.items) ? (r.items as Record<string, unknown>[]) : []).map(rowToTransferItem),
    createdAt: (r.created_at as string) || '',
    updatedAt: (r.updated_at as string) || '',
    createdBy: (r.created_by as string) || '',
    updatedBy: (r.updated_by as string) || '',
  };
}
function rowToTransferItem(r: Record<string, unknown>): StockTransferItem {
  return {
    id: r.id as string,
    materialId: (r.material_id as string) || '',
    materialCode: (r.material_code as string) || undefined,
    materialName: (r.material_name as string) || undefined,
    unit: (r.unit as string) || undefined,
    quantity: Number(r.quantity) || 0,
    batchNo: (r.batch_no as string) || undefined,
    locationId: (r.location_id as string) || undefined,
  };
}

// ── inventory_adjustments ──
function rowToAdjustment(r: Record<string, unknown>): InventoryAdjustment {
  return {
    id: r.id as string,
    adjustmentNo: (r.adjustment_no as string) || '',
    warehouseId: (r.warehouse_id as string) || '',
    warehouseName: (r.warehouse_name as string) || undefined,
    status: (r.status as InventoryAdjustment['status']) || 'draft',
    reason: (r.reason as string) || '',
    date: (r.date as string) || '',
    items: (Array.isArray(r.items) ? (r.items as Record<string, unknown>[]) : []).map(rowToAdjustmentItem),
    totalDeltaQty: Number(r.total_delta_qty) || 0,
    voucherNo: (r.voucher_no as string) || undefined,
    createdAt: (r.created_at as string) || '',
    updatedAt: (r.updated_at as string) || '',
    createdBy: (r.created_by as string) || '',
    updatedBy: (r.updated_by as string) || '',
  };
}
function rowToAdjustmentItem(r: Record<string, unknown>): InventoryAdjustmentItem {
  return {
    id: r.id as string,
    materialId: (r.material_id as string) || '',
    materialCode: (r.material_code as string) || undefined,
    materialName: (r.material_name as string) || undefined,
    unit: (r.unit as string) || undefined,
    locationId: (r.location_id as string) || undefined,
    bookQty: Number(r.book_qty) || 0,
    actualQty: Number(r.actual_qty) || 0,
    deltaQty: Number(r.delta_qty) || 0,
    reason: (r.reason as string) || undefined,
  };
}

// ── quality_holds ──
function rowToHold(r: Record<string, unknown>): QualityHold {
  return {
    id: r.id as string,
    materialId: (r.material_id as string) || '',
    materialCode: (r.material_code as string) || undefined,
    materialName: (r.material_name as string) || undefined,
    warehouseId: (r.warehouse_id as string) || '',
    warehouseName: (r.warehouse_name as string) || undefined,
    batchNo: (r.batch_no as string) || undefined,
    quantity: Number(r.quantity) || 0,
    status: (r.status as QualityHold['status']) || 'pending',
    sourceInboundNo: (r.source_inbound_no as string) || undefined,
    holdDate: (r.hold_date as string) || '',
    releaseDate: (r.release_date as string) || undefined,
    inspector: (r.inspector as string) || undefined,
    reason: (r.reason as string) || undefined,
  };
}

export interface WarehouseAdvApi<T> {
  list: (params?: { keyword?: string; status?: string; page?: number; pageSize?: number }) => Promise<{ data: T[]; total: number; page: number; pageSize: number }>;
  get: (id: string) => Promise<T>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<unknown>;
}

const stockTransfers: WarehouseAdvApi<StockTransfer> = {
  list: async (params) => {
    const res = await api.get<{ data: Record<string, unknown>[]; total: number; page: number; pageSize: number }>('/stock-transfers', params);
    return { data: (res?.data || []).map(rowToTransfer), total: res?.total || 0, page: res?.page || 1, pageSize: res?.pageSize || 20 };
  },
  get: async (id) => rowToTransfer(await api.get<Record<string, unknown>>(`/stock-transfers/${encodeURIComponent(id)}`)),
  create: async (data) => rowToTransfer(await api.post<Record<string, unknown>>('/stock-transfers', data as Record<string, unknown>)),
  update: async (id, data) => rowToTransfer(await api.put<Record<string, unknown>>(`/stock-transfers/${encodeURIComponent(id)}`, data as Record<string, unknown>)),
  remove: async (id) => api.delete(`/stock-transfers/${encodeURIComponent(id)}`),
};

const inventoryAdjustments: WarehouseAdvApi<InventoryAdjustment> = {
  list: async (params) => {
    const res = await api.get<{ data: Record<string, unknown>[]; total: number; page: number; pageSize: number }>('/inventory-adjustments', params);
    return { data: (res?.data || []).map(rowToAdjustment), total: res?.total || 0, page: res?.page || 1, pageSize: res?.pageSize || 20 };
  },
  get: async (id) => rowToAdjustment(await api.get<Record<string, unknown>>(`/inventory-adjustments/${encodeURIComponent(id)}`)),
  create: async (data) => rowToAdjustment(await api.post<Record<string, unknown>>('/inventory-adjustments', data as Record<string, unknown>)),
  update: async (id, data) => rowToAdjustment(await api.put<Record<string, unknown>>(`/inventory-adjustments/${encodeURIComponent(id)}`, data as Record<string, unknown>)),
  remove: async (id) => api.delete(`/inventory-adjustments/${encodeURIComponent(id)}`),
};

const qualityHolds: WarehouseAdvApi<QualityHold> = {
  list: async (params) => {
    const res = await api.get<{ data: Record<string, unknown>[]; total: number; page: number; pageSize: number }>('/quality-holds', params);
    return { data: (res?.data || []).map(rowToHold), total: res?.total || 0, page: res?.page || 1, pageSize: res?.pageSize || 20 };
  },
  get: async (id) => rowToHold(await api.get<Record<string, unknown>>(`/quality-holds/${encodeURIComponent(id)}`)),
  create: async (data) => rowToHold(await api.post<Record<string, unknown>>('/quality-holds', data as Record<string, unknown>)),
  update: async (id, data) => rowToHold(await api.put<Record<string, unknown>>(`/quality-holds/${encodeURIComponent(id)}`, data as Record<string, unknown>)),
  remove: async (id) => api.delete(`/quality-holds/${encodeURIComponent(id)}`),
};

export const warehouseAdv = { stockTransfers, inventoryAdjustments, qualityHolds };
export default warehouseAdv;
