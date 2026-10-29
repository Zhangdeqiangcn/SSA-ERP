// GET /api/unit-conversions — 分页查询单位换算规则
// POST /api/unit-conversions — 新增单位换算规则
import { getUserFromRequest, json } from '../../_shared/auth';
import { uid } from '../../_shared/auth';
import { writeAudit } from '../../_shared/auditLog';
import { requireByRegistry } from '../../_shared/validate';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const rules = await db.prepare('SELECT * FROM unit_conversions ORDER BY from_unit, to_unit').all();
  return json({ ok: true, data: rules.results || [] });
}

export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  const { fromUnit, toUnit, factor } = body;

  // ★ V3.87.0 扩面：收口到集中必填登记表（单一真相，不造双源）
  const _reqCore = requireByRegistry('unit_conversions', body);
  if (_reqCore) return _reqCore;

  const id = uid('uc');
  try {
    await db.prepare(
      `INSERT INTO unit_conversions (id, from_unit, to_unit, factor, created_at) VALUES (?, ?, ?, ?, ?)`
    ).bind(id, fromUnit, toUnit, Number(factor), new Date().toISOString()).run();

    await writeAudit(db, {
      orgId: user.org_id,
      actor: { id: user.id, name: user.name },
      entity: 'unit_conversion',
      action: 'create',
      entityId: id,
      summary: `新增单位换算：${fromUnit} → ${toUnit} (×${factor})`,
    });

    return json({ ok: true, data: { id, fromUnit, toUnit, factor } }, 201);
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint')) {
      return json({ error: '该换算规则已存在' }, 409);
    }
    return json({ error: e.message || '保存失败' }, 500);
  }
}
