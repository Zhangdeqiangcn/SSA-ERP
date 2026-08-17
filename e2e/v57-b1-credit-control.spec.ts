import { test, expect, type Page } from '@playwright/test';

/**
 * B1 信用卡点专项（P1 流程闭环第一战役）：
 * ① 采购订单表单实时展示供应商授信画像
 * ② 提交采购订单占用供应商信用（creditOccupied + usedCredit 上浮）
 * ③ 超授信额度提交被硬拦截（不落库、不占用）
 * ④ 采购收货过账按交货进度释放信用，且重复过账幂等
 * ⑤ 删除采购订单释放剩余占用；删除销售订单释放客户信用（补 A3 闭环）
 */

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

const gotoNewPO = async (page: Page) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/purchase/orders/create');
  await expect(page.getByRole('heading', { name: '新建采购订单' })).toBeVisible();
  await page.waitForFunction(() => (window as any).__ssaStores);
};

/** 读取供应商已占用信用 */
const usedCreditOf = (page: Page, vendorId: string) =>
  page.evaluate(
    (vid) =>
      (window as any).__ssaStores.useVendorStore
        .getState()
        .vendors.find((v: any) => v.id === vid)?.usedCredit ?? 0,
    vendorId
  );

/** UI 建单：选供应商 + 加一行物料 + 录未税单价 */
const fillPO = async (page: Page, vendorKeyword: string, price: string, title: string) => {
  await page.getByLabel('订单标题').fill(title);
  const vendor = page.getByRole('combobox', { name: '主供应商' });
  await vendor.fill(vendorKeyword);
  await page.getByRole('option').first().click();

  await page.getByRole('button', { name: '添加物料' }).click();
  const mat = page.getByPlaceholder('输入关键字搜索物料');
  await mat.click();
  await mat.fill('钢板');
  await page.getByRole('option').first().click();

  await page.locator('[data-testid^="po-line-price-"]').locator('input').fill(price);
};

test('B1-1 采购订单表单实时展示供应商授信画像与本单占用额', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoNewPO(page);

  // 未选供应商时不展示信用条
  await expect(page.getByTestId('po-vendor-credit')).toHaveCount(0);

  await fillPO(page, '宝钢', '1000', 'B1 信用画像测试');

  // 宝钢：授信 500 万 / 已用 210 万 → 可用 290 万；本单 1000 × 1.13 = 1130
  const credit = page.getByTestId('po-vendor-credit');
  await expect(credit).toBeVisible();
  await expect(credit).toContainText('授信额度');
  await expect(page.getByTestId('po-credit-available')).toContainText('2,900,000');
  await expect(page.getByTestId('po-credit-need')).toContainText('1,130.00');

  expect(errors).toEqual([]);
});

test('B1-2 提交采购订单占用供应商信用（usedCredit 上浮 + creditOccupied 标记）', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoNewPO(page);

  const before = await usedCreditOf(page, 'ven-001');
  expect(before).toBe(2100000);

  await fillPO(page, '宝钢', '1000', 'B1 信用占用测试');
  await page.getByRole('button', { name: '提交订单', exact: true }).click();

  await page.waitForFunction(() => {
    const list = (window as any).__ssaStores?.usePurchaseStore.getState().purchaseOrders || [];
    return list[list.length - 1]?.creditOccupied === true;
  }, undefined, { timeout: 5000 });

  const po = await page.evaluate(() => {
    const list = (window as any).__ssaStores.usePurchaseStore.getState().purchaseOrders;
    const o = list[list.length - 1];
    return { grandTotal: o.grandTotal, creditOccupied: o.creditOccupied, creditAmount: o.creditAmount };
  });
  expect(po.grandTotal).toBeCloseTo(1130, 2);
  expect(po.creditOccupied).toBe(true);
  expect(po.creditAmount).toBeCloseTo(1130, 2);

  // 供应商已用额度按价税合计上浮
  const after = await usedCreditOf(page, 'ven-001');
  expect(after).toBeCloseTo(2100000 + 1130, 2);

  expect(errors).toEqual([]);
});

