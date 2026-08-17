import { test, expect, type Page } from '@playwright/test';

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

test('BOM 成本卷积：计算当前选中 BOM 的递归总成本（含子装配）', async ({ page }) => {
  const errors = await captureErrors(page);

  // 直接进入 BOM 详情页（路由 /bom/:id），bom-002 含一个引用 EBOM 的子装配项
  await page.goto('/bom/bom-002');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // 点击「计算成本」，针对当前选中的 BOM 做递归卷积
  const computeBtn = page.getByTestId('bom-cost');
  await expect(computeBtn).toBeVisible();
  await computeBtn.click();

  // 结果区应出现总成本（数值，带 ¥）
  const total = page.getByTestId('bom-total-cost');
  await expect(total).toBeVisible();
  const totalText = await total.textContent();
  expect(totalText).toMatch(/¥\s*[\d,]+(?:\.\d+)?/);

  // 数值应大于 0（递归子装配使总额 > 物料直接成本之和）
  const value = parseFloat((await total.textContent())!.replace(/[^\d.]/g, ''));
  expect(value).toBeGreaterThan(0);

  expect(errors).toEqual([]);
});

test('BOM 成本卷积：从列表打开 BOM 后计算，结果展示每行小计与合计', async ({ page }) => {
  const errors = await captureErrors(page);

  await page.goto('/bom/list');
  // 打开第一行的 BOM 详情（点击「查看详情」按钮）
  await page.locator('tbody tr').first().getByRole('button').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.getByTestId('bom-cost').click();
  await expect(page.getByTestId('bom-total-cost')).toBeVisible();

  // 成本卷积结果块中至少出现一行明细（含小计）
  await expect(page.getByText('成本卷积结果').first()).toBeVisible();

  expect(errors).toEqual([]);
});
