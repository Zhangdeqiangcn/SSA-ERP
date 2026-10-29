// V3.61.0 · 发货→出库联动共用助手（S-03/S-04 的唯一实现）
//
// ── 为什么要抽出来 ────────────────────────────────────────────────
// 缺陷（V3.61.0 第三批审计抓出）：联动原实现整个埋在 `shipments/[id].ts` 的
//   PUT 状态边沿分支里，而 `shipments/index.ts` 的 POST 直接 `pcCreate`，
//   **建单时若状态已是 shipped（如批量导入可传任意状态、API 直调），
//    联动完全不触发**——界面显示已发货、库存没扣、订单已交量没回写，
//    属V3.58.0 起重点治理的「假成功」形态。
// 现在：POST 建单即发货 与 PUT 状态推进 共用本助手，两条路径同口径同幂等。
//
// 幂等保证：以发货单号为 `outbound_orders.source_no` 查重（配合条件抢占
//   `WHERE inventory_posted = 0`），重复触发不会二次扣库存；已交数量
//   回写本身是「封顶累加」，重复执行结果一致。
import { guardOperation } from './operationGuard';
import { postOutbound } from './inventoryPosting';

/**
 * 触发发货→出库联动（生成销售出库单并过账 + 回写销售订单已交数量）
 * @returns { issues: string[] } 联动过程中的告警/错误（供端点回传前端红条）
 */
