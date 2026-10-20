/**
 * 第 39 号套件：序列号治理 + 三单匹配行级化 的生产守护
 *
 * 覆盖 V3.47.0 第3批 3-05：
 *  A. 序列号出库校验：已发货/已报废/串号的序列号不能再出库（原先无任何校验，
 *     一台设备可"发货两次"，台账与实物彻底脱节）；状态值统一为前端枚举认得的
 *     shipped（原写 out_stock，前端类型里根本没这个值）
 *  B. 三单匹配行级：能识破「金额自洽但某一行既没到货也没开票」的蒙混过关
 *
 * 成对断言（防假修复）：非法序列号被拦 + 合法序列号照常出库；
 * 行级不通过被拦 + 行级齐备时放行。
 */
export const meta = {
  id: '39-v347-serial-line',
  title: '序列号出库校验 + 三单匹配行级比对',
};

export default async function run(ctx, s) {
  const { req } = ctx;
  const admin = ctx.admin.token;
  const stamp = String(Date.now());

  // ═══ A. 序列号出库校验 ═══
  s.info('── A. 序列号出库校验（状态与物料）──');

  // A0. 建物料并入库一个序列号（走正常入库过账，序列号主档应自动建成 in_stock）
  const matSn = `MAT-SN-${stamp}`;
  const matCreate = await req('POST', '/api/materials', {
    token: admin,
    body: {
      id: `mat-sn-${stamp}`, code: matSn, name: '序列号守护物料',
      unit: '个', specification: 'SN-E2E', price: 100, currentStock: 0, safetyStock: 0,
    },
  });
  s.expectTrue('★ A0 建物料', matCreate.status === 200 || matCreate.status === 201,
    `status=${matCreate.status} ${JSON.stringify(matCreate.data).slice(0, 160)}`);
  if (matCreate.data?.id) ctx.track('material', matCreate.data.id);

  const sn1 = `SN-E2E-${stamp}-1`;
  const inNo = `IN-SN-${stamp}`;
  const inbound = await req('POST', '/api/inbound-orders', {
    token: admin,
    body: {
      inboundNo: inNo, type: 'purchase', sourceNo: `PO-SN-${stamp}`,
      vendorId: 'vnd-e2e', vendorName: '序列号守护供应商',
      status: 'completed', inboundDate: '2026-07-01',
      warehouseId: 'wh-e2e', warehouseName: '主仓', operator: 'E2E',
      items: [{
        materialId: `mat-sn-${stamp}`, materialCode: matSn, materialName: '序列号守护物料',
        unit: '个', expectedQuantity: 10, actualQuantity: 10,
        unitPrice: 100, amount: 1000,
        serialNos: [sn1],
      }],
    },
  });
  s.expectStatus('★ A0b 入库 10 件带 1 个序列号 201', inbound, 201,
    inbound.status !== 201 ? JSON.stringify(inbound.data).slice(0, 200) : '');
  if (inbound.data?.id) ctx.track('inbound-order', inbound.data.id);

  // A1. 序列号主档应为 in_stock（且不是 'active' / 'out_stock' 这类枚举外值）
  const snList1 = await req('GET', `/api/serial-numbers?page=1&pageSize=200&keyword=${encodeURIComponent(sn1)}`, { token: admin });
  const rows1 = Array.isArray(snList1.data?.data) ? snList1.data.data : [];
  // ★ 该端点返回 **snake_case**（serial_no/status），不是 camelCase ——
  //   读 camelCase 会永远取不到，表现为"序列号根本没建"的假象（探针已实测确认）。
  const master1 = rows1.find((r) => (r.serial_no ?? r.serialNo) === sn1);
  s.expectTrue('★ A1 序列号主档已由入库自动建立', !!master1, `查到 ${rows1.length} 条`);
  s.expectTrue('★ A2 入库后状态为 in_stock（在前端枚举内）',
    master1?.status === 'in_stock', `status=${master1?.status}`);
  if (master1?.id) ctx.track('serial-number', master1.id);

  // A3. 正常出库该序列号 → 应成功且状态变 shipped
  const outNo = `OUT-SN-${stamp}`;
  const outCreate = await req('POST', '/api/outbound-orders', {
    token: admin,
    body: {
      outboundNo: outNo, type: 'sales', sourceNo: `SO-SN-${stamp}`,
      customerId: 'cus-e2e', customerName: '序列号守护客户',
      status: 'completed', outboundDate: '2026-07-02',
      warehouseId: 'wh-e2e', warehouseName: '主仓', operator: 'E2E',
      items: [{
        materialId: `mat-sn-${stamp}`, materialCode: matSn, materialName: '序列号守护物料',
        unit: '个', quantity: 1, serialNos: [sn1],
      }],
    },
  });
  s.expectTrue('★ A3 出库单建成', outCreate.status === 200 || outCreate.status === 201,
    `status=${outCreate.status} ${JSON.stringify(outCreate.data).slice(0, 200)}`);
  if (outCreate.data?.id) ctx.track('outbound-order', outCreate.data.id);

  // 触发过账：把状态置 completed（端点在 PUT 时过账）
  const outPost = await req('PUT', `/api/outbound-orders/${encodeURIComponent(outCreate.data?.id || '')}`, {
    token: admin,
    body: { status: 'completed' },
  });
  s.expectTrue('★ A3b 出库过账 200', outPost.status === 200,
    `status=${outPost.status} ${JSON.stringify(outPost.data).slice(0, 160)}`);
  s.expectTrue('★ A3c 过账未报序列号问题（合法序列号不误伤）',
    !Array.isArray(outPost.data?.serialIssues) || outPost.data.serialIssues.length === 0,
    `serialIssues=${JSON.stringify(outPost.data?.serialIssues)}`);

  // A4. 出库后状态应为 shipped（不是 out_stock）
  const snList2 = await req('GET', `/api/serial-numbers?page=1&pageSize=200&keyword=${encodeURIComponent(sn1)}`, { token: admin });
  const rows2 = Array.isArray(snList2.data?.data) ? snList2.data.data : [];
  const master2 = rows2.find((r) => (r.serial_no ?? r.serialNo) === sn1);
  s.expectTrue('★ A4 出库后状态为 shipped（统一枚举，非 out_stock）',
    master2?.status === 'shipped', `status=${master2?.status}`);

  // A5. ★ 核心：已发货的序列号再出库 → 必须被识别为问题（不更新状态）
  const outNo2 = `OUT-SN2-${stamp}`;
  const out2 = await req('POST', '/api/outbound-orders', {
    token: admin,
    body: {
      outboundNo: outNo2, type: 'sales', sourceNo: `SO-SN2-${stamp}`,
      customerId: 'cus-e2e', customerName: '序列号守护客户',
      status: 'draft', outboundDate: '2026-07-03',
      warehouseId: 'wh-e2e', warehouseName: '主仓', operator: 'E2E',
      items: [{
        materialId: `mat-sn-${stamp}`, materialCode: matSn, materialName: '序列号守护物料',
        unit: '个', quantity: 1, serialNos: [sn1], // ← 重复出库同一个序列号
      }],
    },
  });
  s.expectTrue('★ A5 重复出库单建成', out2.status === 200 || out2.status === 201,
    `status=${out2.status}`);
  if (out2.data?.id) ctx.track('outbound-order', out2.data.id);

  const outPost2 = await req('PUT', `/api/outbound-orders/${encodeURIComponent(out2.data?.id || '')}`, {
    token: admin,
    body: { status: 'completed' },
  });
  const issues = Array.isArray(outPost2.data?.serialIssues) ? outPost2.data.serialIssues : [];
  s.expectTrue('★ A6 ★ 重复出库被识别（serialIssues 含该序列号，原先完全无校验）',
    issues.some((i) => i.serialNo === sn1),
    `serialIssues=${JSON.stringify(issues).slice(0, 240)} status=${outPost2.status}`);
  s.expectTrue('★ A6b 问题原因说清是"已发货"',
    issues.some((i) => String(i.reason || '').includes('已发货')),
    `reasons=${JSON.stringify(issues.map((i) => i.reason)).slice(0, 200)}`);

  // A7. 状态不应被这次错误出库改动（仍是 shipped）
  const snList3 = await req('GET', `/api/serial-numbers?page=1&pageSize=200&keyword=${encodeURIComponent(sn1)}`, { token: admin });
  const master3 = (Array.isArray(snList3.data?.data) ? snList3.data.data : []).find((r) => (r.serial_no ?? r.serialNo) === sn1);
  s.expectTrue('★ A7 状态未被错误出库改写（仍为 shipped）',
    master3?.status === 'shipped', `status=${master3?.status}`);

  // ═══ B. 三单匹配行级 ═══
  s.info('── B. 三单匹配行级比对（识破金额自洽但行缺失）──');

  // 构造：订单两行 A×100 + B×50；只到 A×100；发票明细只开 A×100。
  // 金额维度：发票 1000 元 = 入库 1000 元 = 付款 1000 元 ⇒ 全部自洽。
  // 但 B 料既没到货也没开票 ⇒ 行级必须识破。
  const poNo = `PO-LINE-${stamp}`;
  const po = await req('POST', '/api/purchase-orders', {
    token: admin,
    body: {
      orderNo: poNo, vendorId: 'vnd-e2e', vendorName: '行级守护供应商',
      orderDate: '2026-07-01', status: 'draft', purchaseType: 'standard',
      totalAmount: 2000, currency: 'CNY',
      items: [
        { materialId: 'mat-line-a', materialCode: `ML-A-${stamp}`, materialName: 'A料',
          unit: '个', orderedQuantity: 100, deliveredQuantity: 0, unitPrice: 10, amount: 1000 },
        { materialId: 'mat-line-b', materialCode: `ML-B-${stamp}`, materialName: 'B料',
          unit: '个', orderedQuantity: 50, deliveredQuantity: 0, unitPrice: 20, amount: 1000 },
      ],
    },
  });
  s.expectTrue('★ B0 建两行采购单', po.status === 200 || po.status === 201,
    `status=${po.status} ${JSON.stringify(po.data).slice(0, 200)}`);
  if (po.data?.id) ctx.track('purchase-order', po.data.id);
  const poItems = Array.isArray(po.data?.items) ? po.data.items : [];
  s.expectTrue('★ B0b 订单明细 2 行', poItems.length === 2, `实际 ${poItems.length} 行`);

  const itemA = poItems[0];
  const itemB = poItems[1];

  // 只入库 A 行 100 件
  const inNoL = `IN-LINE-${stamp}`;
  const inL = await req('POST', '/api/inbound-orders', {
    token: admin,
    body: {
      inboundNo: inNoL, type: 'purchase', sourceNo: poNo,
      vendorId: 'vnd-e2e', vendorName: '行级守护供应商',
      status: 'completed', inboundDate: '2026-07-05',
      warehouseId: 'wh-e2e', warehouseName: '主仓', operator: 'E2E',
      items: [{
        materialId: itemA?.materialId, materialCode: itemA?.materialCode, materialName: itemA?.materialName,
        unit: '个', expectedQuantity: 100, actualQuantity: 100, unitPrice: 10,
        orderItemId: itemA?.id,   // ★ 行锚点：行级比对靠它
      }],
    },
  });
  s.expectStatus('★ B1 只入库 A 行 201', inL, 201, inL.status !== 201 ? JSON.stringify(inL.data).slice(0, 200) : '');
  if (inL.data?.id) ctx.track('inbound-order', inL.data.id);

  // 发票（头）+ 发票明细（只开 A 行 100）—— 金额与已到货部分完全吻合
  const invNo = `INV-LINE-${stamp}`;
  const inv = await req('POST', '/api/entities/finInvoice', {
    token: admin,
    body: {
      invoiceNo: invNo, vendorName: '行级守护供应商', purchaseOrderNo: poNo,
      invoiceDate: '2026-07-06', amount: 1000, taxRate: 13, taxAmount: 130, totalAmount: 1130,
      invoiceType: 'vat_special', currency: 'CNY', status: 'verified',
    },
  });
  s.expectTrue('★ B2 建发票（头）', inv.status === 200 || inv.status === 201,
    `status=${inv.status} ${JSON.stringify(inv.data).slice(0, 200)}`);
  const invId = inv.data?.id;
  if (invId) ctx.track('finInvoice', invId);

  // ★ 建发票明细：只开 A 行，B 行没有发票明细 → 金额自洽但 B 行缺失
  const ivA = await req('POST', '/api/entities/finInvoiceItem', {
    token: admin,
    body: {
      invoiceId: invId, orderItemId: itemA?.id,
      materialId: itemA?.materialId, materialCode: itemA?.materialCode, materialName: itemA?.materialName,
      quantity: 100, unit: '个', unitPrice: 10, amount: 1000, taxRate: 13, taxAmount: 130, totalAmount: 1130,
      toleranceRate: 0.02,
    },
  });
  s.expectTrue('★ B3 建发票明细（只开 A 行）', ivA.status === 200 || ivA.status === 201,
    `status=${ivA.status} ${JSON.stringify(ivA.data).slice(0, 220)}`);
  if (!(ivA.status === 200 || ivA.status === 201)) {
    s.info('   → 发票明细未建成，后续行级断言无法进行（如实停止，不做无意义断言）');
    return;
  }
  if (ivA.data?.id) ctx.track('finInvoiceItem', ivA.data.id);

  // B4. 三单匹配：金额维度必然自洽（发票 1000 = 入库 1000），要看行级是否识破
  const twm = await req('GET', `/api/three-way-match/check?poNo=${encodeURIComponent(poNo)}&invoiceNo=${encodeURIComponent(invNo)}&payAmount=1000`, { token: admin });
  s.expectTrue('★ B4 三单匹配返回可读结果', twm.status === 200,
    `status=${twm.status} ${JSON.stringify(twm.data).slice(0, 200)}`);

  const lm = twm.data?.detail?.lineMatch;
  s.expectTrue('★ B5 行级比对已执行（有 lineMatch 结果而非跳过）',
    !!lm && typeof lm.ok === 'boolean',
    `lineMatch=${JSON.stringify(lm || null).slice(0, 200)} skipped=${twm.data?.detail?.lineMatchSkipped || '无'} err=${twm.data?.detail?.lineMatchError || '无'}`);

  if (lm) {
    s.expectTrue('★ B6 ★ 行级识破「B 行既没到货也没开票」（金额维度看不出来）',
      lm.ok === false && lm.exceededCount >= 1,
      `ok=${lm.ok} exceededCount=${lm.exceededCount}`);
    const bLine = (lm.lines || []).find((l) => l.materialCode === itemB?.materialCode);
    s.expectTrue('★ B7 B 行被标为 short 且差 50',
      bLine?.status === 'short' && Math.abs(Number(bLine?.diffQty)) === 50,
      `B行=${JSON.stringify(bLine).slice(0, 220)}`);
    s.expectTrue('★ B8 汇总说明指到 B 料（业务人员能看懂差什么）',
      String(lm.summary || '').includes(itemB?.materialCode || 'B'),
      `summary=${String(lm.summary || '').slice(0, 200)}`);
  }

  s.info('   → 修复前：金额维度自洽即放行，B 料没到货也没开票却报"三单匹配通过"；');
  s.info('     修复后：按订单行逐行比累计入库与累计开票，B 行欠交 50 被识破。');
}
