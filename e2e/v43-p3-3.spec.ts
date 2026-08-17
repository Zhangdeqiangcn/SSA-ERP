import { test, expect, Page } from '@playwright/test';

/**
 * P3-3 供应链深化 E2E
 * 覆盖：销售报价→SO、开票→AR、退货→红冲；采购框架→PO、采购退货→AP冲销；
 * 仓储跨组织转储双边过账、库存调整；质量检验批自动生成+QM评级回流；物料评估类变更留痕；ATP。
 */

const ROUTES: { path: string; tid: string }[] = [
  { path: '/sales/quotation', tid: 'quotation' },
  { path: '/sales/invoices', tid: 'sales-invoice' },
  { path: '/sales/returns', tid: 'sales-return' },
  { path: '/sales/atp', tid: 'atp' },
  { path: '/purchase/framework', tid: 'framework' },
  { path: '/purchase/returns', tid: 'purchase-return' },
  { path: '/warehouse/transfer', tid: 'stock-transfer' },
  { path: '/warehouse/adjustment', tid: 'inv-adjustment' },
  { path: '/warehouse/serial', tid: 'serial-hu' },
  { path: '/quality/inspection-lot', tid: 'inspection-lot' },
  { path: '/material/valuation', tid: 'material-valuation' },
];

async function fresh(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByText('仪表盘', { exact: true }).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(300);
}

test.beforeEach(async ({ page }) => {
  await fresh(page);
});

test('P3-3 全部 11 个新页面可达（无白屏）', async ({ page }) => {
  for (const r of ROUTES) {
    await page.goto(r.path);
    await expect(page.getByTestId(r.tid)).toBeVisible({ timeout: 30000 });
  }
});

test('销售报价单 → 销售订单（跨模块联动）', async ({ page }) => {
  await page.goto('/sales/quotation');
  await page.getByTestId('quotation').waitFor();
  const res = await page.evaluate(() => {
    const before = (window as any).__ssaStores.useSalesStore.getState().salesOrders.length;
    return { before };
  });
  await page.getByTestId('quotation-convert').first().click();
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => {
    const st = (window as any).__ssaStores;
    return {
      len: st.useSalesStore.getState().salesOrders.length,
      converted: st.useSalesAdvancedStore.getState().quotations.some((q: any) => q.status === 'converted'),
    };
  });
  expect(after.len).toBe(res.before + 1);
  expect(after.converted).toBe(true);
});

test('采购框架协议 → 采购订单（释放）', async ({ page }) => {
  await page.goto('/purchase/framework');
  await page.getByTestId('framework').waitFor();
  const before = await page.evaluate(() => (window as any).__ssaStores.usePurchaseStore.getState().purchaseOrders.length);
  await page.getByTestId('framework-release').first().click();
  await page.getByTestId('framework-release-confirm').click();
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => {
    const st = (window as any).__ssaStores;
    return {
      poLen: st.usePurchaseStore.getState().purchaseOrders.length,
      released: st.usePurchaseAdvancedStore.getState().frameworkAgreements.some((f: any) => f.releasedAmount > 0),
    };
  });
  expect(after.poLen).toBe(before + 1);
  expect(after.released).toBe(true);
});

test('销售开票 → 自动生成应收(AR)凭证', async ({ page }) => {
  const ok = await page.evaluate(() => {
    const st = (window as any).__ssaStores;
    const inv = {
      id: 'e2e-inv-1', invoiceNo: 'INV-E2E-1', invoiceType: 'sales', salesOrderNo: 'SO-E2E',
      customerName: '测试客户', status: 'draft', invoiceDate: '2026-07-15', currency: 'CNY',
      items: [{ id: 'ei1', quantity: 1, unitPrice: 100, amount: 100, taxRate: 13, taxAmount: 13 }],
      amount: 100, taxAmount: 13, totalAmount: 113,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: 't', updatedBy: 't',
    };
    st.useSalesAdvancedStore.getState().addInvoice(inv);
    st.useSalesAdvancedStore.getState().issueInvoice(inv.id);
    const entries = st.useFinanceStore.getState().accountEntries;
    return {
      hasAR: entries.some((e: any) => e.debitAccount === '应收账款'),
      hasRevenue: entries.some((e: any) => e.creditAccount === '主营业务收入'),
      issued: st.useSalesAdvancedStore.getState().salesInvoices.find((x: any) => x.id === inv.id).status === 'issued',
    };
  });
  expect(ok.hasAR).toBe(true);
  expect(ok.hasRevenue).toBe(true);
  expect(ok.issued).toBe(true);
});

test('跨组织转储 → 调出入库双边过账', async ({ page }) => {
  const ok = await page.evaluate(() => {
    const st = (window as any).__ssaStores;
    const t = {
      id: 'e2e-st-1', transferNo: 'ST-E2E-1', fromWarehouseId: 'wh-001', fromWarehouseName: '仓1',
      toWarehouseId: 'wh-002', toWarehouseName: '仓2', status: 'draft', transferDate: '2026-07-15',
      items: [{ id: 'sti1', materialId: 'mat-001', materialCode: 'STEEL-001', materialName: '钢板', unit: 'kg', quantity: 100 }],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: 't', updatedBy: 't',
    };
    st.useWarehouseAdvancedStore.getState().addStockTransfer(t);
    st.useWarehouseAdvancedStore.getState().confirmTransfer(t.id);
    const wh = st.useWarehouseStore.getState();
    return {
      out: wh.outboundOrders.some((o: any) => o.sourceNo === 'ST-E2E-1' && o.type === 'transfer'),
      in: wh.inboundOrders.some((o: any) => o.sourceNo === 'ST-E2E-1' && o.type === 'transfer'),
      completed: st.useWarehouseAdvancedStore.getState().stockTransfers.find((x: any) => x.id === t.id).status === 'completed',
    };
  });
  expect(ok.out).toBe(true);
  expect(ok.in).toBe(true);
  expect(ok.completed).toBe(true);
});

