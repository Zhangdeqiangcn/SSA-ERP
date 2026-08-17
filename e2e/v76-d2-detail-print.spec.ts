import { test, expect } from '@playwright/test';

test('V2.55.20 通用详情打印模块 — 供应商详情页接入验证', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`); });

  // 直达供应商详情页（与用户反馈页面同源）
  await page.goto('/vendor/ven-001', { waitUntil: 'domcontentloaded' });
  try { await page.getByRole('button', { name: '跳过引导' }).click({ timeout: 3000 }); } catch { /* 引导可能没有 */ }
  await page.waitForTimeout(1500);

  // 校验 DetailActions 通用按钮组已渲染
  await expect(page.getByTestId('detail-actions')).toBeVisible();
  await expect(page.getByTestId('detail-actions')).toHaveAttribute('data-entity', 'vendor');

  // 6 个按钮：返回/编辑/分享/删除/打印/打印预览（顺序：onBack/extra/onDelete/printable）
  // 通过 data-testid 稳定定位
  await expect(page.getByTestId('detail-action-back-vendor')).toBeVisible();
  await expect(page.getByTestId('detail-action-edit-vendor')).toBeVisible();
  await expect(page.getByTestId('detail-action-share-vendor')).toBeVisible();
  await expect(page.getByTestId('detail-action-delete-vendor')).toBeVisible();
  await expect(page.getByTestId('print-preview-button')).toBeVisible();
  await expect(page.getByTestId('print-button')).toBeVisible();

  // 点击「打印预览」应弹出预览对话框
  await page.getByTestId('print-preview-button').click();
  await page.waitForTimeout(500);
  // 预览对话框标题 + 业务字段（供应商名称 + 编码等）
  await expect(page.getByText('打印预览').first()).toBeVisible();
  await page.waitForTimeout(500);
  // 关闭预览
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 截图存档
  await page.screenshot({ path: 'test-results/v76-vendor-with-print.png', fullPage: true });

  console.log('--- ERRORS ---');
  for (const e of errors) console.log(e);
  console.log('--- END ---');
  // 全程 0 pageerror / 0 console.error
  expect(errors).toHaveLength(0);
});
