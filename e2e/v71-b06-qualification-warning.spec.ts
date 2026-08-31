import { test, expect, type Page } from './ssa-fixtures';

/**
 * B6 资质到期预警入通知中心（P1 Phase 2 补强项）：
 * 供应商主数据 qualificationExpiry 已存在于 vendors；通知中心此前未聚合该预警。
 * 验收：过期/临期供应商在通知中心产生「供应商资质已过期 / 即将到期」预警，
 * 汇总卡出现「资质到期」分类。
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

test('B6-1 资质到期预警入通知中心', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page, '/workbench');

  // 断言：通知中心出现供应商资质过期/临期预警（种子含已过期供应商）
  await expect(page.getByText(/供应商资质(已过期|即将到期)/).first()).toBeVisible({ timeout: 30000 });
  // 汇总分类「资质到期」存在
  await expect(page.getByText('资质到期').first()).toBeVisible({ timeout: 15000 });

  expect(errors).toEqual([]);
});
