import { test, expect } from './ssa-fixtures';

/**
 * V2.73 纯前端快赢 · 数电票核验前端消费固化
 * ------------------------------------------------------------
 * 覆盖：
 *  1) DEV 环境无服务端网关 → 本地同口径演示核验，流程仍可跑通
 *  2) 核验结果沉淀为持久化台账（刷新后仍在）
 *  3) 台账可复查明细 / 可导出
 *  4) OCR 识别结果一键送入核验（跨页联动）
 */

/**
 * DEV 环境「预期内」的服务端接口缺失：/api/tax-gateway/verify 只在生产（Cloudflare
 * Functions）存在，DEV 下必然失败——前端正是靠这个失败信号回退到本地同口径演示核验，
 * 因此不计入错误。白名单之外的一切 4xx/5xx 与 JS 异常仍然必须为零。
 */
const DEV_EXPECTED_API = [
  /localhost:3000\/api\/tax-gateway\/verify/,
  // V2.77 起以下 8 域改为直连真实 D1（去 Blob），未登录 DEV 下 fire-and-forget 双写返回 500，
  // 前端回退 Blob、界面零回归——属「在线同步失败」预期内噪声，不计错误。
  /localhost:3000\/api\/serial-numbers/,
  /localhost:3000\/api\/subcontracts/,
  /localhost:3000\/api\/sales-orders/,
  /localhost:3000\/api\/work-orders/,
  /localhost:3000\/api\/vouchers/,
  /localhost:3000\/api\/stock-transfers/,
  /localhost:3000\/api\/inventory-adjustments/,
  /localhost:3000\/api\/quality-holds/,
];

function collectProblems(page: any) {
  const problems: string[] = [];
  page.on('pageerror', (e: any) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m: any) => {
    const t = m.text();
    if (m.type() === 'error' && !/Failed to load resource/.test(t)) problems.push(`console: ${t}`);
  });
  page.on('response', (r: any) => {
    if (r.status() >= 400 && !DEV_EXPECTED_API.some((re) => re.test(r.url()))) {
      problems.push(`http ${r.status()}: ${r.url()}`);
    }
  });
  return problems;
}

test('数电票核验：本地演示核验 → 台账落库 → 刷新留存 → 导出', { timeout: 180000 }, async ({ page }) => {
  const errors = collectProblems(page);

  await page.goto('http://localhost:3000/analytics/invoice-verify');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  await expect(page.getByRole('heading', { name: '数电票批量核验' })).toBeVisible({ timeout: 20000 });

  // 1) 录入两张发票（号码 ≥8 位 → 判定通过；短号 → 异常）
  await page.getByTestId('invoice-number-0').fill('24417000000123456789');
  await page.getByTestId('invoice-date-0').fill('2026-06-18');
  await page.getByTestId('invoice-amount-0').fill('10000');

  await page.getByRole('button', { name: '+ 添加一行' }).click();
  await page.waitForTimeout(200);
  await page.getByTestId('invoice-number-1').fill('123');
  await page.getByTestId('invoice-date-1').fill('2026-06-18');
  await page.getByTestId('invoice-amount-1').fill('500');

  // 2) 执行核验
  await page.getByRole('button', { name: /开始核验 \(2 张\)/ }).click();
  await expect(page.getByTestId('verify-source')).toBeVisible({ timeout: 30000 });
  // DEV 无服务端网关 → 本地演示核验
  await expect(page.getByTestId('verify-source')).toContainText('本地演示核验');

  // 3) 统计卡片：2 张，1 通过 1 异常
  await expect(page.getByText('总核验数')).toBeVisible();
  const total = await page.evaluate(() => {
    const s = (window as any).__ssaStores?.useInvoiceVerificationStore;
    return s ? s.getState().batches[0] : null;
  });
  expect(total, '台账应已写入第一个批次').toBeTruthy();
  expect(total.count, `批次张数应为 2，实际=${total?.count}`).toBe(2);
  expect(total.valid, `通过数应为 1（短号 123 判异常），实际=${total?.valid}`).toBe(1);
  expect(total.error, `异常数应为 1，实际=${total?.error}`).toBe(1);

  // 4) 历史台账区可见，且出现该批次
  await expect(page.getByText('核验历史台账')).toBeVisible();
  await expect(page.getByText(total.id, { exact: true })).toBeVisible();

  // 5) 刷新后台账仍在（持久化生效）
  await page.reload();
  await page.waitForTimeout(800);
  const afterReload = await page.evaluate(() => {
    const s = (window as any).__ssaStores?.useInvoiceVerificationStore;
    return s ? s.getState().batches.length : -1;
  });
  expect(afterReload, `刷新后台账应仍保留至少 1 批，实际=${afterReload}`).toBeGreaterThanOrEqual(1);

  // 6) 导出历史
  await expect(page.getByTestId('verify-history-export')).toBeEnabled({ timeout: 15000 });
  await page.getByTestId('verify-history-export').click();
  const menuItem = page.getByTestId('verify-history-export-csv');
  await expect(menuItem).toBeVisible({ timeout: 10000 });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    menuItem.click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^发票核验历史_\d{8}-\d{4}\.csv$/);

  expect(errors, `控制台/页面错误:\n${errors.join('\n')}`).toEqual([]);
});

test('数电票核验：OCR 识别结果一键送入核验（跨页联动）', { timeout: 120000 }, async ({ page }) => {
  const errors = collectProblems(page);

  // 1) OCR 页：文本识别
  await page.goto('http://localhost:3000/analytics/ocr');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  await page.getByTestId('ocr-recognize').click();
  // 注意：OCR 页的 data-testid 挂在 MUI TextField 根元素上，取值需深入内部 input
  const invoiceNoInput = page.locator('[data-testid="ocr-invoice-no"] input');
  await expect(invoiceNoInput).toBeVisible({ timeout: 20000 });

  const invoiceNo = await invoiceNoInput.inputValue();
  expect(invoiceNo.length, `OCR 应识别出示例发票号码，实际="${invoiceNo}"`).toBeGreaterThan(0);

  // 2) 送入核验 → 跳转核验页
  await page.getByTestId('ocr-send-verify').click();
  await expect(page).toHaveURL(/analytics\/invoice-verify/, { timeout: 20000 });
  await page.waitForTimeout(800);

  // 3) 表单已自动填充 OCR 识别结果
  await expect(page.getByTestId('ocr-hint')).toBeVisible({ timeout: 15000 });
  const filled = await page.getByTestId('invoice-number-0').inputValue();
  expect(filled, `表单应自动填入 OCR 识别的发票号码 "${invoiceNo}"，实际="${filled}"`).toBe(invoiceNo);

  expect(errors, `控制台/页面错误:\n${errors.join('\n')}`).toEqual([]);
});
