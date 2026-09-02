// 委外订单专用服务（W1-B1：根治双通道）。
// 直连真实 D1 subcontract_orders（与 B2 三岛同源），替代原 b2Api 双写桥。
// 行表 subcontract_orders 为 snake_case，这里统一转 camelCase 的 SubcontractOrder。
import { api } from './api';
import type { SubcontractOrder, SubcontractIssueItem } from '@/types/production';

export interface SubcontractListResponse {
  data: SubcontractOrder[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

/** D1 snake_case 行 → 前端 SubcontractOrder */
function rowToSubcontract(r: Record<string, unknown>): SubcontractOrder {
  let receiptInboundNos: string[] = [];
  const rawReceipt = r.receipt_inbound_nos;
  if (rawReceipt) {
    try {
      receiptInboundNos =
        typeof rawReceipt === 'string' ? (JSON.parse(rawReceipt) as string[]) : (rawReceipt as string[]);
    } catch {
      receiptInboundNos = [];
    }
  }
  const issueItems = Array.isArray(r.issueItems)
    ? (r.issueItems as Record<string, unknown>[]).map((it) => ({
        id: it.id as string,
        materialId: (it.material_id as string) || '',
        materialCode: (it.material_code as string) || '',
        materialName: (it.material_name as string) || '',
        unit: (it.unit as string) || '',
        qty: Number(it.qty) || 0,
      }))
    : [];

  const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);

  return {
    id: r.id as string,
    orderNo: (r.order_no as string) || '',
    type: (r.type as SubcontractOrder['type']) || 'process',
    materialId: (r.material_id as string) || '',
    materialCode: (r.material_code as string) || '',
    materialName: (r.material_name as string) || '',
    vendorId: (r.vendor_id as string) || '',
    vendorName: (r.vendor_name as string) || '',
    qty: num(r.qty),
    bomId: (r.bom_id as string) || undefined,
    sourceWorkOrderId: (r.source_work_order_id as string) || undefined,
    issueItems,
    status: (r.status as SubcontractOrder['status']) || 'draft',
    planDate: (r.plan_date as string) || '',
    note: (r.note as string) || undefined,
    processFee: num(r.process_fee),
    receivedQty: num(r.received_qty),
    issueOutboundNo: (r.issue_outbound_no as string) || undefined,
    receiptInboundNos,
    createdAt: (r.created_at as string) || '',
    updatedAt: (r.updated_at as string) || '',
    createdBy: (r.created_by as string) || '',
    updatedBy: (r.updated_by as string) || '',
  };
}

/** 前端 SubcontractOrder → POST/PUT payload（snake_case，严格匹配后端）。 */
export function toSubcontractPayload(o: Partial<SubcontractOrder>): Record<string, unknown> {
  return {
    orderNo: o.orderNo,
    type: o.type,
    materialId: o.materialId,
    materialCode: o.materialCode,
    materialName: o.materialName,
    vendorId: o.vendorId,
    vendorName: o.vendorName,
    qty: o.qty,
    bomId: o.bomId,
    sourceWorkOrderId: o.sourceWorkOrderId,
    status: o.status,
    planDate: o.planDate,
    processFee: o.processFee,
    receivedQty: o.receivedQty,
    issueOutboundNo: o.issueOutboundNo,
    // TEXT 列：数组必须 JSON.stringify 后再存，读取端 JSON.parse
    receiptInboundNos: Array.isArray(o.receiptInboundNos) ? JSON.stringify(o.receiptInboundNos) : o.receiptInboundNos,
    issueItems: (o.issueItems || []).map((it: SubcontractIssueItem) => ({
      materialId: it.materialId,
      materialCode: it.materialCode,
      materialName: it.materialName,
      unit: it.unit,
      qty: it.qty,
    })),
  };
}

export interface SubcontractApi {
  list: (params?: { keyword?: string; status?: string; page?: number; pageSize?: number }) => Promise<SubcontractListResponse>;
  get: (id: string) => Promise<SubcontractOrder>;
  create: (data: Partial<SubcontractOrder>) => Promise<SubcontractOrder>;
  update: (id: string, data: Partial<SubcontractOrder>) => Promise<SubcontractOrder>;
  remove: (id: string) => Promise<unknown>;
}

export const subcontractApi: SubcontractApi = {
  list: (params) => api.get<SubcontractListResponse>('/subcontracts', params),
  get: (id) => api.get<SubcontractOrder>(`/subcontracts/${encodeURIComponent(id)}`),
  create: (data) => api.post<SubcontractOrder>('/subcontracts', toSubcontractPayload(data)),
  update: (id, data) => api.put<SubcontractOrder>(`/subcontracts/${encodeURIComponent(id)}`, toSubcontractPayload(data)),
  remove: (id) => api.delete(`/subcontracts/${encodeURIComponent(id)}`),
};

export default subcontractApi;