export async function runShipmentOutboundLink(
  DB: any,
  user: any,
  shipment: any,
  options?: { skipWhenNoDetail?: boolean }
): Promise<string[]> {
  const issues: string[] = [];
  const orgId = user.org_id;
  const items: any[] = shipment?.items || [];
  const shipmentNo = shipment?.shipmentNo || shipment?.shipment_no || shipment?.id;
  const salesOrderNo = shipment?.salesOrderNo || shipment?.sales_order_no || null;
  const outboundNo = `XS-${shipmentNo}`;

  try {
    // ★ V3.62.0 边界④：优先使用发货单指定的仓库；未指定时回退到本组织首个仓库。
    //   多仓场景下用户可在发货单上选择发货仓，库存按指定仓发生移动，不再默认取首个仓。
    let warehouseId = shipment?.warehouseId || shipment?.warehouse_id || null;
    let warehouseName = shipment?.warehouseName || shipment?.warehouse_name || null;
    if (!warehouseId) {
      const wh: any = await DB
        .prepare(`SELECT id, name FROM warehouses WHERE org_id = ? ORDER BY created_at ASC LIMIT 1`)
        .bind(orgId)
        .first()
        .catch(() => null);
      warehouseId = wh?.id ?? null;
      warehouseName = wh?.name ?? null;
    }

    // 查重：该发货单是否已生成过出库单（防重复触发 / 重复扣库存）
    const dup: any = await DB
      .prepare(`SELECT id FROM outbound_orders WHERE org_id = ? AND source_no = ? LIMIT 1`)
      .bind(orgId, shipmentNo)
      .first();
    if (dup) {
      // 已生成过（重复触发），跳过创建，但仍补写已交数量（幂等）
      await writeBackDelivered(DB, orgId, salesOrderNo, items, issues);
      return issues;
    }
    if (items.length === 0) {
      if (!options?.skipWhenNoDetail) issues.push('发货单无明细，未生成销售出库单');
      return issues;
    }

    // ★ V3.61.0 修正：无仓库时**不再假装联动成功**。
    //   旧实现把 warehouseId=null 硬插 outbound_orders，而该列是 NOT NULL →
    //   D1 直接抛 NOT NULL 约束失败，发货单显示已发货但库存没扣、已交量没回写
    //   （探测坐实：POST 建单即发货返回 postingError「D1_ERROR: NOT NULL
    //   constraint failed: outbound_orders.warehouse_id」，订单已交量仍为 0）。
    //   原注释声称「无仓库时仅过账成本、不扣库存（诚实降级）」，实际连过账都到不了。
    //   现在改为**显式降级**：不生成出库单，把原因如实回传前端，
    //   由人先建仓库后重推状态（状态边沿可重触发，联动幂等）。
    if (!warehouseId) {
      issues.push('本组织尚未建立仓库，发货未能联动出库（库存与订单已交量未更新）。请先在「基础资料→仓库」建仓后再重新推进发货状态。');
      return issues;
    }

    // 越权保护：自动建出库单需要仓储 create 权限；无权限则降级为提示、不阻断发货单本身
    const opGuard = await guardOperation(user, 'warehouse', 'create', DB, orgId);
    if (opGuard) {
      issues.push('未自动生成销售出库单：当前账号无仓储建单权限');
      return issues;
    }

    const oid = 'out-' + crypto.randomUUID();
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');
    const headStmt = DB.prepare(
      `INSERT INTO outbound_orders (id, org_id, dept_id, owner_id, outbound_no, type, source_no, customer_id, customer_name, vendor_id, vendor_name, status, warehouse_id, warehouse_name, operator, outbound_date, remarks, picker, created_at, updated_at, created_by, updated_by, inventory_posted, cogs_posted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`
    ).bind(
      oid, orgId, user.department || null, user.id, outboundNo, 'sale', shipmentNo, null,
      shipment?.customerName || shipment?.customer_name || null, null, null, 'completed', warehouseId, warehouseName,
      user.name, new Date().toISOString().slice(0, 10), `由发货单 ${shipmentNo} 自动生成`, null, now, now, user.name, user.name
    );
    const itemStmts: any[] = [];
    for (const it of items) {
      itemStmts.push(
        DB.prepare(
          `INSERT INTO outbound_order_items (id, outbound_order_id, material_id, material_code, material_name, specification, unit, quantity, batch_no, location_id, location_name, unit_cost, cost_amount, serial_nos, hu_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          'ooi-' + crypto.randomUUID(), oid, it.materialId || null, it.materialCode || null, it.materialName || null,
          it.specification || null, it.unit || null, Number(it.shipQuantity) || Number(it.quantity) || 0,
          null, null, null, 0, 0, null, null
        )
      );
    }
    if (itemStmts.length <= 99) {
      await DB.batch([headStmt, ...itemStmts]);
    } else {
      await headStmt.run();
      for (const s of itemStmts) await s.run();
    }

    // 过账（扣库存 + 结转 COGS），与出库单 POST 同口径；失败回滚 + 留痕
    const claim = await DB
      .prepare(`UPDATE outbound_orders SET inventory_posted = 1, cogs_posted = 1 WHERE id = ? AND inventory_posted = 0`)
      .bind(oid)
      .run();
    if (((claim as any)?.meta?.changes ?? 0) > 0) {
      try {
        await postOutbound(DB, orgId, user, {
          items: items.map((it: any) => ({
            materialId: it.materialId, materialCode: it.materialCode, materialName: it.materialName,
            unit: it.unit, quantity: Number(it.shipQuantity) || Number(it.quantity) || 0,
            locationId: null, locationName: null, serialNos: null,
          })),
          warehouseId, warehouseName, outboundDate: new Date().toISOString().slice(0, 10),
          type: 'sale', outboundNo, customerName: shipment?.customerName || shipment?.customer_name || null,
          vendorName: null, operator: user.name,
        });
      } catch (e: any) {
        try {
          await DB.prepare(`UPDATE outbound_orders SET inventory_posted = 0, cogs_posted = 0 WHERE id = ?`).bind(oid).run();
        } catch { /* 回滚尽力而为 */ }
        issues.push(`销售出库单过账失败：${e?.message || e}`);
      }
    }

    // 写回销售订单已交数量
    await writeBackDelivered(DB, orgId, salesOrderNo, items, issues);
  } catch (e: any) {
    // ★ 失败必须可感知（铁律㊴）：不阻断发货单本身，但把异常回传前端红条
    issues.push(`发货→出库联动异常：${e?.message || e}`);
  }
  return issues;
}

/**
 * 写回销售订单已交数量（delivered_quantity）
 * - 按物料编码匹配销售订单行，累加发货数量，封顶订单数量（防超交 >100%）
 * - 表头 delivered_quantity = Σ 行已交数量（幂等，与分几次发货无关）
 */
async function writeBackDelivered(DB: any, orgId: string, salesOrderNo: any, items: any[], issues: string[]) {
  if (!salesOrderNo) {
    issues.push('发货单未关联销售订单，未写回已交数量');
    return;
  }
  const so: any = await DB
    .prepare(`SELECT id FROM sales_orders WHERE org_id = ? AND order_no = ? LIMIT 1`)
    .bind(orgId, salesOrderNo)
    .first();
  if (!so) {
    issues.push(`未写回已交数量：销售订单号 ${salesOrderNo} 在本组织不存在`);
    return;
  }
  for (const it of items) {
    const code = it.materialCode || it.material_code || '';
    const qty = Number(it.shipQuantity ?? it.quantity) || 0;
    if (!code || qty <= 0) continue;
    await DB.prepare(
      `UPDATE sales_order_items
          SET delivered_quantity = MIN(
                COALESCE(quantity, 0),
                COALESCE(delivered_quantity, 0) + ?
              )
        WHERE sales_order_id = ? AND UPPER(COALESCE(material_code, '')) = UPPER(?)`
    )
      .bind(qty, so.id, code)
      .run();
  }
  const sum: any = await DB
    .prepare(`SELECT COALESCE(SUM(COALESCE(delivered_quantity, 0)), 0) AS qty FROM sales_order_items WHERE sales_order_id = ?`)
    .bind(so.id)
    .first();
  await DB.prepare(`UPDATE sales_orders SET delivered_quantity = ?, updated_at = ? WHERE id = ? AND org_id = ?`)
    .bind(Number(sum?.qty || 0), new Date().toISOString(), so.id, orgId)
    .run();
}