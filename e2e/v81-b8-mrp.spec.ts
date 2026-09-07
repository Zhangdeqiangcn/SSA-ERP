import { test, expect } from './ssa-fixtures';

// B8 MRP 增强固化：点击「计算净需求」后真实运算并渲染净需求结果区
test('B8 MRP 净需求计算：计算后可渲染结果区', { timeout: 60000 }, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(`console: ${m.text()}`); });

  await page.goto('http://localhost:3000/production/mrp');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await expect(page.getByText('MRP 物料需求计划')).toBeVisible({ timeout: 15000 });

  // 点击「计算净需求」
  const computeBtn = page.getByTestId('mrp-compute');
  await expect(computeBtn).toBeVisible();
  await computeBtn.click();
  await page.waitForTimeout(1000);

  // 计算后：初始引导提示消失，结果区（mrp-summary）渲染
  await expect(page.getByText('点击右上角「计算净需求」')).toBeHidden();
  await expect(page.getByTestId('mrp-summary')).toBeVisible({ timeout: 8000 });

  // 若存在净需求行，验证净需求/计划订单量单元格存在
  const rowCount = await page.getByTestId('mrp-result-row').count();
  if (rowCount > 0) {
    await expect(page.getByTestId('mrp-net').first()).toBeVisible();
    await expect(page.getByTestId('mrp-planned').first()).toBeVisible();
  }

  expect(errors, `控制台/页面错误:\n${errors.join('\n')}`).toEqual([]);
});
