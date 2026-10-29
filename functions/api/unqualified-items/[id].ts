// POST /api/unqualified-items/:id — 质量不合格品处置（服务端权威 + 注入审批）
//
// V3.65.0 立项①：质量不合格品「处置」此前走通用 entities 路由（/api/entities/unqualifiedItem PUT），
//   通用路由是 config 驱动范式，无法在处置落库后注入 startApprovalForDoc → 审批流接不上。
//   本薄端点只做「处置」这一个动作：服务端权威更新 disposition_status / actual_disposition /
//   completed_date（防前端绕过篡改处置结果），落库后注入审批（module='quality_disposition'，
//   静默幂等：该模块无启用审批流则自动跳过，绝不阻断处置）。增删查继续走通用 entities 路由（够用原则）。
//
// 联动价值（审计 P0-1 闭环）：处置后 disposition_status='completed'，
//   inventoryPosting.checkQualityBlocked 的来料检 failed 分支判定「已闭环不合格品」自动放行，
//   解除质量冻结对仓库出库的拦截 —— 审批通过后处置才真正生效。
import { getUserFromRequest, json } from '../../_shared/auth';
import { writeAudit } from '../../_shared/auditLog';
import { guardOperation } from '../../_shared/operationGuard';
import { startApprovalForDoc } from '../../_shared/autoApproval';

const VALID_STATUS = new Set(['open', 'in_progress', 'completed', 'closed']);
const VALID_DISPOSITION = new Set(['rework', 'scrap', 'concession', 'return_vendor', 'other']);

export async function onRequestPost(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = String(context.params.id || '').slice(0, 64);
  if (!id) return json({ error: '不合格品 id 必填' }, 400);

  // 质量域守卫：质检可处置，越权角色 403 + OPERATION_FORBIDDEN
  const _opGuard = await guardOperation(user, 'quality', 'update', db, user.org_id);
  if (_opGuard) return _opGuard;

  const body = await context.request.json().catch(() => ({}));

  const target: any = await db
    .prepare(`SELECT * FROM unqualified_items WHERE id = ? AND org_id = ?`)
    .bind(id, user.org_id)
    .first();
  if (!target) return json({ error: '不合格品不存在' }, 404);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  // 处置结果（服务端归一化 + 白名单校验，防脏值）
  const disposition = VALID_DISPOSITION.has(body.disposition) ? body.disposition : target.disposition;
  const dispositionStatus = VALID_STATUS.has(body.dispositionStatus) ? body.dispositionStatus : target.disposition_status;
  const actualDisposition = body.actualDisposition !== undefined ? String(body.actualDisposition).slice(0, 300) : target.actual_disposition;
  const status = VALID_STATUS.has(body.status) ? body.status : (dispositionStatus === 'completed' ? 'closed' : target.status || 'open');
  const completedDate = dispositionStatus === 'completed' ? (now.slice(0, 10)) : target.completed_date;

  await db
    .prepare(
      `UPDATE unqualified_items SET
         disposition = ?, disposition_status = ?, actual_disposition = ?, status = ?,
         completed_date = ?, updated_at = ?, updated_by = ?
       WHERE id = ? AND org_id = ?`
    )
    .bind(disposition, dispositionStatus, actualDisposition || null, status, completedDate || null, now, user.name || user.username, id, user.org_id)
    .run();

  const row: any = await db.prepare(`SELECT * FROM unqualified_items WHERE id = ?`).bind(id).first();
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name || user.username || null },
    entity: 'unqualified_items',
    entityId: id,
    action: 'dispose',
    summary: `处置不合格品 ${row?.item_no || id}：处置方式 ${disposition}，状态 ${target.disposition_status || '-'} → ${dispositionStatus}`,
  });

  // V3.65.0 立项①：处置落库后注入审批（静默幂等，无启用审批流则跳过，不阻断处置）
  const appr = await startApprovalForDoc(db, user.org_id, user, 'quality_disposition', id, row?.item_no).catch(() => null);

  return json({ ...row, approval: appr ? { started: appr.started, reason: appr.reason, instanceId: appr.instanceId } : null });
}
