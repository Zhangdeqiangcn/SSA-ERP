import { test, expect, type Page } from '@playwright/test';

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

test('设置页审批流程 Tab：供应商注册审批步骤按配置渲染', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/settings');

  // 打开「审批流程」Tab（index 7）
  await page.getByRole('tab', { name: '审批流程' }).click();

  // 供应商注册审批流配置行存在（data-testid 由 ApprovalFlowTab 提供）
  const vendorRow = page.getByTestId('approval-flow-vendor');
  await expect(vendorRow).toBeVisible();

  // 该配置默认含 3 个步骤，至少渲染出步骤标签（如「采购初审」）
  await expect(page.getByText('采购初审', { exact: false }).first()).toBeVisible();

  expect(errors).toEqual([]);
});

test('供应商审批队列：步骤与审批流配置一致', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/vendor/approvals');

  // 页面标题渲染，无白屏
  await expect(page.getByRole('heading', { name: '供应商注册审批' })).toBeVisible();

  // 页面顶部展示由配置驱动的审批流程概览（含步骤角色名）
  await expect(page.getByText('采购员', { exact: false }).first()).toBeVisible();

  // 队列中存在「当前步骤」列，且至少呈现一个配置步骤标签
  await expect(page.getByText('采购初审', { exact: false }).first()).toBeVisible();

  expect(errors).toEqual([]);
});
