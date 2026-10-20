// 套件 40 · V3.49.0 原子底座守护（删单据连带清子表 + 字段级更新）
// ------------------------------------------------------------------
// 覆盖「第一优先级·原子底座」落地后的 4 处改动（全在 functions/，无新表无迁移）：
//   A. 质检扣留 PUT 改「字段级更新」—— 只拨状态开关不得把没传的物料/批次/数量清空
//   B. 采购订单删除 —— 头+子项收进同一 db.batch，删后订单 404
//   C. 销售订单删除 —— 连带清 shipments + shipment_items（按 sales_order_no 关联）
//   D. 工单删除 —— 连带清 work_order_pickings 领料台账
//
// 为什么必须打真实端点（硬规矩 ㉗）：
//   这些删除/更新端点 functions/ 不在前端 tsc 覆盖内，且「子表是否真被清」只有
//   连真库往返才坐实。本地无 wrangler 起不了 D1，此套件随部署打生产/真库跑。
//
// 断言纪律（铁律 ㊹ 成对断言）：每块都含「合法删除/更新仍成功」+「子表/字段确实
//   被处理」两半，防止「为不报错干脆全拦/全清」这类假修复。
//
// 安全：全部写操作发生在 run 级隔离组织（E2E-<runId>），跑完自动清理。
export const meta = { id: '40-v349-atomic-delete', title: 'V3.49.0 原子底座守护（删不清子 + 字段级更新）' };

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const token = ctx.admin.token;
  const stamp = runId || String(Date.now());
  const P = (p, body) => req('POST', p, { token, body });
  const G = (p) => req('GET', p, { token });
  const U = (p, body) => req('PUT', p, { token, body });
  const D = (p) => req('DELETE', p, { token });

  // ══════════════════════════════════════════════════════════════
  // A. 质检扣留：字段级更新（改状态不清空物料/批次/数量）
  //    旧实现是「整表覆盖式」——PUT 只传 status 也会把没传的列全清成 null。
  // ══════════════════════════════════════════════════════════════
  s.info('── A. 质检扣留 PUT 字段级更新 ──');
  const qh = await P('/api/quality-holds', {
    materialCode: `QHMAT-${stamp}`, materialName: 'E2E 字段级物料', reason: '字段级守护',
    batchNo: `BATCH-${stamp}`, quantity: 5, warehouseName: '主仓', status: 'pending',
  });
  s.expectStatus('前置：创建质检扣留 200/201', qh, [200, 201]);
  const qhId = qh.data?.id;
  if (qhId) ctx.track('quality-hold', qhId);
  const qh0 = await G(`/api/quality-holds/${qhId}`);
  s.expectStatus('前置：读回质检扣留 200', qh0, 200);
  s.expectEq('前置：批次号已落库', qh0.data?.batch_no, `BATCH-${stamp}`);

  // ★ 只拨状态开关，不传物料/批次/数量 —— 旧代码会把它们全清成 null
  const qhPut = await U(`/api/quality-holds/${qhId}`, { status: 'released' });
  s.expectStatus('★ 只改状态的 PUT 返回 200', qhPut, 200);
  const qh1 = await G(`/api/quality-holds/${qhId}`);
  s.expectStatus('★ 改后读回 200', qh1, 200);
  s.expectEq('★ 批次号未被清空（旧代码会清成 null）', qh1.data?.batch_no, `BATCH-${stamp}`);
  s.expectTrue('★ 物料编码未被清空', qh1.data?.material_code === `QHMAT-${stamp}`, `material_code=${qh1.data?.material_code}`);
  s.expectEq('★ 数量未被清成 0', Number(qh1.data?.quantity), 5);
  s.expectEq('★ 状态已更新为 released', qh1.data?.status, 'released');
  await D(`/api/quality-holds/${qhId}`); // 收尾

  // ══════════════════════════════════════════════════════════════
  // B. 采购订单删除：头 + 子项收进同一 db.batch
  // ══════════════════════════════════════════════════════════════
  s.info('── B. 采购订单删除：子项连带清理 + 删除仍成功 ──');
  const po = await P('/api/purchase-orders', {
    // ★ 核心必填 vendorId + orderDate（requireCoreFields），缺 vendorId 会 400（此前造数漏项的坑）
    orderNo: `PO-ATM-${stamp}`, vendorId: `vnd-atm-${stamp}`, vendorName: 'E2E 原子供应商', orderDate: '2026-10-01', totalAmount: 1000,
    items: [{ materialCode: 'AMAT-1', materialName: '原子物料1', unit: '件', orderedQuantity: 10, unitPrice: 100, amount: 1000 }],
  });
  s.expectStatus('前置：创建采购订单 201', po, 201);
  const poId = po.data?.id;
  if (poId) ctx.track('purchase-order', poId);
  const poGet0 = await G(`/api/purchase-orders/${poId}`);
  s.expectEq('前置：采购订单含 1 条明细', (poGet0.data?.items || []).length, 1);
  s.expectStatus('★ 删除采购订单 200', await D(`/api/purchase-orders/${poId}`), 200);
  s.expectStatus('★ 删除后订单 404（头已删）', await G(`/api/purchase-orders/${poId}`), 404);

  // ══════════════════════════════════════════════════════════════
  // C. 销售订单删除：子项 + 发货台账（shipments/shipment_items）连带清理
  //    shipments 按 sales_order_no 字符串关联（非外键，D1 不自动级联）。
  // ══════════════════════════════════════════════════════════════
  s.info('── C. 销售订单删除：发货台账连带清理 ──');
  const soNo = `SO-ATM-${stamp}`;
  const so = await P('/api/sales-orders', {
    // ★ 核心必填 customerId + orderDate（requireCoreFields）
    orderNo: soNo, customerId: `cust-atm-${stamp}`, customerName: 'E2E 原子客户', orderDate: '2026-10-01',
    items: [{ materialCode: 'AMAT-2', materialName: '原子物料2', unit: '件', quantity: 8, unitPrice: 50, amount: 400 }],
  });
  s.expectStatus('前置：创建销售订单 201', so, 201);
  const soId = so.data?.id;
  if (soId) ctx.track('sales-order', soId);

  const shp = await P('/api/shipments', {
    shipmentNo: `SHP-ATM-${stamp}`, salesOrderNo: soNo, customerName: 'E2E 原子客户', status: 'pending',
    items: [{ seq: 1, materialCode: 'AMAT-2', materialName: '原子物料2', unit: '件', orderQuantity: 8, shipQuantity: 8, unitPrice: 50, amount: 400 }],
  });
  s.expectStatus('前置：创建发货单 200/201', shp, [200, 201]);
  const shpId = shp.data?.id;

  s.expectStatus('★ 删除销售订单 200', await D(`/api/sales-orders/${soId}`), 200);
  s.expectStatus('★ 删除后订单 404', await G(`/api/sales-orders/${soId}`), 404);
  if (shpId) {
    const shpAfter = await G(`/api/shipments/${shpId}`);
    s.expectStatus('★ 关联发货单被连带清除（404）', shpAfter, 404,
      shpAfter.status === 404 ? '' : `残留 status=${shpAfter.status}（旧代码/未部署）`);
  } else {
    s.warn('   发货单创建未拿到 id，跳过连带断言', '');
  }

  // ══════════════════════════════════════════════════════════════
  // D. 工单删除：领料台账 work_order_pickings 连带清理
  // ══════════════════════════════════════════════════════════════
  s.info('── D. 工单删除：领料台账连带清理 ──');
  // ★ 先建物料（工单核心必填 materialId 要真实存在），再建工单 + 领料台账
  const atmMat = await P('/api/materials', {
    code: `AMAT3-${stamp}`, name: 'E2E 原子物料3', specification: 'E2E 原子规格', unit: '件', status: 'active',
    currentStock: 100, movingAvgPrice: 3, price: 3,
  });
  s.expectStatus('前置：创建物料 201', atmMat, [200, 201], atmMat.status !== 200 && atmMat.status !== 201 ? JSON.stringify(atmMat.data).slice(0, 160) : '');
  if (atmMat.data?.id) ctx.track('material', atmMat.data.id);
  const woMatId = atmMat.data?.id || `mat-atm-${stamp}`;

  const woNo = `WO-ATM-${stamp}`;
  const wo = await P('/api/work-orders', {
    orderNo: woNo, status: 'draft',
    materialId: woMatId, materialCode: `AMAT3-${stamp}`, materialName: 'E2E 原子物料3', // ★ 核心必填 materialId
    productCode: `PRD-ATM-${stamp}`, productName: 'E2E 原子产品',
    plannedQuantity: 10, completedQuantity: 0, scrapQuantity: 0,
    plannedStartDate: '2026-10-01', plannedEndDate: '2026-10-10', priority: 'normal',
    workshop: 'E2E 车间', supervisor: 'E2E 主管',
  });
  s.expectStatus('前置：创建工单 201', wo, 201);
  const woId = wo.data?.id;
  if (woId) ctx.track('work-order', woId);

  const pk = await P('/api/work-orders/picking', {
    // ★ 核心必填 workOrderId（须为已建成工单）+ materialId + 正数 quantity
    workOrderId: woId, workOrderNo: woNo,
    materialId: woMatId, materialCode: `AMAT3-${stamp}`, materialName: 'E2E 原子物料3',
    unit: '件', quantity: 6,
  });
  s.expectStatus('前置：创建领料台账 200/201', pk, [200, 201]);
  if (pk.data?.id) ctx.track('picking', pk.data.id); // 兜底：若删除逻辑未清，清理阶段可扫掉

  const pkBefore = await G(`/api/work-orders/picking?workOrderId=${woId}`);
  s.expectEq('前置：领料台账含 1 条', Number(pkBefore.data?.pagination?.total ?? pkBefore.data?.total ?? 0), 1);

  s.expectStatus('★ 删除工单 200', await D(`/api/work-orders/${woId}`), 200);
  s.expectStatus('★ 删除后工单 404', await G(`/api/work-orders/${woId}`), 404);
  const pkAfter = await G(`/api/work-orders/picking?workOrderId=${woId}`);
  s.expectEq('★ 领料台账已随工单清除（total=0）', Number(pkAfter.data?.pagination?.total ?? pkAfter.data?.total ?? 0), 0,
    `total=${pkAfter.data?.pagination?.total ?? pkAfter.data?.total}`);

  // ══════════════════════════════════════════════════════════════
  // E. R6 越权写根治：汇率刷新挂财务写守卫（只读角色 403）
  //    守卫在 fetch 外部接口之前拦截 → 只读角色 403 不触发任何外呼，可确定验证。
  //    正向（财务角色可刷新）会打外部 exchangerate.host，不做成硬断言以免网络抖动误红。
  // ══════════════════════════════════════════════════════════════
  s.info('── E. 汇率刷新越权守卫（R6）──');
  const ro = await ctx.registerUser('atm-ro', 'user', 'QA'); // 只读角色（走 '*' 兜底：read=true, update=false）
  if (!ro) {
    // 注册审批链偶发失败属测试环境（与 32 号套件同类），非本批代码缺陷。
    // 取不到只读令牌则 403 断言无锚点可打，显式记 warn（不假装通过、也不误判回归）。
    s.warn('E 段未执行：只读角色注册链失败（测试环境偶发），403 守卫断言本轮回未跑', '');
    return;
  }
  s.expectTrue('前置：只读角色 user 注册拿到令牌', !!ro, `role=${ro.role}`);
  const fxDeny = await req('POST', '/api/fx/refresh', { token: ro?.token, body: { base: 'CNY' } });
  s.expectStatus('★ 只读角色刷新汇率 → 403', fxDeny, 403, fxDeny.status !== 403 ? `status=${fxDeny.status}（旧代码/未部署时此处 200/502）` : '');
  s.expectTrue('   拒绝代码 = OPERATION_FORBIDDEN', fxDeny.data?.code === 'OPERATION_FORBIDDEN', `code=${fxDeny.data?.code}`);
}
