// 审批流集合端点（C1 审批流域 · 父子表）
// GET  /api/approval-flows   列表（分页 / RLS，含每条流程的全部审批节点）
// POST /api/approval-flows   创建（流程 + nodes 一次性写入）
//
// ── 为什么不用通用实体路由 ──────────────────────────────────────
// `ApprovalFlowConfig.nodes: ApprovalNode[]` 是嵌套数组，且**每个节点
// 自己还带嵌套**（conditions / skipRule / escalation 三个对象，
// approverRoles / approverUserIds / fields 三个字符串数组）。
// 通用路由的 pickSnake 只挑登记过的列，未登记字段会被**静默丢弃且返回 201**。
// 若走通用路由，后果是「审批流列表都在、点进去能看到流程名，
// 但审批节点一条都没有」—— 流程等于空的，且没有任何报错。
import { pcList, pcCreate } from '../../_shared/parentChild';
import { APPROVAL_FLOW_PC } from '../../_shared/approvalFlowConfig';

export async function onRequestGet(context: any) {
  return pcList(APPROVAL_FLOW_PC, context);
}

export async function onRequestPost(context: any) {
  return pcCreate(APPROVAL_FLOW_PC, context);
}
