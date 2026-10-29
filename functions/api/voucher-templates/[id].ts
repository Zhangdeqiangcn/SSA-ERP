// GET/PUT/DELETE /api/voucher-templates/:id
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { audit } from '../../_shared/auditLog';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM voucher_templates WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '模板不存在' }, 404);

  const items = await db.prepare(`SELECT * FROM voucher_template_items WHERE template_id = ? ORDER BY line_no`).bind(id).all();
  return json({ ...row, items: (items.results || []).map((r: any) => ({ ...r })) });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT id FROM voucher_templates WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '模板不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const name = (body.name || '').trim();
  if (!name) return json({ error: '模板名称必填' }, 400);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  await db.prepare(
    `UPDATE voucher_templates SET name = ?, description = ?, voucher_type = ?, is_default = ?, sort_order = ?, updated_at = ? WHERE id = ?`
  ).bind(name, body.description || '', body.voucherType || '', body.isDefault ? 1 : 0, Number(body.sortOrder) || 0, now, id).run();

  if (Array.isArray(body.items)) {
    await db.prepare(`DELETE FROM voucher_template_items WHERE template_id = ?`).bind(id).run();
    for (let i = 0; i < body.items.length; i++) {
      const it = body.items[i];
      await db.prepare(
        `INSERT INTO voucher_template_items (id, template_id, org_id, line_no, summary, account_code, account_name, direction, default_amount, ledger_book)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        uid('vti'), id, user.org_id, i + 1, (it.summary || '').trim(), it.accountCode || '', it.accountName || '',
        it.direction === 'credit' ? 'credit' : 'debit', Number(it.defaultAmount) || 0, it.ledgerBook || '0000'
      ).run();
    }
  }

  await audit(db, user.org_id, user, 'voucher_templates', 'update', `更新凭证模板 ${name}`);
  return json({ success: true });
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id FROM voucher_templates WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '模板不存在' }, 404);

  // 显式级联删除分录行（D1 的 FK ON DELETE CASCADE 在部分路径下不保证触发）
  await db.prepare(`DELETE FROM voucher_template_items WHERE template_id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM voucher_templates WHERE id = ?`).bind(id).run();

  await audit(db, user.org_id, user, 'voucher_templates', 'delete', `删除凭证模板 ${id}`);
  return json({ success: true });
}
