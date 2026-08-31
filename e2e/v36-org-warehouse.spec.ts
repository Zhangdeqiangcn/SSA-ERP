import { test, expect } from './ssa-fixtures';

/**
 * V2.13 P2-2 多组织/多账套 + 多仓多库位主数据 E2E：
 *  - 设置页「组织账套」Tab：渲染多组织说明与种子组织，store 含 3 个组织
 *  - 仓库主数据页：渲染仓库表与种子仓库，新增仓库 → 写入 store 并持久化 ssa-erp-warehouse-master
 */

type PageEx = import('@playwright/test').Page;

test.setTimeout(180_000);
test.use({ expect: { timeout: 60_000 } });

const waitStores = (page: PageEx) =>
  page.waitForFunction(() => (window as unknown as Record<string, unknown>).__ssaStores);

let errors: string[] = [];

test.describe('P2-2 组织账套 + 仓库主数据', () => {
  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('dialog', (d) => d.accept());
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (msg) => {
      const t = msg.text();
      if (
        msg.type() === 'error' &&
        !t.includes('validateDOMNesting') &&
        !t.includes('A props object containing a "key" prop') &&
        !t.includes('disabled `button` child to the Tooltip')
      ) {
        errors.push('console.error: ' + t);
      }
    });
  });

  test('组织账套 Tab 渲染 + 种子组织', async ({ page }) => {
    await page.goto('/settings');
    await waitStores(page);
    await page.getByRole('button', { name: '组织账套' }).click();
    await expect(page.getByText('多组织 / 多账套', { exact: false })).toBeVisible();
    // 种子组织可见
    await expect(page.getByText('华东制造公司', { exact: false })).toBeVisible();
    // store 含 3 个组织
    expect(
      await page.evaluate(
        () => (window as unknown as Record<string, any>).__ssaStores.useOrgStore.getState().organizations.length
      )
    ).toBe(6);
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('仓库主数据：渲染 + 新增仓库持久化', async ({ page }) => {
    const marker = `E2E仓${Date.now()}`;
    await page.goto('/warehouse/master');
    await waitStores(page);
    await expect(page.getByRole('heading', { name: '仓库主数据' })).toBeVisible();
    await expect(page.getByText('主仓库', { exact: false })).toBeVisible();

    const before = await page.evaluate(
      () => (window as unknown as Record<string, any>).__ssaStores.useWarehouseMasterStore.getState().warehouses.length
    );

    await page.getByRole('button', { name: '新增仓库' }).click();
    await page.getByRole('dialog').getByLabel('仓库编码').fill(`wh-e2e-${Date.now()}`);
    await page.getByRole('dialog').getByLabel('名称').fill(marker);
    await page.getByRole('dialog').getByRole('button', { name: '保存' }).click();

    // 表格出现新仓库
    await expect(page.getByText(marker, { exact: false })).toBeVisible();
    // store 增加
    expect(
      await page.evaluate(
        (m: string) =>
          (window as unknown as Record<string, any>).__ssaStores.useWarehouseMasterStore
            .getState()
            .warehouses.some((w: { name: string }) => w.name === m),
        marker
      )
    ).toBe(true);
    // 持久化
    expect(
      await page.evaluate(
        (m: string) => (localStorage.getItem('ssa-erp-warehouse-master') ?? '').includes(m),
        marker
      )
    ).toBe(true);
    // 数量确实 +1
    const after = await page.evaluate(
      () => (window as unknown as Record<string, any>).__ssaStores.useWarehouseMasterStore.getState().warehouses.length
    );
    expect(after).toBe(before + 1);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });
});
