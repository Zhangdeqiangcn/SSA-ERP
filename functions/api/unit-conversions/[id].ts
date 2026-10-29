// GET /api/unit-conversions/:id — 查询单条规则
// PUT /api/unit-conversions/:id — 更新规则
// DELETE /api/unit-conversions/:id — 删除规则
import { getUserFromRequest, json } from '../../_shared/auth';
import { writeAudit } from '../../_shared/auditLog';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;
  const rule = await db.prepare('SELECT * FROM unit_conversions WHERE id = ?').bind(id).first();
  if (!rule) return json({ error: '不存在' }, 404);
  return json({ ok: true, data: rule });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;
  const body = await context.request.json().catch(() => ({}));
  const { fromUnit, toUnit, factor } = body;

  const existing = await db.prepare('SELECT * FROM unit_conversions WHERE id = ?').bind(id).first();
  if (!existing) return json({ error: '不存在' }, 404);

  try {
    await db.prepare(
      `UPDATE unit_conversions SET from_unit = ?, to_unit = ?, factor = ?, updated_at = ? WHERE id = ?`
    ).bind(fromUnit, toUnit, Number(factor), new Date().toISOString(), id).run();

    await writeAudit(db, {
      orgId: user.org_id,
      actor: { id: user.id, name: user.name },
      entity: 'unit_conversion',
      action: 'update',
      entityId: id,
      summary: `更新单位换算：${fromUnit} → ${toUnit}`,
    });

    return json({ ok: true });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint')) {
      return json({ error: '该换算规则已存在' }, 409);
    }
    return json({ error: e.message || '更新失败' }, 500);
  }
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;
  const existing = await db.prepare('SELECT * FROM unit_conversions WHERE id = ?').bind(id).first();
  if (!existing) return json({ error: '不存在' }, 404);

  await db.prepare('DELETE FROM unit_conversions WHERE id = ?').bind(id).run();

  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'unit_conversion',
    action: 'delete',
    entityId: id,
    summary: '删除单位换算规则',
  });

  return json({ ok: true });
}
