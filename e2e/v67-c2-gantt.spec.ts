import { test, expect, type Page } from './ssa-fixtures';

/**
 * v67 — C2 甘特图拖拽排产 + 负荷联动重排 专项验收
 *
 * 覆盖对标文档 C2（甘特图拖拽排产 + 负荷联动重排 | 生产域 | 排产体验对标 PPDS）：
 *   C2-1 前移按钮使 wo-001 计划开始日减 1 天且持久化（productionStore persist）。
 *   C2-2 切割中心初始显示超载标红（load-overload-切割中心 可见），峰值利用率 > 100%。
 *   C2-3 点击负荷联动重排后：超载标红消失、峰值利用率 ≤ 100%、同中心 wo-001/wo-002 不重叠
 *        （wo-planned-end-wo-001 < wo-planned-start-wo-002）。
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

const getWoDate = (page: Page, id: string, field: 'plannedStartDate' | 'plannedEndDate') =>
  page.evaluate(
    ([wid, f])=> (window as any).__ssaStores.useProductionStore.getState().workOrders.find((w:any)=>w.id===wid)?.[f],
    [id, field] as const
  );

test.describe('v67 C2 甘特排产 + 负荷联动重排', () => {
  test('C2-1 前移按钮使 wo-001 计划开始日减 1 天并持久化', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);
    await resetAndReady(page);

    const before = await getWoDate(page, 'wo-001', 'plannedStartDate');

    await page.goto('/production/gantt');
    await page.getByTestId('wo-shift-left-wo-001').click();

    const after = await getWoDate(page, 'wo-001', 'plannedStartDate');
    // 减 1 天：ISO 字符串按字典序可直接比较
    const expectBefore = new Date(before).getTime() - 86_400_000;
    expect(new Date(after).getTime(), '开始日应减 1 天').toBe(expectBefore);

    // 持久化校验：刷新后仍为改期后日期
    await page.reload();
    await page.waitForFunction(() => (window as any).__ssaStores);
    const persisted = await getWoDate(page, 'wo-001', 'plannedStartDate');
    expect(persisted, '刷新后应持久化改期结果').toBe(after);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('C2-2 切割中心初始显示超载标红，峰值利用率 > 100%', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);
    await resetAndReady(page);

    await page.goto('/production/gantt');

    // 超载标红可见
    await expect(page.getByTestId('load-overload-切割中心')).toBeVisible();

    // 峰值利用率文本含 > 100
    const peakText = await page.getByTestId('load-peak-切割中心').innerText();
    const peak = Number(peakText.replace(/[^0-9.]/g, ''));
    expect(peak, `切割中心峰值利用率应 > 100，实际 ${peakText}`).toBeGreaterThan(100);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('C2-3 负荷联动重排后：超载消失、峰值 ≤ 100%、同中心不重叠', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);
    await resetAndReady(page);

    await page.goto('/production/gantt');

    // 重排前确认存在超载（前置状态）
    await expect(page.getByTestId('load-overload-切割中心')).toBeVisible();

    await page.getByTestId('reschedule-btn').click();

    // 超载标红消失
    await expect(page.getByTestId('load-overload-切割中心')).toBeHidden();

    // 峰值利用率 ≤ 100
    const peakText = await page.getByTestId('load-peak-切割中心').innerText();
    const peak = Number(peakText.replace(/[^0-9.]/g, ''));
    expect(peak, `重排后峰值利用率应 ≤ 100，实际 ${peakText}`).toBeLessThanOrEqual(100);

    // 同中心 wo-001 / wo-002 不重叠：end-wo-001 < start-wo-002
    const end1 = await getWoDate(page, 'wo-001', 'plannedEndDate');
    const start2 = await getWoDate(page, 'wo-002', 'plannedStartDate');
    expect(end1, 'wo-001 结束日').toBeTruthy();
    expect(start2, 'wo-002 开始日').toBeTruthy();
    expect(
      new Date(end1).getTime() < new Date(start2).getTime(),
      `同中心不应重叠：end(${end1}) 应早于 start(${start2})`
    ).toBe(true);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });
});
