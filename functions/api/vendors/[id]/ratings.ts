// GET /api/vendors/:id/ratings — 某供应商的评级记录
//
// P0-4（V3.113.3）：前端 src/services/vendor.ts 的 getVendorRatings() 一直调用本端点，
//   后端从未实现 → 404（供应商评级历史是「点开就报错」的功能）。
//
// ★ 路径纪律：写评级用 POST /vendors/:id/rate（单数，见 rate.ts），读记录用本端点（复数）。
//   本端点**只注册 GET**，避免与 rate.ts 的 POST 路径语义混淆。
import { getUserFromRequest, json } from '../../../_shared/auth';
import { guardOperation } from '../../../_shared/operationGuard';

/** D1 行 → 前端 VendorRatingRecord */
function toRatingRecord(r: any) {
  let criteria: Record<string, number> = {};
  let remarks = r.remarks || '';
  try {
    const parsed = JSON.parse(remarks);
    if (parsed && typeof parsed === 'object' && parsed.__criteria) {
      criteria = parsed.__criteria;
      remarks = parsed.__remarks || '';
    }
  } catch { /* 非 JSON 备注，按纯文本处理 */ }
  return {
    id: r.id,
    vendorId: r.vendor_id,
    rating: Number(r.total_score) || 0,
    type: 'manual' as const,
    evaluator: r.evaluated_by || '',
    criteria,
    remarks,
    createdAt: r.created_at || r.evaluated_at || '',
  };
}

export async function onRequestGet(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const opGuard = await guardOperation(user, 'vendor', 'read', env.DB, user.org_id);
  if (opGuard) return opGuard;

  const rows = await env.DB.prepare(
    `SELECT * FROM vendor_performance WHERE org_id = ? AND vendor_id = ? ORDER BY created_at DESC`
  ).bind(user.org_id, params.id).all();

  return json((rows.results || []).map((r: any) => toRatingRecord(r)));
}
