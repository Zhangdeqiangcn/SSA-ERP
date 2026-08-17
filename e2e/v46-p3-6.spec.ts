import { test, expect } from '@playwright/test';

test.describe('P3-6 智能分析', () => {
  test('三个分析页面可达（无白屏）', async ({ page }) => {
    await page.goto('/analytics/cockpit');
    await page.getByTestId('cockpit').waitFor();
    await page.goto('/analytics/forecast');
    await page.getByTestId('forecast').waitFor();
    await page.goto('/analytics/ocr');
    await page.getByTestId('ocr').waitFor();
  });

  test('经营驾驶舱 KPI 钻取明细', async ({ page }) => {
    await page.goto('/analytics/cockpit');
    await page.getByTestId('cockpit').waitFor();
    await expect(page.getByTestId('kpi-revenue')).toBeVisible();
    await page.getByTestId('kpi-revenue').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('销售订单明细');
    await page.keyboard.press('Escape');
  });

  test('需求预测：指标计算与再订货点展示', async ({ page }) => {
    await page.goto('/analytics/forecast');
    await page.getByTestId('forecast').waitFor();
    // 选择低库存物料「交流接触器 CJX2」触发补货建议
    await page.getByTestId('fc-material').click();
    await page.getByRole('option', { name: /交流接触器 CJX2/ }).click();
    await expect(page.getByTestId('fc-reorder')).toBeVisible();
    await expect(page.getByTestId('fc-suggest')).toBeVisible();
  });

  test('需求预测：生成补货建议并联动采购申请', async ({ page }) => {
    await page.goto('/analytics/forecast');
    await page.getByTestId('forecast').waitFor();
    await page.getByTestId('fc-material').click();
    await page.getByRole('option', { name: /交流接触器 CJX2/ }).click();
    await page.getByTestId('fc-generate').click();
    await expect(
      page.getByTestId('fc-suggestion-row').filter({ hasText: '交流接触器 CJX2' })
    ).toHaveCount(1);
    await expect(page.getByText(/已生成采购申请/)).toBeVisible();
  });

  test('发票OCR：识别字段', async ({ page }) => {
    await page.goto('/analytics/ocr');
    await page.getByTestId('ocr').waitFor();
    await page.getByTestId('ocr-recognize').click();
    await expect(
      page.getByTestId('ocr-invoice-no').locator('input')
    ).toHaveValue(/24417000000123456789/);
    await expect(page.getByTestId('ocr-total').locator('input')).toHaveValue('11700');
  });

  test('发票OCR：生成凭证并写入历史', async ({ page }) => {
    await page.goto('/analytics/ocr');
    await page.getByTestId('ocr').waitFor();
    await page.getByTestId('ocr-recognize').click();
    await page.getByTestId('ocr-generate').click();
    await expect(
      page.getByTestId('ocr-history-row').filter({ hasText: '24417000000123456789' })
    ).toHaveCount(1);
    await expect(page.getByText(/已生成凭证/)).toBeVisible();
  });
});
