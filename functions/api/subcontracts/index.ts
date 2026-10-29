// GET /api/subcontracts — 分页查询委外订单（按 org_id 隔离）
// POST /api/subcontracts — 创建委外订单
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json } from '../../_shared/auth';
import { guardOperation } from '../../_shared/operationGuard';
import { validateOrReject, requireFields } from '../../_shared/validate';
import { dedupeByNo, resolveIdemKey, findIdem, saveIdem } from '../../_shared/idempotency';

import { audit } from '../../_shared/auditLog';
export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const status = url.searchParams.get('status') || '';

  let sql = `SELECT * FROM subcontract_orders WHERE org_id = ?`;
  const params: (string | number)[] = [user.org_id];
  if (keyword) {
    sql += ` AND (order_no LIKE ? ESCAPE '\\' OR material_name LIKE ? ESCAPE '\\' OR vendor_name LIKE ? ESCAPE '\\')`;
    const kw = likePattern(keyword);
    params.push(kw, kw, kw);
  }
  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, (page - 1) * pageSize);

  const result = await db.prepare(sql).bind(...params).all();
  const rows = (result.results || []).map(r => ({
    ...r,
    qty: Number(r.qty),
    process_fee: r.process_fee ? Number(r.process_fee) : 0,
    received_qty: r.received_qty ? Number(r.received_qty) : 0,
  }));

  // 关联发料明细：一次 IN 查询按 subcontract_order_id 归组，避免 N+1；列表也展示发料明细
  const itemsByOrder: Record<string, unknown[]> = {};
  if (rows.length) {
    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const ir = await db
      .prepare(`SELECT * FROM subcontract_issue_items WHERE subcontract_order_id IN (${placeholders})`)
      .bind(...ids)
      .all();
    for (const it of ir.results || []) {
      const oid = (it as Record<string, unknown>).subcontract_order_id as string;
      (itemsByOrder[oid] = itemsByOrder[oid] || []).push(it);
    }
  }
  const data = rows.map((r) => ({ ...r, issueItems: itemsByOrder[r.id as string] || [] }));

  let countSql = `SELECT COUNT(*) as cnt FROM subcontract_orders WHERE org_id = ?`;
  const countParams = [user.org_id];
  if (keyword) {
    countSql += ` AND (order_no LIKE ? ESCAPE '\\' OR material_name LIKE ? ESCAPE '\\' OR vendor_name LIKE ? ESCAPE '\\')`;
    const kw = likePattern(keyword);
    countParams.push(kw, kw, kw);
  }
  if (status) {
    countSql += ` AND status = ?`;
    countParams.push(status);
  }
  const countResult = await db.prepare(countSql).bind(...countParams).first();

  return json({
    data,
    pagination: {
      page,
      pageSize,
      total: countResult?.cnt || 0,
      totalPages: Math.ceil((countResult?.cnt || 0) / pageSize),
    },
  });
}

export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  // V3.28.0: 操作权限服务端守卫（生产模块 — 生产班长可建委外单，越权返回 403 + OPERATION_FORBIDDEN）
  const _opGuard = await guardOperation(user, 'production', 'create', db, user.org_id);
  if (_opGuard) return _opGuard;
  const _invalid = validateOrReject('subcontract_orders', body);
  if (_invalid) return _invalid;

  // 必填守卫（V3.22.0 · 修复「空入参直接 500」）：
  // 委外订单号 order_no 在库里是 NOT NULL。实测本端点是五个核心写端点里最松的——
  // 只传一个合同号也照旧 500（其余字段全缺却没有任何提示）。这里拦成 400 并指明缺什么。
  const _missing = requireFields(body, ['orderNo'], { orderNo: '委外订单号' });
  if (_missing) return _missing;

  // #10 防重复建单：① 单号查重（同组织同单号已存在 → 409，双击保存/网络重试正好被拦住）
  //                ② Idempotency-Key 幂等键（重复提交命中登记则回传上次结果，不再建单）
  const _dupNo = await dedupeByNo(context.env.DB, { table: 'subcontract_orders', noCol: 'order_no', orgId: user.org_id, no: body.orderNo, label: '委外订单' });
  if (_dupNo) return json(_dupNo.response, 409);
  const _idemKey = resolveIdemKey(context.request, body);
  if (_idemKey) {
    const _hit = await findIdem(context.env.DB, user.org_id, _idemKey);
    if (_hit) {
      const _prev = await context.env.DB.prepare(`SELECT * FROM subcontract_orders WHERE id = ? AND org_id = ?`).bind(_hit.resultId, user.org_id).first().catch(() => null);
      if (_prev) return json({ ...(_prev as any), idempotentReplay: true }, 200);
    }
  }
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const id = 'sco-' + crypto.randomUUID();
  await db.prepare(`INSERT INTO subcontract_orders (id, org_id, order_no, type, material_id, material_code, material_name, vendor_id, vendor_name, bom_id, source_work_order_id, status, qty, plan_date, process_fee, created_at, updated_at, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    // ★ type 在库里是 NOT NULL 且**没有默认值**（见迁移 0011），而旧代码直接用 body.type，
    //   调用方一旦不传就会撞约束、且本端点没有错误映射，直接冒成 500。
    //   这里按前端「委外订单」表单的默认值兜底为 'process'（工序委外），
    //   与前端 Subcontract.tsx 里 form.type 的初值保持一致，不会改变任何既有行为。
    id, user.org_id, body.orderNo, body.type || 'process', body.materialId || null, body.materialCode || null, body.materialName || null,
    body.vendorId || null, body.vendorName || null, body.bomId || null, body.sourceWorkOrderId || null,
    body.status || 'draft', Number(body.qty) || 0, body.planDate || null, Number(body.processFee) || 0, now, now, user.name, user.name
  ).run();

  if (body.issueItems && Array.isArray(body.issueItems)) {
    for (const item of body.issueItems) {
      await db.prepare(`INSERT INTO subcontract_issue_items (id, subcontract_order_id, material_id, material_code, material_name, unit, qty) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(
        'sci-' + crypto.randomUUID(), id, item.materialId || null, item.materialCode || null, item.materialName || null,
        item.unit || null, Number(item.qty) || 0
      ).run();
    }
  }

  // #10 幂等键登记：建单成功后把 (组织, 键) → 结果 id 记下来，供后续重复提交命中回放
  if (_idemKey) await saveIdem(db, user.org_id, _idemKey, 'subcontract_orders', id);
  const row = await db.prepare(`SELECT * FROM subcontract_orders WHERE id = ?`).bind(id).first();
  const itemsRes = await db.prepare(`SELECT * FROM subcontract_issue_items WHERE subcontract_order_id = ?`).bind(id).all();
  const issueItems = (itemsRes.results || []).map(r => ({
    id: r.id, subcontract_order_id: r.subcontract_order_id, material_id: r.material_id,
    material_code: r.material_code, material_name: r.material_name, unit: r.unit, qty: Number(r.qty),
  }));
  await audit(db, user.org_id, user, 'subcontract_orders', 'create', `创建外协订单 ${row?.subcontract_no || row?.order_no || id}`);
  return json({ ...row, issueItems });
}
