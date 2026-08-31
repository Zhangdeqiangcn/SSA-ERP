// GET /api/inbound-orders — 分页查询入库单（按 org_id 隔离）
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const keyword = (url.searchParams.get('keyword') || '').trim();
  const vendorId = url.searchParams.get('vendorId') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const type = url.searchParams.get('type') || undefined;
  const sortBy = url.searchParams.get('sortBy') || 'inbound_date';
  const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'ASC' : 'DESC';

  const db = context.env.DB;
  let where = `WHERE io.org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    where += ` AND (io.inbound_no LIKE ? OR io.vendor_name LIKE ?)`;
    const kw = `%${keyword}%`;
    params.push(kw, kw);
  }
  if (vendorId) {
    where += ` AND io.vendor_id = ?`;
    params.push(vendorId);
  }
  if (status) {
    where += ` AND io.status = ?`;
    params.push(status);
  }
  if (type) {
    where += ` AND io.type = ?`;
    params.push(type);
  }

  const allowedSort = ['inbound_date', 'total_cost', 'created_at'];
  const sortCol = allowedSort.includes(sortBy) ? sortBy : 'inbound_date';

  const offset = (page - 1) * pageSize;
  const totalRows = await db.prepare(`SELECT COUNT(*) as cnt FROM inbound_orders io ${where}`).bind(...params).first();
  const rows = await db.prepare(`SELECT * FROM inbound_orders io ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`).bind(...params, pageSize, offset).all();

  return json({
    data: (rows.results || []).map(r => ({ ...r, items: [] })),
    total: totalRows?.cnt || 0,
    page,
    pageSize,
  });
}

// POST /api/inbound-orders — 创建入库单（仅新增，未改动上方 onRequestGet）
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const id = 'inb-' + crypto.randomUUID();
  await db.prepare(`INSERT INTO inbound_orders (id, org_id, inbound_no, type, source_no, vendor_id, vendor_name, status, warehouse_id, warehouse_name, operator, inbound_date, remarks, asn_shipment_no, created_at, updated_at, created_by, updated_by, inventory_posted, cost_posted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`).bind(
    id, user.org_id, body.inboundNo, body.type || 'purchase', body.sourceNo || null, body.vendorId || null, body.vendorName || null,
    body.status || 'pending', body.warehouseId || null, body.warehouseName || null, body.operator || null, body.inboundDate || null,
    body.remarks || null, body.asnShipmentNo || null, now, now, user.name, user.name
  ).run();

  if (body.items && Array.isArray(body.items)) {
    for (const item of body.items) {
      const serialNos = Array.isArray(item.serialNos) ? JSON.stringify(item.serialNos) : (item.serialNos || null);
      await db.prepare(`INSERT INTO inbound_order_items (id, inbound_order_id, material_id, material_code, material_name, specification, unit, expected_quantity, actual_quantity, batch_no, location_id, location_name, quality_status, unit_price, amount, serial_nos, hu_id, production_date, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        'inoi-' + crypto.randomUUID(), id, item.materialId || null, item.materialCode || null, item.materialName || null, item.specification || null, item.unit || null,
        Number(item.expectedQuantity) || 0, Number(item.actualQuantity) || 0, item.batchNo || null, item.locationId || null, item.locationName || null,
        item.qualityStatus || 'qualified', Number(item.unitPrice) || 0, Number(item.amount) || 0, serialNos, item.huId || null, item.productionDate || null, item.expiryDate || null
      ).run();
    }
  }

  const row = await db.prepare(`SELECT * FROM inbound_orders WHERE id = ?`).bind(id).first();
  return json(row);
}
