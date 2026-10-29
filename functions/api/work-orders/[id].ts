// GET/PUT/DELETE /api/work-orders/:id
import { getUserFromRequest, json } from '../../_shared/auth';
import { validateOrReject } from '../../_shared/validate';
import { withVersionGuard } from '../../_shared/optimisticLock';
import { guardStatusTransition } from '../../_shared/statusMachine';
// ★ V3.20.0 差距13：完工倒冲发料（按 BOM 自动扣减原料）
import { backflushWorkOrder } from '../../_shared/backflush';

import { audit } from '../../_shared/auditLog';
export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM work_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '工单不存在' }, 404);

  return json(row);
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  
  // V3.25.0: 操作权限服务端守卫
  const _opGuard = await import('../../_shared/operationGuard').then(m => m.guardOperation(user, 'production', 'update', context.env.DB, user.org_id));
  if (_opGuard) return _opGuard;

  const db = context.env.DB;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT id, status FROM work_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '工单不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const _invalid = validateOrReject('work_orders', body, { partial: true });
  if (_invalid) return _invalid;

  // #9 服务端状态机：硬拦非法状态流转（如「已完工」不可回退为「生产中」），绕开界面亦生效
  const _statusGuard = guardStatusTransition('work_order', (existing as any).status, body);
  if (_statusGuard) return json(_statusGuard.response, 400);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const fields = ['orderNo', 'status', 'productCode', 'productName', 'bomId', 'bomNo', 'routeId', 'routeNo',
    'plannedQuantity', 'completedQuantity', 'scrapQuantity', 'qualifiedQuantity',
    'plannedStartDate', 'plannedEndDate', 'actualStartDate', 'actualEndDate',
    'priority', 'workshop', 'supervisor', 'projectNo', 'projectName', 'note',
    'costCenterId', 'actualLaborCost', 'actualMaterialCost', 'actualMachineCost', 'actualTotalCost',
    'depreciationCost', 'overheadCost', 'version'];

  const setClauses: string[] = [];
  const values: (string | number)[] = [];

  for (const f of fields) {
    if (body[f] !== undefined) {
      const col = f === 'orderNo' ? 'order_no' : f === 'productCode' ? 'product_code' : f === 'productName' ? 'product_name' :
        f === 'bomId' ? 'bom_id' : f === 'bomNo' ? 'bom_no' : f === 'routeId' ? 'route_id' : f === 'routeNo' ? 'route_no' :
        f === 'plannedQuantity' ? 'planned_quantity' : f === 'completedQuantity' ? 'completed_quantity' : f === 'scrapQuantity' ? 'scrap_quantity' :
        f === 'qualifiedQuantity' ? 'qualified_quantity' : f === 'plannedStartDate' ? 'planned_start_date' : f === 'plannedEndDate' ? 'planned_end_date' :
        f === 'actualStartDate' ? 'actual_start_date' : f === 'actualEndDate' ? 'actual_end_date' :
        f === 'projectNo' ? 'project_no' : f === 'projectName' ? 'project_name' : f === 'costCenterId' ? 'cost_center_id' :
        f === 'actualLaborCost' ? 'actual_labor_cost' : f === 'actualMaterialCost' ? 'actual_material_cost' :
        f === 'actualMachineCost' ? 'actual_machine_cost' : f === 'actualTotalCost' ? 'actual_total_cost' :
        f === 'depreciationCost' ? 'depreciation_cost' : f === 'overheadCost' ? 'overhead_cost' :
        f === 'version' ? 'version' : f.toLowerCase();
      setClauses.push(`${col} = ?`);
      values.push(body[f]);
    }
  }
  setClauses.push('updated_at = ?', 'updated_by = ?');
  values.push(now, user.name);

  // 乐观锁：携带 version 时按版本号比对，被他人改过则 409，避免静默覆盖（缺陷台账 #10）
  const conflict = await withVersionGuard({ db, table: 'work_orders', id, orgId: user.org_id, body, setClauses, values });
  if (conflict) return conflict;

  const updated = await db.prepare(`SELECT * FROM work_orders WHERE id = ?`).bind(id).first();
  await audit(db, user.org_id, user, 'work_orders', 'update', `更新工单 ${body?.workOrderNo || id}`);

  // ══════════════════════════════════════════════════════════════════
  // ★ V3.20.0 差距13：完工倒冲发料（服务端权威）
  // ------------------------------------------------------------------
  // 触发条件刻意收窄为「状态**从非 completed 变为 completed**」那一次：
  //   · 用不变（body.status 缺省、或仍是 completed）不触发 —— 否则每次改个备注
  //     都会重跑一遍倒冲，虽然有 inventory_posted 幂等守卫兜着，但会产生噪音审计；
  //   · 之所以不做成「只要 status=completed 就补跑」，是因为那会让「完工后补录 BOM」
  //     这种改数据动作静默变成扣料动作。补料请走「生成领料出库」这条明路。
  //
  // 倒冲失败**不阻断完工**：它是补账动作，不是完工的门槛。若把它做成硬拦，
  // 一旦某张工单的 BOM 缺失，生产就彻底停在那里 —— 结果一定是有人把功能关掉，
  // 那比从来不扣料更糟（大家会以为有管控）。失败原因通过响应体 backflush 字段
  // 回传给前端展示，并在审计里留痕，保证「没扣料」是看得见的。
  const becameCompleted =
    String(body?.status || '') === 'completed' && String((existing as any).status || '') !== 'completed';
  let backflush: any = null;
  if (becameCompleted) {
    try {
      backflush = await backflushWorkOrder(db, user.org_id, user, id);
      await audit(
        db,
        user.org_id,
        user,
        'work_orders',
        'update',
        `工单完工倒冲：${backflush.code}${backflush.outboundNo ? ' 出库单 ' + backflush.outboundNo : ''}`
      );
    } catch (e) {
      console.error('[backflush] unexpected failure', e);
      backflush = {
        posted: false,
        code: 'ERROR',
        message: '倒冲发料执行异常，原料未自动扣减。请检查库存后手工生成领料出库。',
        lines: [],
        totalCost: 0,
      };
    }
  }

  // ★ 必须重新读一次再返回：倒冲会写 work_orders.inventory_posted / backflush_outbound_no，
  //   而上面那个 `updated` 是**倒冲之前**取的快照。若直接回传旧快照，响应里
  //   inventory_posted 是 0，前端会按「已完工但原料未倒冲」渲染，弹出与实际不符的告警。
  //   （这正是「查得早、改得晚」这类顺序缺陷的典型形态，测试里已用一条断言钉住。）
  if (backflush) {
    const after = await db.prepare(`SELECT * FROM work_orders WHERE id = ?`).bind(id).first();
    return json({ ...((after || updated) as any), backflush });
  }
  return json(updated);
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  
  // V3.25.0: 操作权限服务端守卫
  const _opGuard = await import('../../_shared/operationGuard').then(m => m.guardOperation(user, 'production', 'delete', context.env.DB, user.org_id));
  if (_opGuard) return _opGuard;

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id FROM work_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '工单不存在' }, 404);

  // ★ V3.49.0 原子底座（R3 删不清子）：原只删头表，领料台账 work_order_pickings
  //   指向已删工单、成品成本脱节。收进同一 db.batch：先删领料台账后删头，全成或全回滚。
  //   （mes_operation_reports/subcontract_orders 等按 work_order_id 引用的运营历史
  //     不在此删除范围——那是「引用方」而非「从属子表」，删工单不该抹掉它们。）
  const delPickings = db.prepare(`DELETE FROM work_order_pickings WHERE work_order_id = ?`).bind(id);
  const delHead = db.prepare(`DELETE FROM work_orders WHERE id = ?`).bind(id);
  await db.batch([delPickings, delHead]);

  await audit(db, user.org_id, user, 'work_orders', 'delete', `删除工单 ${id}`);
  return json({ success: true });
}
