/**
 * 单据提交自动触发审批（根治审计 P0-ST-1「审批流仅采购申请/供应商报价触发，核心单据不触发」）
 * ------------------------------------------------------------------
 * V3.63.0 之前：approval_flows 已为采购订单/销售订单/工单/出入库/发票建好默认流程，
 * 但只有采购申请走审批，其余核心单据提交不建审批实例 → 审批流配置形同虚设。
 *
 * 现在：业务单据端点在「单据已落库」后调用 startApprovalForDoc，
 *   若该模块存在 enabled 的审批流，则按首个节点（node_order=1）的 approver_user_ids/approver_roles
 *   解析首位审批人并自动创建一条 pending 审批实例（含委托路由 + SoD 自审拦截）。
 *   审批流未启用 / 查不到 / 建实例失败 → 静默跳过（**绝不阻断主单据**），仅留痕日志，
 *   与凭证模板「未命中回退内置」同口径：配置驱动但不绑架业务。
 *
 * 幂等：同一 (module, entity_id) 已有 pending 实例则不重复建（与 /api/approval-instances POST 同口径）。
 */
import { uid } from './auth';
import { writeAudit } from './auditLog';
import { resolveDelegate, todayStr, assertSoD, writeApprovalAction } from './approvalInstance';

export interface AutoApprovalResult {
  started: boolean;      // 是否成功启动了审批
  reason: string;        // 未启动原因（flow_disabled / no_flow / no_approver / already_pending / sod_self / failed / none）
  instanceId?: string;
}

/**
 * 为业务单据启动审批（服务端侧）。
 * @param db D1 句柄
 * @param orgId 组织 id
 * @param user 提交人（含 id / name / department）
 * @param module 审批模块标识（与 approval_flows.module 对齐：purchase_order / sales_order / work_order / inbound / outbound / invoice）
 * @param entityId 业务单据 id（approval_instances.entity_id）
 * @param entityNo 业务单号（可选，用于实例可读编号）
 */
export async function startApprovalForDoc(
  db: any,
  orgId: string,
  user: any,
  module: string,
  entityId: string,
  entityNo?: string
): Promise<AutoApprovalResult> {
  // 1) 该模块是否有启用的审批流
  const flow = await db
    .prepare(`SELECT id, status FROM approval_flows WHERE org_id = ? AND module = ? AND enabled = 1 ORDER BY created_at DESC LIMIT 1`)
    .bind(orgId, module)
    .first()
    .catch(() => null);
  if (!flow) return { started: false, reason: 'no_flow' };
  if (flow.status && !['active', 'published', 'system'].includes(flow.status)) {
    return { started: false, reason: 'flow_disabled' };
  }

  // 2) 首个审批节点（node_order=1）
  const node = await db
    .prepare(`SELECT * FROM approval_flow_nodes WHERE flow_id = ? ORDER BY node_order ASC LIMIT 1`)
    .bind(flow.id)
    .first()
    .catch(() => null);
  if (!node) return { started: false, reason: 'no_flow' };

  // 3) 解析首位审批人（approver_user_ids 优先，否则 approver_roles 取首）
  let approverId: string | null = null;
  let approverName: string | null = null;
  try {
    const userIds: string[] = node.approver_user_ids ? JSON.parse(node.approver_user_ids) : [];
    if (Array.isArray(userIds) && userIds.length > 0) {
      approverId = String(userIds[0]);
      const urow = await db
        .prepare(`SELECT name FROM users WHERE id = ?`).bind(approverId).first().catch(() => null);
      approverName = urow?.name || approverId;
    } else {
      const roles: string[] = node.approver_roles ? JSON.parse(node.approver_roles) : [];
      const role = node.role || (Array.isArray(roles) && roles.length > 0 ? roles[0] : null);
      if (role) {
        // users 表自带 role 列（本系统无独立 user_roles 关联表）：按组织内首个该角色用户解析审批人
        const rrow = await db
          .prepare(`SELECT id, name FROM users WHERE role = ? AND org_id = ? ORDER BY created_at ASC LIMIT 1`)
          .bind(role, orgId)
          .first()
          .catch(() => null);
        if (rrow) {
          approverId = String(rrow.id);
          approverName = rrow.name;
        }
      }
    }
  } catch {
    /* 解析失败按无审批人处理 */
  }
  if (!approverId) return { started: false, reason: 'no_approver' };

  // 4) 委托路由 + SoD 自审拦截（与 /api/approval-instances POST 同口径）
  const delegated = await resolveDelegate(db, orgId, approverId, module, todayStr()).catch(() => null);
  const effectiveApproverId = delegated ? delegated.id : approverId;
  const effectiveApproverName = delegated ? delegated.name : approverName;
  if (assertSoD(user.id, effectiveApproverId)) return { started: false, reason: 'sod_self' };

  // 5) 幂等：已 pending 不重复建
  const existing = await db
    .prepare(`SELECT id, status FROM approval_instances WHERE org_id = ? AND module = ? AND entity_id = ?`)
    .bind(orgId, module, String(entityId))
    .first()
    .catch(() => null);
  if (existing && existing.status === 'pending') return { started: false, reason: 'already_pending', instanceId: existing.id };

  // 6) 建实例（pending，首节点）
  const now = new Date().toISOString();
  let instanceId = '';
  try {
    if (existing) {
      // 驳回/完成后重提：重置同一行
      instanceId = existing.id;
      await db
        .prepare(
          `UPDATE approval_instances SET
             flow_id = ?, entity_no = ?, submitter_id = ?, submitter_name = ?, status = 'pending',
             current_node_order = 1, current_node_name = ?, current_approver_id = ?, current_approver_name = ?,
             original_approver_id = ?, submitted_at = ?, finished_at = NULL, withdrawn_at = NULL,
             withdrawn_by = NULL, withdraw_reason = NULL, urge_count = 0, last_urged_at = NULL,
             version = version + 1, updated_at = ?
           WHERE id = ? AND org_id = ?`
        )
        .bind(
          flow.id, entityNo || null, user.id, user.name || user.username || '',
          node.name || '第一步', effectiveApproverId, effectiveApproverName, approverId,
          now, now, instanceId, orgId
        )
        .run();
    } else {
      instanceId = uid('appr');
      await db
        .prepare(
          `INSERT INTO approval_instances
             (id, org_id, flow_id, module, entity_id, entity_no, title, submitter_id, submitter_name,
              status, total_nodes, current_node_order, current_node_name,
              current_approver_id, current_approver_name, original_approver_id,
              submitted_at, urge_count, version, created_at, updated_at, owner_id, dept_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, 1, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?)`
        )
        .bind(
          instanceId, orgId, flow.id, module, String(entityId), entityNo || null, `${module} 审批`,
          user.id, user.name || user.username || '',
          node.name || '第一步', effectiveApproverId, effectiveApproverName, approverId,
          now, now, now, user.id, user.department || null
        )
        .run();
    }
    await writeApprovalAction(db, {
      orgId, instanceId, action: 'submit', nodeOrder: 1, nodeName: node.name || '第一步',
      actorId: user.id, actorName: user.name || user.username || '', targetId: effectiveApproverId,
      targetName: effectiveApproverName, comment: '单据提交自动触发审批',
    }).catch(() => {});
  } catch (e: any) {
    await writeAudit(db, { orgId, actor: { id: user.id, name: user.name || user.username || null }, entity: 'approval_instance', action: 'create', entityId: null, summary: `单据审批自动启动失败 ${module} ${entityNo || entityId}: ${e?.message || e}` });
    return { started: false, reason: 'failed' };
  }

  return { started: true, reason: 'none', instanceId };
}
