import { test, expect, type Page } from './ssa-fixtures';

/**
 * B7 门户更多单据回写主 ERP 专项（P1 流程闭环第六战役，目标 V2.42）：
 *   B7-1 发货通知单 → 主 ERP ASN 在途预告（type='asn', status='in_transit'，安全不碰库存）+ 幂等
 *   B7-2 质量问题单 → 主 ERP 不合格品(NCR) 回写（source='vendor'/portalIssueId 双向追溯）+ 幂等
 *   B7-3 对账单确认 → 主 ERP 往来对账(Reconciliation) 回写（store 级 + UI 按钮双验证）+ 幂等
 *   B7-5 门户全链路无白屏（含 T1/T2/T3 三个新页面）
 */

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('[pageerror]', e.message); });
  page.on('console', (msg) => { if (msg.type() === 'error') console.log('[console.error]', msg.text()); });
  return errors;
};

/** 模拟门户登录（写 sessionStorage.vendorPortalUser），并重载到目标门户页 */
const portalGoto = async (page: Page, code: string, path: string) => {
  const names: Record<string, string> = {
    V001: '钢铁联合集团',
    V002: '华东铝业有限公司',
    'V-NEW': '新申请演示账号',
  };
  await page.goto('/');
  await page.evaluate(
    (args) => {
      sessionStorage.setItem(
        'vendorPortalUser',
        JSON.stringify({ code: args.code, name: args.name, role: '正式供应商' }),
      );
    },
    { code, name: names[code] || names.V001 },
  );
  await page.evaluate(() => localStorage.clear());
  await page.goto(path);
  await page.waitForFunction(() => (window as any).__ssaStores);
};

