import { test, expect, type Page } from './ssa-fixtures';

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

const DAY = 24 * 3600 * 1000;

test('B8-1 MRP：安全库存纳入净需求 + 批量取整 + 提前期偏置排产', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/production/mrp');

  await page.getByTestId('mrp-compute').click();

  // 钢板 Q235B（MAT202405010001）：leadTime=7, lotSize=100, moq=50, safetyStock=50
  const steelRow = page.locator('[data-testid="mrp-result-row"]', { hasText: 'MAT202405010001' });
  await expect(steelRow).toBeVisible();

  // 列序：编码/名称/毛需求/现有库存/在途/净需求/计划订单量/安全库存/批量/提前期/需求日期/建议下单日期
  // ① 安全库存纳入：净需求 = 700 + 50 - 85 - 30 = 635
  await expect(steelRow.locator('td').nth(5)).toContainText('635');
  // 安全库存列 = 50
  await expect(steelRow.locator('td').nth(7)).toContainText('50');
  // ② 批量取整：计划订单量 = ceil(635/100)*100 = 700（≥ moq 50）
  await expect(steelRow.locator('td').nth(6)).toContainText('700');
  // 批量列 = 100
  await expect(steelRow.locator('td').nth(8)).toContainText('100');
  // 提前期列 = 7
  await expect(steelRow.locator('td').nth(9)).toContainText('7');

  // ③ 提前期偏置：建议下单日期 = 需求日期 - 7 天
  const demandTxt = (await steelRow.locator('td').nth(10).innerText()).trim();
  const releaseTxt = (await steelRow.locator('td').nth(11).innerText()).trim();
  const diffDays = Math.round((new Date(demandTxt).getTime() - new Date(releaseTxt).getTime()) / DAY);
  expect(diffDays).toBe(7);

  expect(errors).toEqual([]);
});

test('B8-2 MRP：结果表含 B8 新增列，计算后无运行时报错', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/production/mrp');

  // 净需求结果表仅在点击「计算净需求」后渲染，故先触发计算
  await page.getByTestId('mrp-compute').click();
  await expect(page.getByTestId('mrp-result-row').first()).toBeVisible();
  await expect(page.getByTestId('mrp-summary')).toContainText('净需求');

  // 表头可见 B8 新增列（用 columnheader 角色精准定位）
  // 注：「安全库存」列在结果表与种子「需求明细」表中均存在，结果表在 DOM 中靠前故取 .first()
  await expect(page.getByRole('columnheader', { name: '安全库存' }).first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '批量' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '提前期(天)' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '需求日期' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '建议下单日期' })).toBeVisible();

  expect(errors).toEqual([]);
});
