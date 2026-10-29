// POST /api/vendors/:id/rate — 人工评级供应商
//
// P0-4（V3.113.3）：前端 src/services/vendor.ts 的 rateVendor() 一直调用本端点，
//   后端从未实现 → 404（供应商评级是「点了就报错」的功能）。
//
// 口径映射：前端 criteria 用 { deliveryRate, qualityRate, serviceRate }（1–5 星），
//   D1 表 vendor_performance 用 { quality_score, delivery_score, price_score, service_score }（0–5 分）。
//   本端点做**唯一一次**映射（前端不再各自换算，避免两套口径），并把 criteria 原样存进 remarks 的 JSON 里，
//   保证「读回来时能还原成前端契约」，不丢信息。
//
// ★ 路径纪律：前端调的是 `/vendors/:id/rate`（单数），不是 `/vendors/:id/ratings`。
//   读取记录用 GET /vendors/:id/ratings（复数），两者职责不同、路径不同，不可混用。
import { getUserFromRequest, json } from '../../../_shared/auth';
import { guardOperation } from '../../../_shared/operationGuard';
import { audit } from '../../../_shared/auditLog';

const CRITERIA_KEYS = ['deliveryRate', 'qualityRate', 'serviceRate', 'priceRate'] as const;

export async function onRequestPost(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const opGuard = await guardOperation(user, 'vendor', 'update', env.DB, user.org_id);
  if (opGuard) return opGuard;

  let body: any = {};
  try { body = await request.json(); } catch { /* 空体由下方校验拦截 */ }

  const vendor = await env.DB.prepare(
    'SELECT id, vendor_code, company_name FROM vendor_master WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!vendor) return json({ error: '供应商不存在' }, 404);

  const criteria = (body?.criteria && typeof body.criteria === 'object') ? body.criteria : {};
  const scores = CRITERIA_KEYS.map((k) => Number(criteria[k]) || 0);
  if (scores.every((s) => s <= 0)) {
    return json({ error: '评分无效：至少需要一个大于 0 的评分项', code: 'INVALID_RATING' }, 400);
  }
  // 允许 1–5 星；越界视为输入错误，不静默夹紧（静默夹紧会让用户以为打了 5 星）
  if (scores.some((s) => s > 5)) {
    return json({ error: '评分必须在 1–5 之间', code: 'INVALID_RATING' }, 400);
  }

  const delivery = Number(criteria.deliveryRate) || 0;
  const quality = Number(criteria.qualityRate) || 0;
  const service = Number(criteria.serviceRate) || 0;
  const price = Number(criteria.priceRate) || 0;
  // 综合分：有几项就按几项平均（不打分的不计入分母）
  const rated = [delivery, quality, service, price].filter((s) => s > 0);
  const total = Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 10) / 10;

  const now = new Date().toISOString();
  const id = `vprf-${crypto.randomUUID()}`;
  const remarks = JSON.stringify({
    __criteria: {
      ...(delivery > 0 ? { deliveryRate: delivery } : {}),
      ...(quality > 0 ? { qualityRate: quality } : {}),
      ...(service > 0 ? { serviceRate: service } : {}),
      ...(price > 0 ? { priceRate: price } : {}),
    },
    __remarks: String(body?.remarks || '').slice(0, 500),
  });

  await env.DB.prepare(
    `INSERT INTO vendor_performance
       (id, org_id, vendor_id, vendor_name, vendor_code, period,
        quality_score, delivery_score, price_score, service_score, total_score,
        remarks, evaluated_by, evaluated_at, created_at, updated_at, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, user.org_id, vendor.id, vendor.company_name, vendor.vendor_code,
    now.slice(0, 7),
    quality, delivery, price, service, total,
    remarks, user.name, now, now, now, user.name, user.name
  ).run();

  // 主数据 rating 字段同步（列表页展示的评分）
  await env.DB.prepare('UPDATE vendor_master SET rating = ?, updated_at = ?, updated_by = ? WHERE id = ? AND org_id = ?')
    .bind(total, now, user.name, vendor.id, user.org_id).run();

  await audit(env.DB, user.org_id, user, 'vendor_performance', 'create',
    `供应商 ${vendor.vendor_code || vendor.id} 评级 ${total}（交货${delivery}/质量${quality}/服务${service}/价格${price}）`);

  return json({
    id, vendorId: vendor.id, rating: total, type: 'manual',
    evaluator: user.name,
    criteria: JSON.parse(remarks).__criteria,
    remarks: JSON.parse(remarks).__remarks,
    createdAt: now,
  }, 201);
}
