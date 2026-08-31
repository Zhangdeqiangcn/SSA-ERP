// GET /api/outbound-orders — 分页查询出库单（按 org_id 隔离）
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const keyword = (url.searchParams.get('keyword') || '').trim();
  const customerId = url.searchParams.get('customerId') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const type = url.searchParams.get('type') || undefined;
  const sortBy = url.searchParams.get('sortBy') || 'outbound_date';
  const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'ASC' : 'DESC';

  const db = context.env.DB;
  let where = `WHERE oo.org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    where += ` AND (oo.outbound_no LIKE ? OR oo.customer_name LIKE ?)`;
    const kw = `%${keyword}%`;
    params.push(kw, kw);
  }
  if (customerId) {
    where += ` AND oo.customer_id = ?`;
    params.push(customerId);
  }
  if (status) {
    where += ` AND oo.status = ?`;
    params.push(status);
  }
  if (type) {
    where += ` AND oo.type = ?`;
    params.push(type);
  }

  const allowedSort = ['outbound_date', 'created_at'];
  const sortCol = allowedSort.includes(sortBy) ? sortBy : 'outbound_date';

  const offset = (page - 1) * pageSize;
  const totalRows = await db.prepare(`SELECT COUNT(*) as cnt FROM outbound_orders oo ${where}`).bind(...params).first();
  const rows = await db.prepare(`SELECT * FROM outbound_orders oo ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`).bind(...params, pageSize, offset).all();

  return json({
    data: (rows.results || []).map(r => ({ ...r, items: [] })),
    total: totalRows?.cnt || 0,
    page,
    pageSize,
  });
}

// POST /api/outbound-orders — 创建出库单（仅新增，未改动上方 onRequestGet）
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const id = 'out-' + crypto.randomUUID();
  await db.prepare(`INSERT INTO outbound_orders (id, org_id, outbound_no, type, source_no, customer_id, customer_name, vendor_id, vendor_name, status, warehouse_id, warehouse_name, operator, outbound_date, remarks, picker, created_at, updated_at, created_by, updated_by, inventory_posted, cogs_posted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`).bind(
    id, user.org_id, body.outboundNo, body.type || 'sale', body.sourceNo || null, body.customerId || null, body.customerName || null,
    body.vendorId || null, body.vendorName || null, body.status || 'pending', body.warehouseId || null, body.warehouseName || null,
    body.operator || null, body.outboundDate || null, body.remarks || null, body.picker || null, now, now, user.name, user.name
  ).run();

  if (body.items && Array.isArray(body.items)) {
    for (const item of body.items) {
      const serialNos = Array.isArray(item.serialNos) ? JSON.stringify(item.serialNos) : (item.serialNos || null);
      await db.prepare(`INSERT INTO outbound_order_items (id, outbound_order_id, material_id, material_code, material_name, specification, unit, quantity, batch_no, location_id, location_name, unit_cost, cost_amount, serial_nos, hu_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        'ooi-' + crypto.randomUUID(), id, item.materialId || null, item.materialCode || null, item.materialName || null, item.specification || null, item.unit || null,
        Number(item.quantity) || 0, item.batchNo || null, item.locationId || null, item.locationName || null, Number(item.unitCost) || 0, Number(item.costAmount) || 0, serialNos, item.huId || null
      ).run();
    }
  }

  const row = await db.prepare(`SELECT * FROM outbound_orders WHERE id = ?`).bind(id).first();
  return json(row);
}
