import { test, expect } from '@playwright/test';

test.describe('P3-5 平台生态 / 低代码', () => {
  test('六个新页面可达（无白屏）', async ({ page }) => {
    await page.goto('/platform/lowcode');
    await page.getByTestId('lowcode').waitFor();
    await page.goto('/platform/workflow');
    await page.getByTestId('workflow').waitFor();
    await page.goto('/platform/integrations');
    await page.getByTestId('integration').waitFor();
    await page.goto('/platform/field-permissions');
    await page.getByTestId('field-permissions').waitFor();
    await page.goto('/platform/i18n');
    await page.getByTestId('i18n').waitFor();
    await page.goto('/reports/permissions');
    await page.getByTestId('report-permissions').waitFor();
  });

  test('低代码：新建表单定义 → 列表出现；数据填报提交 → 记录出现', async ({ page }) => {
    await page.goto('/platform/lowcode');
    await page.getByTestId('lowcode').waitFor();
    await page.getByTestId('lc-form-add').click();
    await page.getByTestId('lc-form-name').locator('input').fill('测试表单A');
    await page.getByTestId('lc-form-add-confirm').click();
    await expect(page.getByTestId('lc-form-row').filter({ hasText: '测试表单A' })).toHaveCount(1);

    await page.getByRole('tab', { name: '数据填报' }).click();
    await page.getByTestId('lc-runtime-form').click();
    await page.getByRole('option', { name: '客户回访单' }).click();
    await page.getByTestId('lc-field-customer').locator('input').fill('测试客户Z');
    await page.getByTestId('lc-submit').click();
    await page.getByRole('tab', { name: '提交记录' }).click();
    await expect(page.getByTestId('lc-record-row').filter({ hasText: '测试客户Z' })).toHaveCount(1);
  });

  test('工作流：新建流程 → 发起实例 → 推进至完成', async ({ page }) => {
    await page.goto('/platform/workflow');
    await page.getByTestId('workflow').waitFor();
    await page.getByTestId('wf-def-add').click();
    await page.getByTestId('wf-def-name').locator('input').fill('测试流程A');
    await page.getByTestId('wf-def-add-confirm').click();
    await expect(page.getByTestId('wf-def-row').filter({ hasText: '测试流程A' })).toHaveCount(1);

    await page.getByRole('tab', { name: '流程实例' }).click();
    await page.getByTestId('wf-inst-def').click();
    await page.getByRole('option', { name: '采购申请审批流' }).click();
    await page.getByTestId('wf-inst-start').click();
    await expect(page.getByTestId('wf-inst-row')).toHaveCount(1);
    await page.getByTestId('wf-inst-advance').click();
    await page.getByTestId('wf-inst-advance').click();
    await page.getByTestId('wf-inst-advance').click();
    await expect(page.getByTestId('wf-inst-row').filter({ hasText: 'done' })).toHaveCount(1);
  });

  test('集成中心：新建 Webhook → 模拟触发生成调用日志', async ({ page }) => {
    await page.goto('/platform/integrations');
    await page.getByTestId('integration').waitFor();
    await page.getByRole('tab', { name: 'Webhook 管理' }).click();
    await page.getByTestId('ih-add').click();
    await page.getByTestId('ih-name').locator('input').fill('测试HookA');
    await page.getByTestId('ih-url').locator('input').fill('https://example.com/hookA');
    await page.getByTestId('ih-add-confirm').click();
    await expect(page.getByTestId('ih-webhook-row').filter({ hasText: '测试HookA' })).toHaveCount(1);

    await page.getByRole('tab', { name: '调用日志' }).click();
    await page.getByTestId('ih-event').click();
    await page.getByRole('option', { name: 'sales.order.created' }).click();
    await page.getByTestId('ih-trigger').click();
    await expect(page.getByTestId('ih-log-row').first()).toBeVisible();
  });

  test('字段级权限：切换模块字段可见性生效', async ({ page }) => {
    await page.goto('/platform/field-permissions');
    await page.getByTestId('field-permissions').waitFor();
    await expect(page.getByTestId('fp-chip-standardPrice')).toHaveText('显示');
    await page.getByTestId('fp-switch-standardPrice').click();
    await expect(page.getByTestId('fp-chip-standardPrice')).toHaveText('隐藏');
  });

  test('多语言：切换为英文后导航文案实时翻译', async ({ page }) => {
    await page.goto('/platform/i18n');
    await page.getByTestId('i18n').waitFor();
    await page.getByTestId('i18n-locale').click();
    await page.getByRole('option', { name: 'English (US)' }).click();
    await expect(page.getByTestId('i18n-demo')).toHaveText('Platform');
  });

  test('报表权限与订阅：新建订阅 → 列表出现', async ({ page }) => {
    await page.goto('/reports/permissions');
    await page.getByTestId('report-permissions').waitFor();
    await page.getByRole('tab', { name: '订阅管理' }).click();
    await page.getByTestId('rp-sub-add').click();
    await page.getByTestId('rp-sub-report').click();
    await page.getByRole('option', { name: '销售汇总报表' }).click();
    await page.getByTestId('rp-sub-freq').click();
    await page.getByRole('option', { name: 'weekly' }).click();
    await page.getByTestId('rp-sub-recipients').locator('input').fill('a@b.com');
    await page.getByTestId('rp-sub-add-confirm').click();
    await expect(page.getByTestId('rp-sub-row').filter({ hasText: 'a@b.com' })).toHaveCount(1);
  });
});
