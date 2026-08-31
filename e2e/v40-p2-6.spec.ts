import { test, expect, type Page } from './ssa-fixtures';

const BASE = 'http://localhost:3000';

/** 在带 InputLabel 的 MUI FormControl 中选取下拉选项（避免多 Select 歧义） */
async function pick(page: Page, label: string, option: string) {
  await page.locator('.MuiFormControl-root', { hasText: label }).locator('.MuiSelect-select').click();
  await page.getByRole('option', { name: option, exact: false }).first().click();
}

test.describe('P2-6 报表接入财务数据集 + 跨模块 join', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/reports/bi`);
    await expect(page.getByRole('heading', { name: 'BI 自助分析' })).toBeVisible();
  });

  test('财务报表数据集可选并出图', async ({ page }) => {
    await pick(page, '分析数据集', '财务发票');
    await pick(page, '维度（分组字段）', '供应商');
    await pick(page, '度量（数值字段）', '含税金额');
    await expect(page.locator('svg').first()).toBeVisible();
    const heading = await page.getByText(/分析结果（\d+ 组）/).first().innerText();
    expect(heading).toMatch(/分析结果（\d+ 组）/);
  });

  test('跨模块关联 join 产出关联数据并渲染', async ({ page }) => {
    // 财务发票(purchaseOrderNo) × 采购订单(orderNo) —— 保证重叠的跨模块关联
    await pick(page, '左侧数据集', '财务发票');
    await pick(page, '左侧关联字段', 'purchaseOrderNo');
    await pick(page, '右侧数据集', '采购订单');
    await pick(page, '右侧关联字段', 'orderNo');
    await pick(page, '关联方式', '内连接');
    await page.getByRole('button', { name: '生成关联数据集' }).click();

    const alert = page.getByText(/已关联\s*\d+\s*条/);
    await expect(alert).toBeVisible();

    // 选右表度量（R· 前缀）证明跨模块字段被纳入分析
    await pick(page, '度量（数值字段）', 'R·总金额');
    await expect(page.locator('svg').first()).toBeVisible();
  });
});
