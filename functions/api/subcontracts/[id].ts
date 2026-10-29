// GET/PUT/DELETE /api/subcontracts/:id
import { getUserFromRequest, json } from '../../_shared/auth';
import { guardOperation } from '../../_shared/operationGuard';
import { validateOrReject } from '../../_shared/validate';
// V3.5.0 B6：补齐写审计（委外涉发出物料的所有权与加工费结算）
import { writeAudit } from '../../_shared/auditLog';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM subcontract_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '委外订单不存在' }, 404);

  const items = await db.prepare(`SELECT * FROM subcontract_issue_items WHERE subcontract_order_id = ?`).bind(id).all();

  return json({
    ...row,
    qty: Number(row.qty),
    process_fee: row.process_fee ? Number(row.process_fee) : 0,
    received_qty: row.received_qty ? Number(row.received_qty) : 0,
    issueItems: (items.results || []).map(r => ({
      id: r.id, subcontract_order_id: r.subcontract_order_id, material_id: r.material_id,
      material_code: r.material_code, material_name: r.material_name, unit: r.unit, qty: Number(r.qty),
    })),
  });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT id, order_no, material_code, vendor_name, qty, process_fee, received_qty, status FROM subcontract_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '委外订单不存在' }, 404);

  // V3.28.0: 操作权限服务端守卫（生产模块 — 生产班长可改委外单，越权返回 403）
  const _opGuard = await guardOperation(user, 'production', 'update', db, user.org_id);
  if (_opGuard) return _opGuard;

  const body = await context.request.json().catch(() => ({}));
  const _invalid = validateOrReject('subcontract_orders', body, { partial: true });
  if (_invalid) return _invalid;
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const fields = ['orderNo', 'type', 'materialId', 'materialCode', 'materialName', 'vendorId', 'vendorName', 'qty', 'bomId', 'sourceWorkOrderId', 'status', 'planDate', 'processFee', 'receivedQty', 'issueOutboundNo', 'receiptInboundNos'];
  const setClauses: string[] = [];
  const values: (string | number)[] = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      const col = f === 'orderNo' ? 'order_no' : f === 'materialId' ? 'material_id' : f === 'materialCode' ? 'material_code' :
        f === 'materialName' ? 'material_name' : f === 'vendorId' ? 'vendor_id' : f === 'vendorName' ? 'vendor_name' :
        f === 'bomId' ? 'bom_id' : f === 'sourceWorkOrderId' ? 'source_work_order_id' : f === 'planDate' ? 'plan_date' :
        f === 'processFee' ? 'process_fee' : f === 'receivedQty' ? 'received_qty' : f === 'issueOutboundNo' ? 'issue_outbound_no' :
        f === 'receiptInboundNos' ? 'receipt_inbound_nos' : f.toLowerCase();
      setClauses.push(`${col} = ?`);
      values.push(body[f]);
    }
  }
  setClauses.push('updated_at = ?', 'updated_by = ?');
  values.push(now, user.name);

  await db.prepare(`UPDATE subcontract_orders SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values, id).run();

  if (body.issueItems && Array.isArray(body.issueItems)) {
    await db.prepare(`DELETE FROM subcontract_issue_items WHERE subcontract_order_id = ?`).bind(id).run();
    for (const item of body.issueItems) {
      await db.prepare(`INSERT INTO subcontract_issue_items (id, subcontract_order_id, material_id, material_code, material_name, unit, qty) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(
        'sci-' + crypto.randomUUID(), id, item.materialId || null, item.materialCode || null, item.materialName || null,
        item.unit || null, Number(item.qty) || 0
      ).run();
    }
  }

  const updated = await db.prepare(`SELECT * FROM subcontract_orders WHERE id = ?`).bind(id).first();
  const itemsRes = await db.prepare(`SELECT * FROM subcontract_issue_items WHERE subcontract_order_id = ?`).bind(id).all();
  const issueItems = (itemsRes.results || []).map(r => ({
    id: r.id, subcontract_order_id: r.subcontract_order_id, material_id: r.material_id,
    material_code: r.material_code, material_name: r.material_name, unit: r.unit, qty: Number(r.qty),
  }));

  // B6 审计：委外订单的特殊性在于「我方物料发到供应商处加工」，物料所有权在发出后
  //   仍属我方，因此每一次数量/加工费/供应商的改动都直接影响在外物料的对账。
  //   摘要记「数量·加工费·已收数量·供应商」四项，这四项任一变化都是从量或从价的实质变更。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'subcontract_orders',
    entityId: id,
    action: 'update',
    summary:
      `更新委外订单 ${(existing as any).order_no || id}` +
      `（供应商：${body.vendorName ?? (existing as any).vendor_name ?? '-'}）` +
      `（数量：${(existing as any).qty ?? '-'} → ${body.qty ?? (existing as any).qty ?? '-'}；` +
      `加工费：${(existing as any).process_fee ?? '-'} → ${body.processFee ?? (existing as any).process_fee ?? '-'}；` +
      `已收：${(existing as any).received_qty ?? '-'} → ${body.receivedQty ?? (existing as any).received_qty ?? '-'}）` +
      `（状态：${(existing as any).status || '-'} → ${body.status || (existing as any).status || '-'}）` +
      `（发出明细行：${Array.isArray(body.issueItems) ? body.issueItems.length : '未改动'}）`,
  });

  return json({ ...updated, issueItems });
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id, order_no, material_code, vendor_name, qty, received_qty, status FROM subcontract_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '委外订单不存在' }, 404);

  // V3.28.0: 操作权限服务端守卫（生产模块 — 生产班长可删委外单，越权返回 403）
  const _opGuard = await guardOperation(user, 'production', 'delete', db, user.org_id);
  if (_opGuard) return _opGuard;

  await db.prepare(`DELETE FROM subcontract_orders WHERE id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM subcontract_issue_items WHERE subcontract_order_id = ?`).bind(id).run();

  // B6 审计：删除委外订单若已发出物料（received_qty > 0 或状态已进入执行），
  //   意味着账上在外物料凭空减少，必须标注风险供供应链核对在途。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'subcontract_orders',
    entityId: id,
    action: 'delete',
    summary:
      `删除委外订单 ${(row as any).order_no || id}` +
      `（供应商：${(row as any).vendor_name || '-'}；物料：${(row as any).material_code || '-'}；` +
      `数量：${(row as any).qty ?? '-'}；已收：${(row as any).received_qty ?? '-'}）` +
      (Number((row as any).received_qty) > 0
        ? '【注意：该委外单已有收货记录，删除后在外物料账需人工核对】'
        : ''),
  });

  return json({ success: true });
}
