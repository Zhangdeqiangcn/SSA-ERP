// GET /api/vouchers — 分页查询凭证列表（按 org_id 隔离）
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { guardOperation } from '../../_shared/operationGuard';
import { audit } from '../../_shared/entities';
import { validateOrReject } from '../../_shared/validate';
import { guardVoucherItems } from '../../_shared/voucherGuard';
import { writeVoucher } from '../../_shared/voucherWriter';
import { isPeriodClosed, toPeriod } from '../../_shared/appState';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const status = url.searchParams.get('status') || '';
  const source = url.searchParams.get('source') || '';
  const offset = (page - 1) * pageSize;

  let sql = `SELECT * FROM vouchers WHERE org_id = ?`;
  const params: (string | number)[] = [user.org_id];

  if (keyword) {
    sql += ` AND (voucher_no LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')`;
    params.push(likePattern(keyword), likePattern(keyword));
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
  const data: any[] = [];
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
  // V3.28.0: 操作权限服务端守卫（财务模块 — 财务主管/会计可建凭证，越权返回 403 + OPERATION_FORBIDDEN）
  const _opGuard = await guardOperation(user, 'finance', 'create', db, user.org_id);
  if (_opGuard) return _opGuard;
  const _invalid = validateOrReject('vouchers', body);
  if (_invalid) return _invalid;
  if (!body.voucherNo || !body.date) return json({ error: '凭证编号与日期必填' }, 400);

  // ★ V3.15.9 服务端借贷平衡闸门（此前该校验只在前端，绕过界面即失效）
  //   必须放在"查重"之前：不平的凭证连存在的资格都没有，不必再查编号。
  //   校验通过时 guard 会顺带把 totalDebit / totalCredit 改为服务端从分录反推的值。
  const _guard = guardVoucherItems(body);
  if (_guard) return json(_guard.response, 400);

  // ★ #13 期末结账服务端强制管控（此前结账状态只在前端维护，可绕过）：
  //   凭证所属会计期间已结账 → 禁止新建，必须先在"财务→期末结账"反结账该期间。
  const _period = toPeriod(body.date, body.period);
  if (_period && (await isPeriodClosed(db, user.org_id, _period))) {
    return json({ error: `会计期间 ${_period} 已结账，禁止记账；如需记账请先在「财务→期末结账」反结账该期间` }, 400);
  }

  const dup = await db.prepare(`SELECT id FROM vouchers WHERE org_id = ? AND voucher_no = ?`).bind(user.org_id, body.voucherNo).first();
  // ★ V3.45.0 409 响应带出冲突凭证的 id：前端据此区分两种 409 ——
  //   「本机同一张凭证的幂等重放」（id 相同 → 允许转 PUT 更新）
  //   与「他机撞号」（id 不同 → 必须报错，绝不能 PUT 覆盖，否则会静默覆盖他人凭证）。
  //   此前 409 只有一个文案，前端只能一律转 PUT，撞号时等于覆盖对方的凭证且无痕迹。
  if (dup) {
    return json({
      error: '凭证编号已存在',
      code: 'VOUCHER_NO_CONFLICT',
      voucherNo: body.voucherNo,
      id: (dup as any).id,
      conflict: String((dup as any).id) !== String(body.id || ''),
    }, 409);
  }

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  // 前端凭证以 VCH-<voucherNo> 作为业务主键（贯穿 createVoucher/状态机/UI），
  // 允许前端透传 body.id，保证 D1 主键与前端身份一致（避免 POST 用 uuid 后 reload 取回 id 错位）。
  const id = (body.id && typeof body.id === 'string') ? body.id : uid('v');

  // ★ 修正（清 vouchers 驼峰坏列时一并处理）：这里原先把 totalDebit / createdBy / reviewedBy
  //   等映射成**同名的驼峰数据库列**（该表历史遗留 9 个驼峰列），而同一张表里
  //   attachmentCount → attachment_count、sourceNo → source_no 又是蛇形 ——
  //   **一个映射表里混着两套口径**。现统一映射为蛇形列，配合迁移 0064 删除那 9 个驼峰列。
  // ★ 另一处潜伏缺陷：`createdBy` 从 fields 中**移除** —— 下方审计列固定写入
  //   'created_by'（值为当前操作人 user.id），这里若再写一次，INSERT 会因
  //   **重复列名**报错。此前 vouchers 表 0 行，所以从未暴露。
  const fields = ['voucherNo', 'voucherType', 'date', 'period', 'description', 'source', 'status',
    'totalDebit', 'totalCredit', 'currency', 'attachmentCount', 'sourceNo', 'ledgerBook',
    'reviewedBy', 'reviewedAt', 'postedBy', 'postedAt', 'reversed', 'reversedBy', 'reversedAt', 'reversalVoucherNo', 'remark', 'remarks'];
  const colFor = (f) => f === 'voucherNo' ? 'voucher_no' : f === 'voucherType' ? 'voucher_type' : f === 'date' ? 'date' :
    f === 'period' ? 'period' : f === 'description' ? 'description' : f === 'source' ? 'source' : f === 'status' ? 'status' :
    f === 'totalDebit' ? 'total_debit' : f === 'totalCredit' ? 'total_credit' : f === 'currency' ? 'currency' :
    f === 'attachmentCount' ? 'attachment_count' : f === 'sourceNo' ? 'source_no' :
    f === 'ledgerBook' ? 'ledger_book' : f === 'reviewedBy' ? 'reviewed_by' : f === 'reviewedAt' ? 'reviewed_at' : f === 'postedBy' ? 'posted_by' :
    f === 'postedAt' ? 'posted_at' : f === 'reversed' ? 'reversed' : f === 'reversedBy' ? 'reversed_by' :
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

  // ★ 凭证写入统一委托 _shared/voucherWriter（与 inventoryPosting 自动业务凭证同一条路径，
  //   列集只维护一份，消除"两处 INSERT 拼列"漂移）。查重 / 借贷闸门 / 审计仍在本接口负责。
  const vid = await writeVoucher(
    db,
    user.org_id,
    user,
    {
      voucherNo: body.voucherNo,
      voucherType: body.voucherType,
      date: body.date,
      period: body.period,
      description: body.description,
      source: body.source || 'manual',
      sourceNo: body.sourceNo,
      status: body.status || 'draft',
      totalDebit: body.totalDebit,
      totalCredit: body.totalCredit,
      currency: body.currency || 'CNY',
      ledgerBook: body.ledgerBook,
      remark: body.remark || body.remarks,
      items: body.items,
    },
    id
  );

  if (!vid) return json({ error: '凭证借贷不平衡或金额为 0，无法保存' }, 400);

  await audit(db, user.org_id, user, 'vouchers', 'create', `创建凭证 ${body.voucherNo}`);
  const created = await db.prepare(`SELECT * FROM vouchers WHERE id = ?`).bind(id).first();
  return json(created, 201);
}
