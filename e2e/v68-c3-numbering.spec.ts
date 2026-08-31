import { test, expect, type Page } from './ssa-fixtures';

/**
 * v68 — C3 统一编号规则中心 + 数据权限（行级/组织级）专项验收
 *
 * 覆盖对标文档 C3（统一编号规则中心（所有单据）+ 数据权限（行级/组织级） | 设置）：
 *   C3-1 编号规则中心：改 WO 前缀 → 实时预览更新 + 试生成结果含新前缀
 *   C3-2 标准工单接入编号中心：新建工单号来自 WO 规则（WO-YYYY-####）并落库（workOrders +1）
 *   C3-3 数据权限（仅当前组织）：建工单(归 ORG-001) → 切 ORG-002 后该工单从列表消失、
 *        可见数 -1、组织过滤横幅可见
 *
 * 每个用例开局清空 ssa-erp-* localStorage，从初始 Mock 起步，保证状态确定。
 */

test.setTimeout(180_000);
test.use({ expect: { timeout: 60_000 } });

const resetAndReady = async (page: Page) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__ssaStores);
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('ssa-erp-'))
      .forEach((k) => localStorage.removeItem(k));
  });
  await page.reload();
  await page.waitForFunction(() => (window as any).__ssaStores);
};

const captureErrors = (page: Page, errors: string[]) => {
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' &&
        !m.text().includes('validateDOMNesting') &&
        !m.text().includes('A props object containing a "key" prop')) {
      errors.push('console.error: ' + m.text());
    }
  });
};

const getState = (page: Page, expr: string) =>
  page.evaluate((e) => {
    const S = (window as any).__ssaStores;
    // eslint-disable-next-line no-eval
    return eval(e);
  }, expr);

const visibleCount = async (page: Page): Promise<number> => {
  const txt = await page.getByTestId('wo-visible-count').innerText();
  const m = txt.match(/\d+/);
  return m ? Number(m[0]) : -1;
};

test.describe('v68 C3 编号规则中心 + 数据权限', () => {
  test('C3-1 改 WO 前缀 → 预览更新 + 试生成结果含新前缀', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);
    await resetAndReady(page);

    await page.goto('/settings');
    await page.getByRole('button', { name: '编号规则' }).click();

    // 改前缀为 WORK
    const prefixInput = page.getByTestId('nr-prefix-WO').locator('input');
    await prefixInput.fill('WORK');

    // 实时预览应含新前缀
    await expect(page.getByTestId('nr-preview-WO')).toContainText('WORK');

    // 试生成结果应含新前缀
    await page.getByTestId('nr-sample').click();
    await expect(page.getByTestId('nr-sample-result')).toContainText('WORK');

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('C3-2 标准工单新建 → 工单号来自 WO 规则(WO-YYYY-####) 并落库', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);
    await resetAndReady(page);

    await page.goto('/production/orders');
    await page.waitForFunction(() => (window as any).__ssaStores);

    const before = await getState(page, 'S.useProductionStore.getState().workOrders.length');

    await page.getByRole('button', { name: '新建工单' }).click();
    await page.getByTestId('wo-product').locator('input').fill('测试产品C3');
    await page.getByTestId('wo-save').click();

    const after = await getState(page, 'S.useProductionStore.getState().workOrders.length');
    expect(after, 'workOrders 应 +1').toBe(before + 1);

    // 最新工单应为本次新建，编号符合 WO-YYYY-####
    const last = await getState(
      page,
      '(() => { const w = S.useProductionStore.getState().workOrders; return w[w.length-1]; })()'
    );
    expect(last.orderNo, `工单号应来自 WO 规则，实际 ${last.orderNo}`).toMatch(/^WO-\d{4}-\d{4}$/);
    expect(last.orgId, '新建工单应归属当前组织 ORG-001').toBe('ORG-001');

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('C3-3 数据权限(仅当前组织)：建工单(ORG-001) → 切 ORG-002 后消失、可见数-1、横幅可见', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);
    await resetAndReady(page);

    // 开启数据权限：仅当前组织
    await page.waitForLoadState('networkidle');
    await page.goto('/settings');
    await page.getByRole('button', { name: '数据权限' }).click();
    const sw = page.getByTestId('dp-switch');
    if (!(await sw.isChecked())) await sw.click();
    await page.getByTestId('dp-mode-current-org').click();

    // 进入生产工单列表（当前组织 ORG-001）
    await page.goto('/production/orders');
    await page.waitForFunction(() => (window as any).__ssaStores);

    const n0 = await visibleCount(page);

    // 新建一张归属 ORG-001 的工单
    await page.getByRole('button', { name: '新建工单' }).click();
    await page.getByTestId('wo-product').locator('input').fill('权限测试工单');
    await page.getByTestId('wo-save').click();
    // 等待工单保存完成（store 更新）
    await page.waitForTimeout(500);

    const newId = await getState(
      page,
      '(() => { const w = S.useProductionStore.getState().workOrders; return w[w.length-1]?.id; })()'
    );

    // 用 store 直接验证工单存在且归属 ORG-001
    const orgMatch = await getState(
      page,
      '(() => { const w = S.useProductionStore.getState().workOrders; const last = w[w.length-1]; return last?.orgId === "ORG-001"; })()'
    );
    expect(orgMatch, '新建工单应归属 ORG-001').toBe(true);

    // 新建后（仍处 ORG-001）可见数应 +1（新工单归属当前组织，数据权限下仍可见）
    const n1 = await visibleCount(page);
    expect(n1, '新建归属 ORG-001 的工单在当前组织应可见，可见数 +1').toBe(n0 + 1);

    // 切换组织到 ORG-002（华东制造公司）
    await page.getByTestId('org-switcher').click();
    await page.getByRole('option', { name: '华东制造公司' }).click();
    await page.waitForTimeout(500);

    const n2 = await visibleCount(page);
    // 切换组织后，可见数应回到 n0（新工单归属 ORG-001，不可见）
    expect(n2, '切到 ORG-002 后该工单应消失，可见数回到 n0').toBe(n0);
    // 横幅应显示当前组织
    await expect(page.getByTestId('wo-org-banner')).toBeVisible();

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });
});
