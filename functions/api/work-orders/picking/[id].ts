// GET/PUT/DELETE /api/work-orders/picking/:id
import { getUserFromRequest, json } from '../../../_shared/auth';
import { validateOrReject } from '../../../_shared/validate';
// V3.5.0 B6：补齐写审计（领料直接扣原料库存并计入工单成本）
import { writeAudit } from '../../../_shared/auditLog';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM work_order_pickings WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '领料记录不存在' }, 404);

  return json({
    ...row,
    quantity: Number(row.quantity),
  });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT id, work_order_no, material_code, quantity, outbound_no FROM work_order_pickings WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '领料记录不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const _invalid = validateOrReject('work_order_pickings', body, { partial: true });
  if (_invalid) return _invalid;
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const fields = ['workOrderNo', 'materialId', 'materialCode', 'materialName', 'unit', 'quantity', 'outboundNo', 'issuedAt'];
  const setClauses: string[] = [];
  const values: (string | number)[] = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      const col = f === 'workOrderNo' ? 'work_order_no' : f === 'materialId' ? 'material_id' : f === 'materialCode' ? 'material_code' :
        f === 'materialName' ? 'material_name' : f === 'outboundNo' ? 'outbound_no' : f === 'issuedAt' ? 'issued_at' :
        f.toLowerCase();
      setClauses.push(`${col} = ?`);
      values.push(body[f]);
    }
  }
  setClauses.push('updated_at = ?', 'updated_by = ?');
  values.push(now, user.name);

  await db.prepare(`UPDATE work_order_pickings SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values, id).run();

  const updated = await db.prepare(`SELECT * FROM work_order_pickings WHERE id = ?`).bind(id).first();

  // B6 审计：领料记录把原料从仓库账转入工单成本，是「材料成本归集」的凭证。
  //   数量改动会同时影响库存数与工单成本两处，故摘要突出「数量变化」。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'work_order_pickings',
    entityId: id,
    action: 'update',
    summary:
      `更新工单领料 ${(existing as any).work_order_no || id}` +
      `（物料：${body.materialCode ?? (existing as any).material_code ?? '-'}）` +
      `（数量：${(existing as any).quantity ?? '-'} → ${body.quantity ?? (existing as any).quantity ?? '-'}）` +
      `（出库单：${body.outboundNo ?? (existing as any).outbound_no ?? '-'}）`,
  });

  return json(updated);
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id, work_order_no, material_code, material_name, quantity, outbound_no FROM work_order_pickings WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '领料记录不存在' }, 404);

  await db.prepare(`DELETE FROM work_order_pickings WHERE id = ?`).bind(id).run();

  // B6 审计：删除领料记录会同时从工单成本里扣掉这笔材料费，属于成本数据的反向操作。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'work_order_pickings',
    entityId: id,
    action: 'delete',
    summary:
      `删除工单领料 ${(row as any).work_order_no || id}` +
      `（物料：${(row as any).material_code || '-'} ${(row as any).material_name || ''}；` +
      `数量：${(row as any).quantity ?? '-'}；出库单：${(row as any).outbound_no || '-'}）` +
      '【注意：工单材料成本将相应减少，请核对成本核算】',
  });

  return json({ success: true });
}
