import { test, expect, type Page } from '@playwright/test';

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

test('MRP：点击计算净需求，渲染真实净需求结果行与汇总', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/production/mrp');

  // 点击「计算净需求」
  const computeBtn = page.getByTestId('mrp-compute');
  await expect(computeBtn).toBeVisible();
  await computeBtn.click();

  // 至少渲染一行净需求结果
  const resultRows = page.getByTestId('mrp-result-row');
  await expect(resultRows.first()).toBeVisible();
  expect(await resultRows.count()).toBeGreaterThan(0);

  // 汇总文本出现
  await expect(page.getByTestId('mrp-summary')).toContainText('净需求');

  // 已知种子物料校验：钢板 Q235B (MAT202405010001)
  // B8：净需求 = 毛需求(700) + 安全库存(50) - 现有库存(85) - 在途(30) = 635
  const steelRow = page.locator('[data-testid="mrp-result-row"]', { hasText: 'MAT202405010001' });
  await expect(steelRow).toBeVisible();
  // 列顺序：编码/名称/毛需求/现有库存/在途/净需求/计划订单量/安全库存/批量/提前期/需求日期/建议下单日期
  // → 净需求为第 6 列(索引5)
  await expect(steelRow.locator('td').nth(5)).toContainText('635');

  expect(errors).toEqual([]);
});

test('MRP：未计算时展示引导提示，计算后出现结果区块', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/production/mrp');

  // 初始为引导提示，结果区块未渲染
  await expect(page.getByText('点击右上角「计算净需求」')).toBeVisible();
  await expect(page.getByTestId('mrp-result-row')).toHaveCount(0);

  await page.getByTestId('mrp-compute').click();
  await expect(page.getByTestId('mrp-result-row').first()).toBeVisible();
  await expect(page.getByTestId('mrp-summary')).toContainText('净需求');

  expect(errors).toEqual([]);
});
