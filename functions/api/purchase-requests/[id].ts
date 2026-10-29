// 采购申请单条端点（C1 采购域 · 父子表）
// GET    /api/purchase-requests/:id   读取（含全部物料明细）
// PUT    /api/purchase-requests/:id   更新（不传 items = 明细保持原样；传 [] = 清空）
// DELETE /api/purchase-requests/:id   删除（连带删除明细）
//
// ── ★ 「不传」与「传空数组」必须区分（见 _shared/parentChild.ts 不变量 ③）
// 采购申请最高频的两个操作**都不涉及明细**：
//   · 审批通过/驳回 → `updatePurchaseRequest(id, { status, approvalRecords })`
//     （PurchaseApproval.tsx 第 194/200/209 行）
//   · 从申请生成订单后 → `updatePurchaseRequest(rid, { status: 'ordered' })`
//     （OrderForm.tsx 第 725/860 行）
// 若把「不传 items」当成清空，**审批一次就把申请的全部物料删光** ——
// 而界面会提示「保存成功」（PUT 返回 200），用户要等到采购员下单时
// 发现申请单是空白的才知道。这类缺陷在真实环境极难复现与定位。
import { pcGet, pcUpdate, pcRemove } from '../../_shared/parentChild';
import { PURCHASE_REQUEST_PC } from '../../_shared/purchaseConfig';

export async function onRequestGet(context: any) {
  return pcGet(PURCHASE_REQUEST_PC, context);
}

export async function onRequestPut(context: any) {
  return pcUpdate(PURCHASE_REQUEST_PC, context);
}

export async function onRequestDelete(context: any) {
  return pcRemove(PURCHASE_REQUEST_PC, context);
}
