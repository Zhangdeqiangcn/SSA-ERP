// 发货单集合端点（C1 销售域 · 父子表）
// GET  /api/shipments   列表（分页 / keyword / RLS，含每张发货单的明细行）
// POST /api/shipments   创建（发货单 + items 一次性写入）
//
// ── 为什么不用通用实体路由 ──────────────────────────────────────
// `Shipment.items: ShipmentItem[]` 是嵌套数组，通用路由会静默丢弃。
// 后果：物流列表显示发货单号/承运商/状态全都在（看不出异常），
// 但点开详情没有货品明细 —— 而「这车发了哪些料、各多少件」
// 正是发货单存在的全部意义，也是与销售订单核销的依据。
//
// ── 为什么表名不叫 sales_shipments ──────────────────────────────
// 保留 `shipments` 是因为这个域在业务上没有歧义（全系统只有销售发货），
// 前端切片名就叫 `shipments`，表名与切片名一致更利于对照排查。
import { pcList, pcCreate } from '../../_shared/parentChild';
import { SHIPMENT_PC } from '../../_shared/salesConfig';
import { getUserFromRequest, json } from '../../_shared/auth';
import { runShipmentOutboundLink } from '../../_shared/shipmentOutboundLink';

export async function onRequestGet(context: any) {
  return pcList(SHIPMENT_PC, context);
}

export async function onRequestPost(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const resp = await pcCreate(SHIPMENT_PC, context);
  // pcCreate 出错时直接透传（4xx/5xx）
  const respStatus = (resp as any).status;
  if (respStatus && respStatus >= 400) return resp;
  // ★ 必须透传原状态码（建单成功是 201）：曾因重包json() 导致 201 变 200，
  //   被20 号与 43 号守护套件当场抓出（"期望=201 实际=200"）。
  const createdStatus = respStatus || 200;

  // ★ V3.61.0 S-06：建单即发货（status 直接是 shipped）也必须触发联动。
  //   此前联动只挂在 PUT 的「未发货→已发货」状态边沿，而 POST 走 pcCreate
  //   完全绕过 → 批量导入或 API 直调建单时若状态为 shipped，会出现
  //   「界面显示已发货、库存没扣、销售订单已交量没回写」的假成功。
  //   现在与 PUT 共用同一助手（内部按source_no 查重，重复触发不二次扣库存）。
  const created: any = await (resp as any).json();
  if (created?.status === 'shipped') {
    const issues = await runShipmentOutboundLink(context.env.DB, user, {
      ...created,
      shipmentNo: created?.shipmentNo || created?.shipment_no || created?.id,
    });
    if (issues.length > 0) (created as any).postingError = issues.join('；');
  }
  return json(created, createdStatus);
}