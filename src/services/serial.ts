// 序列号 / HU 主数据专用服务（W1-B1：根治双通道）。
// 直连真实 D1 serial_masters（与 B2 三岛同源），替代原 b2Api 双写桥。
// 行表 serial_masters 为 snake_case，这里统一转 camelCase 的 SerialMaster。
import { api } from './api';
import type { SerialMaster, SerialMovement } from '@/types/supplyChain';

export interface SerialListResponse {
  data: SerialMaster[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

/** D1 snake_case 行 → 前端 SerialMaster */
function rowToSerialMaster(r: Record<string, unknown>): SerialMaster {
  const movements = Array.isArray(r.movements) ? (r.movements as SerialMovement[]) : [];
  return {
    id: r.id as string,
    serialNo: (r.serial_no as string) || '',
    materialId: (r.material_id as string) || '',
    materialCode: (r.material_code as string) || undefined,
    materialName: (r.material_name as string) || undefined,
    batchNo: (r.batch_no as string) || undefined,
    warehouseId: (r.warehouse_id as string) || undefined,
    huId: (r.hu_id as string) || undefined,
    status: (r.status as SerialMaster['status']) || 'in_stock',
    inboundDate: (r.inbound_date as string) || undefined,
    outboundDate: (r.outbound_date as string) || undefined,
    customerName: (r.customer_name as string) || undefined,
    remarks: (r.remarks as string) || undefined,
    movements,
    createdAt: (r.created_at as string) || '',
    updatedAt: (r.updated_at as string) || '',
    createdBy: (r.created_by as string) || '',
    updatedBy: (r.updated_by as string) || '',
  };
}

/** 前端 SerialMaster → POST/PUT payload（snake_case，严格匹配后端）。可附带 movement 落 serial_movements。 */
export function toSerialPayload(s: Partial<SerialMaster> & { movement?: SerialMovement }): Record<string, unknown> {
  const p: Record<string, unknown> = {
    serialNo: s.serialNo,
    materialId: s.materialId,
    materialCode: s.materialCode,
    materialName: s.materialName,
    batchNo: s.batchNo,
    warehouseId: s.warehouseId,
    huId: s.huId,
    status: s.status,
    inboundDate: s.inboundDate,
    outboundDate: s.outboundDate,
    customerName: s.customerName,
    remarks: s.remarks,
  };
  if (s.movement) p.movement = s.movement;
  return p;
}

export interface SerialApi {
  list: (params?: { keyword?: string; status?: string; page?: number; pageSize?: number }) => Promise<SerialListResponse>;
  get: (id: string) => Promise<SerialMaster>;
  create: (data: Partial<SerialMaster> & { movement?: SerialMovement }) => Promise<SerialMaster>;
  update: (id: string, data: Partial<SerialMaster> & { movement?: SerialMovement }) => Promise<SerialMaster>;
  remove: (id: string) => Promise<unknown>;
}

export const serialApi: SerialApi = {
  list: (params) => api.get<SerialListResponse>('/serial-numbers', params),
  get: (id) => api.get<SerialMaster>(`/serial-numbers/${encodeURIComponent(id)}`),
  create: (data) => api.post<SerialMaster>('/serial-numbers', toSerialPayload(data)),
  update: (id, data) => api.put<SerialMaster>(`/serial-numbers/${encodeURIComponent(id)}`, toSerialPayload(data)),
  remove: (id) => api.delete(`/serial-numbers/${encodeURIComponent(id)}`),
};

export default serialApi;
