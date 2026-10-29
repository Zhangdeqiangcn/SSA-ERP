// POST /api/serial-numbers/consume — FIFO 核销序列号
import { getUserFromRequest, json } from '../../_shared/auth';
// V3.5.0 B6：补齐写审计（批量核销是「一次改变多个单件状态」的高影响动作）
import { writeAudit } from '../../_shared/auditLog';
// ★ V3.45.0 操作权限服务端守卫：此前该端点零守卫（任何登录用户均可写）。
import { guardOperation } from '../../_shared/operationGuard';

export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;

  // V3.45.0：写端点服务端硬拦，越权返回 403 OPERATION_FORBIDDEN（绕开界面亦生效）。
  const _opGuard = await guardOperation(user, 'serial', 'update', db, user.org_id);
  if (_opGuard) return _opGuard;
  const body = await context.request.json().catch(() => ({}));
  const materialId = body.materialId;
  const qty = parseInt(body.qty, 10);
  const newStatus = body.newStatus || 'shipped';
  const date = body.date || new Date().toISOString().replace(/\.\d{3}Z$/, '');
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  if (!materialId || !qty || qty <= 0) {
    return json({ error: 'materialId 与 qty 必填且 qty 为正整数' }, 400);
  }

  const avail = await db.prepare(`SELECT * FROM serial_masters WHERE org_id = ? AND material_id = ? AND status = 'in_stock' ORDER BY inbound_date ASC, serial_no ASC LIMIT ?`).bind(user.org_id, materialId, qty).all();
  const rows = avail.results || [];
  if (rows.length < qty) {
    return json({ error: '在库序列号不足', available: rows.length, required: qty }, 409);
  }

  const consumed: string[] = [];
  for (const r of rows) {
    await db.prepare(`UPDATE serial_masters SET status = ?, outbound_date = ?, updated_at = ?, updated_by = ? WHERE id = ?`).bind(newStatus, date, now, user.name, r.id).run();
    await db.prepare(`INSERT INTO serial_movements (id, serial_master_id, type, doc_no, date, status, note) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(
      'smv-' + crypto.randomUUID(), r.id, body.type || null, body.docNo || null, date, newStatus, null
    ).run();
    consumed.push(r.serial_no);
  }

  // B6 审计：FIFO 核销是「批量、按先入先出自动选号」的动作，比逐条改序列号影响更大 ——
  //   一次调用就改变多个单件的状态，且具体选中了哪些号由系统按入库日期决定而非人工指定。
  //   因此审计里必须把**实际核销掉的完整序列号清单**写下来，否则事后无法回答
  //   「发给客户的到底是哪几台」——这正是序列号管理存在的意义。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'serial_masters',
    entityId: materialId,
    action: 'consume',
    summary:
      `FIFO 核销序列号：物料 ${materialId} × ${consumed.length} 件` +
      `（状态 → ${newStatus}；单据：${body.docNo || '-'}；日期：${String(date).slice(0, 10)}）` +
      `（核销明细：${consumed.join('、')}）`,
  });

  return json({ consumed });
}
