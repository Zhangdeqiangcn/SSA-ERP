// 套件 44 · 业务域↔财务联动专项修复守护（V3.60.0）
// ------------------------------------------------------------------
// 目的：逐项坐实"采购/生产/销售/仓库 与 财务各表单联动"11 项缺陷的修复，
// 并对齐审计报告（docs/ssa-erp-domain-finance-linkage-audit.html）。
// 不依赖历史结论，全部打真实端点取证（隔离组织 + 自动清理 + 可复跑）。
//
// 覆盖：
//   P0-1  采购发票审核通过 → 借2201 冲暂估 / 贷2202 应付（此前零写入）
//   P0-2  付款实付增加     → 借2202 应付 / 贷1002 银行存款（此前零写入）
//   P0-3  销售开票         → 借1122 应收 / 贷6001 收入 / 贷2221 销项（纯前端→补权威凭证）
//   P0-4  合并报表         → 2202/1122/6001/1002/2221 不再恒为 0（由 P0-1/2/3 直接派生）
//   P1-1  库存调拨         → 不再错记销售成本凭证（6401/1405）（此前多记）
//   P1-3  折旧归集         → 生产用资产折旧进 5001 生产成本（此前全进 6602）
//   P2-1  自动凭证         → status 全部 posted（此前 draft）
//   P2-2  存货↔总账对账    → /api/finance/inventory-reconciliation 只读对账视图可用
//   P2-3  voucher_generated 标记位 → 发票/付款记账后真实回写（此前形同虚设）
//
// 复用既有范式：POST/PUT 后置非阻断记账（不影响主流程）；凭证借贷平衡由 writeVoucher 兜底。
export const meta = {
  id: '44-domain-finance-v360',
  title: '业务域↔财务联动专项修复守护（应收/应付/收入/存款/调拨/折旧/对账）',
};

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const token = ctx.admin.token;
  const stamp = runId || String(Date.now());
  const P = (p, body) => req('POST', p, { token, body });
  const G = (p) => req('GET', p, { token });
  const U = (p, body) => req('PUT', p, { token, body });
  const rnd2 = (n) => Math.round(n * 100) / 100;

  /** 在凭证列表里找指定 source+sourceNo 的凭证，并断言含某科目借贷 */
  const findVoucher = async (source, sourceNo) => {
    const list = await G(`/api/vouchers?source=${source}&pageSize=100`);
    const rows = list.data?.data || [];
    return rows.find((v) => (v.sourceNo || v.source_no) === sourceNo) || null;
  };
  const hasAccount = (v, code, side) => {
    if (!v) return false;
    const items = v.items || [];
    return items.some((it) =>
      String(it.account_code || it.accountCode) === code &&
      (side === 'debit' ? Number(it.debit || 0) > 0 : Number(it.credit || 0) > 0)
    );
  };

  // ════════════════════════════════════════════════════════════════
  // 前置公共：隔离组织的物料 + 仓库（供入库/调拨/折旧使用）
  // ════════════════════════════════════════════════════════════════
  const matCode = `M-V360-${stamp}`;
  const mat = await P('/api/materials', {
    code: matCode, name: '联动测试物料', specification: 'E2E-SPEC', unit: '件', materialType: 'raw',
    standardPrice: 100, price: 100, safetyStock: 0, status: 'active',
  });
  s.expectStatus('前置：创建物料 201', mat, 201, mat.status !== 201 ? JSON.stringify(mat.data).slice(0, 160) : '');
  const matId = mat.data?.id;
  if (matId) ctx.track('material', matId);
  if (!matId) { s.fail('前置：物料创建失败，后续无法进行'); return; }

  const wh = await P('/api/warehouses', { code: `WH-V360-${stamp}`, name: '联动仓', type: 'raw', status: 'active' });
  s.expectStatus('前置：创建仓库 201', wh, 201, wh.status !== 201 ? JSON.stringify(wh.data).slice(0, 160) : '');
  const whId = wh.data?.id;
  if (whId) ctx.track('warehouse', whId);
  if (!whId) { s.fail('前置：仓库创建失败，后续无法进行'); return; }

  // ════════════════════════════════════════════════════════════════
  // 共建一条合规采购链（供 P0-2 付款闸门放行 + P0-1 采购发票）
  // ════════════════════════════════════════════════════════════════
  const poNo = `PO-V360-${stamp}`;
  const po = await P('/api/purchase-orders', {
    orderNo: poNo, vendorId: 'vnd-v360', vendorName: '联动供应商', status: 'draft',
    orderDate: '2026-10-01', totalAmount: 10000,
    items: [{ materialCode: matCode, materialName: '联动测试物料', unit: '件', orderedQuantity: 100, unitPrice: 100, amount: 10000 }],
  });
  s.expectStatus('前置：采购订单 201', po, 201, po.status !== 201 ? JSON.stringify(po.data).slice(0, 160) : '');
  const poId = po.data?.id;
  if (poId) ctx.track('purchase-order', poId);
  // ★ 行锚点：行级三单比对靠 order_item_id 关联订单行（见 threeWayLineMatch.keyOf）。
  //   不传则入库/发票行算不出与订单行同一个键 → 累计入库恒 0 → 付款闸门误拦。
  const poItems = Array.isArray(po.data?.items) ? po.data.items : [];
  const poItem = poItems[0];

  // 入库单建单即 completed（真正过账，否则三单匹配的累计入库量为 0）
  const inbNo = `INB-V360-${stamp}`;
  const inb = await P('/api/inbound-orders', {
    inboundNo: inbNo, type: 'purchase', sourceNo: poNo, vendorId: 'vnd-v360', vendorName: '联动供应商',
    status: 'completed', warehouseId: whId, warehouseName: '联动仓', operator: '审计', inboundDate: '2026-10-02',
    items: [{
      materialId: matId, materialCode: matCode, materialName: '联动测试物料', unit: '件',
      expectedQuantity: 100, actualQuantity: 100, unitPrice: 100, amount: 10000,
      orderItemId: poItem?.id,
    }],
  });
  s.expectStatus('前置：入库单 201', inb, 201, inb.status !== 201 ? JSON.stringify(inb.data).slice(0, 160) : '');
  const inbId = inb.data?.id;
  if (inbId) ctx.track('inbound-order', inbId);

  // ════════════════════════════════════════════════════════════════
  // P0-1 + P2-3：采购发票审核通过 → 借2201/贷2202 + voucher_generated 回写
  // ════════════════════════════════════════════════════════════════
  const purInvNo = `INV-PUR-${stamp}`;
  const purInv = await P('/api/fin-invoices', {
    invoiceNo: purInvNo, invoiceType: 'vat_special', status: 'verified', vendorName: '联动供应商',
    purchaseOrderNo: poNo, invoiceDate: '2026-10-03', taxRate: 13,
    items: [{
      materialId: matId, materialCode: matCode, materialName: '联动测试物料', unit: '件',
      quantity: 100, unitPrice: 100, amount: 10000, taxRate: 13, taxAmount: 1300, totalAmount: 11300,
      orderItemId: poItem?.id,   // ★ 与入库行同一行锚点，行级比对才认得是对同一行
    }],
  });
  s.expectStatus('P0-1 前置：采购发票(verified) 201', purInv, 201, purInv.status !== 201 ? JSON.stringify(purInv.data).slice(0, 160) : '');
  const purInvId = purInv.data?.id;
  if (purInvId) ctx.track('finInvoice', purInvId);

  // P2-3：发票记账后应回写 voucher_generated=1（重读确认，非回显）
  const purInvRead = purInvId ? await G(`/api/fin-invoices/${purInvId}`) : { data: null };
  const genFlag = Number(purInvRead.data?.voucherGenerated ?? purInvRead.data?.voucher_generated ?? 0);
  if (genFlag === 1) s.pass('P2-3 采购发票记账后 voucher_generated=1（已回写）', '');
  else s.fail('P2-3 采购发票 voucher_generated 未回写', `voucherGenerated=${genFlag}`);

  // P0-1：应生成 source=invoice / sourceNo=INV-${purInvNo} 的凭证，含 借2201/贷2202
  const purV = await findVoucher('invoice', `INV-${purInvNo}`);
  if (!purV) { s.fail('P0-1 采购发票未生成凭证（合并报表应付恒为 0 的根因未消除）', `sourceNo=INV-${purInvNo}`); }
  else {
    ctx.track('voucher', purV.id);
    if (hasAccount(purV, '2201', 'debit')) s.pass('P0-1 凭证含 借2201 物资采购(冲暂估)', '');
    else s.fail('P0-1 凭证缺 借2201', JSON.stringify((purV.items || []).map((i) => i.account_code)));
    if (hasAccount(purV, '2202', 'credit')) s.pass('P0-1 凭证含 贷2202 应付账款', '');
    else s.fail('P0-1 凭证缺 贷2202', JSON.stringify((purV.items || []).map((i) => i.account_code)));
  }

  // ════════════════════════════════════════════════════════════════
  // P0-3：销售开票 → 借1122 应收 / 贷6001 收入 / 贷2221 销项
  //   （销售发票是独立前端实体，经 /api/finance/sales-invoice-voucher 补权威凭证）
  // ════════════════════════════════════════════════════════════════
  const saleInvNo = `INV-SALE-${stamp}`;
  const saleReq = await P('/api/finance/sales-invoice-voucher', {
    invoiceNo: saleInvNo, customerName: '联动客户', amount: 2000, taxAmount: 260, totalAmount: 2260, invoiceDate: '2026-10-04',
  });
  s.expectStatus('P0-3 销售开票入账 200', saleReq, 200, saleReq.status !== 200 ? JSON.stringify(saleReq.data).slice(0, 160) : '');
  const saleV = await findVoucher('sales-invoice', `INV-SALE-${saleInvNo}`);
  if (!saleV) { s.fail('P0-3 销售开票未生成凭证（合并报表应收/收入恒为 0 的根因未消除）', `sourceNo=INV-SALE-${saleInvNo}`); }
  else {
    ctx.track('voucher', saleV.id);
    if (hasAccount(saleV, '1122', 'debit')) s.pass('P0-3 凭证含 借1122 应收账款(价税合计)', '');
    else s.fail('P0-3 凭证缺 借1122', JSON.stringify((saleV.items || []).map((i) => i.account_code)));
    if (hasAccount(saleV, '6001', 'credit')) s.pass('P0-3 凭证含 贷6001 主营业务收入(净额)', '');
    else s.fail('P0-3 凭证缺 贷6001', JSON.stringify((saleV.items || []).map((i) => i.account_code)));
    if (hasAccount(saleV, '2221', 'credit')) s.pass('P0-3 凭证含 贷2221 销项税额', '');
    else s.fail('P0-3 凭证缺 贷2221', JSON.stringify((saleV.items || []).map((i) => i.account_code)));
  }

  // ════════════════════════════════════════════════════════════════
  // P0-2 + P2-3：付款实付增加 → 借2202 应付 / 贷1002 银行存款 + voucher_generated 回写
  // ════════════════════════════════════════════════════════════════
  const planNo = `PP-V360-${stamp}`;
  const planId = `plan-v360-${stamp}`;
  const plan = await P('/api/fin-payment-plans', {
    id: planId, planNo, paidAmount: 0, status: 'pending', dueDate: '2026-10-10',
    paymentMethod: 'transfer', currency: 'CNY', exchangeRate: 1,
    vendorId: 'vnd-v360', vendorName: '联动供应商',
    purchaseOrderNo: poNo, invoiceNo: purInvNo, totalAmount: 11300,
  });
  s.expectStatus('P0-2 前置：合规付款计划 201', plan, 201, plan.status !== 201 ? JSON.stringify(plan.data).slice(0, 160) : '');
  if (plan.status === 201) ctx.track('fin-payment-plan', planId);

  // 登记付款（实付 11300），命中付款闸门放行 → 触发记账
  const payReq = await U(`/api/fin-payment-plans/${planId}`, { purchaseOrderNo: poNo, invoiceNo: purInvNo, status: 'paid', paidAmount: 11300 });
  s.expectStatus('P0-2 登记付款 200（闸门放行）', payReq, 200, payReq.status !== 200 ? JSON.stringify(payReq.data).slice(0, 160) : '');

  // P2-3：付款记账后回写 voucher_generated=1
  const planRead = await G(`/api/fin-payment-plans/${planId}`);
  const payGen = Number(planRead.data?.voucherGenerated ?? planRead.data?.voucher_generated ?? 0);
  if (payGen === 1) s.pass('P2-3 付款记账后 voucher_generated=1', '');
  else s.fail('P2-3 付款 voucher_generated 未回写', `voucherGenerated=${payGen}`);

  // P0-2：应生成 source=payment / sourceNo=PAY-${planId}-11300 的凭证，含 借2202/贷1002
  const payV = await findVoucher('payment', `PAY-${planId}-11300`);
  if (!payV) { s.fail('P0-2 付款未生成凭证（合并报表银行存款/应付缺口未消除）', `sourceNo=PAY-${planId}-11300`); }
  else {
    ctx.track('voucher', payV.id);
    if (hasAccount(payV, '2202', 'debit')) s.pass('P0-2 凭证含 借2202 应付账款', '');
    else s.fail('P0-2 凭证缺 借2202', JSON.stringify((payV.items || []).map((i) => i.account_code)));
    if (hasAccount(payV, '1002', 'credit')) s.pass('P0-2 凭证含 贷1002 银行存款', '');
    else s.fail('P0-2 凭证缺 贷1002', JSON.stringify((payV.items || []).map((i) => i.account_code)));
  }

  // ════════════════════════════════════════════════════════════════
  // P1-1：库存调拨不应生成销售成本凭证（6401/1405）
  //   ★ 调拨必须走 /api/stock-transfers（审计缺陷即在此链路的 type='transfer' 分支），
  //     不能用 /api/outbound-orders——后者是销售出库口径、必填 customerId 会 400。
  //     建单 draft → PUT completed 才触发过账（与 35 号套件同范式）。
  // ════════════════════════════════════════════════════════════════
  const trfNo = `TF-V360-${stamp}`;
  const wh2 = await P('/api/warehouses', {
    code: `WH2-V360-${stamp}`.slice(0, 28), name: '联动仓B', type: 'warehouse', status: 'active', locations: [],
  });
  const wh2Id = wh2.data?.id;
  if (wh2Id) ctx.track('warehouse', wh2Id);
  const trfCreate = await P('/api/stock-transfers', {
    transferNo: trfNo, status: 'draft', transferDate: '2026-10-05',
    fromWarehouseId: whId, fromWarehouseName: '联动仓',
    toWarehouseId: wh2Id || whId, toWarehouseName: '联动仓B',
    items: [{ materialId: matId, materialCode: matCode, materialName: '联动测试物料', unit: '件', quantity: 10 }],
  });
  const trfId = trfCreate.data?.id;
  if (trfId) ctx.track('stock-transfer', trfId);
  const trfPost = trfId
    ? await U(`/api/stock-transfers/${trfId}`, { status: 'completed' })
    : { status: 0, data: { error: '建单失败无 id' } };
  s.expectTrue('P1-1 前置：调拨单建单并置完成（触发过账）',
    (trfCreate.status === 200 || trfCreate.status === 201) && (trfPost.status === 200 || trfPost.status === 201),
    `建单=${trfCreate.status} 过账=${trfPost.status} ${JSON.stringify(trfPost.data).slice(0, 160)}`);
  // 调拨分支 continue → 不产生 source=inventory 且 sourceNo=trfNo 的凭证
  const trfV = await findVoucher('inventory', trfNo);
  if (!trfV) s.pass('P1-1 调拨未生成销售成本凭证（6401/1405 不再被错记）', `无 sourceNo=${trfNo} 的 inventory 凭证`);
  else {
    const hit = hasAccount(trfV, '6401', 'debit') || hasAccount(trfV, '1405', 'credit');
    if (hit) s.fail('P1-1 调拨仍错记销售成本凭证', JSON.stringify((trfV.items || []).map((i) => i.account_code)));
    else s.pass('P1-1 调拨未错记成本凭证（仅有非成本类分录或无）', JSON.stringify((trfV.items || []).map((i) => i.account_code)));
  }

  // ════════════════════════════════════════════════════════════════
  // P1-3 + P2-1：生产用资产折旧 → 借5001 生产成本（且凭证 status=posted）
  // ════════════════════════════════════════════════════════════════
  const faCode = `FA-V360-${stamp}`;
  const fa = await P('/api/fixed-assets', {
    assetCode: faCode, assetName: '联动生产设备', category: '生产设备', originalValue: 120000, residualRate: 0.05,
    usefulLifeMonths: 120, monthlyDepreciation: 950, status: 'in_use', startDate: '2026-01-01',
  });
  s.expectStatus('P1-3 前置：创建生产用固定资产 201', fa, 201, fa.status !== 201 ? JSON.stringify(fa.data).slice(0, 160) : '');
  const faId = fa.data?.id;
  if (faId) ctx.track('fixed-asset', faId);

  const period = '2026-10';
  const depr = await P('/api/fixed-assets/depreciate', { period });
  s.expectStatus('P1-3 计提折旧 200', depr, 200, depr.status !== 200 ? JSON.stringify(depr.data).slice(0, 160) : '');

  const deprV = await findVoucher('asset', period);
  if (!deprV) { s.fail('P1-3 折旧未生成凭证', `sourceNo=${period}`); }
  else {
    ctx.track('voucher', deprV.id);
    if (hasAccount(deprV, '5001', 'debit')) s.pass('P1-3 折旧含 借5001 生产成本（生产用资产）', '');
    else s.fail('P1-3 折旧缺 借5001（仍全进 6602）', JSON.stringify((deprV.items || []).map((i) => i.account_code)));
    if (hasAccount(deprV, '6602', 'debit')) s.fail('P1-3 折旧误含 借6602 管理费用', '生产用资产不应进管理费用');
    else s.pass('P1-3 折旧未含 借6602（归集口径正确）', '');
    // P2-1：自动凭证应已 posted（非 draft）
    const st = String(deprV.status || deprV.voucherStatus || '');
    if (st === 'posted') s.pass('P2-1 折旧自动凭证 status=posted', '');
    else s.fail('P2-1 折旧凭证仍为 draft', `status=${st}`);
  }

  // ════════════════════════════════════════════════════════════════
  // P2-2：存货↔总账对账（只读视图可用）
  // ════════════════════════════════════════════════════════════════
  const recon = await G('/api/finance/inventory-reconciliation');
  s.expectStatus('P2-2 存货↔总账对账 200', recon, 200, recon.status !== 200 ? JSON.stringify(recon.data).slice(0, 160) : '');
  if (recon.status === 200) {
    const d = recon.data || {};
    const shapeOk = typeof d.materialStockValue === 'number' && d.inventoryLedger && typeof d.gap === 'number' && typeof d.reconciled === 'boolean';
    if (shapeOk) s.pass('P2-2 对账视图返回完整结构（materialStockValue/inventoryLedger/gap/reconciled）', `gap=${d.gap} reconciled=${d.reconciled}`);
    else s.fail('P2-2 对账视图结构缺失', JSON.stringify(d).slice(0, 160));
  }

  // ════════════════════════════════════════════════════════════════
  // P0-4：合并报表 now includes 2202/1122/6001/1002/2221（此前恒为 0）
  //   由 P0-1/2/3 直接派生 —— books 范围聚合本组织全部账簿凭证
  // ════════════════════════════════════════════════════════════════
  const consol = await req('POST', '/api/consolidation', { token, body: { scope: 'books', period } });
  s.expectStatus('P0-4 执行合并 201', consol, 201, consol.status !== 201 ? JSON.stringify(consol.data).slice(0, 160) : '');
  if (consol.status === 201) {
    const tb = consol.data?.trialBalance || [];
    const byCode = Object.fromEntries(tb.map((r) => [String(r.code), r]));
    for (const code of ['2202', '1122', '6001', '1002', '2221']) {
      if (byCode[code]) s.pass(`P0-4 合并报表已含科目 ${code}（不再恒为 0）`, `ending=${byCode[code].ending}`);
      else s.fail(`P0-4 合并报表缺科目 ${code}`, `codes=${tb.map((r) => r.code).join(',')}`);
    }
  }
}
