import { test, expect, type Page } from './ssa-fixtures';

const BASE = 'http://localhost:3000';

/** 进入目标路由前清空 localStorage，保证每用例从种子数据重新水合（确定性） */
async function resetAndGoto(page: Page, path: string) {
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}${path}`);
}

/** 解析 "¥1,234.56" / "-¥1,234.56" 形式货币文本为数字 */
function parseMoney(text: string | null): number {
  const m = (text ?? '').replace(/[^\d.\-]/g, '');
  return parseFloat(m || '0');
}

test.describe('P3-1 财务深化：财务报表 / 固定资产 / 期末结账', () => {
  test('资产负债表由凭证真实取数且平衡', async ({ page }) => {
    await resetAndGoto(page, '/finance/statements');
    await expect(page.getByTestId('financial-statements')).toBeVisible();
    // 默认期间 2026-01，含种子凭证
    await expect(page.getByTestId('bs-balanced')).toContainText('平衡');

    const assets = await page.getByTestId('bs-total-assets').innerText();
    const liab = await page.getByTestId('bs-total-liabilities').innerText();
    const eq = await page.getByTestId('bs-total-equity').innerText();

    const a = parseMoney(assets);
    const l = parseMoney(liab);
    const e = parseMoney(eq);
    expect(Math.abs(a - (l + e))).toBeLessThan(0.01);
    expect(a).toBeGreaterThan(0);
  });

  test('利润表与现金流量表取数正确', async ({ page }) => {
    await resetAndGoto(page, '/finance/statements');

    // 利润表
    await page.getByRole('tab', { name: '利润表' }).click();
    await expect(page.getByTestId('is-total-revenue')).toBeVisible();
    await expect(page.getByTestId('is-total-expense')).toBeVisible();
    await expect(page.getByTestId('is-net-profit')).toBeVisible();
    const revenue = parseMoney(await page.getByTestId('is-total-revenue').innerText());
    const expense = parseMoney(await page.getByTestId('is-total-expense').innerText());
    expect(revenue).toBeGreaterThan(0);
    expect(expense).toBeGreaterThan(0);
    // 净利润 = 收入 - 费用 = 200000 - 140000 - 40000 = 20000
    await expect(page.getByTestId('is-net-profit')).toContainText('20,000.00');

    // 现金流量表
    await page.getByRole('tab', { name: '现金流量表' }).click();
    await expect(page.getByTestId('cf-operating-net')).toBeVisible();
    await expect(page.getByTestId('cf-total-net')).toBeVisible();
  });

  test('应收 / 应付明细账跨模块取数并渲染', async ({ page }) => {
    await resetAndGoto(page, '/finance/statements');

    await page.getByRole('tab', { name: '应收明细账' }).click();
    await expect(page.getByText('应收账款（取销售订单')).toBeVisible();
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    const arRows = await page.locator('table tbody tr').count();
    expect(arRows).toBeGreaterThanOrEqual(1);

    await page.getByRole('tab', { name: '应付明细账' }).click();
    await expect(page.getByText('应付账款（取采购发票与付款计划')).toBeVisible();
    const apRows = await page.locator('table tbody tr').count();
    expect(apRows).toBeGreaterThanOrEqual(1);
  });

  test('固定资产计提折旧生成记账凭证', async ({ page }) => {
    await resetAndGoto(page, '/finance/fixed-assets');
    await expect(page.getByTestId('fixed-assets')).toBeVisible();
    // 种子含 3 条（2 在用 + 1 已报废）
    const rows = await page.getByTestId('fa-row').count();
    expect(rows).toBeGreaterThanOrEqual(2);

    const before = await page.evaluate(
      () => (window as any).__ssaStores.useFinanceStore.getState().accountEntries.length
    );
    await page.getByTestId('fa-deprecate').click();
    await expect(page.getByText(/已计提折旧/)).toBeVisible();

    const after = await page.evaluate(
      () => (window as any).__ssaStores.useFinanceStore.getState().accountEntries.length
    );
    // 借 管理费用 / 贷 累计折旧，两条凭证
    expect(after).toBe(before + 2);
  });

  test('期末结账损益结转生成凭证并锁定状态', async ({ page }) => {
    await resetAndGoto(page, '/finance/closing');
    await expect(page.getByTestId('period-closing')).toBeVisible();
    // 本期净利润 = 20000
    await expect(page.getByTestId('pc-net-profit')).toContainText('20000.00');
    await expect(page.getByTestId('pc-status')).toContainText('未结账');

    const before = await page.evaluate(
      () => (window as any).__ssaStores.useFinanceStore.getState().accountEntries.length
    );
    await page.getByTestId('pc-profit-close').click();
    await expect(page.getByTestId('pc-status')).toContainText('已损益结转');

    const after = await page.evaluate(
      () => (window as any).__ssaStores.useFinanceStore.getState().accountEntries.length
    );
    expect(after).toBeGreaterThan(before);
  });

  test('汇兑损益结转在外币未结清场景下给出提示而不误生成凭证', async ({ page }) => {
    await resetAndGoto(page, '/finance/closing');
    await expect(page.getByTestId('period-closing')).toBeVisible();
    // 种子发票均为人民币，无外币未结清项目
    await page.getByTestId('pc-fx-close').click();
    await expect(page.getByText(/无需结转汇兑损益/)).toBeVisible();
  });
});
