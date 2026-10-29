// 审批流域数据访问层（C1 关系化 · V3.10.0）
//
// ── 本域为什么必须走专用端点，不能走通用实体路由 ──────────────────
// 通用实体路由 /api/entities/:resource 的前提是「一个资源 = 一张平表」，
// 它的 pickSnake 只挑已登记列，**嵌套数组会被静默丢弃且返回 201 成功**。
// 审批流的每个流程带 `nodes: ApprovalNode[]`，而每个 node 自己还带嵌套：
//   · conditions    : ConditionGroup（对象）
//   · skipRule      : SkipRule（对象）
//   · escalation    : EscalationRule（对象）
//   · approverRoles / approverUserIds / fields（字符串数组）
// 走通用路由的后果是「设置页显示保存成功、刷新后节点全空」——
// 比报错难查得多。因此走 `_shared/approvalFlowConfig.ts` +
// `_shared/parentChild.ts` 驱动的专用端点。
//
// 与 financeApi / salesDomainApi 保持**同一组方法名**（list/create/update/remove），
// 让 store 层不必关心某个切片走哪条通道 —— 将来换通道只改这里一处。
import { api } from './api';
import type { PaginatedResponse } from '@/types';

export interface CrudApi<T> {
  list: (params?: Record<string, unknown>) => Promise<PaginatedResponse<T>>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<unknown>;
}

/** 专用父子表端点通道 */
function viaEndpoint<T>(base: string): CrudApi<T> {
  return {
    list: (params) => api.get<PaginatedResponse<T>>(base, params),
    create: (data) => api.post<T>(base, data),
    update: (id, data) => api.put<T>(`${base}/${id}`, data),
    remove: (id) => api.delete(`${base}/${id}`),
  };
}

/**
 * 审批流定义（父表 approval_flows + 子表 approval_flow_nodes）。
 *
 * ★ 本域只有一个资源，因此直接导出 list/create/update/remove 四个方法，
 *   不再套一层 `{ flows: ... }` 命名空间 —— 与 financeApi / salesDomainApi
 *   的动作形状保持一致（那里是因为有多个切片才需要分组）。
 *
 * ★ 本域的 id 就是业务标识（`sales_order` / `material` / `custom-xxx`），
 *   **没有独立的「编号」列** —— 因此后端配置里 noSnake/noCamel 都取 `module`，
 *   409 冲突提示会显示成「审批流编号 sales_order 在本组织已存在」。
 */
const flows = viaEndpoint<any>('/approval-flows');

export const approvalFlowDomainApi = {
  list: flows.list,
  create: flows.create,
  update: flows.update,
  remove: flows.remove,
};

/**
 * 拉全量时一页最多取多少条。
 *
 * 审批流实测极小（`ssa-erp-approval-flows` 全键 6799 字节、13 条流程，
 * 上线后按当前代码补齐到 20 条）。每条流程的节点数在 1~3 之间，
 * 全量一趟取完，无需分页。与 financeApi / salesApi 同值同义。
 */
export const APPROVAL_FLOW_PAGE_SIZE = 500;
