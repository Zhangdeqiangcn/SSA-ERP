// GET/PUT/DELETE /api/vouchers/:id
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM vouchers WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '凭证不存在' }, 404);

  const items = await db.prepare(`SELECT * FROM voucher_items WHERE voucher_id = ? ORDER BY line_no`).bind(id).all();

  return json({
    ...row,
    items: (items.results || []).map(r => ({
      id: r.id, voucher_id: r.voucher_id, line_no: Number(r.line_no), summary: r.summary,
      account_code: r.account_code, account_name: r.account_name,
      debit: Number(r.debit), credit: Number(r.credit),
      currency: r.currency || 'CNY', exchange_rate: r.exchange_rate ? Number(r.exchange_rate) : 1,
    })),
  });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT id FROM vouchers WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '凭证不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const fields = ['voucherNo', 'date', 'description', 'source', 'status', 'totalDebit', 'totalCredit', 'remarks'];
  const setClauses = [];
  const values = [];

  for (const f of fields) {
    if (body[f] !== undefined) {
      const col = f === 'voucherNo' ? 'voucher_no' : f === 'totalDebit' ? 'total_debit' : f === 'totalCredit' ? 'total_credit' : f.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase();
      setClauses.push(`${col} = ?`);
      values.push(body[f]);
    }
  }
  setClauses.push('updated_at = ?', 'updated_by = ?');
  values.push(now, user.name);

  await db.prepare(`UPDATE vouchers SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values, id).run();

  // 同步更新分录行
  if (body.items && Array.isArray(body.items)) {
    await db.prepare(`DELETE FROM voucher_items WHERE voucher_id = ?`).bind(id).run();
    for (const item of body.items) {
      await db.prepare(`INSERT INTO voucher_items (id, voucher_id, line_no, summary, account_code, account_name, debit, credit, currency, exchange_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        item.id || `vi-${id}-${Math.random().toString(36).slice(2, 6)}`,
        id, item.lineNo || 0, item.summary || null, item.accountCode || null, item.accountName || null,
        item.debit || 0, item.credit || 0, item.currency || 'CNY', item.exchangeRate || 1
      ).run();
    }
  }

  return json({ success: true });
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id FROM vouchers WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '凭证不存在' }, 404);

  await db.prepare(`DELETE FROM vouchers WHERE id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM voucher_items WHERE voucher_id = ?`).bind(id).run();

  return json({ success: true });
}
