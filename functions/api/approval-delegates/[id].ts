// GET    /api/approval-delegates/:id — 单条委托详情
// PUT    /api/approval-delegates/:id — 修改（含 active=0 撤销）
// DELETE /api/approval-delegates/:id — 删除
//
// V3.17.9 修复差距 11。归属闸门：只有委托发起人本人（或管理员）能改/撤销/删除。
import { getUserFromRequest, json } from '../../_shared/auth';
import { isRlsPrivileged } from '../../_shared/rls';
import { writeAudit } from '../../_shared/auditLog';
import { isDelegateActive, todayStr } from '../../_shared/approvalInstance';

async function loadOwned(context: any, user: any) {
  const db = context.env.DB;
  const id = context.params.id;
  const row: any = await db
    .prepare(`SELECT * FROM approval_delegates WHERE id = ? AND org_id = ?`)
    .bind(id, user.org_id)
    .first();
  if (!row) return { db, id, row: null, denied: json({ error: '委托记录不存在' }, 404) };
  if (row.delegator_id !== user.id && !isRlsPrivileged(user.role)) {
    return { db, id, row, denied: json({ error: '只有委托发起人本人或管理员可以修改该委托' }, 403) };
  }
  return { db, id, row, denied: null };
}

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  const { row, denied } = await loadOwned(context, user);
  if (denied) return denied;
  return json({ ok: true, data: { ...row, effective: isDelegateActive(row, todayStr()) } });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const { db, id, row, denied } = await loadOwned(context, user);
  if (denied) return denied;

  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString();

  // 撤销 = active 置 0（保留历史，不物理删除）。这是最常用的动作，单独放行。
  if (body.active === 0 || body.active === false) {
    await db
      .prepare(`UPDATE approval_delegates SET active = 0, updated_at = ? WHERE id = ? AND org_id = ?`)
      .bind(now, id, user.org_id)
      .run();

    await writeAudit(db, {
      orgId: user.org_id,
      actor: { id: user.id, name: user.name || user.username || null },
      entity: 'approval_delegate',
      action: 'update',
      entityId: id,
      summary: `撤销审批委托：${row.delegator_name || row.delegator_id} → ${row.delegate_name || row.delegate_id}`,
    });

    return json({ ok: true, data: { id, active: 0 } });
  }

  if (body.active === 1 || body.active === true) {
    await db
      .prepare(`UPDATE approval_delegates SET active = 1, updated_at = ? WHERE id = ? AND org_id = ?`)
      .bind(now, id, user.org_id)
      .run();
    return json({ ok: true, data: { id, active: 1 } });
  }

  const startDate = body.startDate ?? row.start_date;
  const endDate = body.endDate ?? row.end_date;
  if (String(endDate) < String(startDate)) {
    return json({ error: '结束日期不能早于开始日期' }, 400);
  }

  await db
    .prepare(
      `UPDATE approval_delegates SET
         module = ?, start_date = ?, end_date = ?, reason = ?, delegate_id = ?, delegate_name = ?, updated_at = ?
       WHERE id = ? AND org_id = ?`
    )
    .bind(
      body.module ?? row.module,
      String(startDate),
      String(endDate),
      body.reason ?? row.reason,
      body.delegateId ?? row.delegate_id,
      body.delegateName ?? row.delegate_name,
      now, id, user.org_id,
    )
    .run();

  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name || user.username || null },
    entity: 'approval_delegate',
    action: 'update',
    entityId: id,
    summary: `修改审批委托：${startDate} ~ ${endDate}`,
  });

  const updated = await db.prepare(`SELECT * FROM approval_delegates WHERE id = ?`).bind(id).first();
  return json({ ok: true, data: updated });
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const { db, id, denied } = await loadOwned(context, user);
  if (denied) return denied;

  await db.prepare(`DELETE FROM approval_delegates WHERE id = ? AND org_id = ?`).bind(id, user.org_id).run();

  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name || user.username || null },
    entity: 'approval_delegate',
    action: 'delete',
    entityId: id,
    summary: '删除审批委托记录',
  });

  return json({ ok: true });
}
