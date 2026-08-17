import { test, expect, type Page } from '@playwright/test';

/**
 * A3 客户主数据建档 专项：
 * - 客户列表 / 新建 / 详情（含信用状态展示）
 * - 销售订单引用客户主数据（Autocomplete）
 * - 信用硬管控：订单含税金额超过可用额度时禁止提交；正常提交回写占用
 */

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

const resetAndGoto = async (page: Page, path: string) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto(path);
};

// 选择客户主数据（MUI Autocomplete）
const selectCustomer = async (page: Page, keyword: string, optionText: string) => {
  const combo = page.getByRole('combobox', { name: '客户主数据' });
  await combo.click();
  await combo.fill(keyword);
  await page.getByRole('option').filter({ hasText: optionText }).first().click();
};

// 在订单中添加一行物料并录入单价
const addLine = async (page: Page, materialKeyword: string, price: string) => {
  await page.getByRole('button', { name: '添加物料' }).click();
  const mat = page.getByPlaceholder('输入关键字搜索物料').first();
  await mat.click();
  await mat.fill(materialKeyword);
  await page.getByRole('option').first().click();
  const priceInput = page.locator('[data-testid^="so-line-price-"]').first();
  await priceInput.waitFor({ state: 'visible' });
  await priceInput.fill(price);
  await page.locator('[data-testid^="so-line-qty-"]').first().fill('1');
};

test('A3-1 客户列表展示客户与信用状态', async ({ page }) => {
  const errors = await captureErrors(page);
  await resetAndGoto(page, '/sales/customers');

  await expect(page.getByRole('heading', { name: '客户列表' })).toBeVisible();
  await expect(page.getByText('华润建筑集团有限公司')).toBeVisible();
  await expect(page.getByTestId('credit-status').first()).toBeVisible();

  expect(errors).toEqual([]);
});

test('A3-2 新建客户并落库到客户主数据 store', async ({ page }) => {
  const errors = await captureErrors(page);
  await resetAndGoto(page, '/sales/customers/create');

  await expect(page.getByRole('heading', { name: '新建客户' })).toBeVisible();
  await page.getByLabel('客户名称（企业全称）').fill('测试客户（E2E 自动）');

  await page.getByRole('button', { name: '保存' }).click();

  // 保存后跳转到客户详情（标题为客户编码，副标题为客户名称），且 store 中存在该客户
  await expect(page.getByText('测试客户（E2E 自动）').first()).toBeVisible({ timeout: 5000 });
  const ok = await page.evaluate(() => {
    const list = (window as any).__ssaStores.useCustomerStore.getState().customers;
    return list.some((c: any) => c.name === '测试客户（E2E 自动）');
  });
  expect(ok).toBe(true);

  expect(errors).toEqual([]);
});

test('A3-3 销售订单信用硬拦截（C001 可用约47万，订单56.5万）', async ({ page }) => {
  const errors = await captureErrors(page);
  await resetAndGoto(page, '/sales/orders/create');

  await expect(page.getByRole('heading', { name: '新建销售订单' })).toBeVisible();

  await selectCustomer(page, '华润建筑集团', '华润建筑集团有限公司');
  await addLine(page, '钢板', '500000'); // 价税合计 = 500000 * 1.13 = 565000 > 469440

  const before = await page.evaluate(
    () => (window as any).__ssaStores.useSalesStore.getState().salesOrders.length
  );

  await page.getByRole('button', { name: '提交订单', exact: true }).click();

  // 应弹出信用不足的错误提示（data-testid 精确命中错误 Alert，区别于页面内信用提示 Info Alert），且停留在新建页（未提交成功）
  await expect(page.getByTestId('so-credit-error')).toContainText('禁止提交', { timeout: 5000 });
  await expect(page.getByRole('heading', { name: '新建销售订单' })).toBeVisible();

  const after = await page.evaluate(
    () => (window as any).__ssaStores.useSalesStore.getState().salesOrders.length
  );
  expect(after).toBe(before); // 硬拦截：未产生新订单

  // C001 占用不应因被拦截而改变
  const used = await page.evaluate(
    () => (window as any).__ssaStores.useCustomerStore.getState().customers.find((c: any) => c.id === 'cus-001').usedCredit
  );
  expect(used).toBe(1030560);

  expect(errors).toEqual([]);
});

test('A3-4 销售订单正常提交并回写信用占用（C003 可用200万）', async ({ page }) => {
  const errors = await captureErrors(page);
  await resetAndGoto(page, '/sales/orders/create');

  await expect(page.getByRole('heading', { name: '新建销售订单' })).toBeVisible();

  await selectCustomer(page, '新源机械', '新源机械制造有限公司');
  await addLine(page, '钢板', '100000'); // 价税合计 = 100000 * 1.13 = 113000 < 2000000

  const usedBefore = await page.evaluate(
    () => (window as any).__ssaStores.useCustomerStore.getState().customers.find((c: any) => c.id === 'cus-003').usedCredit
  );

  await page.getByRole('button', { name: '提交订单', exact: true }).click();

  // 提交成功应跳转到销售订单列表
  await expect(page.getByRole('heading', { name: '销售订单管理' })).toBeVisible({ timeout: 5000 });

  // C003 已用信用应增加约 113000
  const usedAfter = await page.evaluate(
    () => (window as any).__ssaStores.useCustomerStore.getState().customers.find((c: any) => c.id === 'cus-003').usedCredit
  );
  expect(usedAfter - usedBefore).toBeCloseTo(113000, 0);

  expect(errors).toEqual([]);
});

test('A3-5 客户详情展示授信/可用信用与关联订单', async ({ page }) => {
  const errors = await captureErrors(page);
  await resetAndGoto(page, '/sales/customers/cus-001');

  await expect(page.getByRole('heading', { name: 'C001' })).toBeVisible();
  await expect(page.getByText('授信额度')).toBeVisible();
  await expect(page.getByText('可用信用', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '关联销售订单' })).toBeVisible();

  expect(errors).toEqual([]);
});
