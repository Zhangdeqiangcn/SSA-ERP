// GET /api/work-orders — 分页查询工单列表（按 org_id 隔离）
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { audit, stampByName } from '../../_shared/entities';
import { validateOrReject } from '../../_shared/validate';
// ★ V3.20.0 差距13：完工倒冲发料（按 BOM 自动扣减原料）
import { backflushWorkOrder } from '../../_shared/backflush';
import { requireCoreFields } from '../../_shared/validate';
// V3.63.0 P0-ST-1：单据提交自动触发审批（审批流配置真正被业务消费；失败不阻断主单据）
import { startApprovalForDoc } from '../../_shared/autoApproval';
import { nextDocNo } from '../../_shared/numbering';
import { guardOperation } from '../../_shared/operationGuard';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const status = url.searchParams.get('status') || '';
  const offset = (page - 1) * pageSize;

  let sql = `SELECT * FROM work_orders WHERE org_id = ?`;
  const params: (string | number)[] = [user.org_id];

  if (keyword) {
    sql += ` AND (order_no LIKE ? ESCAPE '\\' OR product_name LIKE ? ESCAPE '\\')`;
    params.push(likePattern(keyword), likePattern(keyword));
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
  
  // V3.25.0: 操作权限服务端守卫
  const _opGuard = await import('../../_shared/operationGuard').then(m => m.guardOperation(user, 'production', 'create', context.env.DB, user.org_id));
  if (_opGuard) return _opGuard;

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  
  // V3.24.0: 核心必填项校验（工单：生产物料 + 计划数量）— 修正此前误传空表名导致校验被静默关闭
  const _coreFields = requireCoreFields('work_orders', body);
  if (_coreFields) return _coreFields;
  const _invalid = validateOrReject('work_orders', body);
  if (_invalid) return _invalid;
  if (!body.orderNo) {
    // V3.67.0 立项①：未传单号 → 服务端 D1 权威取号（numbering_rules 原子自增，多终端不再漂移撞号）
    body.orderNo = await nextDocNo(db, user.org_id, 'WO');
    if (!body.orderNo) return json({ error: '无法生成工单编号（编号规则不可用），请刷新后重试或手工填写编号', code: 'NO_NUMBERING' }, 503);
  }

  const dup = await db.prepare(`SELECT id FROM work_orders WHERE org_id = ? AND order_no = ?`).bind(user.org_id, body.orderNo).first();
  if (dup) return json({ error: '工单编号已存在' }, 409);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  const id = uid('wo');

  const fields = ['orderNo', 'status', 'productCode', 'productName', 'bomId', 'bomNo', 'routeId', 'routeNo',
    'plannedQuantity', 'completedQuantity', 'scrapQuantity', 'qualifiedQuantity',
    'plannedStartDate', 'plannedEndDate', 'actualStartDate', 'actualEndDate',
    'priority', 'workshop', 'supervisor', 'projectNo', 'projectName', 'note',
    'costCenterId', 'actualLaborCost', 'actualMaterialCost', 'actualMachineCost', 'actualTotalCost',
    'depreciationCost', 'overheadCost'];
  const colFor = (f) => f === 'orderNo' ? 'order_no' : f === 'productCode' ? 'product_code' : f === 'productName' ? 'product_name' :
    f === 'bomId' ? 'bom_id' : f === 'bomNo' ? 'bom_no' : f === 'routeId' ? 'route_id' : f === 'routeNo' ? 'route_no' :
    f === 'plannedQuantity' ? 'planned_quantity' : f === 'completedQuantity' ? 'completed_quantity' : f === 'scrapQuantity' ? 'scrap_quantity' :
    f === 'qualifiedQuantity' ? 'qualified_quantity' : f === 'plannedStartDate' ? 'planned_start_date' : f === 'plannedEndDate' ? 'planned_end_date' :
    f === 'actualStartDate' ? 'actual_start_date' : f === 'actualEndDate' ? 'actual_end_date' :
    f === 'projectNo' ? 'project_no' : f === 'projectName' ? 'project_name' : f === 'costCenterId' ? 'cost_center_id' :
    f === 'actualLaborCost' ? 'actual_labor_cost' : f === 'actualMaterialCost' ? 'actual_material_cost' :
    f === 'actualMachineCost' ? 'actual_machine_cost' : f === 'actualTotalCost' ? 'actual_total_cost' :
    f === 'depreciationCost' ? 'depreciation_cost' : f === 'overheadCost' ? 'overhead_cost' : f.toLowerCase();

  const cols = ['org_id', 'id'];
  const vals = [user.org_id, id];
  for (const f of fields) {
    if (body[f] !== undefined) { cols.push(colFor(f)); vals.push(body[f]); }
  }
  cols.push('created_at', 'updated_at', 'created_by', 'updated_by');
  vals.push(now, now, user.id, user.name);
  // V3.58.0 修复 S-16：写入 owner_id，避免 RLS 'own' 因 owner_id IS NULL 全员可见而 fail-open。
  cols.push('owner_id');
  vals.push(user.id);

  try {
    await db.prepare(`INSERT INTO work_orders (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...vals).run();
    // V3.71.0：补「创建人/修改人 姓名」快照（列不存在的老库自动跳过，不 500）
    await stampByName(db, 'work_orders', id, user);
  } catch (e: any) {
    if (String(e?.message || '').includes('UNIQUE')) return json({ error: '工单编号已存在' }, 409);
    throw e;
  }

  await audit(db, user.org_id, user, 'work_orders', 'create', `创建工单 ${body.orderNo}`);
  // V3.63.0 P0-ST-1：工单落库后按审批流配置自动启动审批（有 enabled 审批流才生效，否则静默跳过）
  await startApprovalForDoc(db, user.org_id, user, 'work_order', id, body.orderNo).catch(() => {});
  const created = await db.prepare(`SELECT * FROM work_orders WHERE id = ?`).bind(id).first();

  // ★ V3.20.0 差距13：直接以「已完工」状态建单（导入历史工单、第三方集成）时同样要倒冲。
  //   缺口套在这里的原因：倒冲的判据是「这张工单是不是已完工且没扣过料」，
  //   与「它是被建出来的还是被改出来的」无关。只堵 PUT 会留下一个可以绕开的后门
  //   （判据永远是「绕开界面还成不成立」，而不是「界面上点的是哪个按钮」）。
  let backflush: any = null;
  if (created && (created as any).status === 'completed') {
    try {
      backflush = await backflushWorkOrder(db, user.org_id, user, id);
      await audit(
        db,
        user.org_id,
        user,
        'work_orders',
        'backflush',
        `工单完工倒冲（建单即完工）：${backflush.code}${backflush.outboundNo ? ' 出库单 ' + backflush.outboundNo : ''}`
      );
    } catch (e) {
      console.error('[backflush] unexpected failure on create', e);
      backflush = {
        posted: false,
        code: 'ERROR',
        message: '倒冲发料执行异常，原料未自动扣减。请检查库存后手工生成领料出库。',
        lines: [],
        totalCost: 0,
      };
    }
  }

  // 同 PUT：倒冲会改工单的 inventory_posted / backflush_outbound_no，
  // 必须重新读一次再返回，否则响应给的是倒冲前的旧快照。
  if (backflush) {
    const after = await db.prepare(`SELECT * FROM work_orders WHERE id = ?`).bind(id).first();
    return json({ ...((after || created) as any), backflush }, 201);
  }
  return json(created, 201);
}
