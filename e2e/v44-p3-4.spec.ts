import { test, expect } from './ssa-fixtures';

test.describe('P3-4 质量深化（8D / SPC控制图 / 实验室设备）', () => {
  test('三个新页面可达（无白屏）', async ({ page }) => {
    await page.goto('/quality/8d');
    await page.getByTestId('eight-d').waitFor();
    await page.goto('/quality/spc');
    await page.getByTestId('spc-chart').waitFor();
    await page.goto('/quality/lab');
    await page.getByTestId('lab-equipment').waitFor();
  });

  test('8D：新增记录 → 列表出现', async ({ page }) => {
    await page.goto('/quality/8d');
    await page.getByTestId('eight-d').waitFor();
    const before = await page.getByTestId('d8-row').count();
    await page.getByTestId('d8-add').click();
    await page.getByTestId('d8-code').locator('input').fill('8D-TEST-001');
    await page.getByTestId('d8-title').locator('input').fill('测试质量问题');
    await page.getByTestId('d8-add-confirm').click();
    await expect(page.getByTestId('d8-row')).toHaveCount(before + 1);
  });

  test('质量SPC：新增示例 → 计算失控点与过程能力', async ({ page }) => {
    await page.goto('/quality/spc');
    await page.getByTestId('spc-chart').waitFor();
    await page.getByTestId('spc-add-sample').click();
    await page.getByTestId('spc-detail').waitFor();
    const ooc = await page.getByTestId('spc-ooc-count').textContent();
    expect(Number((ooc || '').replace(/\D/g, ''))).toBeGreaterThan(0);
    await expect(page.getByTestId('spc-cpk').first()).toBeVisible();
  });

  test('实验室设备：新增 → 列表出现；到期设备预警', async ({ page }) => {
    await page.goto('/quality/lab');
    await page.getByTestId('lab-equipment').waitFor();
    const before = await page.getByTestId('lab-row').count();
    await page.getByTestId('lab-add').click();
    await page.getByTestId('lab-no').locator('input').fill('LAB-TEST-001');
    await page.getByTestId('lab-name').locator('input').fill('测试量具');
    await page.getByTestId('lab-add-confirm').click();
    await expect(page.getByTestId('lab-row')).toHaveCount(before + 1);
    // 种子含一个逾期设备，应显示校准预警
    await expect(page.getByTestId('lab-due').first()).toBeVisible();
  });
});
