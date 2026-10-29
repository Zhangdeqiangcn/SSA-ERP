// 发货单单条端点
// GET    /api/shipments/:id   读取（含货品明细）
// PUT    /api/shipments/:id   更新（不传 items = 明细保持原样；传 [] = 清空）
// DELETE /api/shipments/:id   删除（连带删除明细）
//
// ★ 发货单最频繁的操作是「推进状态」：pending → picked → packed → shipped
//   → in_transit → delivered。这条链路上每一步都**不带 items**。
//   若把「不传 items」当成清空，每次点一次「已装车」就会把整张发货单的
//   货品明细删光，而界面依旧显示操作成功 —— 这是最典型的静默数据损坏。
//
// ── S-03/S-04 发货→出库联动（V3.59.0）────────────────────────────
// 旧实现：发货单端点只是纯 pcUpdate，发货→出库是完全断链的两条线 ——
//   销售发货了，但库存/成本要等仓管再「手动建一张出库单」才会动，
//   且销售订单的「已交数量 delivered_quantity」永远停在 0（对账时
//   无法判断一笔销售订单是否已发完货）。这正是审计 S-03/S-04 点名的缺口。
// 新实现：当发货单状态**从未发货变为「已发货 shipped」**时，在服务端
//   ① 自动生成一张销售出库单（type=sale，source_no=发货单号，状态 completed
//      直接过账扣库存 + 结转 COGS，与手工出库单同口径）；
//   ② 按物料编码把发货数量写回销售订单行的 delivered_quantity（封顶订单数量）；
//   ③ 重算销售订单表头 delivered_quantity = Σ 行已交数量。
// 幂等：① 状态边沿触发（oldStatus!=shipped && newStatus==shipped）；
//       ② 按 source_no 查重，已生成过出库单则跳过（防重复触发/重复扣库存）。
// 可感知失败（铁律㊴）：联动任何异常都不阻断发货单本身的状态更新，
//   而是随响应体 postingError 回传前端红条，与 WH-17 同口径。
import { pcGet, pcUpdate, pcRemove } from '../../_shared/parentChild';
import { SHIPMENT_PC } from '../../_shared/salesConfig';
import { getUserFromRequest, json } from '../../_shared/auth';
import { runShipmentOutboundLink } from '../../_shared/shipmentOutboundLink';

export async function onRequestGet(context: any) {
  return pcGet(SHIPMENT_PC, context);
}

export async function onRequestDelete(context: any) {
  return pcRemove(SHIPMENT_PC, context);
}

export async function onRequestPut(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const DB = context.env.DB;
  const id = context.params.id;
  const existing: any = await DB.prepare(`SELECT * FROM shipments WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '发货单不存在' }, 404);

  const oldStatus = existing.status;

  // 先执行标准更新（状态推进 / 明细修改等），拿回更新后的完整单据（含 items）
  const updResp = await pcUpdate(SHIPMENT_PC, context);
  if ((updResp as any).status && (updResp as any).status >= 400) return updResp;
  const updated: any = await updResp.json();
  const newStatus = updated?.status;
  const salesOrderNo = updated?.salesOrderNo || existing.sales_order_no;

  // ── S-03/S-04 发货→出库联动：仅在「未发货 → 已发货」的边沿触发一次 ──
  // ★ V3.61.0：实现已抽到_shared/shipmentOutboundLink.ts，供POST 建单即发货
  //   与 PUT 状态推进共用（此前只在 PUT 生效，POST 直传 shipped 完全绕过联动）。
  const linkIssues: string[] = [];
  if (newStatus === 'shipped' && oldStatus !== 'shipped') {
    linkIssues.push(...await runShipmentOutboundLink(DB, user, {
      ...updated,
      salesOrderNo,
      shipmentNo: existing.shipment_no || updated?.shipmentNo || id,
      customerName: updated?.customerName || existing.customer_name || null,
    }));
  }

  // 把联动结果（warning / error）回传给前端，与 WH-17 同口径
  if (linkIssues.length > 0) (updated as any).postingError = linkIssues.join('；');
  return json(updated);
}