// GET /api/stock-transfers — 分页查询跨组织转储（按 org_id 隔离）
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
  let where = `WHERE st.org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    where += ` AND (st.transfer_no LIKE ? ESCAPE '\\' OR st.from_warehouse_name LIKE ? ESCAPE '\\' OR st.to_warehouse_name LIKE ? ESCAPE '\\')`;
    const kw = likePattern(keyword);
    params.push(kw, kw, kw);
  }
  if (status) {
    where += ` AND st.status = ?`;
    params.push(status);
  }

  const offset = (page - 1) * pageSize;
  const totalRows = await db.prepare(`SELECT COUNT(*) as cnt FROM stock_transfers st ${where}`).bind(...params).first();
  const rows = await db.prepare(`SELECT * FROM stock_transfers st ${where} ORDER BY st.transfer_date DESC, st.created_at DESC LIMIT ? OFFSET ?`).bind(...params, pageSize, offset).all();

  // 列表回填 items（store 启动 load 路径需明细支撑 confirmTransfer 双边过账，等同迁移前 Blob 全量）
  const data = await Promise.all((rows.results || []).map(async (r) => {
    const items = await db.prepare(`SELECT * FROM stock_transfer_items WHERE stock_transfer_id = ?`).bind(r.id).all();
    return {
      ...r,
      items: (items.results || []).map(it => ({
        id: it.id, material_id: it.material_id, material_code: it.material_code, material_name: it.material_name,
        unit: it.unit, quantity: Number(it.quantity), batch_no: it.batch_no, location_id: it.location_id,
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

// POST /api/stock-transfers — 创建跨组织转储（含 items 子表）
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;

  // V3.45.0：写端点服务端硬拦，越权返回 403 OPERATION_FORBIDDEN（绕开界面亦生效）。
  const _opGuard = await guardOperation(user, 'warehouse', 'create', db, user.org_id);
  if (_opGuard) return _opGuard;
  const body = await context.request.json().catch(() => ({}));
  const _invalid = validateOrReject('stock_transfers', body);
  if (_invalid) return _invalid;

  // #10 防重复建单：① 单号查重（同组织同单号已存在 → 409，双击保存/网络重试正好被拦住）
  //                ② Idempotency-Key 幂等键（重复提交命中登记则回传上次结果，不再建单）
  const _dupNo = await dedupeByNo(context.env.DB, { table: 'stock_transfers', noCol: 'transfer_no', orgId: user.org_id, no: body.transferNo, label: '转储单' });
  if (_dupNo) return json(_dupNo.response, 409);
  const _idemKey = resolveIdemKey(context.request, body);
  if (_idemKey) {
    const _hit = await findIdem(context.env.DB, user.org_id, _idemKey);
    if (_hit) {
      const _prev = await context.env.DB.prepare(`SELECT * FROM stock_transfers WHERE id = ? AND org_id = ?`).bind(_hit.resultId, user.org_id).first().catch(() => null);
      if (_prev) return json({ ...(_prev as any), idempotentReplay: true }, 200);
    }
  }

  // 必填守卫（V3.16.1 · 缺陷 #11）：调拨单必须指明出入仓库且至少一条明细，否则生成全空记录
  const _req = requireFields(body, ['fromWarehouseId', 'toWarehouseId'], {
    fromWarehouseId: '调出仓库',
    toWarehouseId: '调入仓库',
  });
  if (_req) return _req;
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return json({ error: '请至少添加一条调拨明细', code: 'EMPTY_ITEMS' }, 400);
  }
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const id = 'stf-' + crypto.randomUUID();
  // ★ V3.51.0 原子底座（R1 多表写原子化）：头表 + 全部子项 INSERT 收进**同一 db.batch** 原子提交，
  //   全成或全回滚，杜绝「头已建、明细残缺」半状态（D1 单次 batch 上限 100 条，>99 退回逐条 .run()）。
  const headStmt = db.prepare(`INSERT INTO stock_transfers (id, org_id, transfer_no, from_warehouse_id, from_warehouse_name, to_warehouse_id, to_warehouse_name, from_org_id, to_org_id, status, transfer_date, remarks, created_at, updated_at, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id, user.org_id, body.transferNo || ('ST-' + id.slice(0, 8)), body.fromWarehouseId || null, body.fromWarehouseName || null,
    body.toWarehouseId || null, body.toWarehouseName || null, body.fromOrgId || null, body.toOrgId || null,
    body.status || 'draft', body.transferDate || null, body.remarks || null, now, now, user.name, user.name
  );
  const itemStmts: any[] = [];
  if (body.items && Array.isArray(body.items)) {
    for (const item of body.items) {
      itemStmts.push(
        db.prepare(`INSERT INTO stock_transfer_items (id, stock_transfer_id, material_id, material_code, material_name, unit, quantity, batch_no, location_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
          'sti-' + crypto.randomUUID(), id, item.materialId || null, item.materialCode || null, item.materialName || null,
          item.unit || null, Number(item.quantity) || 0, item.batchNo || null, item.locationId || null
        )
      );
    }
  }
  if (itemStmts.length <= 99) {
    await db.batch([headStmt, ...itemStmts]);
  } else {
    await headStmt.run();
    for (const s of itemStmts) await s.run();
  }

  // #10 幂等键登记：建单成功后把 (组织, 键) → 结果 id 记下来，供后续重复提交命中回放
  if (_idemKey) await saveIdem(db, user.org_id, _idemKey, 'stock_transfers', id);
  const row = await db.prepare(`SELECT * FROM stock_transfers WHERE id = ?`).bind(id).first();
  await audit(db, user.org_id, user, 'stock_transfers', 'create', `创建调拨单 ${row?.transfer_no || id}`);
  return json(row);
}
