// GET /api/three-way-match/check — 付款前预检（只判定，不留档）
//
// 用途：界面在用户点「付款」之前就能显示「这笔会被拦 / 会通过、差在哪里」，
// 而不是等提交下去被拒才知道。预检与真实闸门调用**同一个判定函数**
// （_shared/threeWayMatch.ts 的 evaluateThreeWayMatch），因此结论必然一致——
// 这一点很关键：如果预检与真闸门各写一套，就会出现「预检说能付、提交却被拦」，
// 用户会认为系统在骗人。
//
// 为什么不留档：预检可能被频繁调用（打开页面、改金额时都能触发），
// 若每次都写台账，真正的付款判定会被噪声淹没。
//
// 参数语义（容易用错，特别写清）：
//   poNo     必填（缺省则返回 NO_PO）
//   invoiceNo 可选。不传则按该采购订单号汇总其下全部有效发票
//   amount   可选。**不传时不做「付款是否超发票」这一项判断** ——
//            该项的前提是「本次要付多少」，没有金额就无从判断。
//            因此调用方若要看这一项，必须把金额带上；否则会得到
//            「三单一致」的结论，却误以为是「可以付这个数」。
//   advance  可选。预付款金额，> 0 时允许「暂无发票」这一正常情形。
import { getUserFromRequest, json } from '../../_shared/auth';
import { evaluateThreeWayMatch } from '../../_shared/threeWayMatch';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const poNo = (url.searchParams.get('poNo') || '').trim();
  const invoiceNo = (url.searchParams.get('invoiceNo') || '').trim();
  const payAmount = Number(url.searchParams.get('amount') || '0') || 0;
  const advanceAmount = Number(url.searchParams.get('advance') || '0') || 0;

  const check = await evaluateThreeWayMatch(env.DB, user.org_id, {
    poNo,
    invoiceNo,
    payAmount,
    advanceAmount,
  });

  // 预检不拦请求本身：它只是「问一句」，HTTP 一律 200，
  // 由响应体里的 ok / code / message 表达判定结论。
  return json({
    ok: check.ok,
    code: check.code,
    message: check.message,
    detail: check.detail,
  });
}
