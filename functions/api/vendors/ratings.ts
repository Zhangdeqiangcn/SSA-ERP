// GET /api/vendors/ratings — 全部供应商评级记录
//
// P0-4（V3.113.3）：前端 getAllRatings() 一直调用本端点，后端从未实现 → 404。
import { getUserFromRequest, json } from '../../_shared/auth';
import { guardOperation } from '../../_shared/operationGuard';

const CRITERIA_KEYS = ['deliveryRate', 'qualityRate', 'serviceRate', 'priceRate'] as const;

function toRatingRecord(r: any) {
  let criteria: Record<string, number> = {};
  let remarks = r.remarks || '';
  try {
    const parsed = JSON.parse(remarks);
    if (parsed && typeof parsed === 'object' && parsed.__criteria) {
      criteria = parsed.__criteria;
      remarks = parsed.__remarks || '';
    }
  } catch { /* 非 JSON 备注 */ }
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
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const opGuard = await guardOperation(user, 'vendor', 'read', env.DB, user.org_id);
  if (opGuard) return opGuard;

  const url = new URL(request.url);
  const vendorId = url.searchParams.get('vendorId') || undefined;

  let sql = `SELECT * FROM vendor_performance WHERE org_id = ?`;
  const params: any[] = [user.org_id];
  if (vendorId) { sql += ` AND vendor_id = ?`; params.push(vendorId); }
  sql += ` ORDER BY created_at DESC LIMIT 500`;

  const rows = await env.DB.prepare(sql).bind(...params).all();
  return json((rows.results || []).map((r: any) => toRatingRecord(r)));
}
