// GET /api/inventory-adjustments — 分页查询库存调整单（按 org_id 隔离）
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const keyword = (url.searchParams.get('keyword') || '').trim();
  const status = url.searchParams.get('status') || undefined;

  const db = context.env.DB;
  let where = `WHERE ia.org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    where += ` AND (ia.adjustment_no LIKE ? OR ia.warehouse_name LIKE ? OR ia.reason LIKE ?)`;
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (status) {
    where += ` AND ia.status = ?`;
    params.push(status);
  }

  const offset = (page - 1) * pageSize;
  const totalRows = await db.prepare(`SELECT COUNT(*) as cnt FROM inventory_adjustments ia ${where}`).bind(...params).first();
  const rows = await db.prepare(`SELECT * FROM inventory_adjustments ia ${where} ORDER BY ia.date DESC, ia.created_at DESC LIMIT ? OFFSET ?`).bind(...params, pageSize, offset).all();

  // 列表回填 items（store 启动 load 路径需明细支撑 postAdjustment 库存调整，等同迁移前 Blob 全量）
  const data = await Promise.all((rows.results || []).map(async (r) => {
    const items = await db.prepare(`SELECT * FROM inventory_adjustment_items WHERE inventory_adjustment_id = ?`).bind(r.id).all();
    return {
      ...r,
      items: (items.results || []).map(it => ({
        id: it.id, material_id: it.material_id, material_code: it.material_code, material_name: it.material_name,
        unit: it.unit, location_id: it.location_id, book_qty: Number(it.book_qty), actual_qty: Number(it.actual_qty),
        delta_qty: Number(it.delta_qty), reason: it.reason,
      })),
    };
  }));

  return json({
    data,
    total: totalRows?.cnt || 0,
    page,
    pageSize,
  });
}

// POST /api/inventory-adjustments — 创建库存调整单（含 items 子表）
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const id = 'adj-' + crypto.randomUUID();
  await db.prepare(`INSERT INTO inventory_adjustments (id, org_id, adjustment_no, warehouse_id, warehouse_name, status, reason, date, total_delta_qty, voucher_no, created_at, updated_at, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id, user.org_id, body.adjustmentNo || ('ADJ-' + id.slice(0, 8)), body.warehouseId || null, body.warehouseName || null,
    body.status || 'draft', body.reason || null, body.date || null, Number(body.totalDeltaQty) || 0, body.voucherNo || null,
    now, now, user.name, user.name
  ).run();

  if (body.items && Array.isArray(body.items)) {
    for (const item of body.items) {
      await db.prepare(`INSERT INTO inventory_adjustment_items (id, inventory_adjustment_id, material_id, material_code, material_name, unit, location_id, book_qty, actual_qty, delta_qty, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        'adji-' + crypto.randomUUID(), id, item.materialId || null, item.materialCode || null, item.materialName || null, item.unit || null,
        item.locationId || null, Number(item.bookQty) || 0, Number(item.actualQty) || 0, Number(item.deltaQty) || 0, item.reason || null
      ).run();
    }
  }

  const row = await db.prepare(`SELECT * FROM inventory_adjustments WHERE id = ?`).bind(id).first();
  return json(row);
}
