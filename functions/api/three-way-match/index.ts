// GET /api/three-way-match — 三单匹配留档记录（付款闸门历次判定的台账）
//
// 【为什么要有这个端点】
// V3.18.0 复核时发现：本目录此前**只有 create.ts，没有任何 GET**，
// 而老的用户手册里却写着「新增 /api/three-way-match（GET 分页查询 + POST 创建）」——
// 手册描述了一个不存在的接口。付款闸门留档的数据因此只有写、没有读，
// 出了问题无法在界面上追溯「当时是谁、依据什么、判成什么样」。
// 本文件补齐读路径。
//
// 同时这也解释了另一个长期疑点：前端为什么从来不调用这个域？
// 因为按手册去调，GET 拿到的是 404 / POST 拿到的是 405（路径少了 /create 后缀）。
import { getUserFromRequest, json } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';
import { TWM_TOLERANCE } from '../../_shared/threeWayMatch';

/** 库行 → 前端 camelCase（只暴露业务关心的字段，不整行透传） */
function toApi(r: any) {
  return {
    id: r.id,
    poId: r.po_id,
    poNo: r.po_no,
    invoiceNo: r.invoice_no,
    matchStatus: r.match_status,
    poQuantity: r.po_quantity,
    inboundQuantity: r.inbound_quantity,
    qtyVariance: r.qty_variance,
    qtyMatch: !!r.qty_match,
    poUnitPrice: r.po_unit_price,
    invoiceUnitPrice: r.invoice_unit_price,
    priceVariance: r.price_variance,
    priceMatch: !!r.price_match,
    poAmount: r.po_amount,
    inboundAmount: r.inbound_amount,
    invoiceAmount: r.invoice_amount,
    amountVariance: r.amount_variance,
    amountMatch: !!r.amount_match,
    matchedBy: r.matched_by,
    matchedAt: r.matched_at,
    discrepancy: r.discrepancy,
    remarks: r.remarks,
    createdAt: r.created_at,
  };
}

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50', 10)));
  const offset = (page - 1) * pageSize;
  const poNo = (url.searchParams.get('poNo') || '').trim();
  const matchStatus = (url.searchParams.get('status') || '').trim();

  const where: string[] = ['org_id = ?'];
  const args: any[] = [user.org_id];
  const rls = rlsCondition(user, 'three_way_match');
  if (rls.clause !== '1=1') {
    where.push(rls.clause);
    args.push(...rls.params);
  }
  if (poNo) {
    where.push('po_no = ?');
    args.push(poNo);
  }
  if (matchStatus) {
    where.push('match_status = ?');
    args.push(matchStatus);
  }
  const clause = where.join(' AND ');

  const rows = await env.DB.prepare(
    `SELECT * FROM three_way_match WHERE ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  )
    .bind(...args, pageSize, offset)
    .all();
  const cnt: any = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM three_way_match WHERE ${clause}`)
    .bind(...args)
    .first();

  return json({
    data: (rows.results || []).map(toApi),
    total: cnt?.cnt || 0,
    page,
    pageSize,
    // 把判定口径随列表一起回给前端：界面上要注明「按什么标准判的」，
    // 否则用户看到「差异 120 元却判为通过」会以为是 Bug（实际是 1% 容差内）。
    tolerance: TWM_TOLERANCE,
  });
}
