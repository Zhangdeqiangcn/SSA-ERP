import { test, expect } from './ssa-fixtures';

// Phase 2 / Phase 3 新增页面冒烟测试（验证渲染，避免白屏）
// 路由：/quality/aql, /warehouse/barcode, /production/capacity,
//       /reports/designer, /reports/bi, /settings（单位换算/对接配置/移动端）
// 注意：dev 模式下首次加载需按需编译大量模块，放宽断言超时。

test.setTimeout(180_000);
test.use({ expect: { timeout: 60_000 } });

test('Phase2 AQL 抽样检验方案页渲染', async ({ page }) => {
  await page.goto('/quality/aql');
  await expect(page.getByRole('heading', { name: 'AQL 抽样检验方案' })).toBeVisible();
  await expect(page.getByText('批量大小').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '保存方案' })).toBeVisible();
});

test('Phase2 条码打印（Code 39）页渲染', async ({ page }) => {
  await page.goto('/warehouse/barcode');
  await expect(page.getByRole('heading', { name: '条码打印（Code 39）' })).toBeVisible();
  await expect(page.getByRole('button', { name: '生成条码' })).toBeVisible();
  await expect(page.getByRole('button', { name: '打印标签' })).toBeVisible();
});

test('Phase2 产能排产（MRP 增强）页渲染', async ({ page }) => {
  await page.goto('/production/capacity');
  await expect(page.getByRole('heading', { name: '产能排产（MRP 增强）' })).toBeVisible();
  await expect(page.getByText('工作中心').first()).toBeVisible();
  await expect(page.getByText('利用率').first()).toBeVisible();
});

test('Phase2 报表自定义设计器页渲染', async ({ page }) => {
  await page.goto('/reports/designer');
  await expect(page.getByRole('heading', { name: '报表自定义设计器' })).toBeVisible();
  await expect(page.getByText('数据集').first()).toBeVisible();
});

test('Phase2 BI 自助分析页渲染', async ({ page }) => {
  await page.goto('/reports/bi');
  await expect(page.getByRole('heading', { name: 'BI 自助分析' })).toBeVisible();
  await expect(page.getByText('维度').first()).toBeVisible();
  await expect(page.getByText('度量').first()).toBeVisible();
});

test('Phase3 系统设置-单位换算 Tab 渲染', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: '单位换算' }).click();
  await expect(page.getByText('换算规则').first()).toBeVisible();
  await expect(page.getByText('单位换算计算器').first()).toBeVisible();
});

test('Phase3 系统设置-对接配置 Tab 渲染', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: '第三方对接通道' }).click();
  await expect(page.getByText('对接通道列表').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '新增通道' })).toBeVisible();
});

test('Phase3 系统设置-移动端 Tab 渲染', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: '移动端' }).click();
  await expect(page.getByText('支持的现场作业').first()).toBeVisible();
  await expect(page.getByText('移动端访问').first()).toBeVisible();
});
