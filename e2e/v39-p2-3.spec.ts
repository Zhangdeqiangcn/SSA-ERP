import { test, expect, Page } from '@playwright/test';

/**
 * P2-3 生产执行深化 E2E
 * 覆盖：工序报工 / WIP 看板 / 成本归集 / APS 有限产能排程 四个新页面
 * 及报工回写工单、工作中心产能持久化（store 化纪律验证）。
 */

const storeState = (page: Page, name: string) =>
  page.evaluate((n: string) => {
    const stores = (window as unknown as { __ssaStores: Record<string, any> }).__ssaStores;
    return stores[n].getState();
  }, name);

test.describe('P2-3 生产执行深化', () => {
  test('四个 P2-3 页面均可访问（标题渲染）', async ({ page }) => {
    await page.goto('/production/operation-reporting');
    await expect(page.getByRole('heading', { name: /^工序报工/ })).toBeVisible();

    await page.goto('/production/wip');
    await expect(page.getByRole('heading', { name: /^WIP 在制品看板/ })).toBeVisible();

    await page.goto('/production/cost');
    await expect(page.getByRole('heading', { name: /^成本归集/ })).toBeVisible();

    await page.goto('/production/aps');
    await expect(page.getByRole('heading', { name: /^APS 有限产能排程/ })).toBeVisible();
  });

  test('工序报工写入记录并回写工单进度', async ({ page }) => {
    await page.goto('/production/operation-reporting');
    await expect(page.getByRole('heading', { name: /^工序报工/ })).toBeVisible();

    const before = await storeState(page, 'useProductionOperationStore');
    const beforeCount = before.operationReports.length;

    // 选中未完工工单 WO-2024-0501
    await page.getByText('WO-2024-0501').first().click();
    // 首个「报工」按钮对应 op-003（组焊，状态 in_progress）
    await page.getByRole('button', { name: '报工' }).first().click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('合格数量').fill('3');
    await dialog.getByLabel('操作工').fill('测试工');
    await dialog.getByRole('button', { name: '提交报工' }).click();

    // 报工记录 +1
    const after = await storeState(page, 'useProductionOperationStore');
    expect(after.operationReports.length).toBe(beforeCount + 1);

    // 工单 wo-001 的 op-003 进度回写为 completed
    const prod = await storeState(page, 'useProductionStore');
    const wo = prod.workOrders.find((w: any) => w.id === 'wo-001');
    const prog = wo?.progress?.find((p: any) => p.operationId === 'op-003');
    expect(prog?.status).toBe('completed');
    expect(prog?.completedQuantity).toBe(3);
  });

  test('APS 工作中心产能编辑并持久化', async ({ page }) => {
    await page.goto('/production/aps');
    await expect(page.getByRole('heading', { name: /^APS 有限产能排程/ })).toBeVisible();

    await page.getByRole('button', { name: '编辑产能' }).click();
    const dialog = page.getByRole('dialog');
    const firstInput = dialog.locator('input').first();
    await firstInput.fill('20');
    await dialog.getByRole('button', { name: '保存' }).click();

    // 持久化到 localStorage（persist 键 ssa-erp-production-op）
    const persisted = await page.evaluate(() => {
      const raw = localStorage.getItem('ssa-erp-production-op');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.state.workCenters[0].capacityHours;
    });
    expect(persisted).toBe(20);

    // 内存态同步
    const op = await storeState(page, 'useProductionOperationStore');
    expect(op.workCenters[0].capacityHours).toBe(20);
  });

  test('成本归集可应用费率并保存实际成本至工单', async ({ page }) => {
    await page.goto('/production/cost');
    await expect(page.getByRole('heading', { name: /^成本归集/ })).toBeVisible();

    // 应用费率（人工 60 / 机器 130）
    await page.getByLabel('人工费率').fill('60');
    await page.getByLabel('机器费率').fill('130');
    await page.getByRole('button', { name: '应用费率' }).click();

    const op = await storeState(page, 'useProductionOperationStore');
    expect(op.laborRate).toBe(60);
    expect(op.machineRate).toBe(130);

    // 保存首条工单实际成本
    await page.getByRole('button', { name: '归集并保存至工单' }).first().click();
    const prod = await storeState(page, 'useProductionStore');
    const saved = prod.workOrders.find((w: any) => w.actualTotalCost != null);
    expect(saved).toBeTruthy();
    expect(saved.actualTotalCost).toBeGreaterThan(0);
  });
});