test('B1-3 超授信额度提交被硬拦截：不落库、不占用', async ({ page }) => {
  const errors = await captureErrors(page);

  const alerts: string[] = [];
  page.on('dialog', async (d) => {
    alerts.push(d.message());
    await d.dismiss();
  });

  await gotoNewPO(page);

  const beforeCount = await page.evaluate(
    () => (window as any).__ssaStores.usePurchaseStore.getState().purchaseOrders.length
  );
  const before = await usedCreditOf(page, 'ven-002');
  expect(before).toBe(2350000); // 温州紧固件：额度 200 万已被占 235 万，可用为负

  await fillPO(page, '温州紧固件', '1000', 'B1 超额拦截测试');

  // 表单即时预警
  await expect(page.getByTestId('po-vendor-credit')).toContainText('已超出可用额度');

  await page.getByRole('button', { name: '提交订单', exact: true }).click();

  // 弹出明确的阻断提示
  await expect.poll(() => alerts.length, { timeout: 5000 }).toBeGreaterThan(0);
  expect(alerts[0]).toContain('供应商信用额度不足');

  // 订单未落库、额度未变化、仍停留在表单页
  const afterCount = await page.evaluate(
    () => (window as any).__ssaStores.usePurchaseStore.getState().purchaseOrders.length
  );
  expect(afterCount).toBe(beforeCount);
  expect(await usedCreditOf(page, 'ven-002')).toBe(2350000);
  await expect(page.getByRole('heading', { name: '新建采购订单' })).toBeVisible();

  expect(errors).toEqual([]);
});

