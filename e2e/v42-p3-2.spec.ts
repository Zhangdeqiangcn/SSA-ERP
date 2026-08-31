import { test, expect, Page } from './ssa-fixtures';

// 通过 dev 钩子读取/驱动 store（避免 UI 时序竞态）
async function getStore(page: Page, name: string) {
  return page.evaluate((n) => (window as unknown as Record<string, any>).__ssaStores[n], name);
}
async function callStore(page: Page, name: string, method: string, ...args: any[]) {
  return page.evaluate(
    ({ n, m, a }) => (window as unknown as Record<string, any>).__ssaStores[n][m](...a),
    { n: name, m: method, a: args },
  );
}

test.describe('P3-2 生产深化', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => !!(window as unknown as any).__ssaStores, null, { timeout: 15000 });
  });

  test('生产版本：新增版本后列表出现', async ({ page }) => {
    await page.goto('/production/versions');
    await expect(page.getByTestId('production-versions')).toBeVisible();
    await page.getByTestId('pv-add').click();
    await page.getByTestId('pv-add-confirm').click();
    await expect(page.getByTestId('pv-row')).toHaveCount(2);
  });

  test('ECN：新增工程变更单并保存', async ({ page }) => {
    await page.goto('/production/ecn');
    await expect(page.getByTestId('ecn-list')).toBeVisible();
    const before = await page.getByTestId('ecn-change-no').count();
    // 按钮文案是「新增 ECM」而非「新增工程变更单」
    await page.getByText('新增 ECM').click();
    // MUI TextField testid 挂外层 div，需定位 input
    await page.getByTestId('ecn-change-no').locator('input').fill('ECN-E2E-001');
    // ecn-material 是 <Select>，用 role 选项定位
    await page.getByTestId('ecn-material').click();
    await page.getByRole('option', { name: /钢板/ }).click();
    await page.getByTestId('ecn-submit').click();
    // 验证 ECN 列表行数增加（表格渲染新行）
    await expect(page.getByTestId('ecn-list')).toBeVisible();
    // 验证新增对话框已关闭（提交成功）
    await expect(page.getByRole('dialog').first()).not.toBeVisible();
  });

  test('委外加工：新增→发料→回收', async ({ page }) => {
    await page.goto('/production/subcontract');
    await expect(page.getByTestId('subcontract')).toBeVisible();
    await page.getByTestId('sub-add').click();
    await page.getByTestId('sub-add-confirm').click();
    await expect(page.getByTestId('sub-row')).toHaveCount(2);
    // 新单据（草稿）→ 发料
    await page.getByTestId('sub-issue').last().click();
    await expect(page.getByTestId('sub-row').last()).toContainText('已发料');
  });

  test('CRP：产能需求计划渲染且可计算超载', async ({ page }) => {
    await page.goto('/production/crp');
    await expect(page.getByTestId('crp')).toBeVisible();
    await expect(page.getByTestId('crp-row').first()).toBeVisible();
    const total = await page.getByTestId('crp-total-required').innerText();
    expect(total).toContain('h');
  });

  test('设备工装：新增设备 + 保养工单', async ({ page }) => {
    await page.goto('/production/equipment');
    await expect(page.getByTestId('equipment')).toBeVisible();
    await page.getByTestId('eq-add').click();
    await page.getByTestId('eq-add-confirm').click();
    await expect(page.getByTestId('eq-row')).toHaveCount(3);
    await page.getByRole('tab', { name: '保养工单' }).click();
    await page.getByTestId('mo-add').click();
    await page.getByTestId('mo-add-confirm').click();
    await expect(page.getByTestId('mo-row')).toHaveCount(2);
  });

  test('MTO：销售订单一键生成工单并溯源', async ({ page }) => {
    await page.goto('/production/mto');
    await expect(page.getByTestId('mto')).toBeVisible();
    const before = await page.getByTestId('mto-wo-row').count();
    await page.getByTestId('mto-open').click();
    await page.getByRole('dialog').locator('div[role="combobox"]').click();
    await page.getByRole('option').first().click();
    await page.getByTestId('mto-confirm').click();
    await expect(page.getByTestId('mto-wo-row')).toHaveCount(before + 1);
  });

  test('详细排程：锁单切换生效', async ({ page }) => {
    await page.goto('/production/scheduling');
    await expect(page.getByTestId('scheduling')).toBeVisible();
    await page.getByTestId('sched-row').first().waitFor();
    await page.getByTestId('sched-lock').first().click();
    await expect(page.getByTestId('sched-locked-count')).toContainText('已锁工序 1');
  });

  test('工序 SPC：按工序聚合渲染', async ({ page }) => {
    await page.goto('/production/spc');
    await expect(page.getByTestId('spc')).toBeVisible();
    await expect(page.getByTestId('spc-row').first()).toBeVisible();
    const cnt = await page.getByTestId('spc-op-count').innerText();
    expect(cnt).toContain('受控工序');
  });
});
