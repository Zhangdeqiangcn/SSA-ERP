import { test, expect, type Page } from '@playwright/test';

/**
 * v32 — P0 五处死链修复专项回归
 *
 * 覆盖深度对标文档 P0 路线图中的 5 处死链（按钮/菜单无 onClick 或仅 alert 演示）：
 *   1. 仓储·盘点单：新建盘点（生成盘点任务）→ 完成盘点（盘盈盘亏过账库存）
 *   2. 生产·工艺路线：新建工艺路线真实落库
 *   3. 生产·工单：新建工单真实落库（不再跳转空 MRP 壳）
 *   4. 销售·意向客户：新增/编辑真实落库
 *   5. 价格·价目表：手工录入真实落库
 *
 * 全程采集 pageerror / console.error，最终断言为零（防白屏回归）。
 * 每个用例开局清空 ssa-erp-* localStorage，从初始 Mock 起步，保证计数断言确定。
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

test.describe('v32 P0 死链修复', () => {
  test('仓储·盘点单新建并过账调整库存', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);

    await resetAndReady(page);
    const before = await page.evaluate(() => (window as any).__ssaStores.useWarehouseStore.getState().checkTasks.length);

    await page.goto('/warehouse/check');
    await page.getByRole('button', { name: '新建盘点' }).click();

    // 选择第一个「有库存」的仓库，保证盘点明细非空
    const whName = await page.evaluate(() => {
      const st = (window as any).__ssaStores.useWarehouseStore.getState();
      const map = new Map<string, string>();
      st.inventoryRecords.forEach((r: any) => { if (r.warehouseId) map.set(r.warehouseId, r.warehouseName || r.warehouseId); });
      for (const [id, name] of map.entries()) {
        if (st.inventoryRecords.filter((r: any) => r.warehouseId === id).length > 0) return name;
      }
      return null;
    });
    expect(whName, '应存在有库存的仓库').toBeTruthy();

    await page.getByLabel('仓库').click();
    await page.getByRole('option', { name: whName as string }).click();
    await page.getByTestId('check-create-confirm').click();

    const afterCreate = await page.evaluate(() => (window as any).__ssaStores.useWarehouseStore.getState().checkTasks.length);
    expect(afterCreate, '盘点单应 +1').toBe(before + 1);

    // 等待盘点任务页渲染
    await page.getByRole('button', { name: '完成盘点' }).waitFor();

    const ctx = await page.evaluate(() => {
      const st = (window as any).__ssaStores.useWarehouseStore.getState();
      const t = st.checkTasks[st.checkTasks.length - 1];
      const first = t.items[0];
      const r = st.inventoryRecords.find((x: any) => x.materialId === first.materialId && x.locationId === first.locationId);
      return {
        taskId: t.id,
        items: t.items.map((i: any) => ({ book: i.bookQuantity, materialId: i.materialId, locationId: i.locationId })),
        beforeQty: r ? r.quantity : null,
      };
    });
    expect(ctx.items.length, '盘点单应有明细行').toBeGreaterThan(0);

    // 填写盘点数量：首行盘盈 +10，其余等于账面
    const inputs = page.locator('table input[type="number"]');
    const n = await inputs.count();
    for (let i = 0; i < n; i++) {
      const val = i === 0 ? ctx.items[i].book + 10 : ctx.items[i].book;
      await inputs.nth(i).fill(String(val));
    }

    await page.getByRole('button', { name: '完成盘点' }).click();

    const res = await page.evaluate((c: any) => {
      const st = (window as any).__ssaStores.useWarehouseStore.getState();
      const t = st.checkTasks.find((x: any) => x.id === c.taskId);
      const r = st.inventoryRecords.find((x: any) => x.materialId === c.items[0].materialId && x.locationId === c.items[0].locationId);
      return { status: t?.status, qty: r ? r.quantity : null };
    }, ctx);

    expect(res.status, '盘点任务应标记完成').toBe('completed');
    if (ctx.beforeQty !== null) {
      expect(res.qty, '首行盘盈 +10 应调整库存').toBe(ctx.beforeQty + 10);
    }
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('生产·工艺路线新建真实落库', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);

    await resetAndReady(page);
    const before = await page.evaluate(() => (window as any).__ssaStores.useProductionStore.getState().processRoutes.length);

    await page.goto('/production/routes');
    await page.getByRole('button', { name: '新建工艺路线' }).click();
    await page.getByTestId('route-no').locator('input').fill(`RT-E2E-${Date.now()}`);
    await page.getByTestId('route-name').locator('input').fill('E2E工艺路线');
    await page.getByTestId('route-product').locator('input').fill('E2E产品');
    await page.getByLabel('工序名称').first().fill('下料');
    await page.getByLabel('工作中心').first().fill('CNC中心');
    await page.getByTestId('route-save').click();

    const after = await page.evaluate(() => (window as any).__ssaStores.useProductionStore.getState().processRoutes.length);
    expect(after, '工艺路线应 +1').toBe(before + 1);
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('生产·工单新建真实落库（不再跳转空 MRP 壳）', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);

    await resetAndReady(page);
    const before = await page.evaluate(() => (window as any).__ssaStores.useProductionStore.getState().workOrders.length);

    await page.goto('/production/orders');
    await page.getByRole('button', { name: '新建工单' }).click();
    await page.getByTestId('wo-product').locator('input').fill('E2E生产产品');
    await page.getByTestId('wo-save').click();

    const after = await page.evaluate(() => (window as any).__ssaStores.useProductionStore.getState().workOrders.length);
    expect(after, '工单应 +1').toBe(before + 1);
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('销售·意向客户新增真实落库', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);

    await resetAndReady(page);
    const before = await page.evaluate(() => (window as any).__ssaStores.useSalesStore.getState().prospects.length);

    await page.goto('/sales/prospects');
    await page.getByRole('button', { name: '新增意向客户' }).click();
    await page.getByTestId('prospect-company').locator('input').fill(`E2E公司${Date.now()}`);
    await page.getByTestId('prospect-save').click();

    const after = await page.evaluate(() => (window as any).__ssaStores.useSalesStore.getState().prospects.length);
    expect(after, '意向客户应 +1').toBe(before + 1);
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('价格·价目表手工录入真实落库', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);

    await resetAndReady(page);
    const before = await page.evaluate(() => (window as any).__ssaStores.usePriceStore.getState().priceList.length);

    await page.goto('/price/list');
    await page.getByRole('button', { name: '手工录入' }).click();
    await page.getByTestId('price-material').locator('input').fill(`E2E物料${Date.now()}`);
    await page.getByTestId('price-vendor').locator('input').fill('E2E供应商');
    await page.getByTestId('price-unitprice').locator('input').fill('99');
    await page.getByTestId('price-save').click();

    const after = await page.evaluate(() => (window as any).__ssaStores.usePriceStore.getState().priceList.length);
    expect(after, '价目表项应 +1').toBe(before + 1);
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });
});
