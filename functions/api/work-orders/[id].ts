// GET/PUT/DELETE /api/work-orders/:id
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = getUserFromRequest(context);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM work_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '工单不存在' }, 404);

  return json(row);
}

export async function onRequestPut(context) {
  const user = getUserFromRequest(context);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT id FROM work_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '工单不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const fields = ['orderNo', 'status', 'productCode', 'productName', 'bomId', 'bomNo', 'routeId', 'routeNo',
    'plannedQuantity', 'completedQuantity', 'scrapQuantity', 'qualifiedQuantity',
    'plannedStartDate', 'plannedEndDate', 'actualStartDate', 'actualEndDate',
    'priority', 'workshop', 'supervisor', 'projectNo', 'projectName', 'note',
    'costCenterId', 'actualLaborCost', 'actualMaterialCost', 'actualMachineCost', 'actualTotalCost'];

  const setClauses = [];
  const values = [];

  for (const f of fields) {
    if (body[f] !== undefined) {
      const col = f === 'orderNo' ? 'order_no' : f === 'productCode' ? 'product_code' : f === 'productName' ? 'product_name' :
        f === 'bomId' ? 'bom_id' : f === 'bomNo' ? 'bom_no' : f === 'routeId' ? 'route_id' : f === 'routeNo' ? 'route_no' :
        f === 'plannedQuantity' ? 'planned_quantity' : f === 'completedQuantity' ? 'completed_quantity' : f === 'scrapQuantity' ? 'scrap_quantity' :
        f === 'qualifiedQuantity' ? 'qualified_quantity' : f === 'plannedStartDate' ? 'planned_start_date' : f === 'plannedEndDate' ? 'planned_end_date' :
        f === 'actualStartDate' ? 'actual_start_date' : f === 'actualEndDate' ? 'actual_end_date' :
        f === 'projectNo' ? 'project_no' : f === 'projectName' ? 'project_name' : f === 'costCenterId' ? 'cost_center_id' :
        f === 'actualLaborCost' ? 'actual_labor_cost' : f === 'actualMaterialCost' ? 'actual_material_cost' :
        f === 'actualMachineCost' ? 'actual_machine_cost' : f === 'actualTotalCost' ? 'actual_total_cost' : f.toLowerCase();
      setClauses.push(`${col} = ?`);
      values.push(body[f]);
    }
  }
  setClauses.push('updated_at = ?', 'updated_by = ?');
  values.push(now, user.name);

  await db.prepare(`UPDATE work_orders SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values, id).run();

  const updated = await db.prepare(`SELECT * FROM work_orders WHERE id = ?`).bind(id).first();
  return json(updated);
}

export async function onRequestDelete(context) {
  const user = getUserFromRequest(context);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id FROM work_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '工单不存在' }, 404);

  await db.prepare(`DELETE FROM work_orders WHERE id = ?`).bind(id).run();

  return json({ success: true });
}
