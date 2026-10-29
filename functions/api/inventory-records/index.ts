// GET /api/inventory-records — 分页查询库存记录（按 org_id 隔离）
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const materialId = url.searchParams.get('materialId');
  const warehouseId = url.searchParams.get('warehouseId');
  const locationId = url.searchParams.get('locationId');
  const offset = (page - 1) * pageSize;

  const rls = rlsCondition(user, 'inventory_records');
  let sql = `SELECT * FROM inventory_records WHERE org_id = ?`;
  const params: (string | number)[] = [user.org_id];
  if (rls.clause !== '1=1') {
    sql += ' AND ' + rls.clause;
    params.push(...rls.params);
  }

  if (keyword) {
    sql += ` AND (material_code LIKE ? ESCAPE '\\' OR material_name LIKE ? ESCAPE '\\')`;
    params.push(likePattern(keyword), likePattern(keyword));
  }
  if (materialId) {
    sql += ' AND material_id = ?';
    params.push(materialId);
  }
  if (warehouseId) {
    sql += ' AND warehouse_id = ?';
    params.push(warehouseId);
  }
  if (locationId) {
    sql += ' AND location_id = ?';
    params.push(locationId);
  }
  sql += ` ORDER BY material_code LIMIT ? OFFSET ?`;
  params.push(pageSize, offset);

  const results = await db.prepare(sql).bind(...params).all();

  let countSql = `SELECT COUNT(*) as cnt FROM inventory_records WHERE org_id = ?`;
  const countParams = [user.org_id];
  if (rls.clause !== '1=1') {
    countSql += ' AND ' + rls.clause;
    countParams.push(...rls.params);
  }
  if (keyword) {
    countSql += ` AND (material_code LIKE ? ESCAPE '\\' OR material_name LIKE ? ESCAPE '\\')`;
    countParams.push(likePattern(keyword), likePattern(keyword));
  }
  if (materialId) {
    countSql += ' AND material_id = ?';
    countParams.push(materialId);
  }
  if (warehouseId) {
    countSql += ' AND warehouse_id = ?';
    countParams.push(warehouseId);
  }
  if (locationId) {
    countSql += ' AND location_id = ?';
    countParams.push(locationId);
  }
  const count = await db.prepare(countSql).bind(...countParams).first();

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