test('B1-4 采购收货过账释放信用额度，且重复过账幂等不重复释放', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoNewPO(page);

  // 构造一张已占用信用的采购订单（1 行 × 10 件 × 1000 元，价税合计 11300）
  const seeded = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const now = new Date().toISOString();
    const orderNo = 'PO-B1-REL';
    S.useVendorStore.getState().applyVendorCreditDelta('ven-001', 11300);
    S.usePurchaseStore.getState().addPurchaseOrder({
      id: 'po-b1-rel',
      orderNo,
      vendorId: 'ven-001',
      vendorName: '上海宝钢钢铁贸易有限公司',
      status: 'created',
      orderDate: now.split('T')[0],
      expectedDeliveryDate: now.split('T')[0],
      items: [
        {
          id: 'l1',
          materialId: 'mat-001',
          materialName: '钢板Q235B',
          unit: '张',
          orderedQuantity: 10,
          deliveredQuantity: 0,
          unitPrice: 1000,
          amount: 10000,
          taxRate: 13,
          taxAmount: 1300,
          priceWithTax: 1130,
          amountWithTax: 11300,
        },
      ],
      totalAmount: 10000,
      currency: 'CNY',
      totalTaxAmount: 1300,
      grandTotal: 11300,
      creditOccupied: true,
      creditAmount: 11300,
      createdAt: now,
      updatedAt: now,
      createdBy: 'e2e',
    });
    return {
      orderNo,
      used: S.useVendorStore.getState().vendors.find((v: any) => v.id === 'ven-001').usedCredit,
    };
  });
  expect(seeded.used).toBeCloseTo(2100000 + 11300, 2);

  // 部分收货 4 件 → 按 40% 进度释放 4520
  const partial = await page.evaluate((orderNo) => {
    const S = (window as any).__ssaStores;
    S.useWarehouseStore.getState().addInboundOrder({
      id: 'in-b1-1',
      inboundNo: 'IN-B1-1',
      type: 'purchase',
      sourceNo: orderNo,
      warehouseId: 'wh-001',
      status: 'completed',
      inboundDate: new Date().toISOString().slice(0, 10),
      items: [
        { id: 'i1', materialId: 'mat-001', materialName: '钢板Q235B', expectedQuantity: 4, actualQuantity: 4, unitPrice: 1000 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'e2e',
    });
    const po = S.usePurchaseStore.getState().purchaseOrders.find((o: any) => o.orderNo === orderNo);
    return {
      used: S.useVendorStore.getState().vendors.find((v: any) => v.id === 'ven-001').usedCredit,
      released: po.creditReleasedAmount,
      occupied: po.creditOccupied,
      status: po.status,
    };
  }, seeded.orderNo);
  expect(partial.released).toBeCloseTo(4520, 2);
  expect(partial.used).toBeCloseTo(2100000 + 11300 - 4520, 2);
  expect(partial.occupied).toBe(true);
  expect(partial.status).toBe('partial');

  // 重复过账同一张入库单（幂等：不再释放）
  const dup = await page.evaluate((orderNo) => {
    const S = (window as any).__ssaStores;
    const wh = S.useWarehouseStore.getState();
    const exist = wh.inboundOrders.find((o: any) => o.id === 'in-b1-1');
    wh.addInboundOrder({ ...exist });
    const po = S.usePurchaseStore.getState().purchaseOrders.find((o: any) => o.orderNo === orderNo);
    return {
      used: S.useVendorStore.getState().vendors.find((v: any) => v.id === 'ven-001').usedCredit,
      released: po.creditReleasedAmount,
    };
  }, seeded.orderNo);
  expect(dup.released).toBeCloseTo(4520, 2);
  expect(dup.used).toBeCloseTo(2100000 + 11300 - 4520, 2);

  // 剩余 6 件收完 → 全额释放，占用标记归零
  const full = await page.evaluate((orderNo) => {
    const S = (window as any).__ssaStores;
    S.useWarehouseStore.getState().addInboundOrder({
      id: 'in-b1-2',
      inboundNo: 'IN-B1-2',
      type: 'purchase',
      sourceNo: orderNo,
      warehouseId: 'wh-001',
      status: 'completed',
      inboundDate: new Date().toISOString().slice(0, 10),
      items: [
        { id: 'i2', materialId: 'mat-001', materialName: '钢板Q235B', expectedQuantity: 6, actualQuantity: 6, unitPrice: 1000 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'e2e',
    });
    const po = S.usePurchaseStore.getState().purchaseOrders.find((o: any) => o.orderNo === orderNo);
    return {
      used: S.useVendorStore.getState().vendors.find((v: any) => v.id === 'ven-001').usedCredit,
      released: po.creditReleasedAmount,
      occupied: po.creditOccupied,
      status: po.status,
    };
  }, seeded.orderNo);
  expect(full.released).toBeCloseTo(11300, 2);
  expect(full.used).toBeCloseTo(2100000, 2);
  expect(full.occupied).toBe(false);
  expect(full.status).toBe('received');

  expect(errors).toEqual([]);
});

test('B1-5 删除单据释放信用：采购订单释放供应商额度、销售订单释放客户额度', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoNewPO(page);

  // —— 采购侧：提交后删除，额度应完整回退 ——
  await fillPO(page, '宝钢', '2000', 'B1 删除释放测试');
  await page.getByRole('button', { name: '提交订单', exact: true }).click();
  await page.waitForFunction(() => {
    const list = (window as any).__ssaStores?.usePurchaseStore.getState().purchaseOrders || [];
    return list[list.length - 1]?.creditOccupied === true;
  }, undefined, { timeout: 5000 });

  const poId = await page.evaluate(() => {
    const list = (window as any).__ssaStores.usePurchaseStore.getState().purchaseOrders;
    return list[list.length - 1].id;
  });
  expect(await usedCreditOf(page, 'ven-001')).toBeCloseTo(2100000 + 2260, 2);

  await page.goto(`/purchase/orders/${poId}`);
  await expect(page.getByTestId('po-credit-status')).toContainText('已占用');
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(page.getByRole('heading', { name: '采购订单' }).first()).toBeVisible();
  expect(await usedCreditOf(page, 'ven-001')).toBeCloseTo(2100000, 2);

  // —— 销售侧：补 A3 闭环，删除销售订单同样释放客户信用 ——
  const so = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const cust = S.useCustomerStore.getState().customers[0];
    const before = cust.usedCredit ?? 0;
    S.useCustomerStore.getState().applyCreditDelta(cust.id, 5000);
    const now = new Date().toISOString();
    S.useSalesStore.getState().addSalesOrder({
      id: 'so-b1-del',
      orderNo: 'SO-B1-DEL',
      type: 'standard',
      status: 'confirmed',
      customerId: cust.id,
      customerName: cust.name,
      items: [],
      totalAmount: 5000,
      taxRate: 13,
      taxAmount: 0,
      grandTotal: 5000,
      orderDate: now.slice(0, 10),
      expectedDeliveryDate: now.slice(0, 10),
      salesPerson: 'e2e',
      linkedWorkOrders: [],
      creditOccupied: true,
      creditAmount: 5000,
      createdAt: now,
      updatedAt: now,
      createdBy: 'e2e',
    });
    return { id: 'so-b1-del', customerId: cust.id, before };
  });

  const usedAfterOccupy = await page.evaluate(
    (cid) =>
      (window as any).__ssaStores.useCustomerStore.getState().customers.find((c: any) => c.id === cid).usedCredit,
    so.customerId
  );
  expect(usedAfterOccupy).toBeCloseTo(so.before + 5000, 2);

  await page.goto(`/sales/orders/${so.id}`);
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();

  await page.waitForFunction(
    (args) => {
      const c = (window as any).__ssaStores.useCustomerStore
        .getState()
        .customers.find((x: any) => x.id === args.cid);
      return Math.abs((c?.usedCredit ?? 0) - args.before) < 0.01;
    },
    { cid: so.customerId, before: so.before },
    { timeout: 5000 }
  );

  expect(errors).toEqual([]);
});
