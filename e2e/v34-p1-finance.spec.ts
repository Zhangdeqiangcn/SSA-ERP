import { test, expect, type Page } from '@playwright/test';

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

// 打开发票详情并点击「生成凭证」，校验成功文案（凭证应写入 accountEntries）
test('发票：生成凭证按钮生成会计分录 + 无白屏', async ({ page }) => {
  const errors = await captureErrors(page);
  // 清空持久化，确保从 mock 种子数据（voucherGenerated 未置位）重新初始化
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.goto('/finance/invoices');
  await expect(page.getByRole('heading', { name: '发票管理' })).toBeVisible();

  // 选一张「待验证」状态的发票（无凭证），打开详情
  const row = page.locator('tbody tr', { hasText: '待验证' }).first();
  await row.getByRole('button', { name: '详情' }).click();

  // 点击生成凭证
  const genBtn = page.getByTestId('gen-voucher');
  await expect(genBtn).toBeVisible();
  await genBtn.click();

  // 期望出现成功文案（凭证已写入 store.accountEntries）
  await expect(page.getByTestId('voucher-msg')).toBeVisible();
  await expect(page.getByTestId('voucher-msg')).toContainText('凭证已生成');

  expect(errors).toEqual([]);
});

test('科目余额表：合计行渲染无白屏', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/finance/trial-balance');
  await expect(page.getByTestId('tb-total-debit')).toBeVisible();
  await expect(page.getByTestId('tb-total-credit')).toBeVisible();
  // 至少有科目行
  await expect(page.getByTestId('tb-row').first()).toBeVisible();
  await page.getByTestId('tb-refresh').click();
  await expect(page.getByTestId('tb-total-debit')).toBeVisible();
  expect(errors).toEqual([]);
});

test('凭证列表：按凭证号分组渲染无白屏', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/finance/vouchers');
  await expect(page.getByTestId('voucher-count')).toBeVisible();
  await expect(page.getByTestId('voucher-row').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('三单匹配：发票 × 采购单 × 收货单 匹配展示无白屏', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/finance/three-way');
  await expect(page.getByTestId('twm-summary')).toBeVisible();
  await expect(page.getByTestId('three-way-row').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('科目表：列表渲染无白屏', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/finance/chart-accounts');
  await expect(page.getByTestId('coa-row').first()).toBeVisible();
  expect(errors).toEqual([]);
});
