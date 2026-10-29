// GET  /api/approval-instances  — 审批实例列表（视图：待我审批 / 我提交的 / 全部）
// POST /api/approval-instances  — 登记一次提交（提交审批 = 建实例）
//
// V3.17.9 修复差距 9/10/11（审批撤回 / 催办 / 委托）的实例层入口。
// 迁移 0075 建表，公共判定在 functions/_shared/approvalInstance.ts。
//
// 为什么「提交审批」要显式登记一条实例：
//   撤回要知道卡在哪个节点、催办要知道该催谁、委托要能把待办转给别人 ——
//   这三件事都以「实例 + 当前审批人」为前提。业务单据自己的 status 只回答
//   「这张单是什么状态」，回答不了「现在轮到谁、催过几次、有没有委托」。
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';
import { writeAudit } from '../../_shared/auditLog';
import {
  resolveDelegate,
  todayStr,
  listDelegatorsForMe,
  writeApprovalAction,
  assertSoD,
} from '../../_shared/approvalInstance';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const view = url.searchParams.get('view') || 'all';
  const moduleFilter = url.searchParams.get('module');
  const statusFilter = url.searchParams.get('status');
  const limit = Math.min(Number(url.searchParams.get('pageSize')) || 200, 500);

  // ★ org_id 条件必须**无条件**放进 where —— 否则当 view 为 all、且用户是
  //   admin/super_admin（RLS 返回 1=1）时，where 会为空数组，SQL 变成
  //   `SELECT ... ORDER BY submitted_at DESC LIMIT ?` 而 params 仍是 [org_id, limit]：
  //   1 个占位符配 2 个绑定参数 → D1 直接报错，接口 500。
  //   这个坑由线上验收抓出（本地构建、类型检查都不会暴露它）。
  const where: string[] = ['org_id = ?'];
  const params: any[] = [user.org_id];

  const rls = rlsCondition(user, 'approval_instances');
  if (rls.clause !== '1=1') {
    where.push(rls.clause);
    params.push(...rls.params);
  }

  if (view === 'pending') {
    // 待我审批 = 当前审批人是我，**或** 我是某人的受委托人（他委托期内由我代批）。
    // 后者不可省：委托关系建立之前就已提交的单子，current_approver_id 仍是原审批人。
    const delegators = await listDelegatorsForMe(db, user.org_id, user.id, todayStr());
    const ids = [user.id, ...delegators.map((d) => d.delegatorId)];
    const ph = ids.map(() => '?').join(', ');
    where.push(`status = 'pending' AND current_approver_id IN (${ph})`);
    params.push(...ids);
  } else if (view === 'submitted') {
    where.push(`submitter_id = ?`);
    params.push(user.id);
  } else if (view === 'delegated') {
    // 「委托给我的」只看走了委托的（原审批人 ≠ 当前审批人），便于核对代批清单
    where.push(`status = 'pending' AND current_approver_id = ? AND original_approver_id <> current_approver_id`);
    params.push(user.id);
  }

  if (moduleFilter) {
    where.push('module = ?');
    params.push(moduleFilter);
  }
  if (statusFilter) {
    where.push('status = ?');
    params.push(statusFilter);
  }

  const sql = `SELECT * FROM approval_instances
    WHERE ${where.join(' AND ')}
    ORDER BY submitted_at DESC LIMIT ?`;
  params.push(limit);

  const res = await db.prepare(sql).bind(...params).all();
  const rows = (res.results || []) as any[];

  // 附带「我作为受委托人代理了谁」，供界面标注「代 XX 审批」
  const delegators = await listDelegatorsForMe(db, user.org_id, user.id, todayStr());

  return json({ ok: true, data: rows, delegators });
}

