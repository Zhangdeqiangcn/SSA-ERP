// GET/PUT/DELETE /api/serial-numbers/:id
import { getUserFromRequest, json } from '../../_shared/auth';
import { insertSerialMovement } from '../../_shared/serial';
import { validateOrReject } from '../../_shared/validate';
// V3.5.0 B6：补齐写审计（序列号是单件追溯的最后一道证据链）
import { writeAudit } from '../../_shared/auditLog';
// ★ V3.45.0 操作权限服务端守卫：此前该端点零守卫（任何登录用户均可写）。
import { guardOperation } from '../../_shared/operationGuard';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM serial_masters WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '序列号不存在' }, 404);

  const movements = await db.prepare(`SELECT * FROM serial_movements WHERE serial_master_id = ?`).bind(id).all();

  return json({
    ...row,
    movements: movements.results || [],
  });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;

  // V3.45.0：写端点服务端硬拦，越权返回 403 OPERATION_FORBIDDEN（绕开界面亦生效）。
  const _opGuard = await guardOperation(user, 'serial', 'update', db, user.org_id);
  if (_opGuard) return _opGuard;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT id, serial_no, material_code, status, customer_name FROM serial_masters WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '序列号不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const _invalid = validateOrReject('serial_masters', body, { partial: true });
  if (_invalid) return _invalid;
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const fields = ['serialNo', 'materialId', 'materialCode', 'materialName', 'batchNo', 'warehouseId', 'huId', 'status', 'inboundDate', 'outboundDate', 'customerName', 'remarks'];
  const setClauses: string[] = [];
  const values: (string | number)[] = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      const col = f === 'serialNo' ? 'serial_no' : f === 'materialId' ? 'material_id' : f === 'materialCode' ? 'material_code' :
        f === 'materialName' ? 'material_name' : f === 'warehouseId' ? 'warehouse_id' : f === 'huId' ? 'hu_id' :
        f === 'inboundDate' ? 'inbound_date' : f === 'outboundDate' ? 'outbound_date' : f === 'customerName' ? 'customer_name' :
        f.toLowerCase();
      setClauses.push(`${col} = ?`);
      values.push(body[f]);
    }
  }
  setClauses.push('updated_at = ?', 'updated_by = ?');
  values.push(now, user.name);

  await db.prepare(`UPDATE serial_masters SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values, id).run();

  // 流转记录：状态变更 / 显式传入 movement 时落 serial_movements，保留全生命周期轨迹
  if (body.movement && typeof body.movement === 'object') {
    await insertSerialMovement(db, id, body.movement, user, now);
  }

  const updated = await db.prepare(`SELECT * FROM serial_masters WHERE id = ?`).bind(id).first();
  const movements = await db.prepare(`SELECT * FROM serial_movements WHERE serial_master_id = ?`).bind(id).all();

  // B6 审计：序列号用于单件级追溯（哪一台设备发给了哪个客户、何时进的库）。
  //   一旦序列号状态被改（在库 → 已出库），售后退换货与质量召回的判定基础就变了，
  //   因此状态流转与客户指向必须逐个留痕。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'serial_masters',
    entityId: id,
    action: 'update',
    summary:
      `更新序列号 ${(existing as any).serial_no || id}` +
      `（物料：${body.materialCode ?? (existing as any).material_code ?? '-'}）` +
      `（状态：${(existing as any).status || '-'} → ${(body.status ?? (existing as any).status) || '-'}）` +
      ((existing as any).customer_name !== (body.customerName ?? (existing as any).customer_name)
        ? `（客户：${(existing as any).customer_name || '-'} → ${body.customerName ?? '-'}）`
        : '') +
      `（流转记录：${body.movement ? '本次新增一条' : '未新增'}）`,
  });

  return json({ ...updated, movements: movements.results || [] });
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  // V3.45.0 操作权限服务端守卫（此前该端点零守卫，任何登录用户都能删序列号主档 → 追溯链断裂）
  const _opGuard = await guardOperation(user, 'serial', 'delete', db, user.org_id);
  if (_opGuard) return _opGuard;

  const row = await db.prepare(`SELECT id, serial_no, material_code, status, customer_name FROM serial_masters WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '序列号不存在' }, 404);

  await db.prepare(`DELETE FROM serial_masters WHERE id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM serial_movements WHERE serial_master_id = ?`).bind(id).run();

  // B6 审计：删除序列号 = 抹掉该单件的全部流转轨迹（含已发货给客户的记录）。
  //   已出库的序列号被删除后，客户端的设备将无法在系统内追溯到来源，故单独告警。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'serial_masters',
    entityId: id,
    action: 'delete',
    summary:
      `删除序列号 ${(row as any).serial_no || id}` +
      `（物料：${(row as any).material_code || '-'}；状态：${(row as any).status || '-'}）` +
      `（原客户：${(row as any).customer_name || '-'}）` +
      ((row as any).customer_name || (row as any).status === 'shipped'
        ? '【注意：该序列号已指向客户，删除后单件追溯链断裂，售后与召回将无法定位】'
        : ''),
  });

  return json({ success: true });
}
