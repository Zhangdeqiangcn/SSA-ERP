import { test, expect, type Page } from '@playwright/test';

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

test('B9：新建检验任务接入 AQL 抽样方案（GB/T 2828.1）自动算样本量并回写详情', async ({ page }) => {
  const errors = await captureErrors(page);
  // 1) 打开检验任务列表
  await page.goto('/quality/inspection');
  await expect(page.getByRole('heading', { name: '质量检验' })).toBeVisible();

  // 2) 新建检验任务
  await page.getByRole('button', { name: '新建检验任务' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  const materialName = 'B9-AQL-连接件';
  await dialog.getByTestId('inspection-material-code').fill('B9-CODE-001');
  await dialog.getByTestId('inspection-material-name').fill(materialName);

  // 3) 填写检验数量，触发 AQL 抽样方案自动计算
  // 默认 检验水平=II / AQL=2.5% / 批量500 → 字码 H，样本量 n=50（Ac=3/Re=4）
  const qty = dialog.getByTestId('inspection-quantity');
  await qty.fill('500');

  const sampleSize = dialog.getByTestId('inspection-sample-size');
  await expect(sampleSize).toHaveValue('50');

  // 抽样方案提示（字码 H / n=50 / Ac=3 / Re=4）
  const planAlert = dialog.getByTestId('inspection-aql-plan');
  await expect(planAlert).toContainText('字码 H');
  await expect(planAlert).toContainText('n=50');
  await expect(planAlert).toContainText('Ac=3');
  await expect(planAlert).toContainText('Re=4');

  // 4) 创建任务
  await dialog.getByRole('button', { name: '创建' }).click();
  await expect(page.getByText('检验任务已创建')).toBeVisible();

  // 5) 打开该任务详情，验证 AQL 抽样方案已回写并展示
  const row = page.locator('tbody tr', { hasText: materialName });
  await row.getByRole('button', { name: '查看详情' }).click();
  await expect(page.getByRole('heading', { name: /检验执行/ })).toBeVisible();

  const detailPlan = page.getByTestId('aql-plan-detail');
  await expect(detailPlan).toBeVisible();
  await expect(detailPlan).toContainText('字码 H');
  await expect(detailPlan).toContainText('n=50');
  await expect(detailPlan).toContainText('Ac=3');
  await expect(detailPlan).toContainText('Re=4');

  expect(errors).toEqual([]);
});

test('B9：切换 AQL / 检验水平时样本量随之重算', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/quality/inspection');
  await expect(page.getByRole('heading', { name: '质量检验' })).toBeVisible();

  await page.getByRole('button', { name: '新建检验任务' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByTestId('inspection-material-code').fill('B9-CODE-002');
  await dialog.getByTestId('inspection-material-name').fill('B9-AQL-切换验证');

  const qty = dialog.getByTestId('inspection-quantity');
  await qty.fill('500'); // 默认 II/2.5% → n=50

  // 切换到 检验水平 III：批量500 → 字码 J，n=80
  await dialog.getByTestId('inspection-aql-level').click();
  await page.getByRole('option', { name: 'III' }).click();
  await expect(dialog.getByTestId('inspection-sample-size')).toHaveValue('80');

  // 切 AQL 至 4.0%（字码 J）：Ac=5/Re=6
  await dialog.getByTestId('inspection-aql-value').click();
  await page.getByRole('option', { name: '4' }).click();
  const planAlert = dialog.getByTestId('inspection-aql-plan');
  await expect(planAlert).toContainText('n=80');
  await expect(planAlert).toContainText('Ac=5');
  await expect(planAlert).toContainText('Re=6');

  expect(errors).toEqual([]);
});
