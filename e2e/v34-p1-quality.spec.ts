import { test, expect, type Page } from './ssa-fixtures';

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

test('NCR→CAPA：打开不合格品详情，生成 CAPA 并关闭 NCR 闭环', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/quality/unqualified');
  await expect(page.getByRole('heading', { name: '不合格品管理' })).toBeVisible();

  // 打开首条 NCR 详情
  await page.locator('tbody tr').first().getByRole('button', { name: '查看不合格品详情' }).click();
  await expect(page.getByRole('dialog').getByTestId('ncr-to-capa')).toBeVisible();

  // 生成 CAPA
  await page.getByRole('dialog').getByTestId('ncr-to-capa').click();

  // 成功提示出现
  await expect(page.getByText(/已为 NCR/)).toBeVisible();
  // NCR 状态更新为「已发起CAPA」
  await expect(page.getByText('已发起CAPA').first()).toBeVisible();
  // 关联的 CAPA / PDCA 已渲染（pdcaNo 形如 CAPA-xxxxxxxx）
  await expect(page.getByText(/CAPA-/).first()).toBeVisible();

  expect(errors).toEqual([]);
});

test('AQL：选定抽样方案后样本量自动回填', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/quality/aql');
  await expect(page.getByRole('heading', { name: 'AQL 抽样检验方案' })).toBeVisible();

  const sampleSize = page.getByTestId('aql-sample-size');
  await expect(sampleSize).toBeVisible();
  // 默认 批量500 / 水平II / AQL2.5% → 抽样字码 H，样本量 n=50（GB/T 2828.1），自动回填
  await expect(sampleSize).toHaveValue('50');

  expect(errors).toEqual([]);
});
