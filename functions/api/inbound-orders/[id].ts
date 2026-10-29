// GET/PUT/DELETE /api/inbound-orders/:id
import { getUserFromRequest, json } from '../../_shared/auth';
import { withVersionGuard } from '../../_shared/optimisticLock';
import { assertRlsOwnership } from '../../_shared/rls';
import { validateOrReject } from '../../_shared/validate';
import { guardStatusTransition } from '../../_shared/statusMachine';
// V3.5.0 B6：补齐写审计（原先 PUT/DELETE 无留痕，单据被改动后无法追责）
import { writeAudit } from '../../_shared/auditLog';
import { postInbound, assertPeriodOpen } from '../../_shared/inventoryPosting';
import { guardOperation } from '../../_shared/operationGuard';
// V3.61.0 D-02/D-03：采购订单已交量行级回写 + 状态推进（共用助手，与 POST 路径同源）
import { writeBackPurchaseDelivered, advancePurchaseOrderStatus, readWorkOrderCosts } from '../../_shared/purchaseReceiptWriteback';
import { roundAmount } from '../../_shared/money';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM inbound_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '入库单不存在' }, 404);
  if (!assertRlsOwnership(user, row, 'inbound_orders')) return json({ error: '无权访问该单据' }, 403);

  const items = await db.prepare(`SELECT * FROM inbound_order_items WHERE inbound_order_id = ?`).bind(id).all();

  return json({
    ...row,
    items: (items.results || []).map(r => ({
      id: r.id, inbound_order_id: r.inbound_order_id, material_id: r.material_id,
      material_code: r.material_code, material_name: r.material_name, specification: r.specification,
      unit: r.unit, expected_quantity: Number(r.expected_quantity), actual_quantity: Number(r.actual_quantity),
      batch_no: r.batch_no, location_id: r.location_id, location_name: r.location_name,
      quality_status: r.quality_status, unit_price: r.unit_price ? Number(r.unit_price) : null,
      amount: r.amount ? Number(r.amount) : null, serial_nos: r.serial_nos ? JSON.parse(r.serial_nos) : null,
      hu_id: r.hu_id, production_date: r.production_date, expiry_date: r.expiry_date,
    })),
  });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT * FROM inbound_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '入库单不存在' }, 404);
  if (!assertRlsOwnership(user, existing, 'inbound_orders')) return json({ error: '无权访问该单据' }, 403);

  const body = await context.request.json().catch(() => ({}));

  // V3.26.0: 操作权限服务端守卫（仓储模块 — 库管可改入库单，越权角色返回 403）
  const _opGuard = await guardOperation(user, 'warehouse', 'update', db, user.org_id);
  if (_opGuard) return _opGuard;

  const _invalid = validateOrReject('inbound_orders', body, { partial: true });
  if (_invalid) return _invalid;

  // #9 服务端状态机：硬拦非法状态流转（如「已完成」不可回退为「待处理」），绕开界面亦生效
  //   注意：入库单「已完成」= 库存已入库，回退会造成账实不符，必须拦。
  const _statusGuard = guardStatusTransition('inbound_order', (existing as any).status, body);
  if (_statusGuard) return json(_statusGuard.response, 400);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const fields = ['inboundNo', 'type', 'sourceNo', 'vendorId', 'vendorName', 'status', 'warehouseId',
    'warehouseName', 'operator', 'inboundDate', 'totalCost', 'subcontractMaterialCost', 'asnShipmentNo',
    'remarks'];
  // P0-3：inventoryPosted / costPosted 是**服务端专属**幂等标志（过账成功后才置 1），
  //   不再放进客户端可写白名单——否则客户端可预写 inventory_posted=1，
  //   让单据转 completed 时守卫读到 1 就跳过过账（库存从未真动却标成已 posting）。

  const setClauses: string[] = [];
  const values: (string | number)[] = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      const col = f === 'inboundNo' ? 'inbound_no' : f === 'sourceNo' ? 'source_no' : f === 'vendorId' ? 'vendor_id' :
        f === 'vendorName' ? 'vendor_name' : f === 'warehouseId' ? 'warehouse_id' : f === 'warehouseName' ? 'warehouse_name' :
        f === 'inboundDate' ? 'inbound_date' : f === 'totalCost' ? 'total_cost' : f === 'subcontractMaterialCost' ? 'subcontract_material_cost' :
        f === 'asnShipmentNo' ? 'asn_shipment_no' : f === 'inventoryPosted' ? 'inventory_posted' : f === 'costPosted' ? 'cost_posted' :
        f.toLowerCase();
      setClauses.push(`${col} = ?`);
      values.push(body[f]);
    }
  }
  setClauses.push('updated_at = ?', 'updated_by = ?');
  values.push(now, user.name);

  // 乐观锁：携带 version 时按版本号比对，被他人改过则 409，避免静默覆盖
  const conflict = await withVersionGuard({ db, table: 'inbound_orders', id, orgId: user.org_id, body, setClauses, values });
  if (conflict) return conflict;

  if (body.items && Array.isArray(body.items)) {
    // V3.58.0 修复 WH-01：已过账（inventory_posted=1）的入库单禁止修改明细数量。
    // 已过账意味着库存余额/流水/三单匹配基准已锁定，改数量会导致三者永久脱钩
    // 且无法自愈（流水 SUM ≠ 余额、三单匹配基准漂移）。如需调整须走红冲 + 重做流程。
    if ((existing as any).inventory_posted) {
      return json(
        { error: '该入库单已过账，库存与账本已锁定，禁止修改明细数量。如需调整请走红冲 + 重新入库流程。', code: 'POSTED_CANNOT_EDIT_ITEMS' },
        409
      );
    }
    await db.prepare(`DELETE FROM inbound_order_items WHERE inbound_order_id = ?`).bind(id).run();
    for (const item of body.items) {
      // 兜底：明细行可能缺字段或类型不对，逐字段归一化，避免 undefined 直接进 bind 导致 500
      const it = (item && typeof item === 'object') ? item : {};
      // ★ V3.61.0 D-04：改单路径补齐「单价兜底 + 金额退化守卫」（与 POST 同范式）。
      //   缺陷：此前 PUT 直接 `it.unitPrice ?? null` / `it.amount ?? null` 原样落库，
      //   改单时若前端没回填单价 → 金额静默落 NULL/0 → 三单匹配入库金额恒 0 → 付款闸门误拦，
      //   且已存在的正确金额会被改单「改没」。
      const _qty = Number(it.actualQuantity) || Number(it.expectedQuantity) || 0;
      let _price = Number(it.unitPrice) || 0;
      if (_price <= 0 && (it.materialId || it.materialCode)) {
        try {
          const _m: any = await db
            .prepare('SELECT moving_avg_price, standard_price, price FROM materials WHERE org_id = ? AND (id = ? OR code = ?) LIMIT 1')
            .bind(user.org_id, it.materialId || it.materialCode, it.materialCode || it.materialId)
            .first();
          if (_m) {
            _price = Number(_m.moving_avg_price) > 0 ? Number(_m.moving_avg_price)
              : Number(_m.standard_price) > 0 ? Number(_m.standard_price)
              : Number(_m.price) || 0;
          }
        } catch { /* 取不到主数据则保持 0，交由守卫处理，不静默编数 */ }
      }
      const _amount = _price > 0 ? roundAmount(_qty * _price) : (Number(it.amount) || 0);
      // 金额退化 fail-closed（与 POST 路径 0053/ G4 守卫同口径）：有量无金额 → 400
      if (_qty > 0 && _price <= 0 && _amount <= 0) {
        return json({
          error: `入库明细「${it.materialName || it.materialCode || '?'}」有数量（${_qty}）但无法确定金额：物料主数据无单价且未传入库金额。请先在物料主数据中维护单价，或在入库单中填写单价/金额。`,
          code: 'AMOUNT_DEGRADATION',
          field: 'items.unitPrice',
        }, 400);
      }
      await db.prepare(`INSERT INTO inbound_order_items (id, inbound_order_id, material_id, material_code, material_name, specification, unit, expected_quantity, actual_quantity, batch_no, location_id, location_name, quality_status, unit_price, amount, serial_nos, hu_id, production_date, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        it.id || `ini-${id}-${Math.random().toString(36).slice(2, 6)}`,
        id, it.materialId ?? null, it.materialCode ?? null, it.materialName ?? null, it.specification ?? null, it.unit ?? null,
        Number(it.expectedQuantity) || 0, Number(it.actualQuantity) || 0, it.batchNo ?? null, it.locationId ?? null,
        it.locationName ?? null, it.qualityStatus || 'qualified', _price > 0 ? _price : (it.unitPrice ?? null), _amount,
        it.serialNos ? JSON.stringify(it.serialNos) : null, it.huId ?? null, it.productionDate ?? null,
        it.expiryDate ?? null
      ).run();
    }
  }

  const updated = await db.prepare(`SELECT * FROM inbound_orders WHERE id = ?`).bind(id).first();

  // N1 服务端过账（2026-09-20）：状态变为 completed 且尚未过账时触发；
  // 幂等靠 inventory_posted 守卫。PUT 可能只传状态不带 items，此时从库读明细。
  // V3.58.0 修复 WH-16：与 POST（inbound-orders/index.ts:221）对齐——
  // 过账前先做条件 UPDATE 抢占（SET inventory_posted=1 WHERE inventory_posted=0），
  // 读 meta.changes 判定本次是否抢到。原「先读 → 判断 → 后置 1」是读-判断-写竞态，
  // 两次并发 PUT 都会读到「未过账」→ 都去过账 → 流水翻倍。
  const _voucherIssues: string[] = [];
  if (updated && updated.status === 'completed' && !updated.inventory_posted) {
    // ★ V3.61.0 P0-1：期末结账守卫在抢占之前校验（POST 路径同范式）。
    //   只靠 postInbound 抛错会被过账 catch 吞掉 → 仍返回 200 的假成功。
    try {
      await assertPeriodOpen(db, user.org_id, { inboundDate: updated.inbound_date }, '入库单');
    } catch (e: any) {
      return json({ error: e?.message || '会计期间已结账，禁止过账', code: 'PERIOD_CLOSED', period: String(updated.inbound_date || '').slice(0, 7) }, 409);
    }
    // V3.58.0 WH-16：条件抢占（与 POST 同范式）
    const _claim = await db
      .prepare(`UPDATE inbound_orders SET inventory_posted = 1 WHERE id = ? AND inventory_posted = 0`)
      .bind(id).run();
    if (((_claim as any)?.meta?.changes ?? 0) > 0) {
      try {
      let postItems = body.items;
      if (!Array.isArray(postItems) || postItems.length === 0) {
        const dbItems = await db
          .prepare(
            `SELECT material_id, material_code, material_name, unit, actual_quantity, expected_quantity, unit_price, location_id, location_name FROM inbound_order_items WHERE inbound_order_id = ?`
          )
          .bind(id)
          .all();
        postItems = (dbItems.results || []).map((it: any) => ({
          materialId: it.material_id,
          materialCode: it.material_code,
          materialName: it.material_name,
          unit: it.unit,
          actualQuantity: Number(it.actual_quantity),
          expectedQuantity: Number(it.expected_quantity),
          unitPrice: it.unit_price ? Number(it.unit_price) : 0,
          locationId: it.location_id,
          locationName: it.location_name,
        }));
      }
      const r = await postInbound(db, user.org_id, user, {
        items: postItems,
        warehouseId: updated.warehouse_id,
        warehouseName: updated.warehouse_name,
        inboundDate: updated.inbound_date,
        type: updated.type,
        inboundNo: updated.inbound_no,
        vendorName: updated.vendor_name,
        operator: updated.operator,
        sourceNo: updated.source_no,
        // ★ #14（V3.17.6）：把材料成本带给凭证生成，委外入库才能拆成 借1405 / 贷1408 / 贷2201
        subcontractMaterialCost: updated.subcontract_material_cost,
        // ★ V3.61.0 W-C3：生产完工入库带工单人工成本，使结转为完整生产成本
        // ★ V3.62.0 边界①：再带上工单折旧与制造费用，5001 结转含 材料+人工+折旧+制造费用
        laborCost: 0,
        depreciationCost: 0,
        overheadCost: 0,
        ...(updated.type === 'production' && updated.source_no
          ? await readWorkOrderCosts(db, user.org_id, updated.source_no)
          : {}),
      });
      await db
        .prepare(`UPDATE inbound_orders SET total_cost = COALESCE(total_cost, ?) WHERE id = ?`)
        .bind(r.totalCost, id)
        .run();
      // ★ V3.58.0 修复 PO-01：入库过账成功后回写对应采购订单的已交数量。
      //★ V3.61.0 D-02/D-03：改为行级 + 头级一并回写，并按进度推进订单状态。
      if (updated.type === 'purchase' && updated.source_no) {
        try {
          const poNo = updated.source_no;
          const sumQty = postItems.reduce((a: number, it: any) => a + (Number(it.actualQuantity) || 0), 0);
          if (sumQty > 0) {
            await writeBackPurchaseDelivered(db, user.org_id, poNo, postItems);
            await advancePurchaseOrderStatus(db, user.org_id, poNo);
          }
        } catch (e) {
          console.error('[inbound-po] 回写采购订单已交量失败', (e as any)?.message || e);
        }
      }
      // ★ R4 留痕：凭证生成失败（库存已过账不回滚）的原因收集到响应，让「账实动了但凭证缺失」可见
      _voucherIssues.push(...(r.voucherIssues || []));
    } catch (e) {
      // V3.58.0 WH-17：过账失败 ① 回滚过账标志（让后续可重试）② 回滚单据状态（避免假成功）③ 错误进响应体
      console.error('[inbound-post] failed', e);
      try {
        await db.prepare(`UPDATE inbound_orders SET inventory_posted = 0 WHERE id = ?`).bind(id).run();
      } catch { /* 回滚标志失败不阻断响应 */ }
      try {
        await db.prepare(`UPDATE inbound_orders SET status = ? WHERE id = ?`)
          .bind((existing as any).status, id).run();
      } catch { /* 状态回滚失败不阻断 */ }
      _voucherIssues.push(`过账失败：${(e as any)?.message || e}`);
    }
    } // close _claim block
  }

  // B6 审计：入库单是可触发库存与成本过账的单据，改动必须留痕。
  //   摘要里写「改了哪些字段 + 明细行数」——事后追责时最有用的就是这两项，
  //   只写「更新了入库单 xxx」等于没写。明细行数单独记是因为整单替换明细
  //   （下方 DELETE + INSERT）是最容易出错的一步，行数突变本身就是异常信号。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'inbound_orders',
    entityId: id,
    action: 'update',
    summary:
      `更新入库单 ${(existing as any).inbound_no || id}` +
      `（字段：${fields.filter((f) => body[f] !== undefined).join('、') || '无'}）` +
      `（明细行：${Array.isArray(body.items) ? body.items.length : '未改动'}）` +
      ((existing as any).status !== (body.status ?? (existing as any).status)
        ? `（状态：${(existing as any).status} → ${body.status}）`
        : ''),
  });

  // ★ R4 + V3.58.0 WH-17：过账失败时显式回传 postingError（含凭证缺失与过账异常两类），
  // 前端 store 的写入路径已接入全局红条告警，此处必须把错误放进响应体，
  // 让「界面点了保存却库账没动」可见。
  const _fresh = await db.prepare(`SELECT * FROM inbound_orders WHERE id = ?`).bind(id).first();
  const respBody: any = _fresh || updated;
  if (_voucherIssues.length > 0) respBody.postingError = _voucherIssues.join('；');
  return json(respBody);
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM inbound_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '入库单不存在' }, 404);
  if (!assertRlsOwnership(user, row, 'inbound_orders')) return json({ error: '无权访问该单据' }, 403);

  // V3.26.0: 操作权限服务端守卫（仓储模块 — 库管无删除权，越权删除返回 403）
  const _opGuard = await guardOperation(user, 'warehouse', 'delete', db, user.org_id);
  if (_opGuard) return _opGuard;

  await db.prepare(`DELETE FROM inbound_orders WHERE id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM inbound_order_items WHERE inbound_order_id = ?`).bind(id).run();

  // B6 审计：删除单据是破坏性操作，必须留痕；已过账（动过库存/成本）的单据
  //   单独标注，因为这类删除在财务上需要人工核对冲销。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'inbound_orders',
    entityId: id,
    action: 'delete',
    summary:
      `删除入库单 ${(row as any).inbound_no || id}` +
      `（供应商：${(row as any).vendor_name || '-'}；状态：${(row as any).status || '-'}）` +
      ((row as any).inventory_posted || (row as any).cost_posted
        ? '【注意：该单已过账（库存/成本已发生），删除后需人工核对冲销】'
        : ''),
  });

  return json({ success: true });
}
