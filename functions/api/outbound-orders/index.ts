// GET /api/outbound-orders — 分页查询出库单（按 org_id 隔离）
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';
import { validateOrReject, requireFields } from '../../_shared/validate';
import { dedupeByNo, resolveIdemKey, findIdem, saveIdem } from '../../_shared/idempotency';

import { audit } from '../../_shared/auditLog';
import { postOutbound, assertPeriodOpen, writeBackOutboundItemCost } from '../../_shared/inventoryPosting';
import { guardOperation } from '../../_shared/operationGuard';
import { requireCoreFields } from '../../_shared/validate';
// V3.64.0 P0-5：审批流扩面——出库单落库后自动触发审批（静默幂等，无启用审批流则跳过，不阻断业务）
import { startApprovalForDoc } from '../../_shared/autoApproval';
import { nextDocNo } from '../../_shared/numbering';
import { stampByName } from '../../_shared/entities';
export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const customerId = url.searchParams.get('customerId') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const type = url.searchParams.get('type') || undefined;
  const sortBy = url.searchParams.get('sortBy') || 'outbound_date';
  const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'ASC' : 'DESC';

  const db = context.env.DB;
  let where = `WHERE oo.org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    where += ` AND (oo.outbound_no LIKE ? ESCAPE '\\' OR oo.customer_name LIKE ? ESCAPE '\\')`;
    const kw = likePattern(keyword);
    params.push(kw, kw);
  }
  if (customerId) {
    where += ` AND oo.customer_id = ?`;
    params.push(customerId);
  }
  if (status) {
    where += ` AND oo.status = ?`;
    params.push(status);
  }
  if (type) {
    where += ` AND oo.type = ?`;
    params.push(type);
  }

  const rls = rlsCondition(user, 'outbound_orders');
  if (rls.clause !== '1=1') {
    where += ' AND ' + rls.clause;
    params.push(...rls.params);
  }

  const allowedSort = ['outbound_date', 'created_at'];
  const sortCol = allowedSort.includes(sortBy) ? sortBy : 'outbound_date';

  const offset = (page - 1) * pageSize;
  const totalRows = await db.prepare(`SELECT COUNT(*) as cnt FROM outbound_orders oo ${where}`).bind(...params).first();
  const rows = await db.prepare(`SELECT * FROM outbound_orders oo ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`).bind(...params, pageSize, offset).all();

  return json({
    data: (rows.results || []).map(r => ({ ...r, items: [] })),
    total: totalRows?.cnt || 0,
    page,
    pageSize,
  });
}

// POST /api/outbound-orders — 创建出库单（仅新增，未改动上方 onRequestGet）
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));

  // V3.26.0: 操作权限服务端守卫（仓储模块 — 库管可建出库单，越权角色建单返回 403 + OPERATION_FORBIDDEN）
  const _opGuard = await guardOperation(user, 'warehouse', 'create', db, user.org_id);
  if (_opGuard) return _opGuard;

  // V3.24.0: 核心必填项校验（出库单：客户 + 出库日期）
  const _coreFields = requireCoreFields('outbound_orders', body);
  if (_coreFields) return _coreFields;
  const _invalid = validateOrReject('outbound_orders', body);
  if (_invalid) return _invalid;

  // 必填守卫（V3.22.0 · 修复「空入参直接 500」）：
  // 出库单号 outbound_no 在库里是 NOT NULL，缺它时旧行为是 bind undefined → 数据库报
  // 约束错误 → 端点未捕获 → 中间件兜底 500。这里提前拦成 400 并说明缺哪个字段。
  // V3.67.0 立项①：未传出库单号 → 服务端 D1 权威取号（numbering_rules 原子自增，多终端不再漂移撞号）
  if (!body.outboundNo) {
    body.outboundNo = await nextDocNo(db, user.org_id, 'OUT');
    if (!body.outboundNo) {
      return json({ error: '无法生成出库单号（编号规则不可用），请刷新后重试或手工填写出库单号', code: 'NO_NUMBERING' }, 503);
    }
  }
  const _missing = requireFields(body, ['outboundNo'], { outboundNo: '出库单号' });
  if (_missing) return _missing;

  // #10 防重复建单：① 单号查重（同组织同单号已存在 → 409，双击保存/网络重试正好被拦住）
  //                ② Idempotency-Key 幂等键（重复提交命中登记则回传上次结果，不再建单）
  const _dupNo = await dedupeByNo(context.env.DB, { table: 'outbound_orders', noCol: 'outbound_no', orgId: user.org_id, no: body.outboundNo, label: '出库单' });
  if (_dupNo) return json(_dupNo.response, 409);
  const _idemKey = resolveIdemKey(context.request, body);
  if (_idemKey) {
    const _hit = await findIdem(context.env.DB, user.org_id, _idemKey);
    if (_hit) {
      const _prev = await context.env.DB.prepare(`SELECT * FROM outbound_orders WHERE id = ? AND org_id = ?`).bind(_hit.resultId, user.org_id).first().catch(() => null);
      if (_prev) return json({ ...(_prev as any), idempotentReplay: true }, 200);
    }
  }
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const id = 'out-' + crypto.randomUUID();
  // ★ V3.51.0 原子底座（R1 多表写原子化）：头表 + 全部子项 INSERT 收进**同一 db.batch** 原子提交，
  //   全成或全回滚，杜绝「头已建、明细残缺」半状态（D1 单次 batch 上限 100 条，>99 退回逐条 .run()）。
  //   过账（postOutbound）在下方、其内部本就原子，这里只收「建单」的头+子写。
  // V3.58.0 修复 S-16：新增 owner_id 列（RLS 行级权限用），写入 user.id 避免 'own' 策略 fail-open。
  const headStmt = db.prepare(`INSERT INTO outbound_orders (id, org_id, dept_id, owner_id, outbound_no, type, source_no, customer_id, customer_name, vendor_id, vendor_name, status, warehouse_id, warehouse_name, operator, outbound_date, remarks, picker, created_at, updated_at, created_by, updated_by, inventory_posted, cogs_posted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`).bind(
    id, user.org_id, user.department || null, user.id, body.outboundNo, body.type || 'sale', body.sourceNo || null, body.customerId || null, body.customerName || null,
    body.vendorId || null, body.vendorName || null, body.status || 'pending', body.warehouseId || null, body.warehouseName || null,
    body.operator || null, body.outboundDate || null, body.remarks || null, body.picker || null, now, now, user.name, user.name
  );
  const itemStmts: any[] = [];
  if (body.items && Array.isArray(body.items)) {
    for (const item of body.items) {
      const serialNos = Array.isArray(item.serialNos) ? JSON.stringify(item.serialNos) : (item.serialNos || null);
      itemStmts.push(
        db.prepare(`INSERT INTO outbound_order_items (id, outbound_order_id, material_id, material_code, material_name, specification, unit, quantity, batch_no, location_id, location_name, unit_cost, cost_amount, serial_nos, hu_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
          'ooi-' + crypto.randomUUID(), id, item.materialId || null, item.materialCode || null, item.materialName || null, item.specification || null, item.unit || null,
          Number(item.quantity) || 0, item.batchNo || null, item.locationId || null, item.locationName || null, Number(item.unitCost) || 0, Number(item.costAmount) || 0, serialNos, item.huId || null
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

  // V3.71.0 ③ by_name：建单后回填创建/修改人姓名（fail-safe，列不存在自动跳过）
  await stampByName(db, 'outbound_orders', id, user);

  // #10 幂等键登记：建单成功后把 (组织, 键) → 结果 id 记下来，供后续重复提交命中回放
  if (_idemKey) await saveIdem(db, user.org_id, _idemKey, 'outbound_orders', id);
  const row = await db.prepare(`SELECT * FROM outbound_orders WHERE id = ?`).bind(id).first();

  // N1 服务端过账（2026-09-20）：状态为 completed 且尚未过账时，在服务端统一扣减库存
  // （超发卡 0）+ 滚动物料成本（卡 0）。幂等靠 inventory_posted/cogs_posted 守卫。
  // ★ R4 留痕：凭证生成失败（库存已扣、不回滚）时回传 voucherIssues，不阻断但留痕
  const _voucherIssues: string[] = [];
  if (row && row.status === 'completed' && !row.inventory_posted) {
    // ★ V3.48.0 止血①（P0 过账竞态）：把置标志改为**条件 UPDATE 抢占**——
    //   SET inventory_posted=1, cogs_posted=1 WHERE id=? AND inventory_posted=0，读 meta.changes 判定本次是否抢到。
    //   原「先读 !posted → 过账 → 后置 1」两次并发首次请求都能读到 0 而双扣库存（MAX(0) 卡 0 掩盖账面、流水却翻倍）。
    // ★ V3.61.0 P0-1：期末结账守卫在抢占之前（否则被过账 catch 吞成假成功）
    try {
      await assertPeriodOpen(db, user.org_id, { outboundDate: row.outbound_date }, '出库单');
    } catch (e: any) {
      return json({ error: e?.message || '会计期间已结账，禁止过账', code: 'PERIOD_CLOSED', period: String(row.outbound_date || '').slice(0, 7) }, 409);
    }
    const _claim = await db.prepare(
      `UPDATE outbound_orders SET inventory_posted = 1, cogs_posted = 1 WHERE id = ? AND inventory_posted = 0`
    ).bind(id).run();
    if (((_claim as any)?.meta?.changes ?? 0) > 0) {
      try {
        const r = await postOutbound(db, user.org_id, user, {
          items: body.items,
          warehouseId: row.warehouse_id,
          warehouseName: row.warehouse_name,
          outboundDate: row.outbound_date,
          type: row.type,
          outboundNo: row.outbound_no,
          customerName: row.customer_name,
          vendorName: row.vendor_name,
          operator: row.operator,
        });
        // ★ R4 留痕：凭证生成失败（库存已扣不回滚）的原因收集到响应，让「账实动了但凭证缺失」可见
        _voucherIssues.push(...(r.voucherIssues || []));
        // ★ V3.61.0 S-08：把服务端算出的真实成本回写明细行（此前恒 0，单据与凭证两套口径）
        await writeBackOutboundItemCost(db, id, r.enrichedItems || []);
        // inventory_posted/cogs_posted 已在抢占时置 1，此处无需再写
      } catch (e) {
        // ★ V3.48.0 止血①：过账失败→回滚抢占（两标志置 0）保持可重试、不产生"假已置位"；并发方可再次抢占。
        try { await db.prepare(`UPDATE outbound_orders SET inventory_posted = 0, cogs_posted = 0 WHERE id = ?`).bind(id).run(); } catch { /* 回滚标志尽力而为 */ }
        console.error('[outbound-post] failed（已回滚过账标志，可重试）', e);
      }
    }
  }

  await audit(db, user.org_id, user, 'outbound_orders', 'create', `创建出库单 ${row?.outbound_no || id}`);
  // ★ V3.64.0 P0-5：出库单落库后触发审批（审批流 module='outbound' 启用时；未启用/无审批人/SoD/失败均静默跳过，绝不阻断建单）
  await startApprovalForDoc(db, user.org_id, user, 'outbound', id, row?.outbound_no).catch(() => {});
  // ★ R4：凭证生成失败时显式回传（库存已扣不回滚，但缺失的凭证必须让人知道去补录）
  if (_voucherIssues.length > 0) (row as any).voucherIssues = _voucherIssues;
  return json(row);
}
