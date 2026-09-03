// GET /api/work-orders — 分页查询工单列表（按 org_id 隔离）
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { audit } from '../../_shared/entities';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const keyword = url.searchParams.get('keyword') || '';
  const status = url.searchParams.get('status') || '';
  const offset = (page - 1) * pageSize;

  let sql = `SELECT * FROM work_orders WHERE org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    sql += ` AND (order_no LIKE ? OR product_name LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY planned_start_date DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, offset);

  const results = await db.prepare(sql).bind(...params).all();
  const count = await db.prepare(`SELECT COUNT(*) as cnt FROM work_orders WHERE org_id = ?${status ? ' AND status = ?' : ''}`).bind(
    user.org_id, ...(status ? [status] : [])
  ).first();

  return json({
    data: (results.results || []).map(r => ({
      id: r.id, org_id: r.org_id, order_no: r.order_no, status: r.status,
      product_code: r.product_code, product_name: r.product_name,
      planned_quantity: Number(r.planned_quantity), completed_quantity: Number(r.completed_quantity),
      scrap_quantity: Number(r.scrap_quantity), qualified_quantity: r.qualified_quantity ? Number(r.qualified_quantity) : 0,
      planned_start_date: r.planned_start_date, planned_end_date: r.planned_end_date,
      actual_start_date: r.actual_start_date, actual_end_date: r.actual_end_date,
      priority: r.priority, workshop: r.workshop, supervisor: r.supervisor,
      project_no: r.project_no, project_name: r.project_name, note: r.note,
      created_at: r.created_at, updated_at: r.updated_at,
    })),
    pagination: { page, pageSize, total: count?.cnt || 0 },
  });
}

// POST /api/work-orders — 创建工单（W1 根治双通道：直写真实 D1 work_orders）
// 会话鉴权 + org 隔离 + 单号唯一 + 审计。工单无行明细表，仅写表头。
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  if (!body.orderNo) return json({ error: '工单编号必填' }, 400);

  const dup = await db.prepare(`SELECT id FROM work_orders WHERE org_id = ? AND order_no = ?`).bind(user.org_id, body.orderNo).first();
  if (dup) return json({ error: '工单编号已存在' }, 409);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  const id = uid('wo');

  const fields = ['orderNo', 'status', 'productCode', 'productName', 'bomId', 'bomNo', 'routeId', 'routeNo',
    'plannedQuantity', 'completedQuantity', 'scrapQuantity', 'qualifiedQuantity',
    'plannedStartDate', 'plannedEndDate', 'actualStartDate', 'actualEndDate',
    'priority', 'workshop', 'supervisor', 'projectNo', 'projectName', 'note',
    'costCenterId', 'actualLaborCost', 'actualMaterialCost', 'actualMachineCost', 'actualTotalCost'];
  const colFor = (f) => f === 'orderNo' ? 'order_no' : f === 'productCode' ? 'product_code' : f === 'productName' ? 'product_name' :
    f === 'bomId' ? 'bom_id' : f === 'bomNo' ? 'bom_no' : f === 'routeId' ? 'route_id' : f === 'routeNo' ? 'route_no' :
    f === 'plannedQuantity' ? 'planned_quantity' : f === 'completedQuantity' ? 'completed_quantity' : f === 'scrapQuantity' ? 'scrap_quantity' :
    f === 'qualifiedQuantity' ? 'qualified_quantity' : f === 'plannedStartDate' ? 'planned_start_date' : f === 'plannedEndDate' ? 'planned_end_date' :
    f === 'actualStartDate' ? 'actual_start_date' : f === 'actualEndDate' ? 'actual_end_date' :
    f === 'projectNo' ? 'project_no' : f === 'projectName' ? 'project_name' : f === 'costCenterId' ? 'cost_center_id' :
    f === 'actualLaborCost' ? 'actual_labor_cost' : f === 'actualMaterialCost' ? 'actual_material_cost' :
    f === 'actualMachineCost' ? 'actual_machine_cost' : f === 'actualTotalCost' ? 'actual_total_cost' : f.toLowerCase();

  const cols = ['org_id', 'id'];
  const vals = [user.org_id, id];
  for (const f of fields) {
    if (body[f] !== undefined) { cols.push(colFor(f)); vals.push(body[f]); }
  }
  cols.push('created_at', 'updated_at', 'created_by', 'updated_by');
  vals.push(now, now, user.id, user.name);

  try {
    await db.prepare(`INSERT INTO work_orders (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...vals).run();
  } catch (e: any) {
    if (String(e?.message || '').includes('UNIQUE')) return json({ error: '工单编号已存在' }, 409);
    throw e;
  }

  await audit(db, user.org_id, user, 'work_orders', 'create', `创建工单 ${body.orderNo}`);
  const created = await db.prepare(`SELECT * FROM work_orders WHERE id = ?`).bind(id).first();
  return json(created, 201);
}
