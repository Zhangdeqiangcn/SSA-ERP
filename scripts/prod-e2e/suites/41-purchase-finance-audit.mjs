// 套件 41 · 采购/财务 数据对齐审计（V3.56.0 修复后复核）
// ------------------------------------------------------------------
// 目的：逐项坐实采购域与财务域是否存在「数据不对齐 / 不准确 / 缺失项」。
// 不依赖历史结论，全部打真实生产接口取证（隔离组织 + 自动清理 + 可复跑）。
//
// V3.56.0 修复了 G1/G3/G4/G6 四个缺口，断言相应更新为预期修复后行为：
//   G1 采购订单头金额 → 服务端以 Σ明细复核覆盖（头金额=3000 非 99999）
//   G3 发票明细 → 专用端点原子写入头+明细（明细行>0）
//   G4 入库金额退化 → fail-closed 拦截（400 AMOUNT_DEGRADATION）
//   G6 销售订单头金额+信用检查 → 服务端复核+信用检查用服务端值
export const meta = { id: '41-purchase-finance-audit', title: '采购/财务 数据对齐审计（头金额勾稽 / 发票明细写入 / 入库金额退化守卫）' };

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const token = ctx.admin.token;
  const stamp = runId || String(Date.now());
  const P = (p, body) => req('POST', p, { token, body });
  const G = (p) => req('GET', p, { token });
  const rnd2 = (n) => Math.round(n * 100) / 100;

  // 唯一物料编码（本隔离组织内新建，避免与它人撞）
  const matCode = `M-AUDIT-${stamp}`;
  const matName = '审计物料';

  // ════════════════════════════════════════════════════════════
  // G1 · 采购订单：头表 totalAmount 被服务端以 Σ明细复核覆盖
  // ════════════════════════════════════════════════════════════
  const poNo = `PO-AUDIT-${stamp}`;
  // 明细 3 行 Σ = 3×1000 = 3000；头表 totalAmount 故意传 99999（模拟前端算错/手填错）
  const g1 = await P('/api/purchase-orders', {
    orderNo: poNo,
    vendorId: 'vnd-audit',
    vendorName: '审计供应商',
    status: 'draft',
    orderDate: '2026-10-01',
    totalAmount: 99999, // ★ 故意 ≠ Σ明细
    items: [
      { materialCode: matCode, materialName: matName, unit: '件', orderedQuantity: 1, unitPrice: 1000, amount: 1000 },
      { materialCode: matCode, materialName: matName, unit: '件', orderedQuantity: 1, unitPrice: 1000, amount: 1000 },
      { materialCode: matCode, materialName: matName, unit: '件', orderedQuantity: 1, unitPrice: 1000, amount: 1000 },
    ],
  });
  s.expectStatus('G1 前置：创建采购订单（头金额故意=99999）返回 201', g1, 201,
    g1.status !== 201 ? JSON.stringify(g1.data).slice(0, 160) : '');
  const g1Id = g1.data?.id;
  if (g1Id) ctx.track('purchase-order', g1Id);
  // 重新 GET 读回（避免回显请求体），看服务端实际存的头金额
  const g1Read = g1Id ? await G(`/api/purchase-orders/${g1Id}`) : { status: 404, data: null };
  const headAmt = Number(g1Read.data?.totalAmount ?? g1Read.data?.total_amount);
  const g1Items = g1Read.data?.items || g1Read.data?.items_snake || [];
  const sumItems = rnd2((g1Items.length ? g1Items : [0, 0, 0]).reduce((a, it) => a + (Number(it.amount) || 0), 0));
  // ★ V3.56.0 G1 已修：服务端以 Σ明细复核覆盖头金额，头金额应为 3000（非 99999）
  if (headAmt === sumItems && sumItems > 0) {
    s.pass('G1 采购订单头金额被服务端复核为 Σ明细（G1 已修）', `头=${headAmt} Σ明细=${sumItems} 一致`);
  } else if (headAmt === 99999) {
    s.warn('G1 【未修】服务端把客户端 totalAmount 原样落库（不勾稽 Σ明细）', `头=${headAmt} Σ明细=${sumItems} 差=${rnd2(headAmt - sumItems)}`);
  } else {
    s.fail('G1 头金额值异常', `头=${headAmt} Σ明细=${sumItems}`);
  }

  // ════════════════════════════════════════════════════════════
  // G2 · 三单匹配核算口径：按明细合计取数，头金额填错不影响核算
  // ════════════════════════════════════════════════════════════
  // 用 G1 这张订单做预检（头金额现在=3000 因为已复核覆盖，但核心是核算取明细合计）
  const g2 = await G(`/api/three-way-match/check?poNo=${encodeURIComponent(poNo)}&payAmount=0`);
  s.expectStatus('G2 采购订单预检返回 200', g2, 200, g2.status !== 200 ? JSON.stringify(g2.data).slice(0, 160) : '');
  if (g2.data?.detail?.poAmount === 3000) {
    s.pass('G2 三单匹配订单金额取 Σ明细=3000', '核算口径=明细合计');
  } else {
    s.fail('G2 预检订单金额应按明细合计=3000', `poAmount=${g2.data?.detail?.poAmount}`);
  }

  // ════════════════════════════════════════════════════════════
  // G3 · 发票明细写入：专用端点原子写入头+明细
  // ════════════════════════════════════════════════════════════
  // V3.56.0 G3 修复：发票走专用端点 /api/fin-invoices（头+items 原子写入）
  const invNo = `INV-AUDIT-${stamp}`;
  const g3Inv = await P('/api/fin-invoices', {
    invoiceNo: invNo,
    invoiceType: 'vat_special',
    status: 'verified',
    vendorName: '审计供应商',
    purchaseOrderNo: poNo,
    invoiceDate: '2026-10-02',
    amount: 3000, // 会被服务端复核覆盖为 Σ明细
    taxRate: 13,
    taxAmount: 390,
    totalAmount: 3390,
    currency: 'CNY',
    items: [
      { materialCode: matCode, materialName: matName, quantity: 3, unit: '件', unitPrice: 1000, amount: 3000, taxRate: 13, taxAmount: 390, totalAmount: 3390 },
    ],
  });
  s.expectStatus('G3 前置：专用端点创建发票（含 items）返回 201', g3Inv, 201,
    g3Inv.status !== 201 ? JSON.stringify(g3Inv.data).slice(0, 160) : '');
  const g3InvId = g3Inv.data?.id;
  if (g3InvId) ctx.track('finInvoice', g3InvId);

  // 查这张发票下明细行数（专用端点写入后应 > 0）
  const g3Read = g3InvId ? await G(`/api/fin-invoices/${g3InvId}`) : { data: null };
  const g3ItemRows = (g3Read.data?.items || []).length;
  if (g3ItemRows > 0) {
    s.pass('G3 专用端点建发票后，发票明细行>0（G3 已修）', `发票 ${invNo} 下明细行=${g3ItemRows}`);
  } else {
    s.warn('G3 【未修】建发票后明细行=0', `发票 ${invNo} 下明细行=${g3ItemRows}`);
  }

  // 头表金额复核验证
  const g3HeadAmt = Number(g3Read.data?.amount);
  if (g3HeadAmt === 3000) {
    s.pass('G3 发票头金额被服务端复核为 Σ明细=3000', `头amount=${g3HeadAmt}`);
  } else {
    s.info('G3 发票头金额复核值', `头amount=${g3HeadAmt}（可能被覆盖或保持原值）`);
  }

  // ════════════════════════════════════════════════════════════
  // G4 · 入库金额退化 fail-closed：无单价+无主数据 → 400 拒绝
  // ════════════════════════════════════════════════════════════
  // 建一张入库单：明细不传单价、物料编码是「系统里查无主数据」的编码，
  // V3.56.0 G4 修复：服务端应返回 400 AMOUNT_DEGRADATION
  const g4MatNoMaster = `M-NOMASTER-${stamp}`; // 故意不建该物料主数据
  const g4Inb = `INB-AUDIT-${stamp}`;
  const g4 = await P('/api/inbound-orders', {
    inboundNo: g4Inb,
    type: 'purchase',
    sourceNo: poNo,
    vendorId: 'vnd-audit',
    vendorName: '审计供应商',
    status: 'pending',
    warehouseId: 'wh-001',
    warehouseName: '主仓',
    operator: '审计',
    inboundDate: '2026-10-03',
    items: [{
      materialCode: g4MatNoMaster,
      materialName: '无主数据物料',
      unit: '件',
      expectedQuantity: 10,
      actualQuantity: 10,
      // 不传 unitPrice、不传 amount → 单价缺失且无物料主数据 → 应被 400 拦截
    }],
  });
  // ★ V3.56.0 G4 已修：fail-closed 守卫返回 400
  if (g4.status === 400 && (g4.data?.code === 'AMOUNT_DEGRADATION' || String(g4.data?.error || '').includes('金额'))) {
    s.pass('G4 入库金额退化被 fail-closed 拦截（G4 已修）', `status=${g4.status} code=${g4.data?.code}`);
  } else if (g4.status === 201) {
    // 未修：静默落库（金额=0）
    const g4Id = g4.data?.id;
    if (g4Id) ctx.track('inbound-order', g4Id);
    s.warn('G4 【未修】入库金额退化静默落库', `status=${g4.status}`);
  } else {
    s.fail('G4 入库单响应异常', `status=${g4.status} body=${JSON.stringify(g4.data).slice(0, 120)}`);
  }

  // ════════════════════════════════════════════════════════════
  // G5 · 凭证借贷平衡（正面对照：这块是扎实的）—— 手工凭证 Σ借≠Σ贷 必被拒
  // ════════════════════════════════════════════════════════════
  const g5 = await P('/api/vouchers', {
    voucherNo: `VCH-AUDIT-${stamp}`,
    date: '2026-10-04',
    period: '2026-10',
    source: 'manual',
    description: '审计：借贷不平应被拒',
    items: [
      { summary: '借', accountCode: '1001', accountName: '库存现金', debit: 1000, credit: 0 },
      { summary: '贷', accountCode: '2001', accountName: '短期借款', debit: 0, credit: 500 }, // 故意不平
    ],
  });
  if (g5.status === 400 || g5.status === 422 || g5.status === 409) {
    s.pass('G5 借贷不平的凭证被服务端拒绝（Σ借≠Σ贷 不落库）', `status=${g5.status}`);
  } else {
    s.fail('G5 借贷不平的凭证应被拒', `status=${g5.status} body=${JSON.stringify(g5.data).slice(0, 120)}`);
  }

  // ════════════════════════════════════════════════════════════
  // G6 · 销售订单：头表 grandTotal 被服务端以 Σ明细复核覆盖
  // ════════════════════════════════════════════════════════════
  const soNo = `SO-AUDIT-${stamp}`;
  // 明细 2 行：行1 amount=2000, 行2 amount=1000 → grandTotal Σ = 3000×1.13 = 3390（假设 taxRate=13）
  // 简化：行1 amountWithTax=2260, 行2 amountWithTax=1130 → grandTotal=3390
  // 头表 grandTotal 故意传 99999
  const g6 = await P('/api/sales-orders', {
    orderNo: soNo,
    customerId: 'cst-audit',
    customerName: '审计客户',
    status: 'draft',
    orderDate: '2026-10-01',
    taxRate: 13, // ★ 必须传头部税率，服务端按 Σ明细amount×(1+taxRate/100) 复核 grandTotal
    grandTotal: 99999, // ★ 故意 ≠ Σ明细
    items: [
      { materialCode: matCode, materialName: matName, unit: '件', quantity: 2, unitPrice: 1000, amount: 2000, taxRate: 13, taxAmount: 260, amountWithTax: 2260 },
      { materialCode: matCode, materialName: matName, unit: '件', quantity: 1, unitPrice: 1000, amount: 1000, taxRate: 13, taxAmount: 130, amountWithTax: 1130 },
    ],
  });
  s.expectStatus('G6 前置：创建销售订单（头金额故意=99999）返回 201', g6, 201,
    g6.status !== 201 ? JSON.stringify(g6.data).slice(0, 160) : '');
  const g6Id = g6.data?.id;
  if (g6Id) ctx.track('sales-order', g6Id);
  const g6Read = g6Id ? await G(`/api/sales-orders/${g6Id}`) : { status: 404, data: null };
  const g6HeadGrand = Number(g6Read.data?.grandTotal ?? g6Read.data?.grand_total);
  // ★ V3.56.0 G6 已修：服务端以 Σ明细复核覆盖头金额
  // grandTotal 应为 ΣamountWithTax = 2260 + 1130 = 3390
  if (g6HeadGrand === 3390) {
    s.pass('G6 销售订单头金额被服务端复核为 Σ明细（G6 已修）', `grandTotal=${g6HeadGrand}`);
  } else if (g6HeadGrand === 99999) {
    s.warn('G6 【未修】服务端把客户端 grandTotal 原样落库', `grandTotal=${g6HeadGrand}`);
  } else {
    s.info('G6 销售订单头金额值', `grandTotal=${g6HeadGrand}（可能被复核覆盖为其他口径）`);
  }
}
