// POST /api/three-way-match/create — 手工发起一次三单匹配判定并留档
// ⚠️ 路由：真实路径带 /create 后缀。本文件是 create.ts 而非 index.ts，
//    Cloudflare Pages Functions 按文件名映射路由，所以 POST /api/three-way-match
//    会返回 405（V3.18.0 线上实测确认）。
//    查询走 GET /api/three-way-match（index.ts）；付款前预检走 /check。
//
// ── V3.19.0 口径统一 ─────────────────────────────────────────────
// 本文件原先自带一套判定算法，接收前端传来的 poQuantity / invoiceUnitPrice 等数值。
// 问题有两层：
//   ① 它与界面上的另外两套算法（Finance/ThreeWayMatch.tsx、Purchase/OrderDetail.tsx）
//      对同一个业务判定给出不同答案；
//   ② 由前端传数值意味着可以传一个「刚好能通过」的数字进来。
// 现在改为：只接收采购订单号与发票号，三个金额全部由服务端从
// purchase_orders / inbound_orders / fin_invoices 自行取数并判定，
// 判定函数与付款闸门完全相同（_shared/threeWayMatch.ts）。
import { getUserFromRequest, json } from '../../_shared/auth';
import { evaluateThreeWayMatch, recordThreeWayMatch } from '../../_shared/threeWayMatch';

export async function onRequestPost(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));

  const poNo = String(body?.poNo ?? body?.po_no ?? '').trim();
  const invoiceNo = String(body?.invoiceNo ?? body?.invoice_no ?? '').trim();
  const advanceAmount = Number(body?.advanceAmount ?? body?.advance_amount ?? 0) || 0;

  if (!poNo) return json({ error: '缺少采购订单号（poNo）' }, 400);

  const input = { poNo, invoiceNo: invoiceNo || null, advanceAmount };
  const check = await evaluateThreeWayMatch(db, user.org_id, input);
  // 无论结论如何都留档：三单匹配是付款前置闸门，
  // 「当时判定为不可付款」这条信息与「判定为可付款」同等重要。
  const id = await recordThreeWayMatch(db, user.org_id, { id: user.id, name: user.name }, input, check);

  return json({
    success: true,
    id,
    matchStatus: check.ok ? 'matched' : 'discrepancy',
    blocked: !check.ok,
    code: check.code,
    message: check.message,
    detail: check.detail,
  });
}
