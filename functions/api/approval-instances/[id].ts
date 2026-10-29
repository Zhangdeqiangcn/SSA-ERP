// GET /api/approval-instances/:id — 实例详情（含全部动作流水）
// PUT /api/approval-instances/:id — 执行审批动作：approve | reject | withdraw | urge
//
// V3.17.9 修复差距 9/10/11。三个动作的权限闸门都在服务端，绕开界面也拦得住：
//   · withdraw（撤回）：只有**提交人本人**或管理员可以撤回，且实例必须仍在审批中；
//                        撤回同时把业务单据退回草稿，并在流水里留下原因。
//   · urge（催办）    ：只有**提交人本人**或管理员可以催办；同一实例两次催办之间
//                        有最小间隔，避免把「催办」点成刷屏骚扰。
//   · approve/reject  ：只有**当前审批人本人**可以处理（含经委托路由后的实际审批人）。
//                        这里刻意不给管理员开口子 —— 审批是责任动作，管理员代批会
//                        让「谁批的」失去意义。管理员要纠错应走撤回，而不是替人签字。
//
// 委托路由：批准后推进到下一节点时，会再解析一次下一节点审批人的生效委托，
// 保证「审批人临时出差」在推进链路中也被正确转交（不只是提交那一刻）。
import { getUserFromRequest, json } from '../../_shared/auth';
import { isRlsPrivileged } from '../../_shared/rls';
import { writeAudit } from '../../_shared/auditLog';
import { withVersionGuard } from '../../_shared/optimisticLock';
import {
  resolveDelegate,
  todayStr,
  withdrawBusinessDoc,
  writeApprovalAction,
  assertSoD,
} from '../../_shared/approvalInstance';

