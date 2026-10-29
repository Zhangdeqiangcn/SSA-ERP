// GET/PUT/DELETE /api/outbound-orders/:id
import { getUserFromRequest, json } from '../../_shared/auth';
import { withVersionGuard } from '../../_shared/optimisticLock';
import { assertRlsOwnership } from '../../_shared/rls';
import { validateOrReject } from '../../_shared/validate';
import { guardStatusTransition } from '../../_shared/statusMachine';
// V3.5.0 B6：补齐写审计（出库单动库存与销货成本，改动必须可追责）
import { writeAudit } from '../../_shared/auditLog';
import { postOutbound, assertPeriodOpen, writeBackOutboundItemCost } from '../../_shared/inventoryPosting';
import { guardOperation } from '../../_shared/operationGuard';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM outbound_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '出库单不存在' }, 404);
  if (!assertRlsOwnership(user, row, 'outbound_orders')) return json({ error: '无权访问该单据' }, 403);

  const items = await db.prepare(`SELECT * FROM outbound_order_items WHERE outbound_order_id = ?`).bind(id).all();

  return json({
    ...row,
    items: (items.results || []).map(r => ({
      id: r.id, outbound_order_id: r.outbound_order_id, material_id: r.material_id,
      material_code: r.material_code, material_name: r.material_name, specification: r.specification,
      unit: r.unit, quantity: Number(r.quantity), batch_no: r.batch_no, location_id: r.location_id,
      location_name: r.location_name, unit_cost: r.unit_cost ? Number(r.unit_cost) : null,
      cost_amount: r.cost_amount ? Number(r.cost_amount) : null, serial_nos: r.serial_nos ? JSON.parse(r.serial_nos) : null,
      hu_id: r.hu_id,
    })),
  });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  // 序列号校验未通过的明细（库存已扣，序列号未更新）—— 必须在响应里告知
  let _serialIssues: any[] = [];
  // ★ R4 留痕：凭证生成失败（库存已扣、不回滚）时回传 voucherIssues，不阻断但留痕
  const _voucherIssues: string[] = [];

  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT * FROM outbound_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '出库单不存在' }, 404);
  if (!assertRlsOwnership(user, existing, 'outbound_orders')) return json({ error: '无权访问该单据' }, 403);

  const body = await context.request.json().catch(() => ({}));

  // V3.26.0: 操作权限服务端守卫（仓储模块 — 库管可改出库单，越权角色返回 403）
  const _opGuard = await guardOperation(user, 'warehouse', 'update', db, user.org_id);
  if (_opGuard) return _opGuard;

  const _invalid = validateOrReject('outbound_orders', body, { partial: true });
  if (_invalid) return _invalid;

  // #9 服务端状态机：硬拦非法状态流转（如「已完成」不可回退为「待处理」），绕开界面亦生效
  //   注意：出库单「已完成」= 库存已扣减/成本已结转，回退会造成账实不符，必须拦。
  const _statusGuard = guardStatusTransition('outbound_order', (existing as any).status, body);
  if (_statusGuard) return json(_statusGuard.response, 400);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const fields = ['outboundNo', 'type', 'sourceNo', 'customerId', 'customerName', 'vendorId', 'vendorName',
    'status', 'warehouseId', 'warehouseName', 'operator', 'outboundDate', 'remarks',
    'picker', 'packagingMethod', 'packageCount', 'weight', 'volume', 'shippingCompany', 'trackingNo'];
  // P0-3：inventoryPosted / cogsPosted 是**服务端专属**幂等标志（过账成功后才置 1），
  //   不再放进客户端可写白名单——否则客户端可预写 inventory_posted=1，
  //   让出库单转 completed 时守卫读到 1 就跳过过账（库存从未真扣却标成已 posting）。

  const setClauses: string[] = [];
  const values: (string | number)[] = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      const col = f === 'outboundNo' ? 'outbound_no' : f === 'sourceNo' ? 'source_no' : f === 'customerId' ? 'customer_id' :
        f === 'customerName' ? 'customer_name' : f === 'vendorId' ? 'vendor_id' : f === 'vendorName' ? 'vendor_name' :
        f === 'warehouseId' ? 'warehouse_id' : f === 'warehouseName' ? 'warehouse_name' : f === 'outboundDate' ? 'outbound_date' :
        f === 'packagingMethod' ? 'packaging_method' : f === 'packageCount' ? 'package_count' : f === 'shippingCompany' ? 'shipping_company' :
        f === 'trackingNo' ? 'tracking_no' : f === 'inventoryPosted' ? 'inventory_posted' : f === 'cogsPosted' ? 'cogs_posted' :
        f.toLowerCase();
      setClauses.push(`${col} = ?`);
      values.push(body[f]);
    }
  }
  setClauses.push('updated_at = ?', 'updated_by = ?');
  values.push(now, user.name);

  // 乐观锁：携带 version 时按版本号比对，被他人改过则 409，避免静默覆盖
  const conflict = await withVersionGuard({ db, table: 'outbound_orders', id, orgId: user.org_id, body, setClauses, values });
  if (conflict) return conflict;

  if (body.items && Array.isArray(body.items)) {
    // V3.58.0 修复 WH-01：已过账的出库单禁止修改明细数量（库存/COGS 凭证已锁定）。
    if ((existing as any).inventory_posted) {
      return json(
        { error: '该出库单已过账，库存与成本凭证已锁定，禁止修改明细数量。如需调整请走红冲 + 重新出库流程。', code: 'POSTED_CANNOT_EDIT_ITEMS' },
        409
      );
    }
    await db.prepare(`DELETE FROM outbound_order_items WHERE outbound_order_id = ?`).bind(id).run();
    for (const item of body.items) {
      // 兜底：明细行可能缺字段或类型不对，逐字段归一化，避免 undefined 直接进 bind 导致 500
      const it = (item && typeof item === 'object') ? item : {};
      await db.prepare(`INSERT INTO outbound_order_items (id, outbound_order_id, material_id, material_code, material_name, specification, unit, quantity, batch_no, location_id, location_name, unit_cost, cost_amount, serial_nos, hu_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        it.id || `ooi-${id}-${Math.random().toString(36).slice(2, 6)}`,
        id, it.materialId ?? null, it.materialCode ?? null, it.materialName ?? null, it.specification ?? null, it.unit ?? null,
        Number(it.quantity) || 0, it.batchNo ?? null, it.locationId ?? null, it.locationName ?? null,
        it.unitCost ?? null, it.costAmount ?? null, it.serialNos ? JSON.stringify(it.serialNos) : null,
        it.huId ?? null
      ).run();
    }
  }

  const updated = await db.prepare(`SELECT * FROM outbound_orders WHERE id = ?`).bind(id).first();

  // N1 服务端过账（2026-09-20）：状态变为 completed 且尚未过账时触发；
  // 幂等靠 inventory_posted 守卫。PUT 可能只传状态不带 items，此时从库读明细。
  // V3.58.0 修复 WH-16：与 POST 对齐，过账前置条件 UPDATE 抢占，杜绝并发重复过账。
  if (updated && updated.status === 'completed' && !updated.inventory_posted) {
    // ★ V3.61.0 P0-1：期末结账守卫在抢占之前（否则被过账 catch 吞成假成功）
    try {
      await assertPeriodOpen(db, user.org_id, { outboundDate: updated.outbound_date }, '出库单');
    } catch (e: any) {
      return json({ error: e?.message || '会计期间已结账，禁止过账', code: 'PERIOD_CLOSED', period: String(updated.outbound_date || '').slice(0, 7) }, 409);
    }
    const _claim = await db
      .prepare(`UPDATE outbound_orders SET inventory_posted = 1, cogs_posted = 1 WHERE id = ? AND inventory_posted = 0`)
      .bind(id).run();
    if (((_claim as any)?.meta?.changes ?? 0) > 0) {
      try {
      let postItems = body.items;
      if (!Array.isArray(postItems) || postItems.length === 0) {
        // ★ V3.47.0 3-05：**必须带上 serial_nos**。
        //   原 SELECT 没取这一列 ⇒ 「只改状态完成」这条最常见的过账路径
        //   （前端改单据状态后由服务端过账）丢失全部序列号信息 ⇒
        //   序列号既不更新状态、也不做状态校验，表现为"校验写了却从不起作用"。
        const dbItems = await db
          .prepare(
            `SELECT material_id, material_code, material_name, unit, quantity, location_id, location_name, serial_nos
               FROM outbound_order_items WHERE outbound_order_id = ?`
          )
          .bind(id)
          .all();
        postItems = (dbItems.results || []).map((it: any) => ({
          materialId: it.material_id,
          materialCode: it.material_code,
          materialName: it.material_name,
          unit: it.unit,
          quantity: Number(it.quantity),
          locationId: it.location_id,
          locationName: it.location_name,
          serialNos: it.serial_nos,
        }));
      }
      // ★ V3.47.0 3-05：接住序列号校验结果（原先返回值直接丢弃 ⇒
      //   序列号没更新成功也没人知道，台账与实物脱节却无提示）
      const rOut = await postOutbound(db, user.org_id, user, {
        items: postItems,
        warehouseId: updated.warehouse_id,
        warehouseName: updated.warehouse_name,
        outboundDate: updated.outbound_date,
        type: updated.type,
        outboundNo: updated.outbound_no,
        customerName: updated.customer_name,
        vendorName: updated.vendor_name,
        operator: updated.operator,
      });
      _serialIssues = rOut.serialIssues || [];
      // ★ R4 留痕：凭证生成失败（库存已扣不回滚）的原因收集到响应，让「账实动了但凭证缺失」可见
      _voucherIssues.push(...(rOut.voucherIssues || []));
      // ★ V3.61.0 S-08：把服务端算出的真实成本回写明细行（此前恒 0，单据与凭证两套口径）
      await writeBackOutboundItemCost(db, id, rOut.enrichedItems || []);
      // 过账标志已由上方 _claim 抢占，此处不再重复置 1（保留 total_cost 回写）
      try {
        await db.prepare(`UPDATE outbound_orders SET cogs_posted = 1 WHERE id = ?`).bind(id).run();
      } catch { /* cogs 标志回写失败不阻断 */ }
    } catch (e) {
      // V3.58.0 WH-17：出库 PUT 过账失败不再静默。
      //   ① 把过账标志回滚为 0（防止「库存没扣但标记已扣」的假成功，让后续可重试）
      //   ② 把单据状态回滚为改前状态（避免「已完成但库存没动」的假成功）
      //   ③ 错误收集进 _voucherIssues，随响应体 postingError 回传给前端红条（铁律㊴）
      console.error('[outbound-post] failed', e);
      try {
        await db.prepare(`UPDATE outbound_orders SET inventory_posted = 0, cogs_posted = 0 WHERE id = ?`).bind(id).run();
      } catch { /* 回滚标志失败不阻断响应 */ }
      try {
        await db.prepare(`UPDATE outbound_orders SET status = ? WHERE id = ?`).bind((existing as any).status, id).run();
      } catch { /* 状态回滚失败不阻断 */ }
      _voucherIssues.push(`过账失败：${(e as any)?.message || e}`);
    }
    } // close _claim block
  }

  // B6 审计：出库单直接扣库存、并结转销货成本，是「账实相符」的关键单据，
  //   改动必须留痕。摘要带上「改了哪些字段 / 明细行数 / 客户 / 状态变化」，
  //   发货类字段（物流单号、包装件数）变更一并记入，便于事后追溯实际发货事实。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'outbound_orders',
    entityId: id,
    action: 'update',
    summary:
      `更新出库单 ${(existing as any).outbound_no || id}` +
      `（客户：${body.customerName ?? (existing as any).customer_name ?? '-'}）` +
      `（字段：${fields.filter((f) => body[f] !== undefined).join('、') || '无'}）` +
      `（明细行：${Array.isArray(body.items) ? body.items.length : '未改动'}）` +
      ((existing as any).status !== (body.status ?? (existing as any).status)
        ? `（状态：${(existing as any).status} → ${body.status}）`
        : ''),
  });

  // V3.58.0 WH-17：过账/凭证失败（含库存未扣但状态被回滚的场景）必须回传可感知的 postingError
  const _fresh2 = await db.prepare(`SELECT * FROM outbound_orders WHERE id = ?`).bind(id).first();
  const respRow: any = _fresh2 || (updated as any);
  return json({
    ...respRow,
    // 序列号未更新的明细：库存已扣但序列号状态没变，必须让用户知道要处理
    serialIssues: _serialIssues.length > 0 ? _serialIssues : undefined,
    // ★ R4 + WH-17：凭证生成失败 或 过账异常时，统一回传 postingError（含两者）
    postingError: _voucherIssues.length > 0 ? _voucherIssues.join('；') : undefined,
    voucherIssues: _voucherIssues.length > 0 ? _voucherIssues : undefined,
  });
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM outbound_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '出库单不存在' }, 404);
  if (!assertRlsOwnership(user, row, 'outbound_orders')) return json({ error: '无权访问该单据' }, 403);

  // V3.26.0: 操作权限服务端守卫（仓储模块 — 库管无删除权，越权删除返回 403）
  const _opGuard = await guardOperation(user, 'warehouse', 'delete', db, user.org_id);
  if (_opGuard) return _opGuard;

  await db.prepare(`DELETE FROM outbound_orders WHERE id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM outbound_order_items WHERE outbound_order_id = ?`).bind(id).run();

  // B6 审计：与入库单同理，已过账出库单的删除在财务上需要人工核对冲销。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'outbound_orders',
    entityId: id,
    action: 'delete',
    summary:
      `删除出库单 ${(row as any).outbound_no || id}` +
      `（客户：${(row as any).customer_name || '-'}；状态：${(row as any).status || '-'}）` +
      ((row as any).inventory_posted || (row as any).cogs_posted
        ? '【注意：该单已过账（库存已扣/成本已结转），删除后需人工核对冲销】'
        : ''),
  });

  return json({ success: true });
}