test('采购退货 → 红字出库 + 应付冲销(AP)', async ({ page }) => {
  const ok = await page.evaluate(() => {
    const st = (window as any).__ssaStores;
    const r = {
      id: 'e2e-pr-1', returnNo: 'PR-E2E-1', purchaseOrderNo: 'PO-E2E', vendorId: 'ven-001', vendorName: '供应商',
      status: 'draft', returnDate: '2026-07-15', reason: '质量', items: [{ id: 'pri1', materialId: 'mat-001', materialCode: 'STEEL-001', materialName: '钢板', unit: 'kg', quantity: 50, unitPrice: 40, amount: 2000 }],
      totalAmount: 2000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: 't', updatedBy: 't',
    };
    st.usePurchaseAdvancedStore.getState().addReturn(r);
    st.usePurchaseAdvancedStore.getState().completeReturn(r.id);
    const entries = st.useFinanceStore.getState().accountEntries;
    const wh = st.useWarehouseStore.getState();
    return {
      ap: entries.some((e: any) => e.debitAccount === '应付账款' && e.voucherNo && e.voucherNo.startsWith('V-APCN')),
      outbound: wh.outboundOrders.some((o: any) => o.type === 'return' && o.sourceNo === 'PR-E2E-1'),
      completed: st.usePurchaseAdvancedStore.getState().purchaseReturns.find((x: any) => x.id === r.id).status === 'completed',
    };
  });
  expect(ok.ap).toBe(true);
  expect(ok.outbound).toBe(true);
  expect(ok.completed).toBe(true);
});

test('采购入库完成 → 自动生成检验批 + QM评级回流', async ({ page }) => {
  const res = await page.evaluate(() => {
    const st = (window as any).__ssaStores;
    st.useWarehouseStore.getState().addInboundOrder({
      id: 'ib-e2e-1', inboundNo: 'IB-E2E-1', type: 'purchase', status: 'completed', warehouseId: 'wh-001',
      vendorId: 'ven-001', vendorName: '宝钢', operator: 't', inboundDate: '2026-07-15',
      items: [{ id: 'ibi1', materialId: 'mat-001', materialCode: 'STEEL-001', materialName: '钢板', unit: 'kg', expectedQuantity: 80, actualQuantity: 80, qualityStatus: 'qualified' }],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: 't', updatedBy: 't',
    });
    return true;
  });
  expect(res).toBe(true);
  await page.waitForTimeout(500);
  const lotInfo = await page.evaluate(() => {
    const st = (window as any).__ssaStores;
    const lots = st.useQualityAdvancedStore.getState().inspectionLots.filter((l: any) => l.sourceNo === 'IB-E2E-1');
    return { count: lots.length, lotId: lots[0]?.id };
  });
  expect(lotInfo.count).toBeGreaterThan(0);
  // 判定不合格 → 回流供应商评级
  const fb = await page.evaluate((lotId: string) => {
    const st = (window as any).__ssaStores;
    st.useQualityAdvancedStore.getState().judgeLot(lotId, 'failed');
    return st.useQualityAdvancedStore.getState().qmVendorFeedback.some((f: any) => f.lotNo === 'LOT-IB-E2E-1-1');
  }, lotInfo.lotId);
  expect(fb).toBe(true);
});

test('物料评估类维护 → 变更留痕', async ({ page }) => {
  const ok = await page.evaluate(() => {
    const st = (window as any).__ssaStores;
    const m = st.useMaterialStore.getState().materials[0];
    const before = st.useMaterialExtensionStore.getState().changeDocs.length;
    st.useMaterialStore.getState().updateMaterial(m.id, { valuationClass: 'RAW', priceControl: 'S', standardPrice: 50 });
    st.useMaterialExtensionStore.getState().logMaterialChange({
      materialId: m.id, materialCode: m.code, materialName: m.name, changeType: 'valuation',
      fields: [{ field: '评估类', oldValue: '', newValue: 'RAW' }], reason: 'E2E',
    });
    const mat = st.useMaterialStore.getState().materials.find((x: any) => x.id === m.id);
    return {
      vc: mat.valuationClass === 'RAW',
      docs: st.useMaterialExtensionStore.getState().changeDocs.length === before + 1,
    };
  });
  expect(ok.vc).toBe(true);
  expect(ok.docs).toBe(true);
});

test('可用量承诺(ATP) 计算与展示', async ({ page }) => {
  await page.goto('/sales/atp');
  await page.getByTestId('atp').waitFor();
  // 打开物料下拉并选择第一个物料
  await page.getByTestId('atp-material').locator('.MuiSelect-select').click();
  await page.getByRole('option').first().click();
  await page.waitForTimeout(300);
  await expect(page.getByTestId('atp-row').first()).toBeVisible();
});
