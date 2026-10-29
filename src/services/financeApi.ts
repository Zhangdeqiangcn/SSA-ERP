// 财务域数据访问层（C1 关系化 · V3.8.0）
//
// ── 为什么拆成两种通道 ──────────────────────────────────────────
// 四个**平表切片**（分录 / 税务 / 科目 / 凭证）走通用实体路由
//   /api/entities/:resource —— 后端零新增代码，已在 ENTITY_RESOURCES 登记。
// 三个**带嵌套数组的切片**必须走专用端点：
//   · 发票（items 明细数组）—— V3.56.0 G3 从通用路由迁移到专用端点
//   · 付款计划（installments 分期数组）
//   · 项目核算（costItems 成本明细数组）
//   通用路由只挑已登记列，嵌套数组会被**静默丢弃**且返回 201 成功。
//
// 两种通道对外暴露**同一组方法**（list/create/update/remove），
// 让 store 层不必关心某切片走哪条路 —— 换通道时只改这里一处。
import { api } from './api';
import { entityRepo } from './entityRepo';
import type { PaginatedResponse } from '@/types';

export interface CrudApi<T> {
  list: (params?: Record<string, unknown>) => Promise<PaginatedResponse<T>>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<unknown>;
}

/** 通用实体路由通道（平表切片） */
function viaEntity<T>(resource: string): CrudApi<T> {
  return {
    list: (params) => entityRepo.list<T>(resource, params),
    create: (data) => entityRepo.create<T>(resource, data),
    update: (id, data) => entityRepo.update<T>(resource, id, data),
    remove: (id) => entityRepo.remove(resource, id),
  };
}

/** 专用父子表端点通道（带嵌套数组的切片） */
function viaEndpoint<T>(base: string): CrudApi<T> {
  return {
    list: (params) => api.get<PaginatedResponse<T>>(base, params),
    create: (data) => api.post<T>(base, data),
    update: (id, data) => api.put<T>(`${base}/${id}`, data),
    remove: (id) => api.delete(`${base}/${id}`),
  };
}

export const financeApi = {
  // ★ V3.56.0 G3：发票从通用实体路由迁移到专用端点（头+明细原子写入）
  invoices: viaEndpoint<any>('/fin-invoices'),
  // #8：报表真源已切换为 vouchers（见 financeStore 的 deriveEntries）。
  // 下面是旧表 fin_account_entries 的历史存档通道，业务代码已不再调用其写入；
  // 保留定义以避免影响其它潜在读取与类型引用。
  accountEntries: viaEntity<any>('finAccountEntry'),
  taxRecords: viaEntity<any>('finTaxRecord'),
  chartOfAccounts: viaEntity<any>('finChartAccount'),
  // V3.96.0 税码主数据（迁移 0114）：平表切片，走通用实体路由，登记于 entities.ts finTaxCode
  taxCodes: viaEntity<any>('finTaxCode'),
  paymentPlans: viaEndpoint<any>('/fin-payment-plans'),
  projectAccounts: viaEndpoint<any>('/fin-project-accounts'),
  // V3.26.0 凭证模板（常用凭证）：专用父子表端点通道（带嵌套数组 items）
  voucherTemplates: viaEndpoint<any>('/voucher-templates'),
};

/** 拉全量时一页最多取多少条（财务数据远小于此，留足余量避免漏行） */
export const FIN_PAGE_SIZE = 500;
