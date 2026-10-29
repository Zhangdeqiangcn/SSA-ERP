// GET /api/quality-holds — 分页查询质检扣留（按 org_id 隔离）
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json } from '../../_shared/auth';
import { guardOperation } from '../../_shared/operationGuard';
import { validateOrReject, requireFields } from '../../_shared/validate';
import { resolveIdemKey, findIdem, saveIdem } from '../../_shared/idempotency';

import { audit } from '../../_shared/auditLog';
// ★ V3.113.3 P0-3：质检扣留必须把冻结量落到库存台账（inventory_records.frozen_quantity），
//   否则「ATP 说扣了、库存台账说没扣」，两套口径分裂、审计对不上。
import { adjustFrozenQuantity } from '../../_shared/inventoryPosting';
import { HOLD_OCCUPYING_STATUSES } from '../../_shared/qualityHoldStatus';
export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const status = url.searchParams.get('status') || undefined;

  const db = context.env.DB;
  let where = `WHERE qh.org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    where += ` AND (qh.material_code LIKE ? ESCAPE '\\' OR qh.material_name LIKE ? ESCAPE '\\' OR qh.warehouse_name LIKE ? ESCAPE '\\' OR qh.batch_no LIKE ? ESCAPE '\\')`;
    const kw = likePattern(keyword);
    params.push(kw, kw, kw, kw);
  }
  if (status) {
    where += ` AND qh.status = ?`;
    params.push(status);
  }

  const offset = (page - 1) * pageSize;
  const totalRows = await db.prepare(`SELECT COUNT(*) as cnt FROM quality_holds qh ${where}`).bind(...params).first();
  const rows = await db.prepare(`SELECT * FROM quality_holds qh ${where} ORDER BY qh.hold_date DESC, qh.created_at DESC LIMIT ? OFFSET ?`).bind(...params, pageSize, offset).all();

  return json({
    data: rows.results || [],
    total: totalRows?.cnt || 0,
    page,
    pageSize,
  });
}

// POST /api/quality-holds — 创建质检扣留
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  // V3.28.0: 操作权限服务端守卫（质量模块 — 质检可建扣留，越权返回 403 + OPERATION_FORBIDDEN）
  const _opGuard = await guardOperation(user, 'quality', 'create', db, user.org_id);
  if (_opGuard) return _opGuard;
  const _invalid = validateOrReject('quality_holds', body);
  if (_invalid) return _invalid;

  // #10 防重复建单：质检扣留单没有业务单号，走 Idempotency-Key 幂等键——
  // 客户端带 `Idempotency-Key` 请求头（或 body.idempotencyKey）时，重复提交回传上次结果。
  const _idemKey = resolveIdemKey(context.request, body);
  if (_idemKey) {
    const _hit = await findIdem(context.env.DB, user.org_id, _idemKey);
    if (_hit) {
      const _prev = await context.env.DB.prepare(`SELECT * FROM quality_holds WHERE id = ? AND org_id = ?`).bind(_hit.resultId, user.org_id).first().catch(() => null);
      if (_prev) return json({ ...(_prev as any), idempotentReplay: true }, 200);
    }
  }

  // 必填守卫（V3.16.1 · 缺陷 #11）：扣留单必须指向具体物料并写明原因，否则生成全空记录
  const _req = requireFields(body, ['materialCode', 'reason'], { materialCode: '物料编码', reason: '扣留原因' });
  if (_req) return _req;
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const id = 'qh-' + crypto.randomUUID();
  const holdQty = Number(body.quantity) || 0;
  const holdStatus = body.status || 'pending';
  await db.prepare(`INSERT INTO quality_holds (id, org_id, material_id, material_code, material_name, warehouse_id, warehouse_name, batch_no, quantity, status, source_inbound_no, hold_date, release_date, inspector, reason, created_at, updated_at, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id, user.org_id, body.materialId || null, body.materialCode || null, body.materialName || null, body.warehouseId || null, body.warehouseName || null,
    body.batchNo || null, holdQty, holdStatus, body.sourceInboundNo || null, body.holdDate || null, body.releaseDate || null,
    body.inspector || null, body.reason || null, now, now, user.name, user.name
  ).run();

  // ★ V3.113.3 P0-3：同步冻结量到库存台账（可用量 = 现有量 − 冻结量）。
  //   仅「占用实物」的扣留才冻结：pending/active/rejected/open/inspecting。
  //   rejected（判不合格但未处置）同样占着实物 → 同样冻结（与前端 isHoldActive 对齐）。
  //   注意：materialId 缺失时无法定位库存行 —— 此时只扣 quality_holds 表（既有行为），
  //   并回传提示让用户知道冻结量未落到台账（不静默）。
  const OCCUPYING_STATUSES = HOLD_OCCUPYING_STATUSES;
  let frozenApplied = false;
  let frozenNote = '';
  if (holdQty > 0 && body.materialId && OCCUPYING_STATUSES.includes(String(holdStatus))) {
    const fr = await adjustFrozenQuantity(db, user.org_id, user, {
      materialId: String(body.materialId),
      warehouseId: body.warehouseId || null,
      delta: holdQty,
      reason: `质检扣留 ${id}`,
    });
    frozenApplied = fr.ok;
    if (!fr.ok) frozenNote = fr.message || '冻结量未写入库存台账';
  } else if (holdQty > 0 && !body.materialId) {
    frozenNote = '扣留单未指定物料 ID，冻结量无法写入库存台账（仅登记扣留记录）';
  }

  // #10 幂等键登记：建单成功后把 (组织, 键) → 结果 id 记下来，供后续重复提交命中回放
  if (_idemKey) await saveIdem(db, user.org_id, _idemKey, 'quality_holds', id);
  const row = await db.prepare(`SELECT * FROM quality_holds WHERE id = ?`).bind(id).first();
  await audit(db, user.org_id, user, 'quality_holds', 'create', `创建质量扣留 ${row?.hold_no || id}`);
  return json({
    ...row,
    frozenApplied,
    ...(frozenNote ? { warning: frozenNote } : {}),
  });
}
