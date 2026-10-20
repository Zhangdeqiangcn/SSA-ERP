// 套件 42 · 销售出库 → COGS 对账（W8 整改守护）
// ------------------------------------------------------------------
// 目的（W8 审计发现）：销售出库过账后，账面「库存流水 value_delta」与「COGS 凭证
//   借方 6401 主营业务成本 / 贷方 1405 库存商品」之间**没有任何守护套件对账**——
//   两套账各写各的，一旦某一侧算错（成本取错、漏结转、金额漂移），
//   库存与损益就会长期背离而无人发现。本套件打真实生产接口做三处闭环对账：
//
//   等式：Σ|出库流水 value_delta| == 6401 借方合计 == 1405 贷方合计 == 服务端 unitCost×qty
//
//   全程隔离组织（E2E-<runId>）+ track 自动清理 + 可复跑。不依赖历史结论。
export const meta = {
  id: '42-sales-cogs-reconciliation',
  title: '销售出库 COGS 对账（流水 value_delta ↔ 6401/1405 凭证借贷）',
};

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const token = ctx.admin.token;
  const P = (p, body) => req('POST', p, { token, body });
  const G = (p) => req('GET', p, { token });
  const rnd2 = (n) => Math.round(n * 100) / 100;

  const matCode = `M-COGS-${runId}`;
  const matName = 'COGS对账物料';
  const unitCost = 100;   // 入库单价 → 服务端 unitCost 应为 100
  const inQty = 10;
  const outQty = 3;
  const expectCost = rnd2(unitCost * outQty); // 期望 COGS = 300

  // ════════════════════════════════════════════════════════════
  // 前置①：建物料主数据（带标准价，供 unitCost 回滚取数）
  // ════════════════════════════════════════════════════════════
  const mat = await P('/api/materials', {
    code: matCode,
    name: matName,
    specification: 'E2E-SPEC',
    unit: '件',
    materialType: 'raw',
    standardPrice: unitCost,
    price: unitCost,
    safetyStock: 0,
    status: 'active',
  });
  s.expectStatus('前置①：创建物料返回 201', mat, 201,
    mat.status !== 201 ? JSON.stringify(mat.data).slice(0, 160) : '');
  const matId = mat.data?.id;
  if (matId) ctx.track('material', matId);

  if (!matId) {
    s.fail('前置①：物料创建失败，后续 COGS 对账无法进行（锚点缺失=失败）');
    return;
  }

  // ════════════════════════════════════════════════════════════
  // 前置②：采购入库并过账（建立成本基础：unitCost=100）
  // ════════════════════════════════════════════════════════════
  const inbNo = `IN-COGS-${runId}`;
  const inb = await P('/api/inbound-orders', {
    inboundNo: inbNo,
    type: 'purchase',
    sourceNo: `PO-COGS-${runId}`,
    vendorId: 'vnd-cogs',
    vendorName: 'COGS供应商',
    status: 'completed',           // ★ 建单即过账
    warehouseId: 'wh-001',
    warehouseName: '主仓',
    operator: '审计',
    inboundDate: '2026-10-05',
    items: [{
      materialId: matId,
      materialCode: matCode,
      materialName: matName,
      unit: '件',
      expectedQuantity: inQty,
      actualQuantity: inQty,
      unitPrice: unitCost,          // ★ 单价 → 移动平均价 = 100
      amount: rnd2(unitCost * inQty),
    }],
  });
  s.expectStatus('前置②：入库过账返回 201', inb, 201,
    inb.status !== 201 ? JSON.stringify(inb.data).slice(0, 160) : '');
  const inbId = inb.data?.id;
  if (inbId) ctx.track('inbound-order', inbId);

  // ════════════════════════════════════════════════════════════
  // 前置③：销售出库并过账（type='sale' 走 6401/1405 分支）
  // ════════════════════════════════════════════════════════════
  const outNo = `OUT-COGS-${runId}`;
  const out = await P('/api/outbound-orders', {
    outboundNo: outNo,
    type: 'sale',
    sourceNo: `SO-COGS-${runId}`,
    customerId: 'cus-cogs',
    customerName: 'COGS客户',
    status: 'completed',           // ★ 建单即过账（触发 postOutbound + COGS 凭证）
    warehouseId: 'wh-001',
    warehouseName: '主仓',
    operator: '审计',
    outboundDate: '2026-10-06',
    items: [{
      materialId: matId,
      materialCode: matCode,
      materialName: matName,
      unit: '件',
      quantity: outQty,
      unitPrice: 150,               // 售价（与成本无关，仅用于区分收入/成本）
    }],
  });
  s.expectStatus('前置③：销售出库过账返回 200', out, 200,
    out.status !== 200 ? JSON.stringify(out.data).slice(0, 160) : '');
  const outId = out.data?.id;
  if (outId) ctx.track('outbound-order', outId);

  if (!outId) {
    s.fail('前置③：出库单创建失败，后续 COGS 对账无法进行（锚点缺失=失败）');
    return;
  }

  // 过账失败的信号必须暴露（R4 留痕口径）：不能「账扣了但凭证没生成」还报成功
  if (out.data?.voucherIssues && out.data.voucherIssues.length > 0) {
    s.fail('前置③：出库过账回报 voucherIssues（凭证生成失败）', out.data.voucherIssues.join('; '));
  } else {
    s.pass('前置③：出库过账无 voucherIssues（凭证生成未被留痕告警）', '');
  }

  // ════════════════════════════════════════════════════════════
  // 对账①：出库流水 value_delta（带符号，出库为负）
  // ════════════════════════════════════════════════════════════
  const txns = await G(`/api/inventory-transactions?docNo=${encodeURIComponent(outNo)}&pageSize=200`);
  const txnRows = txns.data?.data || [];
  const outTxns = txnRows.filter((t) => Number(t.qtyDelta) < 0 || Number(t.qty_delta) < 0);
  // value_delta 带符号，出库为负；取绝对值求和
  const sumAbsValueDelta = rnd2(
    txnRows.reduce((a, t) => a + Math.abs(Number(t.valueDelta ?? t.value_delta) || 0), 0)
  );
  if (txnRows.length > 0) {
    s.pass('对账①：出库单已写入库存流水', `docNo=${outNo} 流水行=${txnRows.length} 出库行=${outTxns.length}`);
  } else {
    s.fail('对账①：出库单在 inventory_transactions 无流水（过账未落账）', `docNo=${outNo}`);
  }

  // ════════════════════════════════════════════════════════════
  // 对账②：COGS 凭证（source_no = 出库单号）取 6401/1405 借贷
  // ════════════════════════════════════════════════════════════
  // 凭证端点按 sourceNo 查（voucherNo = OUT-{出库单号}）
  const vlist = await G(`/api/vouchers?pageSize=200&keyword=${encodeURIComponent(outNo)}`);
  const vouchers = vlist.data?.data || [];
  const cogsV = vouchers.find((v) => String(v.voucherNo || v.voucher_no || '').startsWith('OUT-')
    && String(v.sourceNo || v.source_no || '') === outNo);

  if (!cogsV) {
    s.fail('对账②：未找到出库对应的 COGS 凭证（source_no=' + outNo + '）',
      `voucherNo 应为 OUT-${outNo}；检索到凭证=${vouchers.length}`);
    // 锚点缺失 → 剩余断言无法执行，明确记 FAIL 后返回
    return;
  }
  s.pass('对账②：找到出库 COGS 凭证', `voucherNo=${cogsV.voucherNo || cogsV.voucher_no}`);

  // 取凭证分录（6401 借方 / 1405 贷方）
  const vId = cogsV.id;
  const vDetail = await G(`/api/vouchers/${vId}`);
  const vItems = vDetail.data?.items || vDetail.data?.voucherItems || [];
  const sum6401Debit = rnd2(vItems
    .filter((it) => String(it.accountCode || it.account_code || '') === '6401')
    .reduce((a, it) => a + (Number(it.debit) || 0), 0));
  const sum1405Credit = rnd2(vItems
    .filter((it) => String(it.accountCode || it.account_code || '') === '1405')
    .reduce((a, it) => a + (Number(it.credit) || 0), 0));

  // 借贷平衡自检（记账基本恒等式）
  const totDebit = rnd2(vItems.reduce((a, it) => a + (Number(it.debit) || 0), 0));
  const totCredit = rnd2(vItems.reduce((a, it) => a + (Number(it.credit) || 0), 0));
  if (totDebit === totCredit && totDebit > 0) {
    s.pass('对账②：COGS 凭证借贷平衡', `借=${totDebit} 贷=${totCredit}`);
  } else {
    s.fail('对账②：COGS 凭证借贷不平衡', `借=${totDebit} 贷=${totCredit}`);
  }

  // ════════════════════════════════════════════════════════════
  // 对账③：三处闭环 —— 流水 value_delta ↔ 6401借 ↔ 1405贷
  // ════════════════════════════════════════════════════════════
  const detail = `期望=${expectCost} 流水Σ|vdelta|=${sumAbsValueDelta} 6401借=${sum6401Debit} 1405贷=${sum1405Credit}`;

  if (Math.abs(sumAbsValueDelta - expectCost) < 0.01) {
    s.pass('对账③：流水 value_delta 与服务端成本一致', detail);
  } else {
    s.fail('对账③：流水 value_delta 与 unitCost×qty 不符', detail);
  }

  if (Math.abs(sum6401Debit - sumAbsValueDelta) < 0.01) {
    s.pass('对账③：6401 主营业务成本借方 = 流水 value_delta（两账对齐）', detail);
  } else {
    s.fail('对账③：6401 借方 ≠ 流水 value_delta（库存与损益背离）', detail);
  }

  if (Math.abs(sum1405Credit - sumAbsValueDelta) < 0.01) {
    s.pass('对账③：1405 库存商品贷方 = 流水 value_delta（两账对齐）', detail);
  } else {
    s.fail('对账③：1405 贷方 ≠ 流水 value_delta（库存与损益背离）', detail);
  }
}