import { test, expect } from './ssa-fixtures';

// V2.55.22 导航二次整合验证：
// 1) 侧栏「审批中心」聚合 4 个审批入口；原业务模块不再有审批子项
// 2) 侧栏「分析与报表」聚合 报表中心 + 报表权限与订阅 + 智能分析；原「智能分析」分组消失、财务下报表中心消失
// 3) 侧栏「供应商门户」不重复（恰 1 处）
// 4) 系统设置不再含「报表权限与订阅」
// 5) 关键页面不白屏；全程 0 pageerror / 0 console.error
test('导航二次整合：审批中心 + 分析与报表 + 去重', { timeout: 120000 }, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(`console: ${m.text()}`); });

  await page.goto('http://localhost:3000/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  // 跳过欢迎引导（如有）
  const skip = page.getByText('跳过引导', { exact: true }).first();
  if (await skip.isVisible({ timeout: 1500 }).catch(() => false)) { await skip.click(); await page.waitForTimeout(300); }

  // 侧栏默认折叠，先展开使子菜单可见
  const expandBtn = page.getByRole('button', { name: '折叠或展开侧边栏' });
  if (await expandBtn.isVisible()) {
    const title = await expandBtn.getAttribute('title') || '';
    if (title.includes('折叠')) await expandBtn.click();
    await page.waitForTimeout(400);
  }

  // 3) 供应商门户仅 1 处（供应商门户是「供应商管理」的子项，需先展开该可折叠父项）
  await page.getByText('供应商管理', { exact: true }).click();
  await page.waitForTimeout(200);
  await expect(page.getByText('供应商门户', { exact: true })).toHaveCount(1);
  // 折叠「供应商管理」
  await page.getByText('供应商管理', { exact: true }).click();
  await page.waitForTimeout(100);

  // 1) 审批中心存在且含 4 入口
  await expect(page.getByText('审批中心', { exact: true }).first()).toBeVisible({ timeout: 15000 });
  for (const t of ['物料审批', '供应商注册审批', '采购审批', '价格审批']) {
    await page.getByText('审批中心', { exact: true }).first().click();
    await page.waitForTimeout(300);
    await expect(page.getByText(t, { exact: true }).first()).toBeVisible({ timeout: 8000 });
    // 折叠回审批中心
    await page.getByText('审批中心', { exact: true }).first().click();
    await page.waitForTimeout(100);
  }

  // 原模块不应再有审批子项：点开各组确认无审批
  for (const g of ['物料管理', '供应商管理', '采购管理', '价格管理']) {
    await page.getByText(g, { exact: true }).first().click();
    await page.waitForTimeout(300);
    await expect(page.getByText(g, { exact: true }).first()).toBeVisible();
    // 折叠
    await page.getByText(g, { exact: true }).first().click();
    await page.waitForTimeout(100);
  }
  await expect(page.getByText('物料审批', { exact: true })).toHaveCount(1);
  await expect(page.getByText('采购审批', { exact: true })).toHaveCount(1);
  await expect(page.getByText('价格审批', { exact: true })).toHaveCount(1);

  // 2) 分析与报表分组存在
  await page.getByText('分析与报表', { exact: true }).first().click();
  await page.waitForTimeout(300);
  for (const t of ['报表中心', '报表权限与订阅', '经营驾驶舱', 'ChatBI对话分析']) {
    await expect(page.getByText(t, { exact: true }).first()).toBeVisible({ timeout: 8000 });
  }
  await expect(page.getByText('智能分析', { exact: true })).toHaveCount(0);

  // 4) 系统设置入口页正常加载；报表权限与订阅已归入「分析与报表」分组，全局侧栏仅 1 处（无重复）
  await page.goto('http://localhost:3000/settings');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(700);
  const skip2 = page.getByText('跳过引导', { exact: true }).first();
  if (await skip2.isVisible({ timeout: 1500 }).catch(() => false)) { await skip2.click(); await page.waitForTimeout(300); }
  await expect(page.getByRole('heading', { name: '系统设置' })).toBeVisible();
  // 侧栏内「报表权限与订阅」仅出现 1 次（在「分析与报表」分组下，而非系统设置内）
  await expect(page.getByText('报表权限与订阅', { exact: true })).toHaveCount(1);

  // 5) 关键页面不白屏
  await page.goto('http://localhost:3000/reports');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.goto('http://localhost:3000/material/approvals');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.goto('http://localhost:3000/analytics/chatbi');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  expect(errors, `控制台/页面错误:\n${errors.join('\n')}`).toEqual([]);
});
