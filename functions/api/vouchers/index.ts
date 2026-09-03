// GET /api/vouchers — 分页查询凭证列表（按 org_id 隔离）
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { audit } from '../../_shared/entities';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const keyword = url.searchParams.get('keyword') || '';
  const status = url.searchParams.get('status') || '';
  const source = url.searchParams.get('source') || '';
  const offset = (page - 1) * pageSize;

  let sql = `SELECT * FROM vouchers WHERE org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    sql += ` AND (voucher_no LIKE ? OR description LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  if (source) {
    sql += ` AND source = ?`;
    params.push(source);
  }
  sql += ` ORDER BY date DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, offset);

  const results = await db.prepare(sql).bind(...params).all();
  const count = await db.prepare(`SELECT COUNT(*) as cnt FROM vouchers WHERE org_id = ?${status ? ' AND status = ?' : ''}${source ? ' AND source = ?' : ''}`).bind(
    user.org_id,
    ...(status ? [status] : []),
    ...(source ? [source] : [])
  ).first();

  // 行明细随列表一并返回（snake 原样，前端用 snakeToCamel 统一映射），保证前端 financeStore 取到完整凭证
  const data = [];
  for (const r of (results.results || [])) {
    const items = await db.prepare(`SELECT * FROM voucher_items WHERE voucher_id = ? ORDER BY line_no`).bind(r.id).all();
    data.push({ ...r, items: (items.results || []).map((it: any) => ({ ...it })) });
  }

  return json({
    data,
    pagination: { page, pageSize, total: count?.cnt || 0 },
  });
}

// POST /api/vouchers — 创建凭证（W1 根治双通道：直写真实 D1 vouchers + voucher_items）
// 会话鉴权 + org 隔离 + 单号唯一 + 分录行 + 审计。凭证头业务字段按前端 Voucher camel 形状接收。
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  if (!body.voucherNo || !body.date) return json({ error: '凭证编号与日期必填' }, 400);

  const dup = await db.prepare(`SELECT id FROM vouchers WHERE org_id = ? AND voucher_no = ?`).bind(user.org_id, body.voucherNo).first();
  if (dup) return json({ error: '凭证编号已存在' }, 409);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  // 前端凭证以 VCH-<voucherNo> 作为业务主键（贯穿 createVoucher/状态机/UI），
  // 允许前端透传 body.id，保证 D1 主键与前端身份一致（避免 POST 用 uuid 后 reload 取回 id 错位）。
  const id = (body.id && typeof body.id === 'string') ? body.id : uid('v');

  const fields = ['voucherNo', 'voucherType', 'date', 'period', 'description', 'source', 'status',
    'totalDebit', 'totalCredit', 'currency', 'attachmentCount', 'sourceNo', 'createdBy',
    'reviewedBy', 'reviewedAt', 'postedBy', 'postedAt', 'reversed', 'reversedBy', 'reversedAt', 'reversalVoucherNo', 'remark', 'remarks'];
  const colFor = (f) => f === 'voucherNo' ? 'voucher_no' : f === 'voucherType' ? 'voucher_type' : f === 'date' ? 'date' :
    f === 'period' ? 'period' : f === 'description' ? 'description' : f === 'source' ? 'source' : f === 'status' ? 'status' :
    f === 'totalDebit' ? 'totalDebit' : f === 'totalCredit' ? 'totalCredit' : f === 'currency' ? 'currency' :
    f === 'attachmentCount' ? 'attachment_count' : f === 'sourceNo' ? 'source_no' : f === 'createdBy' ? 'createdBy' :
    f === 'reviewedBy' ? 'reviewedBy' : f === 'reviewedAt' ? 'reviewedAt' : f === 'postedBy' ? 'postedBy' :
    f === 'postedAt' ? 'posted_at' : f === 'reversed' ? 'reversed' : f === 'reversedBy' ? 'reversedBy' :
    f === 'reversedAt' ? 'reversed_at' : f === 'reversalVoucherNo' ? 'reversal_voucher_no' :
    f === 'remark' ? 'remarks' : f === 'remarks' ? 'remarks' :
    f.toLowerCase();

  const cols = ['org_id', 'id'];
  const vals = [user.org_id, id];
  for (const f of fields) {
    if (body[f] !== undefined) { cols.push(colFor(f)); vals.push(body[f]); }
  }
  cols.push('created_at', 'updated_at', 'created_by', 'updated_by');
  vals.push(now, now, user.id, user.name);

  try {
    await db.prepare(`INSERT INTO vouchers (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...vals).run();
  } catch (e: any) {
    if (String(e?.message || '').includes('UNIQUE')) return json({ error: '凭证编号已存在' }, 409);
    throw e;
  }

  if (Array.isArray(body.items)) {
    for (const item of body.items) {
      await db.prepare(`INSERT INTO voucher_items (id, voucher_id, line_no, summary, account_code, account_name, debit, credit, currency, exchange_rate, cost_center_id, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        item.id || `vi-${id}-${Math.random().toString(36).slice(2, 6)}`,
        id, item.lineNo || 0, item.summary || null, item.accountCode || null, item.accountName || null,
        item.debit || 0, item.credit || 0, item.currency || 'CNY', item.exchangeRate || 1,
        item.costCenterId || null, item.projectId || null
      ).run();
    }
  }

  await audit(db, user.org_id, user, 'vouchers', 'create', `创建凭证 ${body.voucherNo}`);
  const created = await db.prepare(`SELECT * FROM vouchers WHERE id = ?`).bind(id).first();
  return json(created, 201);
}
