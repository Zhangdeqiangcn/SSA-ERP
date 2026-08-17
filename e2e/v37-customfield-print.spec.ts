import { test, expect } from '@playwright/test';

/**
 * V2.13 P2-1 剩余：自定义字段 + 打印模板设计器 E2E：
 *  - 设置页「自定义字段」Tab：为物料新增自定义字段 → 写入 store 并持久化 ssa-erp-customfield
 *    → 物料新增表单自动渲染该字段
 *  - 设置页「打印模板」Tab：设计器与默认模板实时预览渲染、无运行时错误
 *  - 采购订单列表「打印」入口：打开打印对话框并套用模板渲染单据
 */

type PageEx = import('@playwright/test').Page;

test.setTimeout(180_000);
test.use({ expect: { timeout: 60_000 } });

const waitStores = (page: PageEx) =>
  page.waitForFunction(() => (window as unknown as Record<string, unknown>).__ssaStores);

let errors: string[] = [];

test.describe('P2-1 自定义字段 + 打印模板', () => {
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

  test('自定义字段：新增物料字段 → 持久化 + 物料表单渲染', async ({ page }) => {
    const marker = `环保等级${Date.now()}`;
    await page.goto('/settings');
    await waitStores(page);
    await page.getByRole('tab', { name: '自定义字段' }).click();
    await expect(page.getByRole('heading', { name: '自定义字段' })).toBeVisible();

    // 默认实体为「物料」，直接新增字段
    await page.getByRole('button', { name: '新增字段' }).click();
    await page.getByRole('dialog').getByLabel('字段名称').fill(marker);
    await page.getByRole('dialog').getByRole('button', { name: '保存' }).click();

    // 表格中出现该字段
    await expect(page.getByText(marker, { exact: false })).toBeVisible();

    // 写入 store（ssa-erp-customfield）
    expect(
      await page.evaluate(
        (m: string) =>
          (window as unknown as Record<string, any>).__ssaStores.useCustomFieldStore
            .getState()
            .fields.material.some((f: { label: string }) => f.label === m),
        marker
      )
    ).toBe(true);

    // 持久化
    expect(
      await page.evaluate(
        (m: string) => (localStorage.getItem('ssa-erp-customfield') ?? '').includes(m),
        marker
      )
    ).toBe(true);

    // 物料新增表单自动渲染该自定义字段
    await page.goto('/material/create');
    await waitStores(page);
    await expect(page.getByText(marker, { exact: false }).first()).toBeVisible();

    // 刷新后仍持久化
    await page.reload();
    await waitStores(page);
    expect(
      await page.evaluate(
        (m: string) =>
          (window as unknown as Record<string, any>).__ssaStores.useCustomFieldStore
            .getState()
            .fields.material.some((f: { label: string }) => f.label === m),
        marker
      )
    ).toBe(true);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('打印模板：设计器渲染 + 默认模板预览', async ({ page }) => {
    await page.goto('/settings');
    await waitStores(page);
    await page.getByRole('tab', { name: '打印模板' }).click();
    await expect(page.getByRole('heading', { name: '打印模板设计器' })).toBeVisible();

    // 默认采购订单模板存在并预览渲染（模板标题「采购订单」出现）
    await expect(page.getByText('采购订单', { exact: false }).first()).toBeVisible();
    // 预览区含有样例字段（供应商）
    await expect(page.getByText('供应商', { exact: false }).first()).toBeVisible();

    // 默认采购订单模板已在 store 中（persist 仅在变更后写盘，故校验 store 而非 localStorage）
    expect(
      await page.evaluate(
        () => !!window.__ssaStores.usePrintTemplateStore.getState().getTemplateByEntity('purchaseOrder')
      )
    ).toBe(true);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('采购订单列表：打印入口套用模板渲染', async ({ page }) => {
    await page.goto('/purchase/orders');
    await waitStores(page);
    await page.getByRole('button', { name: '打印' }).click();
    await expect(page.getByText('打印采购订单', { exact: false })).toBeVisible();
    // 套用默认采购订单模板渲染单据（标题出现）
    await expect(page.getByText('采购订单', { exact: false }).first()).toBeVisible();

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });
});
