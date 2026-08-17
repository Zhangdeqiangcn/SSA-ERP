import { test, expect, type Page } from '@playwright/test';

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

test('物料详情：多单位绑定换算展示 unit-conversion', async ({ page }) => {
  const errors = await captureErrors(page);

  // 进入列表 → 打开首条物料编辑，设置采购单位与换算率
  await page.goto('/material/list');
  await expect(page.getByRole('heading', { name: '物料列表' })).toBeVisible();
  await page.locator('tbody tr').first().click();
  await expect(page.getByTestId('material-rating')).toBeVisible();
  await page.getByRole('button', { name: '编辑' }).click();

  await page.getByLabel('采购单位').fill('箱');
  await page.getByLabel('单位换算系数').fill('12');
  await page.getByRole('button', { name: '保存' }).click();

  // 回到列表并重新打开首条物料详情，断言 unit-conversion 可见
  await page.goto('/material/list');
  await page.locator('tbody tr').first().click();
  await expect(page.getByTestId('unit-conversion')).toBeVisible();
  await expect(page.getByTestId('unit-conversion')).toContainText('1 箱 = 12');

  expect(errors).toEqual([]);
});

test('供应商列表：信用状态 credit-status 渲染（含超额告警）', async ({ page }) => {
  const errors = await captureErrors(page);

  await page.goto('/vendor/list');
  await expect(page.getByRole('heading', { name: '供应商列表' })).toBeVisible();
  // 每行均渲染 credit-status（含未授信 / 正常 / 超额）
  await expect(page.getByTestId('credit-status').first()).toBeAttached();
  // 存在超额告警 Chip「信用超额」
  await expect(page.getByText('信用超额').first()).toBeVisible();

  expect(errors).toEqual([]);
});

test('意向客户列表：信用状态 credit-status 渲染', async ({ page }) => {
  const errors = await captureErrors(page);

  await page.goto('/sales/prospects');
  await expect(page.getByRole('heading', { name: '意向客户管理' })).toBeVisible();
  await expect(page.getByTestId('credit-status').first()).toBeAttached();

  expect(errors).toEqual([]);
});
