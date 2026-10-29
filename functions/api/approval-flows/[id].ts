// 审批流单条端点
// GET    /api/approval-flows/:id   读取（含全部审批节点及其条件/升级规则）
// PUT    /api/approval-flows/:id   更新（不传 nodes = 节点保持原样；传 [] = 清空）
// DELETE /api/approval-flows/:id   删除（连带删除节点）
//
// 「不传」与「传空数组」必须区分（见 _shared/parentChild.ts 文件头不变量 ③）：
// 设置页最常见的操作是「把某个流程开关拨一下」（改 enabled）或
// 「换一下标准/简化方案」（改 profile）。这两种操作都**不涉及节点**，
// 若把「不传 nodes」当成清空，拨一下开关就会把整条审批流的审批步骤全删光 ——
// 而界面会提示「保存成功」，用户要等到下一张单据卡在没人审批时才发现。
import { pcGet, pcUpdate, pcRemove } from '../../_shared/parentChild';
import { APPROVAL_FLOW_PC } from '../../_shared/approvalFlowConfig';

export async function onRequestGet(context: any) {
  return pcGet(APPROVAL_FLOW_PC, context);
}

export async function onRequestPut(context: any) {
  return pcUpdate(APPROVAL_FLOW_PC, context);
}

export async function onRequestDelete(context: any) {
  return pcRemove(APPROVAL_FLOW_PC, context);
}
