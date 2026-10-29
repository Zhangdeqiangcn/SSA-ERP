// GET /api/inventory-adjustments — 分页查询库存调整单（按 org_id 隔离）
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json } from '../../_shared/auth';
import { validateOrReject, requireFields } from '../../_shared/validate';
import { dedupeByNo, resolveIdemKey, findIdem, saveIdem } from '../../_shared/idempotency';

import { audit } from '../../_shared/auditLog';
// ★ V3.45.0 操作权限服务端守卫：此前该端点零守卫（任何登录用户均可写）。
import { guardOperation } from '../../_shared/operationGuard';
export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const status = url.searchParams.get('status') || undefined;

  const db = context.env.DB;
  let where = `WHERE ia.org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    where += ` AND (ia.adjustment_no LIKE ? ESCAPE '\\' OR ia.warehouse_name LIKE ? ESCAPE '\\' OR ia.reason LIKE ? ESCAPE '\\')`;
    const kw = likePattern(keyword);
    params.push(kw, kw, kw);
  }
  if (status) {
    where += ` AND ia.status = ?`;
    params.push(status);
  }

  const offset = (page - 1) * pageSize;
  const totalRows = await db.prepare(`SELECT COUNT(*) as cnt FROM inventory_adjustments ia ${where}`).bind(...params).first();
  const rows = await db.prepare(`SELECT * FROM inventory_adjustments ia ${where} ORDER BY ia.date DESC, ia.created_at DESC LIMIT ? OFFSET ?`).bind(...params, pageSize, offset).all();

  // 列表回填 items（store 启动 load 路径需明细支撑 postAdjustment 库存调整，等同迁移前 Blob 全量）
  const data = await Promise.all((rows.results || []).map(async (r) => {
    const items = await db.prepare(`SELECT * FROM inventory_adjustment_items WHERE inventory_adjustment_id = ?`).bind(r.id).all();
    return {
      ...r,
      items: (items.results || []).map(it => ({
        id: it.id, material_id: it.material_id, material_code: it.material_code, material_name: it.material_name,
        unit: it.unit, location_id: it.location_id, book_qty: Number(it.book_qty), actual_qty: Number(it.actual_qty),
        delta_qty: Number(it.delta_qty), reason: it.reason,
      })),
    };
  }));

  return json({
    data,
    total: totalRows?.cnt || 0,
    page,
    pageSize,
  });
}

// POST /api/inventory-adjustments — 创建库存调整单（含 items 子表）
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;

  // V3.45.0：写端点服务端硬拦，越权返回 403 OPERATION_FORBIDDEN（绕开界面亦生效）。
  const _opGuard = await guardOperation(user, 'warehouse', 'create', db, user.org_id);
  if (_opGuard) return _opGuard;
  const body = await context.request.json().catch(() => ({}));
  const _invalid = validateOrReject('inventory_adjustments', body);
  if (_invalid) return _invalid;

  // #10 防重复建单：① 单号查重（同组织同单号已存在 → 409，双击保存/网络重试正好被拦住）
  //                ② Idempotency-Key 幂等键（重复提交命中登记则回传上次结果，不再建单）
  const _dupNo = await dedupeByNo(context.env.DB, { table: 'inventory_adjustments', noCol: 'adjustment_no', orgId: user.org_id, no: body.adjustmentNo, label: '库存调整单' });
  if (_dupNo) return json(_dupNo.response, 409);
  const _idemKey = resolveIdemKey(context.request, body);
  if (_idemKey) {
    const _hit = await findIdem(context.env.DB, user.org_id, _idemKey);
    if (_hit) {
      const _prev = await context.env.DB.prepare(`SELECT * FROM inventory_adjustments WHERE id = ? AND org_id = ?`).bind(_hit.resultId, user.org_id).first().catch(() => null);
      if (_prev) return json({ ...(_prev as any), idempotentReplay: true }, 200);
    }
  }

  // 必填守卫（V3.16.1 · 缺陷 #11）：调整单必须指明仓库且至少一条明细，否则生成全空记录
  const _req = requireFields(body, ['warehouseId'], { warehouseId: '仓库' });
  if (_req) return _req;
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return json({ error: '请至少添加一条调整明细', code: 'EMPTY_ITEMS' }, 400);
  }
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const id = 'adj-' + crypto.randomUUID();
  // ★ V3.61.0 W-E12：头 + 全部子项收进**同一 db.batch 原子提交**（与调拨/入出库同范式）。
  //   缺陷：此前头 INSERT 与逐条子项 INSERT 各自独立执行，中途失败会留下
  //   「头已建、明细残缺」的半状态单据（对账时只看到 adjustment_no 查不到行）。
  //   D1 单次 batch 上限 100 条：子项 ≤99 走原子批次，超出退回逐条（保持既有降级）。
  const headStmt = db.prepare(`INSERT INTO inventory_adjustments (id, org_id, adjustment_no, warehouse_id, warehouse_name, status, reason, date, total_delta_qty, voucher_no, created_at, updated_at, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id, user.org_id, body.adjustmentNo || ('ADJ-' + id.slice(0, 8)), body.warehouseId || null, body.warehouseName || null,
    body.status || 'draft', body.reason || null, body.date || null, Number(body.totalDeltaQty) || 0, body.voucherNo || null,
    now, now, user.name, user.name
  );
  const childStmts: any[] = (body.items || []).map((item: any) =>
    db.prepare(`INSERT INTO inventory_adjustment_items (id, inventory_adjustment_id, material_id, material_code, material_name, unit, location_id, book_qty, actual_qty, delta_qty, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      'adji-' + crypto.randomUUID(), id, item.materialId || null, item.materialCode || null, item.materialName || null, item.unit || null,
      item.locationId || null, Number(item.bookQty) || 0, Number(item.actualQty) || 0, Number(item.deltaQty) || 0, item.reason || null
    )
  );
  if (childStmts.length <= 99) {
    await db.batch([headStmt, ...childStmts]);
  } else {
    await headStmt.run();
    for (const s of childStmts) await s.run();
  }

  // #10 幂等键登记：建单成功后把 (组织, 键) → 结果 id 记下来，供后续重复提交命中回放
  if (_idemKey) await saveIdem(db, user.org_id, _idemKey, 'inventory_adjustments', id);
  const row = await db.prepare(`SELECT * FROM inventory_adjustments WHERE id = ?`).bind(id).first();
  await audit(db, user.org_id, user, 'inventory_adjustments', 'create', `创建库存调整单 ${row?.adjustment_no || id}，原因：${row?.reason || body?.reason || '未填写'}`);
  return json(row);
}