// ═══════════════════════════════════════════════════════════════
test('B7-1a 门户发货通知 → 主 ERP ASN 在途预告回写（单次提交仅一条、in_transit、vendor 匹配）', async ({ page }) => {
  const errors = await captureErrors(page);
  await portalGoto(page, 'V001', '/vendor-portal/orders/shipment');

  await expect(page.getByText('发货物流管理').first()).toBeVisible();

  const before = await page.evaluate(
    () => (window as any).__ssaStores.useWarehouseStore.getState().inboundOrders.filter((o: any) => o.type === 'asn').length,
  );

  // 打开「新建发货通知」并填写表单
  await page.getByRole('button', { name: '新建发货通知', exact: true }).click();
  await page.getByLabel(/关联采购订单号/).fill('PO20240506001');
  await page.getByLabel(/物流公司/).fill('测试物流公司');
  await page.getByLabel(/运单号/).fill('TN-B7-0001');
  await page.getByLabel(/物料编码/).fill('MAT-B7-001');
  await page.getByLabel(/物料名称/).fill('测试钢板');
  await page.getByLabel(/单位/).fill('张');
  await page.getByLabel(/数量/).fill('10');
  await page.getByTestId('submit-shipment-btn').click();

  const res = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const ships = S.useFlowStore.getState().deliveryShipments;
    const newShip = ships[ships.length - 1];
    const asns = S.useWarehouseStore.getState().inboundOrders.filter((o: any) => o.type === 'asn');
    const asn = asns.find((o: any) => o.asnShipmentNo === newShip.shipmentNo);
    return {
      shipmentNo: newShip.shipmentNo,
      asnCount: asns.length,
      sameShipmentAsnCount: asns.filter((o: any) => o.asnShipmentNo === newShip.shipmentNo).length,
      asn: asn
        ? { type: asn.type, status: asn.status, vendorId: asn.vendorId, vendorName: asn.vendorName, asnShipmentNo: asn.asnShipmentNo }
        : null,
    };
  });

  expect(res.sameShipmentAsnCount).toBe(1); // 单次提交仅生成一条 ASN 预告单
  expect(res.asnCount).toBe(before + 1);
  expect(res.asn).not.toBeNull();
  expect(res.asn!.type).toBe('asn');
  expect(res.asn!.status).toBe('in_transit'); // ASN 在途预告，安全不触碰库存/财务
  expect(res.asn!.vendorId).toBe('ven-001'); // 统一身份源回写主数据供应商
  expect(res.asn!.vendorName).toContain('宝钢');

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B7-1b 门户 ASN 回写安全 + 幂等（多单据各生成独立 ASN，无重复，全部 in_transit）', async ({ page }) => {
  const errors = await captureErrors(page);
  await portalGoto(page, 'V001', '/vendor-portal/orders/shipment');

  const before = await page.evaluate(
    () => (window as any).__ssaStores.useWarehouseStore.getState().inboundOrders.filter((o: any) => o.type === 'asn').length,
  );

  // 第一单
  await page.getByRole('button', { name: '新建发货通知', exact: true }).click();
  await page.getByLabel(/关联采购订单号/).fill('PO20240506001');
  await page.getByLabel(/物流公司/).fill('测试物流-A');
  await page.getByLabel(/运单号/).fill('TN-B7-A001');
  await page.getByLabel(/物料编码/).fill('MAT-B7-A01');
  await page.getByLabel(/单位/).fill('张');
  await page.getByLabel(/数量/).fill('5');
  await page.getByTestId('submit-shipment-btn').click();

  const first = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const ships = S.useFlowStore.getState().deliveryShipments;
    return ships[ships.length - 1].shipmentNo;
  });

  // 第二单（不同物料）
  await page.getByRole('button', { name: '新建发货通知', exact: true }).click();
  await page.getByLabel(/关联采购订单号/).fill('PO20240507001');
  await page.getByLabel(/物流公司/).fill('测试物流-B');
  await page.getByLabel(/运单号/).fill('TN-B7-B002');
  await page.getByLabel(/物料编码/).fill('MAT-B7-B02');
  await page.getByLabel(/单位/).fill('件');
  await page.getByLabel(/数量/).fill('8');
  await page.getByTestId('submit-shipment-btn').click();

  const res = await page.evaluate((firstNo: string) => {
    const S = (window as any).__ssaStores;
    const asns = S.useWarehouseStore.getState().inboundOrders.filter((o: any) => o.type === 'asn');
    return {
      asnCount: asns.length,
      firstAsnCount: asns.filter((o: any) => o.asnShipmentNo === firstNo).length,
      allInTransit: asns.every((o: any) => o.status === 'in_transit'),
    };
  }, first);

  expect(res.asnCount).toBe(before + 2); // 两笔独立发货各生成一条 ASN
  expect(res.firstAsnCount).toBe(1); // 同一发货单号不会被重复建单
  expect(res.allInTransit).toBe(true); // 全部在途预告，安全

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B7-2a 门户质量问题单 → 主 ERP 不合格品(NCR) 回写（source=vendor / portalIssueId 双向追溯）', async ({ page }) => {
  const errors = await captureErrors(page);
  await portalGoto(page, 'V001', '/vendor-portal/quality/issues');

  await expect(page.getByText('质量管理').first()).toBeVisible();

  await page.getByRole('button', { name: '新建问题单', exact: true }).click();
  await page.getByLabel(/物料编码/).fill('MAT-B7-Q001');
  await page.getByLabel(/物料名称/).fill('测试瑕疵件');
  await page.getByLabel(/不合格数量/).fill('3');
  await page.getByLabel(/问题描述/).fill('B7 测试问题描述');
  await page.getByTestId('vendor-quality-issue-submit').click();

  const res = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const issues = S.useFlowStore.getState().vendorQualityIssues;
    const issue = issues[issues.length - 1];
    const ncr = S.useQualityStore.getState().unqualifiedItems.find((x: any) => x.portalIssueId === issue.id);
    return {
      issueId: issue.id,
      ncr: ncr
        ? {
            source: ncr.source,
            portalIssueId: ncr.portalIssueId,
            vendorReported: ncr.vendorReported,
            materialCode: ncr.materialCode,
            defectQuantity: ncr.defectQuantity,
            status: ncr.status,
            dispositionStatus: ncr.dispositionStatus,
          }
        : null,
    };
  });

  expect(res.ncr).not.toBeNull();
  expect(res.ncr!.source).toBe('vendor'); // 来源标记为主数据可识别的门户上报
  expect(res.ncr!.portalIssueId).toBe(res.issueId); // 双向追溯键
  expect(res.ncr!.vendorReported).toBe(true);
  expect(res.ncr!.materialCode).toBe('MAT-B7-Q001');
  expect(res.ncr!.defectQuantity).toBe(3);
  expect(res.ncr!.status).toBe('open');

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B7-2b 门户 NCR 回写幂等（同一 portalIssueId 重复回写仅生成一条 NCR）', async ({ page }) => {
  const errors = await captureErrors(page);
  await portalGoto(page, 'V001', '/vendor-portal/quality/issues');

  const sameIssueId = 'vqi-b7-idem-001';
  const res = await page.evaluate((issueId: string) => {
    const S = (window as any).__ssaStores;
    const issue = {
      id: issueId,
      issueNo: 'VQI-B7-IDEM',
      vendorId: 'ven-001',
      vendorName: '上海宝钢钢铁贸易有限公司',
      materialCode: 'MAT-X',
      materialName: 'X',
      batchNo: 'B',
      issueType: 'other',
      severity: 'minor',
      description: 'd',
      defectQty: 1,
      totalQty: 10,
      defectRate: 10,
      status: 'open',
      createdAt: '',
      updatedAt: '',
      createdBy: 'ven-001',
      updatedBy: 'ven-001',
    };
    // 模拟重复回写（如网络重试 / 重复提交）
    S.useQualityStore.getState().addVendorQualityIssue(issue);
    S.useQualityStore.getState().addVendorQualityIssue(issue);
    return S.useQualityStore.getState().unqualifiedItems.filter((x: any) => x.portalIssueId === issueId).length;
  }, sameIssueId);

  expect(res).toBe(1); // 幂等：仅一条，重复回写被守卫拦截
  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B7-3a 门户对账单确认 → 主 ERP 往来对账(Reconciliation) 回写（金额/状态/周期正确）', async ({ page }) => {
  const errors = await captureErrors(page);
  await portalGoto(page, 'V001', '/vendor-portal/finance/statements');

  await expect(page.getByText('财务管理').first()).toBeVisible();

  const rec = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    S.useFinanceStore.getState().confirmReconciliation({
      statementNo: 'VS-B7-001',
      vendorId: 'ven-001',
      vendorName: '上海宝钢钢铁贸易有限公司',
      period: '2026-08',
      amount: 12345,
    });
    const r = S.useFinanceStore.getState().reconciliations.find(
      (x: any) => x.statementNo === 'VS-B7-001' && x.vendorId === 'ven-001',
    );
    return r ? { status: r.status, amount: r.amount, vendorName: r.vendorName, period: r.period } : null;
  });

  expect(rec).not.toBeNull();
  expect(rec!.status).toBe('confirmed');
  expect(rec!.amount).toBe(12345);
  expect(rec!.vendorName).toContain('宝钢');
  expect(rec!.period).toBe('2026-08');

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B7-3b 门户往来对账回写幂等（同 statementNo+vendorId 重复确认仅一条）', async ({ page }) => {
  const errors = await captureErrors(page);
  await portalGoto(page, 'V001', '/vendor-portal/finance/statements');

  const count = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const input = {
      statementNo: 'VS-B7-001',
      vendorId: 'ven-001',
      vendorName: '上海宝钢钢铁贸易有限公司',
      period: '2026-08',
      amount: 12345,
    };
    S.useFinanceStore.getState().confirmReconciliation(input);
    S.useFinanceStore.getState().confirmReconciliation(input); // 重复确认
    return S.useFinanceStore.getState().reconciliations.filter(
      (x: any) => x.statementNo === 'VS-B7-001' && x.vendorId === 'ven-001',
    ).length;
  });

  expect(count).toBe(1); // 幂等 upsert：仍仅一条
  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B7-3c 门户 UI 点击「确认对账」按钮 → 主 ERP 往来对账回写（端到端）', async ({ page }) => {
  const errors = await captureErrors(page);
  await portalGoto(page, 'V001', '/vendor-portal/finance/statements');

  // 种子对账单 vs-001 为 confirmed，按钮仅在 sent 状态出现：先置为 sent
  await page.evaluate(() => {
    (window as any).__ssaStores.useFlowStore.getState().updateVendorStatement('vs-001', { status: 'sent' });
  });
  const confirmBtn = page.getByTestId('vendor-statement-confirm');
  await expect(confirmBtn).toBeVisible();
  await confirmBtn.click();

  const res = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const rec = S.useFinanceStore.getState().reconciliations.find(
      (x: any) => x.statementNo === 'VS20240531001' && x.vendorId === 'ven-001',
    );
    const st = S.useFlowStore.getState().vendorStatements.find((x: any) => x.id === 'vs-001');
    return {
      rec: rec ? { status: rec.status, amount: rec.amount } : null,
      statementStatus: st?.status,
    };
  });

  expect(res.rec).not.toBeNull();
  expect(res.rec!.status).toBe('confirmed');
  expect(res.rec!.amount).toBe(124500); // 对账单行项金额合计
  expect(res.statementStatus).toBe('confirmed'); // 门户侧同步置为已确认

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B7-5 门户全链路无白屏（含 T1/T2/T3 三个新页面 + 既有门户页）', async ({ page }) => {
  const errors = await captureErrors(page);
  await portalGoto(page, 'V001', '/vendor-portal');

  const routes = [
    '/vendor-portal',
    '/vendor-portal/orders/shipment',
    '/vendor-portal/orders/confirm',
    '/vendor-portal/quotation',
    '/vendor-portal/profile',
    '/vendor-portal/quality/issues',
    '/vendor-portal/finance/statements',
  ];

  for (const r of routes) {
    await page.goto(r);
    await page.waitForFunction(() => (window as any).__ssaStores);
    await expect(page.locator('h1, h2, h3, h4, h5, h6').first()).toBeVisible();
  }

  expect(errors).toEqual([]);
});
