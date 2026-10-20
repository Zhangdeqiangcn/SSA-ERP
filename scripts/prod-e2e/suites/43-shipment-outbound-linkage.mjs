// 套件 43 · 发货→出库联动（S-03/S-04 整改守护）
// ------------------------------------------------------------------
// 目的（审计 S-03/S-04）：发货单状态从未发货变为「已发货 shipped」时，服务端应：
//   ① 自动生成销售出库单（source_no = 发货单号，type=sale，status=completed 直接过账扣库存 + 结转 COGS）；
//   ② 把发货数量写回销售订单行的 delivered_quantity（封顶订单数量）并同步刷新表头；
//   ③ 幂等：重复触发不重复建出库单 / 不重复扣库存。
//
// 全程隔离组织（E2E-<runId>）+ track 自动清理 + 可复跑，不依赖历史结论。
export const meta = {
  id: '43-shipment-outbound-linkage',
  title: '发货→出库联动（自动出库 + 已交数量写回 + 幂等）',
};

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const token = ctx.admin.token;
  const P = (p, body) => req('POST', p, { token, body });
  const G = (p) => req('GET', p, { token });
  const U = (p, body) => req('PUT', p, { token, body });
  const rnd2 = (n) => Math.round(n * 100) / 100;

  const matCode = `M-SHIP-${runId}`;
  const matName = '联动测试物料';
  const unitCost = 80;
  const inQty = 20;
  const shipQty = 5;

  // ════════════════════════════════════════════════════════════
  // 前置①：建物料（带标准价，供 unitCost 回滚取数）
  // ════════════════════════════════════════════════════════════
  const mat = await P('/api/materials', {
    code: matCode, name: matName, specification: 'E2E-SPEC', unit: '件', materialType: 'raw',
    standardPrice: unitCost, price: unitCost, safetyStock: 0, status: 'active',
  });
  s.expectStatus('前置①：创建物料返回 201', mat, 201,
    mat.status !== 201 ? JSON.stringify(mat.data).slice(0, 160) : '');
  const matId = mat.data?.id;
  if (matId) ctx.track('material', matId);
  if (!matId) { s.fail('前置①：物料创建失败，后续联动无法进行（锚点缺失=失败）'); return; }

  // ════════════════════════════════════════════════════════════
  // 前置②：建仓库（auto-outbound 取本组织首个仓库作为发货仓；无仓库则仅过账成本不扣库存）
  // ════════════════════════════════════════════════════════════
  const wh = await P('/api/warehouses', { code: `WH-${runId}`, name: '联动仓', type: 'raw', status: 'active' });
  s.expectStatus('前置②：创建仓库返回 201', wh, 201,
    wh.status !== 201 ? JSON.stringify(wh.data).slice(0, 160) : '');
  const whId = wh.data?.id;
  if (whId) ctx.track('warehouse', whId);
  if (!whId) { s.fail('前置②：仓库创建失败，后续联动无法进行（锚点缺失=失败）'); return; }

  // ════════════════════════════════════════════════════════════
  // 前置③：采购入库并过账（建立库存 + 成本基础：unitCost=80）
  // ════════════════════════════════════════════════════════════
  const inbNo = `IN-SHIP-${runId}`;
  const inb = await P('/api/inbound-orders', {
    inboundNo: inbNo, type: 'purchase', sourceNo: `PO-SHIP-${runId}`, vendorId: 'vnd-ship', vendorName: '联动供应商',
    status: 'completed', warehouseId: whId, warehouseName: '联动仓', operator: '审计', inboundDate: '2026-10-07',
    items: [{
      materialId: matId, materialCode: matCode, materialName: matName, unit: '件',
      expectedQuantity: inQty, actualQuantity: inQty, unitPrice: unitCost, amount: rnd2(unitCost * inQty),
    }],
  });
  s.expectStatus('前置③：入库过账返回 201', inb, 201,
    inb.status !== 201 ? JSON.stringify(inb.data).slice(0, 160) : '');
  const inbId = inb.data?.id;
  if (inbId) ctx.track('inbound-order', inbId);
  if (!inbId) { s.fail('前置③：入库失败，后续联动无法进行（锚点缺失=失败）'); return; }
  if (inb.data?.voucherIssues?.length > 0) s.fail('前置③：入库凭证留痕告警', inb.data.voucherIssues.join(';'));
  else s.pass('前置③：入库过账无 voucherIssues', '');

  // ════════════════════════════════════════════════════════════
  // 前置④：建销售订单（明细 materialCode=matCode，用于已交数量写回）
  // ════════════════════════════════════════════════════════════
  const soNo = `SO-SHIP-${runId}`;
  const so = await P('/api/sales-orders', {
    orderNo: soNo, customerId: 'cus-ship', customerName: '联动客户', orderDate: '2026-10-07', salesPerson: '审计', taxRate: 0,
    items: [{
      materialId: matId, materialCode: matCode, materialName: matName, unit: '件',
      quantity: shipQty, unitPrice: 120, amount: rnd2(120 * shipQty),
    }],
  });
  s.expectStatus('前置④：创建销售订单返回 201', so, 201,
    so.status !== 201 ? JSON.stringify(so.data).slice(0, 160) : '');
  const soId = so.data?.id;
  if (soId) ctx.track('sales-order', soId);
  if (!soId) { s.fail('前置④：销售订单创建失败，后续联动无法进行（锚点缺失=失败）'); return; }

  // ════════════════════════════════════════════════════════════
  // 前置⑤：建发货单（pending），关联销售订单号 + 明细（shipQuantity=shipQty）
  // ════════════════════════════════════════════════════════════
  const shipNo = `SH-SHIP-${runId}`;
  const ship = await P('/api/shipments', {
    shipmentNo: shipNo, salesOrderNo: soNo, customerName: '联动客户', status: 'pending',
    transportMode: 'road', carrier: '联动承运', packageCount: 1,
    items: [{
      seq: 1, materialId: matId, materialCode: matCode, materialName: matName, unit: '件',
      orderQuantity: shipQty, shipQuantity: shipQty, unitPrice: 120, amount: rnd2(120 * shipQty),
    }],
  });
  s.expectStatus('前置⑤：创建发货单返回 201', ship, 201,
    ship.status !== 201 ? JSON.stringify(ship.data).slice(0, 160) : '');
  const shipId = ship.data?.id;
  if (shipId) ctx.track('shipment', shipId);
  if (!shipId) { s.fail('前置⑤：发货单创建失败，后续联动无法进行（锚点缺失=失败）'); return; }

  // ════════════════════════════════════════════════════════════
  // 核心①：发货单推进到 shipped，触发联动
  // ════════════════════════════════════════════════════════════
  const put1 = await U(`/api/shipments/${shipId}`, { status: 'shipped' });
  s.expectStatus('核心①：发货单 PUT 返回 200', put1, 200,
    put1.status !== 200 ? JSON.stringify(put1.data).slice(0, 200) : '');
  if (put1.data?.postingError) s.fail('核心①：联动回报 postingError（应无）', put1.data.postingError);
  else s.pass('核心①：发货单 PUT 无 postingError', '');

  // 断言①：自动生成销售出库单（source_no = 发货单号）
  const outList = await G(`/api/outbound-orders?keyword=${encodeURIComponent('XS-' + shipNo)}&pageSize=100`);
  const outRows = outList.data?.data || [];
  const autoOut = outRows.find((o) => (o.sourceNo || o.source_no) === shipNo);
  if (!autoOut) { s.fail('断言①：未自动生成销售出库单（source_no=' + shipNo + '）', `检索到出库单=${outRows.length}`); return; }
  s.pass('断言①：自动生成销售出库单', `outboundNo=${autoOut.outboundNo || autoOut.outbound_no} sourceNo=${autoOut.sourceNo || autoOut.source_no}`);
  ctx.track('outbound-order', autoOut.id);

  if ((autoOut.status || '') !== 'completed') s.fail('断言①：自动出库单状态应为 completed', `status=${autoOut.status}`);
  else s.pass('断言①：自动出库单状态=completed', '');
  if (!(autoOut.inventoryPosted || autoOut.inventory_posted)) s.fail('断言①：自动出库单应已过账 inventory_posted=1', `inventory_posted=${autoOut.inventoryPosted || autoOut.inventory_posted}`);
  else s.pass('断言①：自动出库单已过账 inventory_posted=1', '');
  if ((autoOut.type || '') !== 'sale') s.fail('断言①：自动出库单类型应为 sale', `type=${autoOut.type}`);
  else s.pass('断言①：自动出库单类型=sale', '');

  // 断言②：出库过账产生库存流水，扣减量 = shipQty（验证「联动真的动了库存」）
  const txns = await G(`/api/inventory-transactions?docNo=${encodeURIComponent('XS-' + shipNo)}&pageSize=200`);
  const txnRows = txns.data?.data || [];
  const sumQtyDelta = rnd2(txnRows.reduce((a, t) => a + (Number(t.qtyDelta ?? t.qty_delta) || 0), 0));
  if (Math.abs(sumQtyDelta - (-shipQty)) < 0.01) s.pass('断言②：出库流水扣减量=发货量', `ΣqtyDelta=${sumQtyDelta} 期望=${-shipQty}`);
  else s.fail('断言②：出库流水扣减量与发货量不符', `ΣqtyDelta=${sumQtyDelta} 期望=${-shipQty}`);

  // 断言③：销售订单行 delivered_quantity 写回 = shipQty，表头同步
  const soList = await G(`/api/sales-orders?keyword=${encodeURIComponent(soNo)}&pageSize=100`);
  const soRows = soList.data?.data || [];
  const soReload = soRows.find((o) => (o.orderNo || o.order_no) === soNo);
  if (!soReload) { s.fail('断言③：未找到销售订单（订单号=' + soNo + '）', `检索到订单=${soRows.length}`); return; }
  const soItem = (soReload.items || []).find((it) => (it.materialCode || it.material_code) === matCode);
  if (!soItem) { s.fail('断言③：销售订单明细未找到匹配物料', matCode); return; }
  const delivItem = Number(soItem.deliveredQuantity ?? soItem.delivered_quantity ?? 0);
  if (Math.abs(delivItem - shipQty) < 0.01) s.pass('断言③：销售订单行已交数量写回=发货量', `delivered_quantity=${delivItem} 期望=${shipQty}`);
  else s.fail('断言③：销售订单行已交数量写回不符', `delivered_quantity=${delivItem} 期望=${shipQty}`);
  const delivHead = Number(soReload.deliveredQuantity ?? soReload.delivered_quantity ?? 0);
  if (Math.abs(delivHead - shipQty) < 0.01) s.pass('断言③：销售订单表头已交数量同步', `delivered_quantity=${delivHead}`);
  else s.fail('断言③：销售订单表头已交数量未同步', `delivered_quantity=${delivHead} 期望=${shipQty}`);

  // ════════════════════════════════════════════════════════════
  // 核心②：幂等 —— 再次 PUT shipped 不应重复建出库单 / 重复扣库存
  // ════════════════════════════════════════════════════════════
  const txnBeforeIdem = rnd2(((await G(`/api/inventory-transactions?docNo=${encodeURIComponent('XS-' + shipNo)}&pageSize=200`)).data?.data || []).reduce((a, t) => a + (Number(t.qtyDelta ?? t.qty_delta) || 0), 0));
  const put2 = await U(`/api/shipments/${shipId}`, { status: 'shipped' });
  s.expectStatus('核心②：重复 PUT shipped 返回 200', put2, 200,
    put2.status !== 200 ? JSON.stringify(put2.data).slice(0, 200) : '');
  const outList2 = await G(`/api/outbound-orders?keyword=${encodeURIComponent('XS-' + shipNo)}&pageSize=100`);
  const autoOuts2 = (outList2.data?.data || []).filter((o) => (o.sourceNo || o.source_no) === shipNo);
  if (autoOuts2.length === 1) s.pass('核心②：重复触发未重复建出库单', `出库单数=${autoOuts2.length}`);
  else s.fail('核心②：重复触发导致重复建出库单（幂等失效）', `出库单数=${autoOuts2.length}`);
  const txnAfterIdem = rnd2(((await G(`/api/inventory-transactions?docNo=${encodeURIComponent('XS-' + shipNo)}&pageSize=200`)).data?.data || []).reduce((a, t) => a + (Number(t.qtyDelta ?? t.qty_delta) || 0), 0));
  if (Math.abs(txnBeforeIdem - txnAfterIdem) < 0.01) s.pass('核心②：重复触发未重复扣库存', `ΣqtyDelta ${txnBeforeIdem}→${txnAfterIdem}`);
  else s.fail('核心②：重复触发重复扣库存', `ΣqtyDelta ${txnBeforeIdem}→${txnAfterIdem}`);
}
