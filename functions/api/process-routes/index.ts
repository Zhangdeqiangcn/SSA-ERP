// 工艺路线集合端点（C1 生产域 · 父子表）
// GET  /api/process-routes   列表（分页 / RLS，含每条路线的全部工序）
// POST /api/process-routes   创建（路线 + operations 一次性写入）
//
// ── 为什么不用通用实体路由 ──────────────────────────────────────
// `ProcessRoute.operations: Operation[]` 是嵌套数组，且 Operation 自己还带
// `skills: string[]`。通用路由（/api/entities/:resource）的设计前提是
// 「一个资源 = 一张平表」，它的 pickSnake 只挑登记过的列 ——
// **嵌套数组会被静默丢弃且返回 201**。
// 后果：「工艺路线列表都在、编号版本都对，但工序一条都没有」，
// 而工艺路线的全部价值就在于工序 —— 这是 V3.6.0 BOM 轮次最危险的那类缺陷。
import { pcList, pcCreate } from '../../_shared/parentChild';
import { PROCESS_ROUTE_PC } from '../../_shared/productionConfig';

export async function onRequestGet(context: any) {
  return pcList(PROCESS_ROUTE_PC, context);
}

export async function onRequestPost(context: any) {
  return pcCreate(PROCESS_ROUTE_PC, context);
}
