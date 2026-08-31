import { test, expect, type Page } from './ssa-fixtures';

/**
 * B11 多笔付款计划（P1 Phase 2 补强项）：
 * ① 分批付款计划（预付款+进度款+尾款）创建，计划总额=各期之和
 * ② 含预付款的计划创建时占用供应商信用额度（applyVendorCreditDelta +advanceAmount）
 * ③ 逐期付款：标记各期已付，全部付清后状态=已付清 且 释放预付款占用信用
 * 对标 SAP 付款计划（预付款占用信用 / 分期支付）
 */

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

const bootstrap = async (page: Page, path = '/') => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto(path, { timeout: 120000 });
  await page.waitForFunction(() => (window as any).__ssaStores);
};

test('B11-1 多笔付款计划：分批创建+预付款占信用+逐期付款释放', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page, '/finance/payments');

  // 选第一个供应商，记录信用占用前
  const vendorId: string = await page.evaluate(() =>
    (window as any).__ssaStores.useVendorStore.getState().vendors[0].id
  );
  const beforeCredit: number = await page.evaluate((id: string) =>
    (window as any).__ssaStores.useVendorStore.getState().vendors.find((v: any) => v.id === id).usedCredit || 0,
    vendorId
  );

  await page.getByRole('button', { name: '申请付款' }).click();
  await page.getByTestId('pp-vendor-select').click();
  await page.getByRole('option').first().click();
  await page.getByTestId('pp-split-switch').click();
  await page.getByTestId('pp-add-advance').click();
  await page.getByTestId('pp-add-progress').click();
  await page.getByTestId('pp-add-final').click();
  // TextField 的 data-testid 挂在 MUI FormControl div 上，需定位内部 input
  await page.getByTestId('pp-inst-amount-0').locator('input').fill('30000');
  await page.getByTestId('pp-inst-amount-1').locator('input').fill('20000');
  await page.getByTestId('pp-inst-amount-2').locator('input').fill('10000');
  await page.getByTestId('pp-create').click();

  // 列表出现「3期」标记 + 总额 ¥60,000
  await expect(page.getByTestId('pp-installment-badge').first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('¥60,000').first()).toBeVisible({ timeout: 15000 });

  // 预付款占用信用 +30000
  const afterCredit: number = await page.evaluate((id: string) =>
    (window as any).__ssaStores.useVendorStore.getState().vendors.find((v: any) => v.id === id).usedCredit || 0,
    vendorId
  );
  expect(afterCredit - beforeCredit).toBe(30000);

  // 打开含 3期 的行详情，逐期付款
  const row = page.locator('table tbody tr', { has: page.getByTestId('pp-installment-badge') }).first();
  await row.getByRole('button', { name: '详情' }).click();

  const payBtns = page.locator('[data-testid^="pp-pay-inst-"]');
  const n = await payBtns.count();
  expect(n).toBe(3);
  // 每期付款后列表会重渲染，按 first() 逐次点击避免固定索引错位
  for (let i = 0; i < n; i++) {
    await page.locator('[data-testid^="pp-pay-inst-"]').first().click();
  }

  // 计划状态已付清
  await expect(page.getByText('已付清').first()).toBeVisible({ timeout: 15000 });

  // 信用释放回 before
  const finalCredit: number = await page.evaluate((id: string) =>
    (window as any).__ssaStores.useVendorStore.getState().vendors.find((v: any) => v.id === id).usedCredit || 0,
    vendorId
  );
  expect(finalCredit).toBe(beforeCredit);

  expect(errors).toEqual([]);
});
