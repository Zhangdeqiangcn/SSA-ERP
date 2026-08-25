// GET /api/inventory-records — 分页查询库存记录（按 org_id 隔离）
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = getUserFromRequest(context);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const keyword = url.searchParams.get('keyword') || '';
  const offset = (page - 1) * pageSize;

  let sql = `SELECT * FROM inventory_records WHERE org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    sql += ` AND (material_code LIKE ? OR material_name LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  sql += ` ORDER BY material_code LIMIT ? OFFSET ?`;
  params.push(pageSize, offset);

  const results = await db.prepare(sql).bind(...params).all();
  const count = await db.prepare(`SELECT COUNT(*) as cnt FROM inventory_records WHERE org_id = ?${keyword ? ' AND (material_code LIKE ? OR material_name LIKE ?)' : ''}`).bind(
    user.org_id, ...(keyword ? [`%${keyword}%`, `%${keyword}%`] : [])
  ).first();

  return json({
    data: (results.results || []).map(r => ({
      id: r.id, org_id: r.org_id, material_id: r.material_id, material_code: r.material_code,
      material_name: r.material_name, warehouse_id: r.warehouse_id, warehouse_name: r.warehouse_name,
      location_id: r.location_id, location_name: r.location_name, quantity: Number(r.quantity),
      available_quantity: Number(r.available_quantity), frozen_quantity: Number(r.frozen_quantity),
      unit: r.unit, last_inbound_date: r.last_inbound_date, last_outbound_date: r.last_outbound_date,
      shelf_life_status: r.shelf_life_status, created_at: r.created_at, updated_at: r.updated_at,
    })),
    pagination: { page, pageSize, total: count?.cnt || 0 },
  });
}
