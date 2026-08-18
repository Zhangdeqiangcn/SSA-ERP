import { test, expect, type Page } from '@playwright/test';

/**
 * 首次运行（localStorage 为空）会出现「欢迎使用 SSA ERP」引导向导，
 * 会遮挡业务页面。封装一个安全关闭函数，遇到即跳过。
 */
async function dismissOnboarding(page: Page) {
  await page
    .getByRole('button', { name: '跳过引导' })
    .click({ timeout: 2000 })
    .catch(() => {
      /* 引导未出现则忽略 */
    });
}

test('顶栏搜索框 + 使用说明书 冒烟验证', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');
  await dismissOnboarding(page);

  // 1) 搜索过滤 + Enter 跳转
  const search = page.getByPlaceholder(/搜索功能/);
  await search.click();
  await search.fill('采购订单');
  await expect(page.getByText('采购订单', { exact: true }).first()).toBeVisible();
  await search.press('Enter');
  await expect(page).toHaveURL(/\/purchase\/orders/);

  // 2) 键盘 ↑/↓ 导航 + Enter 打开
  await page.goto('/');
  await dismissOnboarding(page);
  const s2 = page.getByPlaceholder(/搜索功能/);
  await s2.click();
  await s2.fill('MRP');
  await expect(page.getByText('MRP计划', { exact: false }).first()).toBeVisible();
  await s2.press('ArrowDown'); // idx 1
  await s2.press('ArrowUp'); // 回到 idx 0
  await s2.press('Enter');
  await expect(page).toHaveURL(/\/production\/mrp/);

  // 3) 使用说明书可达 + 内容渲染
  await page.goto('/help/manual');
  await dismissOnboarding(page);
  await expect(page.getByRole('heading', { name: '使用说明书' })).toBeVisible();
  await expect(page.getByText('销售订单', { exact: false }).first()).toBeVisible();

  // 4) 说明书内搜索过滤
  const manualSearch = page.getByPlaceholder(/在说明书内搜索/);
  await manualSearch.fill('三单匹配');
  await expect(page.getByText('三单匹配', { exact: false }).first()).toBeVisible();
  // 不相干的节应被过滤掉
  await expect(page.getByText('批次追溯穿透', { exact: false }).first()).toHaveCount(0);

  // 5) 零运行时错误
  expect(errors, errors.join('\n')).toHaveLength(0);
});
