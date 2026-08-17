import { test, expect } from '@playwright/test';

test('V2.7 批次管理页渲染与种子数据', async ({ page }) => {
  await page.goto('/warehouse/batch');
  await expect(page.getByRole('heading', { name: '批次管理' })).toBeVisible();
  await expect(page.getByText('B20240510A')).toBeVisible();
  // "已过期" 同时出现在统计卡片与状态 Chip，取首个匹配即可证明已渲染
  await expect(page.getByText('已过期').first()).toBeVisible();
});

test('V2.7 库龄分析页渲染', async ({ page }) => {
  await page.goto('/warehouse/aging');
  await expect(page.getByRole('heading', { name: '库龄分析' })).toBeVisible();
  await expect(page.getByText('效期预警', { exact: false })).toBeVisible();
  await expect(page.getByText('批次库龄分布', { exact: false })).toBeVisible();
});

test('V2.7 现金流量表页渲染', async ({ page }) => {
  await page.goto('/finance/cash-flow');
  await expect(page.getByRole('heading', { name: '现金流量表' })).toBeVisible();
  await expect(page.getByText('经营活动产生的现金流量')).toBeVisible();
  await expect(page.getByText('期末现金及现金等价物余额')).toBeVisible();
});

test('V2.7 采购订单三单匹配指示', async ({ page }) => {
  await page.goto('/purchase/orders');
  await page.locator('table tbody tr').first().click();
  // 三单匹配在 Object Page 化后会出现在锚点导航/分区标题/卡片标题多处，按分区标题(heading)精确定位
  await expect(page.getByRole('heading', { name: '三单匹配', exact: true })).toBeVisible();
  await expect(page.getByText('采购订单 / 收货 / 发票')).toBeVisible();
});

test('V2.7 意向客户信用占用列', async ({ page }) => {
  await page.goto('/sales/prospects');
  await expect(page.getByText('信用占用')).toBeVisible();
  await expect(page.getByText('额度', { exact: false }).first()).toBeVisible();
});

test('V2.7 销售订单信用检查超额度提示', async ({ page }) => {
  await page.goto('/sales/orders/create');
  // A3：客户改为主数据 Autocomplete，信用改为硬拦截（超额禁止提交，区别于旧 Prospect 只警告不拦截）
  const combo = page.getByRole('combobox', { name: '客户主数据' });
  await combo.click();
  await combo.fill('华润建筑集团');
  await page.getByRole('option').filter({ hasText: '华润建筑集团' }).first().click();
  await page.getByRole('button', { name: '添加物料' }).click();
  const mat = page.getByPlaceholder('输入关键字搜索物料').first();
  await mat.click();
  await mat.fill('钢板');
  await page.getByRole('option').first().click();
  // 单价设为超高：价税合计远超 C001 可用额度(约47万)
  const priceInput = page.locator('[data-testid^="so-line-price-"]').first();
  await priceInput.waitFor({ state: 'visible' });
  await priceInput.fill('9999999');
  await page.locator('[data-testid^="so-line-qty-"]').first().fill('1');
  await page.getByRole('button', { name: '提交订单', exact: true }).click();
  // A3 信用硬拦截：超额禁止提交，弹错误 Alert（区别于旧 Prospect 只警告）
  await expect(page.getByTestId('so-credit-error')).toContainText('禁止提交', { timeout: 5000 });
  // 且停留在新建页（订单未写入、未跳转列表）
  await expect(page.getByRole('heading', { name: '新建销售订单' })).toBeVisible();
});
