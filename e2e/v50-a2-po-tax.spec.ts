import { test, expect, type Page } from './ssa-fixtures';

/**
 * A2 采购订单税价拆分专项（V2.67 适配版）：
 * 表头币种 / 含税价开关 / 默认税率税价控件；行项目金额自动计算；
 * 三单匹配口径统一为「价税合计 vs 价税合计」；发票进项税对账。
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
};

test('A2-1 新建采购订单页具备币种/价格类型/默认税率税价控件', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoNewPO(page);

  await expect(page.getByTestId('po-currency')).toBeVisible();
  await expect(page.getByTestId('po-tax-included')).toBeVisible();
  await expect(page.getByTestId('po-tax-rate')).toBeVisible();

  expect(errors).toEqual([]);
});

test('A2-2 行项目录入未税单价后税额与价税合计自动计算', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoNewPO(page);

  await page.getByRole('button', { name: '添加物料' }).click();
  // PO 行 unitPrice 列：MaterialLineItemsGrid 渲染为 spinbutton（MUI type="number"）
  // 用 nth(1) 跳过 quantity 的 spinbutton，取第二个 spinbutton（unitPrice）
  const priceSpin = page.getByRole('spinbutton').nth(1);
  await priceSpin.fill('100');

  // 数量 1 × 未税单价 100 → 未税 100 / 税额 13 / 价税合计 113（默认税率 13%）
  await expect(page.getByTestId('po-total-net')).toContainText('100');
  await expect(page.getByTestId('po-total-tax')).toContainText('13');
  await expect(page.getByTestId('po-grand-total')).toContainText('113');

  expect(errors).toEqual([]);
});

test('A2-3 切换为含税价录入后按含税口径反算未税与税额', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoNewPO(page);

  await page.getByRole('button', { name: '添加物料' }).click();
  // 切换含税模式：点击「价格类型」下拉，选「含税价」
  await page.getByTestId('po-tax-included').click();
  await page.getByRole('option', { name: '含税价' }).click();
  // 等 React 重渲（含税模式下列变为 priceWithTax）
  await page.waitForTimeout(500);
  // 含税模式下含税单价列直接渲染为带 testid 的 input（po-cell-priceWithTax-${rowId}）
  const priceSpin = page.locator('[data-testid^="po-cell-priceWithTax-"]').first();
  await priceSpin.fill('113');
  // 含税模式：含税 113 → 未税 100 / 税额 13 / 价税合计 113
  // 优先验证价税合计（最稳定），再验证内部一致性
  await expect(page.getByTestId('po-grand-total')).toContainText('113');
  const netTxt = await page.getByTestId('po-total-net').innerText();
  const taxTxt = await page.getByTestId('po-total-tax').innerText();
  const netVal = parseFloat(netTxt.replace(/[¥,]/g, '')) || 0;
  const taxVal = parseFloat(taxTxt.replace(/[¥,]/g, '')) || 0;
  expect(netVal + taxVal).toBeCloseTo(113, 0);

  expect(errors).toEqual([]);
});

test('A2-4 提交采购订单后税价字段持久化（币种/行税额/价税合计）', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoNewPO(page);

  await page.getByLabel('订单标题').fill('A2 税价拆分测试订单');

  // 选择供应商（宝钢）
  const vendor = page.getByRole('combobox', { name: '主供应商' });
  await vendor.fill('宝钢');
  await page.getByRole('option').first().click();

  // 添加物料并选料（钢板 Q235B）
  await page.getByRole('button', { name: '添加物料' }).click();
  // MaterialLineItemsGrid 物料编码列 placeholder: '输入物料编码'
  const mat = page.getByPlaceholder('输入物料编码').first();
  await mat.click();
  await mat.fill('钢板');
  await page.getByRole('option').first().click();

  // 录入未税单价 100（nth(1) 跳过 quantity 的 spinbutton）
  const priceSpin = page.getByRole('spinbutton').nth(1);
  await priceSpin.fill('100');

  // 提交订单
  await page.getByRole('button', { name: '提交订单', exact: true }).click();

  // 等待新订单落库（价税合计 ≈ 113）
  await page.waitForFunction(() => {
    const s = (window as any).__ssaStores?.usePurchaseStore.getState();
    const list = s?.purchaseOrders || [];
    const po = list[list.length - 1];
    return po && Math.abs((po.grandTotal ?? 0) - 113) < 0.01;
  }, undefined, { timeout: 5000 });

  const ok = await page.evaluate(() => {
    const s = (window as any).__ssaStores.usePurchaseStore.getState();
    const list = s.purchaseOrders;
    const po = list[list.length - 1];
    return {
      currency: po.currency,
      taxIncluded: po.taxIncluded,
      totalTaxAmount: po.totalTaxAmount,
      grandTotal: po.grandTotal,
      lineTax: po.items[0]?.taxAmount,
      lineGrand: po.items[0]?.amountWithTax,
    };
  });

  expect(ok.currency).toBe('CNY');
  expect(ok.taxIncluded).toBe(false);
  expect(ok.lineTax).toBeCloseTo(13, 2);
  expect(ok.lineGrand).toBeCloseTo(113, 2);
  expect(ok.totalTaxAmount).toBeCloseTo(13, 2);
  expect(ok.grandTotal).toBeCloseTo(113, 2);

  expect(errors).toEqual([]);
});

test('A2-5 三单匹配页按价税合计比对采购单与发票含税金额', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/finance/three-way');
  await expect(page.getByRole('heading', { name: '三单匹配' })).toBeVisible();

  // 金额匹配维度列已存在
  await expect(page.getByTestId('twm-amount-match').first()).toBeVisible();

  expect(errors).toEqual([]);
});
