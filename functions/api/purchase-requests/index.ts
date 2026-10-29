// 采购申请集合端点（C1 采购域 · 父子表）
// GET  /api/purchase-requests   列表（分页 / RLS，含每张申请的全部物料明细）
// POST /api/purchase-requests   创建（申请 + items 一次性写入）
//
// ── 为什么不用通用实体路由 ──────────────────────────────────────
// `PurchaseRequest.items: PurchaseRequestItem[]` 是嵌套数组。
// 通用路由（/api/entities/:resource）的设计前提是「一个资源 = 一张平表」，
// 它的 pickSnake 只挑登记过的列 —— **未登记字段会被静默丢弃且返回 201**。
// 若走通用路由，后果是「申请列表都在、点进去能看到单号，
// 但物料明细一条都没有」—— 申请单等于空的，且没有任何报错。
// 这与审批流（节点全空）是同一类缺陷，只是丢的东西不同。
import { pcList, pcCreate } from '../../_shared/parentChild';
import { PURCHASE_REQUEST_PC } from '../../_shared/purchaseConfig';

export async function onRequestGet(context: any) {
  return pcList(PURCHASE_REQUEST_PC, context);
}

export async function onRequestPost(context: any) {
  return pcCreate(PURCHASE_REQUEST_PC, context);
}