/** 同一实例两次催办之间的最小间隔（分钟）。太短会变成刷屏，太长又起不到作用。 */
const URGE_MIN_INTERVAL_MIN = 30;

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db
    .prepare(`SELECT * FROM approval_instances WHERE id = ? AND org_id = ?`)
    .bind(id, user.org_id)
    .first();
  if (!row) return json({ error: '审批实例不存在' }, 404);

  const acts = await db
    .prepare(`SELECT * FROM approval_actions WHERE instance_id = ? ORDER BY created_at ASC`)
    .bind(id)
    .all();

  return json({ ok: true, data: { ...row, actions: acts.results || [] } });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;
  const actorName = user.name || user.username || '';
  const now = new Date().toISOString();

  const inst: any = await db
    .prepare(`SELECT * FROM approval_instances WHERE id = ? AND org_id = ?`)
    .bind(id, user.org_id)
    .first();
  if (!inst) return json({ error: '审批实例不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const action = String(body.action || '');
  if (!['approve', 'reject', 'withdraw', 'urge'].includes(action)) {
    return json({ error: '不支持的审批动作', allowed: ['approve', 'reject', 'withdraw', 'urge'] }, 400);
  }

  const privileged = isRlsPrivileged(user.role);
  const setClauses: string[] = [];
  const values: any[] = [];

  // ────────────────────────── 撤回 ──────────────────────────
  if (action === 'withdraw') {
    if (inst.status !== 'pending') {
      return json({ error: '该单据当前不在审批中，无法撤回', status: inst.status }, 409);
    }
    if (inst.submitter_id !== user.id && !privileged) {
      return json({ error: '只有提交人本人或管理员可以撤回该审批' }, 403);
    }

    // 业务侧回退：撤回只改本表的话，单据状态还挂着「审核中」，等于假装撤回成功
    const pushed = await withdrawBusinessDoc(
      db, user.org_id, String(inst.module), String(inst.entity_id),
      body.comment || '', actorName,
    );
    if (pushed === 'skipped') {
      return json({ error: '单据已进入后续环节，不能撤回（请改用驳回或冲销）' }, 409);
    }
    if (pushed === 'missing') {
      return json({ error: '关联业务单据不存在或已删除' }, 404);
    }

    setClauses.push(
      `status = ?`, `withdrawn_at = ?`, `withdrawn_by = ?`, `withdraw_reason = ?`,
      `current_approver_id = NULL`, `current_approver_name = NULL`, `updated_at = ?`,
    );
    values.push('withdrawn', now, actorName, body.comment || '', now);

    await writeApprovalAction(db, {
      orgId: user.org_id, instanceId: id, action: 'withdraw',
      nodeOrder: inst.current_node_order, nodeName: inst.current_node_name,
      actorId: user.id, actorName,
      targetId: inst.current_approver_id, targetName: inst.current_approver_name,
      comment: body.comment || '撤回',
    });
  }

  // ────────────────────────── 催办 ──────────────────────────
  if (action === 'urge') {
    if (inst.status !== 'pending') {
      return json({ error: '该单据当前不在审批中，无需催办', status: inst.status }, 409);
    }
    if (inst.submitter_id !== user.id && !privileged) {
      return json({ error: '只有提交人本人或管理员可以催办该审批' }, 403);
    }
    if (inst.last_urged_at) {
      const gapMin = (Date.now() - new Date(inst.last_urged_at).getTime()) / 60000;
      if (Number.isFinite(gapMin) && gapMin < URGE_MIN_INTERVAL_MIN) {
        const wait = Math.ceil(URGE_MIN_INTERVAL_MIN - gapMin);
        return json({ error: `请勿频繁催办，${wait} 分钟后可再次催办`, code: 'URGE_TOO_SOON', waitMinutes: wait }, 429);
      }
    }

    setClauses.push(`urge_count = COALESCE(urge_count, 0) + 1`, `last_urged_at = ?`, `updated_at = ?`);
    values.push(now, now);

    await writeApprovalAction(db, {
      orgId: user.org_id, instanceId: id, action: 'urge',
      nodeOrder: inst.current_node_order, nodeName: inst.current_node_name,
      actorId: user.id, actorName,
      targetId: inst.current_approver_id, targetName: inst.current_approver_name,
      comment: body.comment || '催办',
    });
  }

  // ─────────────────────── 通过 / 驳回 ───────────────────────
  if (action === 'approve' || action === 'reject') {
    if (inst.status !== 'pending') {
      return json({ error: '该单据已处理完毕，不能再审批', status: inst.status }, 409);
    }
    // 审批责任闸门：只认当前审批人本人（经委托路由后的实际审批人）
    if (inst.current_approver_id !== user.id) {
      return json(
        {
          error: '您不是当前节点的审批人，无权处理',
          currentApprover: inst.current_approver_name || null,
        },
        403,
      );
    }

    if (action === 'reject') {
      setClauses.push(`status = ?`, `finished_at = ?`, `updated_at = ?`);
      values.push('rejected', now, now);
    } else {
      const totalNodes = Number(inst.total_nodes) || 0;
      const currOrder = Number(inst.current_node_order) || 1;
      const isLast = totalNodes > 0 ? currOrder >= totalNodes : true;

      if (isLast) {
        setClauses.push(`status = ?`, `finished_at = ?`, `updated_at = ?`);
        values.push('approved', now, now);
      } else {
        const nextOrder = currOrder + 1;
        // 下一节点审批人也过一遍委托路由：审批人期间出差，推进链路同样要正确转交
        const nextRawId = body.nextApproverId || null;
        const nextRawName = body.nextApproverName || null;
        const nextDeleg = await resolveDelegate(db, user.org_id, nextRawId, String(inst.module), todayStr());
        // ★ SoD 推进闸：下一节点「委托路由后的实际审批人」不得是提交人本人。
        //   只校验 nextRawId 会漏掉「配置审批人=他人、但该人委托给了提交人」的自审后门。
        const nextEffectiveId = nextDeleg ? nextDeleg.id : nextRawId;
        if (assertSoD(String(inst.submitter_id), nextEffectiveId)) {
          return json(
            { error: '下一审批人不能是提交人本人，请指定其他责任人（制单与审核分离）', code: 'SOD_SELF_APPROVAL' },
            403,
          );
        }
        setClauses.push(
          `current_node_order = ?`, `current_node_name = ?`,
          `current_approver_id = ?`, `current_approver_name = ?`,
          `original_approver_id = ?`, `updated_at = ?`,
        );
        values.push(
          nextOrder,
          body.nextNodeName || null,
          nextEffectiveId,
          nextDeleg ? nextDeleg.name : nextRawName,
          nextRawId,
          now,
        );
      }
    }

    await writeApprovalAction(db, {
      orgId: user.org_id, instanceId: id, action,
      nodeOrder: inst.current_node_order, nodeName: inst.current_node_name,
      actorId: user.id, actorName,
      comment: body.comment || (action === 'approve' ? '同意' : '驳回'),
    });
  }

  // 统一走乐观锁写入（客户端不带 version 时行为不变，兼容老前端）
  const conflict = await withVersionGuard({
    db, table: 'approval_instances', id, orgId: user.org_id, body, setClauses, values,
  });
  if (conflict) return conflict;

  const updated = await db
    .prepare(`SELECT * FROM approval_instances WHERE id = ? AND org_id = ?`)
    .bind(id, user.org_id)
    .first();

  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: actorName || null },
    entity: 'approval_instance',
    action,
    entityId: id,
    summary: `审批动作 ${action}：${inst.module} ${inst.entity_no || inst.entity_id}`,
  });

  return json({ ok: true, data: updated });
}
