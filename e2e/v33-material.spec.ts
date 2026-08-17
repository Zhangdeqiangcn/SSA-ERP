import { test, expect, type Page } from '@playwright/test';

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

test('物料列表：模糊搜索 + 批量工具条渲染无白屏', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/material/list');
  await expect(page.getByRole('heading', { name: '物料列表' })).toBeVisible();

  // 初始行数
  const initialRows = await page.locator('tbody tr').count();
  expect(initialRows).toBeGreaterThan(0);

  // 模糊搜索：输入不可能匹配的串，行数应变少（验证过滤生效）
  await page.getByTestId('material-keyword').fill('ZZZNOMATCH_物料_不存在');
  await expect(page.locator('tbody tr').count()).resolves.toBeLessThan(initialRows);
  await page.getByTestId('material-keyword').fill('');

  // 批量工具条按钮存在（选中行后可见）
  await expect(page.getByTestId('batch-enable')).toBeAttached();
  await expect(page.getByTestId('batch-disable')).toBeAttached();

  expect(errors).toEqual([]);
});

test('物料新增审批闭环：发起→采购审核→批准生效→正式物料落库', async ({ page }) => {
  const errors = await captureErrors(page);
  const name = `E2E物料${Date.now()}`;

  // 1) 新增物料（审批开启时走申请流程）
  await page.goto('/material/create');
  await expect(page.getByRole('heading', { name: '新增物料（审批）' })).toBeVisible();
  await page.getByLabel('物料名称').fill(name);
  await page.getByLabel('物料分类').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('单位').fill('个');
  await page.keyboard.press('Enter');
  await page.getByTestId('material-submit').click();
  await expect(page.getByText('已提交物料新增审批，等待采购审核与批准生效')).toBeVisible();

  // 2) 进入审批队列，应能看到该申请
  await page.goto('/material/approvals');
  await expect(page.getByRole('heading', { name: '物料新增审批队列' })).toBeVisible();
  await expect(page.getByText(name).first()).toBeVisible();

  // 3) 打开详情，按步骤推进（admin 拥有 material.approve，可逐级处理）
  await page.getByRole('button', { name: '查看' }).first().click();
  await expect(page.getByTestId('ma-approve-btn')).toBeVisible();
  // 发起人步骤 → 提交下一步
  await page.getByTestId('ma-approve-btn').click();
  await expect(page.getByText(/已提交至下一步/).first()).toBeVisible();
  // 采购步骤 → 提交下一步
  await page.getByTestId('ma-approve-btn').click();
  await expect(page.getByText(/已提交至下一步/).first()).toBeVisible();
  // 批准步骤 → 批准生效
  await page.getByTestId('ma-approve-btn').click();
  await expect(page.getByText(/物料已批准生效/).first()).toBeVisible();

  // 4) 列表中出现正式物料
  await page.goto('/material/list');
  await page.getByTestId('material-keyword').fill(name);
  await expect(page.getByText(name).first()).toBeVisible();

  expect(errors).toEqual([]);
});

test('设置页：物料审批 / 物料评级 两个 Tab 可打开且无白屏', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/settings');
  await page.getByRole('tab', { name: '物料审批' }).click();
  await expect(page.getByTestId('approval-enabled')).toBeVisible();

  await page.getByRole('tab', { name: '物料评级' }).click();
  await expect(page.getByTestId('rating-enabled')).toBeVisible();

  expect(errors).toEqual([]);
});

test('物料详情：自动评级卡片渲染（聚合数据，无白屏）', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/material/list');
  // 点击首行进入详情
  await page.locator('tbody tr').first().click();
  await expect(page.getByTestId('material-rating')).toBeVisible();
  expect(errors).toEqual([]);
});

test('导入导出页：导出/导入控件渲染无白屏', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/material/import-export');
  await expect(page.getByTestId('export-btn')).toBeVisible();
  await expect(page.getByTestId('import-file')).toBeAttached();
  expect(errors).toEqual([]);
});