export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  const {
    module, entityId, entityNo, title, flowId,
    totalNodes, nodeOrder, nodeName, approverId, approverName,
  } = body;

  if (!module || !entityId) {
    return json({ error: '缺少必填字段：module, entityId' }, 400);
  }

  const now = new Date().toISOString();

  // ── 委托路由：配置上的审批人若在委托期内，实际落到受委托人 ──
  const delegated = await resolveDelegate(db, user.org_id, approverId || null, String(module), todayStr());
  const effectiveApproverId = delegated ? delegated.id : (approverId || null);
  const effectiveApproverName = delegated ? delegated.name : (approverName || null);

  // ★ SoD（制单与审核分离）：提交人不得是本人单据的审批人。
  //   判据用「委托路由后的实际审批人」而非配置上的 approverId —— 否则
  //   「配置审批人=他人、但他人委托给了提交人」会绕开拦截，形成新的自审后门。
  if (assertSoD(user.id, effectiveApproverId)) {
    return json(
      { error: '审批人不能是提交人本人，请指定其他责任人（制单与审核分离）', code: 'SOD_SELF_APPROVAL' },
      403,
    );
  }

  const existing = await db
    .prepare(`SELECT * FROM approval_instances WHERE org_id = ? AND module = ? AND entity_id = ?`)
    .bind(user.org_id, String(module), String(entityId))
    .first();

  if (existing && existing.status === 'pending') {
    return json({ error: '该单据已在审批中，请勿重复提交', id: existing.id }, 409);
  }

  // 已收口的实例被重新提交（例如被驳回后改完再提）：复用同一行，重置为新一轮
  if (existing) {
    await db
      .prepare(
        `UPDATE approval_instances SET
           flow_id = ?, entity_no = ?, title = ?, submitter_id = ?, submitter_name = ?,
           status = 'pending', total_nodes = ?, current_node_order = ?, current_node_name = ?,
           current_approver_id = ?, current_approver_name = ?, original_approver_id = ?,
           submitted_at = ?, finished_at = NULL, withdrawn_at = NULL, withdrawn_by = NULL,
           withdraw_reason = NULL, urge_count = 0, last_urged_at = NULL,
           version = version + 1, updated_at = ?
         WHERE id = ? AND org_id = ?`
      )
      .bind(
        flowId || null, entityNo || null, title || null, user.id, user.name || user.username || '',
        Number(totalNodes) || 0, Number(nodeOrder) || 1, nodeName || null,
        effectiveApproverId, effectiveApproverName, approverId || null,
        now, now, existing.id, user.org_id,
      )
      .run();

    await writeApprovalAction(db, {
      orgId: user.org_id,
      instanceId: existing.id,
      action: 'submit',
      nodeOrder: Number(nodeOrder) || 1,
      nodeName: nodeName || null,
      actorId: user.id,
      actorName: user.name || user.username || '',
      targetId: effectiveApproverId,
      targetName: effectiveApproverName,
      comment: body.comment || '重新提交',
    });

    return json({ ok: true, data: { id: existing.id, resubmitted: true, delegated: !!delegated } });
  }

  const id = uid('appr');
  try {
    await db
      .prepare(
        `INSERT INTO approval_instances
           (id, org_id, flow_id, module, entity_id, entity_no, title, submitter_id, submitter_name,
            status, total_nodes, current_node_order, current_node_name,
            current_approver_id, current_approver_name, original_approver_id,
            submitted_at, urge_count, version, created_at, updated_at, owner_id, dept_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?)`
      )
      .bind(
        id, user.org_id, flowId || null, String(module), String(entityId), entityNo || null, title || null,
        user.id, user.name || user.username || '',
        Number(totalNodes) || 0, Number(nodeOrder) || 1, nodeName || null,
        effectiveApproverId, effectiveApproverName, approverId || null,
        now, now, now, user.id, user.department || null,
      )
      .run();
  } catch (e: any) {
    return json({ error: e?.message || '创建审批实例失败' }, 500);
  }

  await writeApprovalAction(db, {
    orgId: user.org_id,
    instanceId: id,
    action: 'submit',
    nodeOrder: Number(nodeOrder) || 1,
    nodeName: nodeName || null,
    actorId: user.id,
    actorName: user.name || user.username || '',
    targetId: effectiveApproverId,
    targetName: effectiveApproverName,
    comment: body.comment || '提交审批',
  });

  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name || user.username || null },
    entity: 'approval_instance',
    action: 'create',
    entityId: id,
    summary: `提交审批：${module} ${entityNo || entityId}${delegated ? `（已按委托转交 ${delegated.name}）` : ''}`,
  });

  return json({ ok: true, data: { id, delegated: !!delegated, approver: effectiveApproverName } }, 201);
}
