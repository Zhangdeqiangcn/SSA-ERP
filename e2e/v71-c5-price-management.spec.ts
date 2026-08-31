import { test, expect, type Page } from './ssa-fixtures';

/**
 * v71 — C5 销售价目表「管理页」增删改 + 促销 E2E
 *
 * 验收点位（与 SalesPriceTab.tsx 的 data-testid 一一对应）：
 *   A 新增价目表项：sp-price-add → 选物料/填单价 → sp-dlg-save → 新行含 9,999
 *   B 编辑价目表项：sp-price-edit-* → 改基准单价 → 含 8,888
 *   C 删除价目表项：sp-price-delete-* → 行数 -1（兼容二次确认弹窗）
 *   D 新增促销：sp-promo-add → 名称/类型/优惠值 → sp-dlg-promo-save → 促销行含「测试促销C5」
 *
 * 每个测试开局清空 ssa-erp-* localStorage，从初始 Mock 起步，保证用例相互独立。
 * 纯前端 SPA 约定：MUI Select 的 data-testid 挂在 SelectDisplayProps 的 div 上，
 * 打开后到 listbox 中选 option；number 输入框 role=spinbutton，用 .locator('input').fill 填值。
 */

test.setTimeout(60_000);
test.use({ expect: { timeout: 15_000 } });

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

const gotoSalesPriceTab = async (page: Page) => {
  await page.goto('/settings');
  await page.waitForFunction(() => (window as any).__ssaStores);
  // Settings 页面使用 Button 侧栏导航
  try {
    await page.getByRole('button', { name: '销售价目表' }).click();
  } catch {
    await page.getByText('销售价目表', { exact: true }).click();
  }
  await expect(page.getByTestId('sp-price-add')).toBeVisible();
};

test.describe('v71 C5 销售价目表管理页（增删改 + 促销）', () => {
  test('A 新增价目表项：选通用价 + 钢板 Q235B + 单价 9999 → 列表出现 9,999', async ({ page }) => {
    await resetAndReady(page);
    await gotoSalesPriceTab(page);

    const before = await page.locator('[data-testid^="sp-price-row-"]').count();

    await page.getByTestId('sp-price-add').click();

    // 客户选「通用物料价」（值为空 ''）
    await page.getByTestId('sp-dlg-customer').click();
    await page.getByRole('option', { name: '通用物料价' }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);

    // 物料选「钢板 Q235B」
    await page.getByTestId('sp-dlg-material').click();
    await page.getByRole('option', { name: '钢板 Q235B' }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);

    // 基准单价 9999、折扣率 0
    await page.getByTestId('sp-dlg-basePrice').locator('input').fill('9999');
    await page.getByTestId('sp-dlg-discount').locator('input').fill('0');

    await page.getByTestId('sp-dlg-save').click();

    // 新行出现（行数 +1）且含千分位金额 9,999
    await expect(page.locator('[data-testid^="sp-price-row-"]')).toHaveCount(before + 1);
    await expect(page.getByText(/9,999/)).toBeVisible();
  });

  test('B 编辑价目表项：首行改基准单价 8888 → 列表含 8,888', async ({ page }) => {
    await resetAndReady(page);
    await gotoSalesPriceTab(page);

    // 编辑列表首行
    await page.locator('[data-testid^="sp-price-edit-"]').first().click();

    // 对话框应预填并进入编辑态（标题为「编辑价目表项」）
    await expect(page.getByText('编辑价目表项')).toBeVisible();

    // 仅改基准单价为 8888（不触发物料重选，避免覆盖 basePrice）
    await page.getByTestId('sp-dlg-basePrice').locator('input').fill('8888');

    await page.getByTestId('sp-dlg-save').click();

    // 编辑后该行显示 8,888
    await expect(page.getByText(/8,888/)).toBeVisible();
  });

  test('C 删除价目表项：首行删除 → 行数 -1（兼容二次确认）', async ({ page }) => {
    await resetAndReady(page);
    await gotoSalesPriceTab(page);

    const before = await page.locator('[data-testid^="sp-price-row-"]').count();

    await page.locator('[data-testid^="sp-price-delete-"]').first().click();

    // 若实现弹出二次确认对话框，则点确认；无确认则忽略
    await page.getByRole('button', { name: /确认|确定/ }).first().click({ timeout: 2_000 }).catch(() => {});

    await expect(page.locator('[data-testid^="sp-price-row-"]')).toHaveCount(before - 1);
  });

  test('D 新增促销：名称 测试促销C5 + 百分比折扣 5 → 促销行出现', async ({ page }) => {
    await resetAndReady(page);
    await gotoSalesPriceTab(page);

    await page.getByTestId('sp-promo-add').click();

    await page.getByTestId('sp-dlg-promo-name').locator('input').fill('测试促销C5');

    await page.getByTestId('sp-dlg-promo-type').click();
    await page.getByRole('option', { name: '百分比折扣' }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);

    await page.getByTestId('sp-dlg-promo-value').locator('input').fill('5');

    await page.getByTestId('sp-dlg-promo-save').click();

    await expect(page.getByText('测试促销C5')).toBeVisible();
  });
});
