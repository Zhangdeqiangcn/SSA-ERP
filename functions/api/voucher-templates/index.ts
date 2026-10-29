// GET /api/voucher-templates — 分页查询凭证模板（按 org_id 隔离，组织级共享配置）
// POST /api/voucher-templates — 创建模板（含分录行）
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { audit } from '../../_shared/auditLog';
import { requireByRegistry } from '../../_shared/validate';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10);
  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const vtype = url.searchParams.get('voucherType') || '';
  const offset = (page - 1) * pageSize;

  let sql = `SELECT * FROM voucher_templates WHERE org_id = ?`;
  const params: any[] = [user.org_id];
  // ★ 关键词搜索必须「escapeLike 转义 + SQL 声明 ESCAPE '\\'」成对（见硬规矩㉗），否则连该搜到的都搜不到
  if (keyword) {
    sql += ` AND (name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')`;
    params.push(likePattern(keyword), likePattern(keyword));
  }
  if (vtype) {
    sql += ` AND voucher_type = ?`;
    params.push(vtype);
  }
  sql += ` ORDER BY sort_order, name LIMIT ? OFFSET ?`;
  params.push(pageSize, offset);

  const results = await db.prepare(sql).bind(...params).all();
  const count = await db.prepare(`SELECT COUNT(*) as cnt FROM voucher_templates WHERE org_id = ?`).bind(user.org_id).first();

  const data: any[] = [];
  for (const r of (results.results || [])) {
    const items = await db.prepare(`SELECT * FROM voucher_template_items WHERE template_id = ? ORDER BY line_no`).bind(r.id).all();
    data.push({ ...r, items: (items.results || []).map((it: any) => ({ ...it })) });
  }

  return json({ data, pagination: { page, pageSize, total: count?.cnt || 0 } });
}

// POST /api/voucher-templates — 新建模板（头 + 分录行）
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  // ★ V3.87.0 扩面：收口到集中必填登记表（单一真相，不造双源）
  const _reqCore = requireByRegistry('voucher_templates', body);
  if (_reqCore) return _reqCore;
  const name = (body.name || '').trim();

  const items = Array.isArray(body.items) ? body.items : [];
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  const id = (body.id && typeof body.id === 'string') ? body.id : uid('vt');

  await db.prepare(
    `INSERT INTO voucher_templates (id, org_id, name, description, voucher_type, is_default, sort_order, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, user.org_id, name, body.description || '', body.voucherType || '', body.isDefault ? 1 : 0,
    Number(body.sortOrder) || 0, user.id, now, now
  ).run();

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    await db.prepare(
      `INSERT INTO voucher_template_items (id, template_id, org_id, line_no, summary, account_code, account_name, direction, default_amount, ledger_book)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      uid('vti'), id, user.org_id, i + 1, (it.summary || '').trim(), it.accountCode || '', it.accountName || '',
      it.direction === 'credit' ? 'credit' : 'debit', Number(it.defaultAmount) || 0, it.ledgerBook || '0000'
    ).run();
  }

  await audit(db, user.org_id, user, 'voucher_templates', 'create', `创建凭证模板 ${name}`);
  const created = await db.prepare(`SELECT * FROM voucher_templates WHERE id = ?`).bind(id).first();
  return json(created, 201);
}
