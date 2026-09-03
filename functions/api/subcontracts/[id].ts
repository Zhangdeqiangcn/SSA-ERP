// GET/PUT/DELETE /api/subcontracts/:id
import { getUserFromRequest, json } from '../../_shared/auth';

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

  const existing = await db.prepare(`SELECT id FROM subcontract_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '委外订单不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const fields = ['orderNo', 'type', 'materialId', 'materialCode', 'materialName', 'vendorId', 'vendorName', 'qty', 'bomId', 'sourceWorkOrderId', 'status', 'planDate', 'processFee', 'receivedQty', 'issueOutboundNo', 'receiptInboundNos'];
  const setClauses = [];
  const values = [];
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
  return json({ ...updated, issueItems });
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id FROM subcontract_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '委外订单不存在' }, 404);

  await db.prepare(`DELETE FROM subcontract_orders WHERE id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM subcontract_issue_items WHERE subcontract_order_id = ?`).bind(id).run();

  return json({ success: true });
}
