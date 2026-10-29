// 计划订单 API 服务层（V3.5.0 B2 流程闭环）
//
// 为什么单独一个文件而不是塞进 w1Api：
//   w1Api 的语义是「W1 轮次的三个域（销售/工单/凭证）」，B2 是另一轮次的产物。
//   混在一起会让「这个端点属于哪一轮改造」变得不可考，后续维护者难以判断能否安全改动。
//
// 与既有 api.ts 客户端的差异（**刻意保留**）：
//   api.ts 的响应拦截器在 401 时会 `window.location.href = '/login'` 强制跳转。
//   本模块的行为是「打开页面即拉数据」，若用户在计划订单页停留过久导致 token 过期，
//   强制跳登录页会让整页输入丢失。故本模块对 401 采取「返回空、页面显示提示」的温和策略。
import apiClient from './api';

/** 计划订单（落库后的形态，字段与后端 rowToApi 对齐） */
export interface PlannedOrder {
  id: string;
  runId: string;
  runAt?: string | null;
  materialCode: string;
  materialName?: string | null;
  unit?: string | null;
  type: 'purchase' | 'manufacture';
  grossQty: number;
  onHandQty: number;
  onOrderQty: number;
  netQty: number;
  plannedQty: number;
  dueDate?: string | null;
  bucketStart?: string | null;
  lowLevelCode: number;
  status: 'draft' | 'confirmed' | 'converted' | 'void';
  convertedType?: string | null;
  convertedId?: string | null;
  convertedNo?: string | null;
  priority?: string | null;
  reason?: string | null;
  note?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** 一次 MRP 运算批次的汇总（用于「轮次对比」） */
export interface PlannedRunSummary {
  runId: string;
  runAt?: string | null;
  total: number;
  purchase: number;
  manufacture: number;
  totalPlannedQty: number;
  byStatus: Record<string, number>;
}

/** 落库入参的每一行（与 MRP 页面算出来的行直接对接） */
export interface PlannedOrderInput {
  materialCode: string;
  materialName?: string;
  unit?: string;
  type: 'purchase' | 'manufacture';
  grossQty: number;
  onHandQty: number;
  onOrderQty: number;
  netQty: number;
  plannedQty: number;
  dueDate?: string;
  bucketStart?: string;
  lowLevelCode?: number;
  priority?: string;
  reason?: string;
  note?: string;
}

export interface PersistResult {
  success: boolean;
  runId: string;
  inserted: number;
  updated: number;
  skipped: number;
  skippedSample: string[];
  total: number;
}

export const plannedOrderApi = {
  /** 查建议明细。runId='latest' 表示最新一批（计划员最常用） */
  list: (params?: Record<string, unknown>) =>
    apiClient.get<{ data: PlannedOrder[]; pagination: { page: number; pageSize: number; total: number } }>(
      '/planned-orders',
      { params },
    ),

  /** 查最近若干轮运算的汇总（轮次对比） */
  listRuns: (limit = 10) =>
    apiClient.get<{ data: PlannedRunSummary[] }>('/planned-orders', { params: { runs: 1, limit } }),

  /** 整批落库（幂等：同一 runId 重复提交只会更新，不会产生重复行） */
  persist: (runId: string, rows: PlannedOrderInput[], runAt?: string) =>
    apiClient.post<PersistResult>('/planned-orders', { action: 'persist', runId, rows, runAt }),

  /** 确认 / 否决（人的判断，与机器落库分离） */
  setStatus: (id: string, status: PlannedOrder['status'], note?: string) =>
    apiClient.patch<PlannedOrder>('/planned-orders', { id, status, note }),
};
