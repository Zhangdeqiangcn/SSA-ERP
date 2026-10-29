// 供应商报价集合端点（C1 采购域 · 父子表）
// GET  /api/vendor-quotes   列表（分页 / RLS，含每条报价的全部物料明细）
// POST /api/vendor-quotes   创建（报价 + items 一次性写入）
//
// ── 关于路径的取舍（为什么不做成 /purchase-requests/:id/quotes）──
// `src/services/purchase.ts` 里早就声明了 `getQuotes(requestId)` /
// `submitQuote(requestId, ...)` 指向 `/purchase-requests/:id/quotes`，
// 但那是**悬空的接口存根**（后端从来没有这个文件）。
// 本轮选择独立路径 `/api/vendor-quotes`，理由：
//   1. 报价本身有独立的 id、有效期、提交时间，是**一等业务实体**，
//      不是「申请单的一个附属视图」；
//   2. `VendorQuote.requestId` 只是外键，按它过滤是**查询条件**，
//      不必做成路径层级；
//   3. 与前面五个域（bom / print-templates / fin-* / sales-* /
//      approval-flows）全部采用「父表独立路径」的形态一致，
//      减少一个特例就少一处将来要对齐的地方。
// 前端 store 里按 requestId 在内存中筛选即可（数据量极小）。
//
// ★ vendor_quotes 的 RLS 登记为 `'all'`（公司级公共信息）——
//   报价是比价依据，采购员与审批人都要看全部报价才能比出最低价。
//   这与 purchase_requests 的 `'own'`（个人提报单据）刻意不同，
//   见 _shared/purchaseConfig.ts 文件头说明。
import { pcList, pcCreate } from '../../_shared/parentChild';
import { VENDOR_QUOTE_PC } from '../../_shared/purchaseConfig';

export async function onRequestGet(context: any) {
  return pcList(VENDOR_QUOTE_PC, context);
}

export async function onRequestPost(context: any) {
  return pcCreate(VENDOR_QUOTE_PC, context);
}
