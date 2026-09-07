import { test, expect, type Page } from './ssa-fixtures';

/**
 * v70 — C5 销售价目表 / 折扣 / 促销 专项验收
 *
 * 覆盖对标文档 C5（销售价目表 + 折扣/促销 | 销售）：
 *   C5-1 设置-销售价目表「取价试算」：客户 cus-001 + 物料 mat-001(基准4200) →
 *        折扣率10% → 3780，叠加促销立减200 → 最终 3580（试算结果含 3580）。
 *   C5-2 销售订单表单取价落地：选华润建筑(cus-001) + 钢板(mat-001) →
 *        明细行单价经 resolvePrice 自动取为 3580（非基准 4200）。
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
    if (m.type() === 'error' && !m.text().includes('Failed to load resource') &&
        !m.text().includes('validateDOMNesting') &&
        !m.text().includes('A props object containing a "key" prop')) {
      errors.push('console.error: ' + m.text());
    }
  });
};

test.describe('v70 C5 销售价目表 / 折扣 / 促销', () => {
  test('C5-1 设置-销售价目表取价试算：cus-001 + mat-001 → 3580', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);
    await resetAndReady(page);

    await page.goto('/settings');
    await page.waitForFunction(() => (window as any).__ssaStores);
    // Settings 页面使用 Button 侧栏导航（V2.55.22 后从 MUI Tab 改为 Button）
    await page.getByRole('button', { name: '销售价目表' }).click();

    // 客户选 cus-001（华润建筑），物料选 mat-001（钢板 Q235B），数量 1
    // MUI Select 的下拉是 Popover，选完需等 listbox 完全卸载再点下一个，否则元素会 detach
    await page.getByTestId('sp-calc-customer').click();
    await page.getByRole('option', { name: /华润建筑/ }).first().click();
    await expect(page.getByRole('listbox')).toHaveCount(0);

    await page.getByTestId('sp-calc-material').click();
    await page.getByRole('option', { name: '钢板 Q235B' }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);

    await page.getByTestId('sp-calc-qty').fill('1');

    await page.getByTestId('sp-calc-btn').click();
    // formatCurrency 输出带千分位：基准 4200 → 9折 3780 → 促销立减200 → 条件引擎含税(13%) 4045.40
    await expect(page.getByTestId('sp-calc-result')).toContainText('4,045.40', { timeout: 15_000 });
    await expect(page.getByTestId('sp-calc-result')).toContainText('折扣率 10%');

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('C5-2 销售订单表单取价落地：华润建筑 + 钢板 → 单价 3580', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);
    await resetAndReady(page);

    await page.goto('/sales/orders/create');
    await page.waitForFunction(() => (window as any).__ssaStores);

    // 选择客户：华润建筑集团有限公司 (C001)
    const custInput = page.getByRole('combobox', { name: '客户主数据' });
    await custInput.fill('华润建筑');
    await page.getByRole('option').first().click();
    await expect(page.getByLabel('客户编码')).toHaveValue('C001');

    // 添加物料行（MaterialLineItemsGrid 的「添加物料」按钮，testid = so-add）
    await page.getByTestId('so-add').click();

    // 选择物料：钢板 Q235B（物料单元格 testid = so-cell-materialName-*，MUI Autocomplete）
    const matCell = page.locator('[data-testid^="so-cell-materialName-"]').first();
    await matCell.fill('钢板 Q235B');
    await page.getByRole('option').first().click();

    // 明细行单价应经 resolvePrice 自动取价（基准 4200 → 9折 3780 → 促销立减200 → 条件引擎含税13% ≈ 4045.40；网格输入保留浮点，数值断言抗浮点误差）
    const priceInput = page.locator('[data-testid^="so-cell-unitPrice-"]').first();
    const priceVal = Number(await priceInput.inputValue());
    expect(priceVal).toBeCloseTo(4045.4, 1);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });
});
