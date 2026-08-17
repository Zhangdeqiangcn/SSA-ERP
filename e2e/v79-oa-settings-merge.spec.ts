import { test, expect } from '@playwright/test';

// V2.55.21 导航整合验证：
// 1) 侧栏不再有「平台生态」分组
// 2) 系统设置出现「OA流程定制」分组，含 审批流程/工作流引擎/表单设计器
// 3) 「字段级权限」「多语言」「开放接口与Webhook」「报表权限与订阅」已并入系统设置
// 4) 全程 0 pageerror / 0 console.error（防「用了没 import」白屏）
test('OA流程定制整合与系统设置去重回归', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

  // 1) 侧栏无「平台生态」
  await page.goto('http://localhost:3001/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('平台生态', { exact: true })).toHaveCount(0);

  // 2) 系统设置页
  await page.goto('http://localhost:3001/settings');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  // 关闭欢迎引导（如有）
  const skip = page.getByText('跳过引导', { exact: true }).first();
  if (await skip.isVisible({ timeout: 1500 }).catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(400);
  }

  // OA流程定制分组存在
  const oaGroup = page.getByText('OA流程定制', { exact: true }).first();
  await expect(oaGroup).toBeVisible({ timeout: 15000 });
  await oaGroup.click();
  await page.waitForTimeout(500);

  for (const label of ['审批流程', '工作流引擎', '表单设计器', '条件技术']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible({ timeout: 10000 });
  }

  // 3) 原平台生态其余能力已并入：借搜索框校验
  const search = page.getByPlaceholder(/搜索/).first();
  for (const kw of ['字段级权限', '多语言', '开放接口与Webhook', '报表权限与订阅']) {
    await search.fill(kw);
    await page.waitForTimeout(400);
    await expect(page.getByText(kw, { exact: true }).first()).toBeVisible({ timeout: 8000 });
  }
  await search.fill('');
  await page.waitForTimeout(300);

  // 4) 逐个打开 OA 分组下的平台能力页，确认不白屏
  await page.getByText('OA流程定制', { exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.getByText('工作流引擎', { exact: true }).first().click();
  await page.waitForTimeout(900);
  await page.getByText('表单设计器', { exact: true }).first().click();
  await page.waitForTimeout(900);

  expect(errors, `控制台/页面错误:\n${errors.join('\n')}`).toEqual([]);
});
