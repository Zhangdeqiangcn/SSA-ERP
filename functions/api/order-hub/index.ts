// 订单中台 CRUD（order_hub 表，org 隔离 + 审计）
// GET /api/order-hub — 列表（平台/状态/关键字过滤）
// POST /api/order-hub — 创建归一化订单（来自各渠道适配器）
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';
import { audit } from '../../_shared/auditLog';
import { errorResponse } from '../../_shared/errors';
import { guardOperation } from '../../_shared/operationGuard';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
  const offset = (page - 1) * pageSize;
  const keyword = url.searchParams.get('keyword');
  const platform = url.searchParams.get('platform');
  const status = url.searchParams.get('status');

  let sql = 'SELECT * FROM order_hub WHERE org_id = ?';
  const params: any[] = [user.org_id];
  const rls = rlsCondition(user, 'order_hub');
  if (rls.clause !== '1=1') {
    sql += ' AND ' + rls.clause;
    params.push(...rls.params);
  }
  if (platform) {
    sql += ' AND platform = ?';
    params.push(platform);
  }
  if (status) {
    sql += ' AND order_status = ?';
    params.push(status);
  }
  if (keyword) {
    sql += " AND (platform_order_id LIKE ? ESCAPE '\\' OR buyer_name LIKE ? ESCAPE '\\')";
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  const rows = await env.DB.prepare(sql).bind(...params).all();
  const data = (rows.results || []).map((r: any) => formatOrder(r));

  let countSql = 'SELECT COUNT(*) as cnt FROM order_hub WHERE org_id = ?';
  const countParams: any[] = [user.org_id];
  if (rls.clause !== '1=1') {
    countSql += ' AND ' + rls.clause;
    countParams.push(...rls.params);
  }
  if (platform) {
    countSql += ' AND platform = ?';
    countParams.push(platform);
  }
  if (status) {
    countSql += ' AND order_status = ?';
    countParams.push(status);
  }
  if (keyword) {
    countSql += " AND (platform_order_id LIKE ? ESCAPE '\\' OR buyer_name LIKE ? ESCAPE '\\')";
    countParams.push(`%${keyword}%`, `%${keyword}%`);
  }
  const countRow = await env.DB.prepare(countSql).bind(...countParams).first();
  const total = (countRow as any)?.cnt || 0;

  return json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const _opGuard = await guardOperation(user, 'orderHub', 'create', env.DB, user.org_id);
  if (_opGuard) return _opGuard;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }
  if (!body.platformOrderId || !body.platform) return json({ error: '平台与平台订单号必填' }, 400);

  const id = uid('oh');
  const now = new Date().toISOString();
  const lines = JSON.stringify(body.lines || []);
  const raw = JSON.stringify(body.rawPayload ?? null);
  try {
    await env.DB.prepare(
      `INSERT INTO order_hub (
        org_id, id, platform, platform_order_id, order_status, buyer_name, buyer_phone,
        receiver_name, receiver_phone, receiver_address, province, city, district, pay_time,
        total_amount, tax_amount, discount_amount, freight, currency, lines, raw_payload,
        created_at, updated_at, created_by, updated_by, created_by_name, updated_by_name
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
      .bind(
        user.org_id, id, body.platform, body.platformOrderId, body.orderStatus ?? 'paid',
        body.buyerName ?? null, body.buyerPhone ?? null, body.receiverName ?? null,
        body.receiverPhone ?? null, body.receiverAddress ?? null, body.province ?? null,
        body.city ?? null, body.district ?? null, body.payTime ?? null,
        body.totalAmount ?? 0, body.taxAmount ?? 0, body.discountAmount ?? 0, body.freight ?? 0,
        body.currency ?? 'CNY', lines, raw,
        now, now, user.id, user.id, user.name ?? user.username, user.name ?? user.username
      )
      .run();
  } catch (e: any) {
    return errorResponse(e, '创建订单中台记录');
  }

  await audit(env.DB, user.org_id, user, 'orderHub', 'create', `创建订单中台 ${body.platform} ${body.platformOrderId}`);
  const created = await env.DB.prepare('SELECT * FROM order_hub WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
  return json(formatOrder(created as any), 201);
}

function formatOrder(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    platform: r.platform,
    platformOrderId: r.platform_order_id,
    orderStatus: r.order_status,
    buyerName: r.buyer_name,
    buyerPhone: r.buyer_phone,
    receiverName: r.receiver_name,
    receiverPhone: r.receiver_phone,
    receiverAddress: r.receiver_address,
    province: r.province,
    city: r.city,
    district: r.district,
    payTime: r.pay_time,
    totalAmount: r.total_amount,
    taxAmount: r.tax_amount,
    discountAmount: r.discount_amount,
    freight: r.freight,
    currency: r.currency,
    lines: safeJson(r.lines, []),
    rawPayload: safeJson(r.raw_payload, null),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function safeJson(s: string | null, fallback: any) {
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}
