// GET /api/subcontracts — 分页查询委外订单（按 org_id 隔离）
// POST /api/subcontracts — 创建委外订单
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const keyword = (url.searchParams.get('keyword') || '').trim();
  const status = url.searchParams.get('status') || '';

  let sql = `SELECT * FROM subcontract_orders WHERE org_id = ?`;
  const params = [user.org_id];
  if (keyword) {
    sql += ` AND (order_no LIKE ? OR material_name LIKE ? OR vendor_name LIKE ?)`;
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, (page - 1) * pageSize);

  const result = await db.prepare(sql).bind(...params).all();
  const data = (result.results || []).map(r => ({
    ...r,
    qty: Number(r.qty),
    process_fee: r.process_fee ? Number(r.process_fee) : 0,
    received_qty: r.received_qty ? Number(r.received_qty) : 0,
  }));

  let countSql = `SELECT COUNT(*) as cnt FROM subcontract_orders WHERE org_id = ?`;
  const countParams = [user.org_id];
  if (keyword) {
    countSql += ` AND (order_no LIKE ? OR material_name LIKE ? OR vendor_name LIKE ?)`;
    const kw = `%${keyword}%`;
    countParams.push(kw, kw, kw);
  }
  if (status) {
    countSql += ` AND status = ?`;
    countParams.push(status);
  }
  const countResult = await db.prepare(countSql).bind(...countParams).first();

  return json({
    data,
    pagination: {
      page,
      pageSize,
      total: countResult?.cnt || 0,
      totalPages: Math.ceil((countResult?.cnt || 0) / pageSize),
    },
  });
}

export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const id = 'sco-' + crypto.randomUUID();
  await db.prepare(`INSERT INTO subcontract_orders (id, org_id, order_no, type, material_id, material_code, material_name, vendor_id, vendor_name, bom_id, source_work_order_id, status, qty, plan_date, process_fee, created_at, updated_at, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id, user.org_id, body.orderNo, body.type, body.materialId || null, body.materialCode || null, body.materialName || null,
    body.vendorId || null, body.vendorName || null, body.bomId || null, body.sourceWorkOrderId || null,
    body.status || 'draft', Number(body.qty) || 0, body.planDate || null, Number(body.processFee) || 0, now, now, user.name, user.name
  ).run();

  if (body.issueItems && Array.isArray(body.issueItems)) {
    for (const item of body.issueItems) {
      await db.prepare(`INSERT INTO subcontract_issue_items (id, subcontract_order_id, material_id, material_code, material_name, unit, qty) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(
        'sci-' + crypto.randomUUID(), id, item.materialId || null, item.materialCode || null, item.materialName || null,
        item.unit || null, Number(item.qty) || 0
      ).run();
    }
  }

  const row = await db.prepare(`SELECT * FROM subcontract_orders WHERE id = ?`).bind(id).first();
  return json(row);
}
