import { test, expect, type Page } from '@playwright/test';

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

test('F8-1 采购申请号自动生成 PR-部门编号-日期-流水', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/purchase/create');
  await expect(page.getByRole('heading', { name: '新建采购申请' })).toBeVisible();

  await page.getByLabel('标题').fill('E2E-F8-申请号');
  await page.getByLabel('部门').fill('生产部');
  await page.getByLabel('申请原因').fill('E2E 自动编号验证');
  await page.getByLabel('期望日期').fill('2026-08-01');

  await page.getByRole('button', { name: '提交申请', exact: true }).click();

  // 通过 DEV 钩子读取 store 中最新申请的编号
  const no = await page.evaluate(() => {
    const st = (window as any).__ssaStores?.usePurchaseStore?.getState?.();
    const list = st?.purchaseRequests || [];
    return list[list.length - 1]?.requestNo;
  });
  // 格式：PR-PD-YYYYMMDD-NNN
  expect(no).toMatch(/^PR-PD-\d{8}-\d{3}$/);
  expect(errors).toEqual([]);
});

test('F8-2 物料号名称拆分 + 粘贴物料批量导入自动匹配', async ({ page, context }) => {
  const errors = await captureErrors(page);
  await page.goto('/purchase/create');
  await expect(page.getByRole('heading', { name: '新建采购申请' })).toBeVisible();

  await page.getByLabel('标题').fill('E2E-F8-粘贴');
  await page.getByLabel('部门').fill('生产部');

  // 授权剪贴板并写入多行物料编码（模拟从 Excel 复制）
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(() => navigator.clipboard.writeText('MAT202405010001\nMAT202405010002'));

  // 在批量粘贴区 Ctrl+V 粘贴 → 批量导入并自动匹配
  const pasteArea = page.getByLabel(/批量粘贴物料编码/);
  await pasteArea.click();
  await page.keyboard.press('Control+V');

  // 明细应新增 2 行
  await expect(page.locator('tbody tr').first()).toBeVisible();
  await expect(page.locator('tbody tr').count()).resolves.toBe(2);

  // 物料名称自动匹配（按物料主数据：钢板 Q235B / 钢管 碳钢）
  await expect(page.getByText('钢板 Q235B').first()).toBeVisible();
  await expect(page.getByText('钢管 碳钢').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('F8-3 来源选择销售订单并拉取明细', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/purchase/create');
  await expect(page.getByRole('heading', { name: '新建采购申请' })).toBeVisible();

  await page.getByLabel('标题').fill('E2E-F8-来源');
  await page.getByLabel('部门').fill('销售部');

  // 选择来源类型 = 销售订单
  await page.getByLabel('来源类型').click();
  await page.getByRole('option', { name: '销售订单' }).click();

  // 选择关联销售订单
  await page.getByLabel(/关联销售订单/).click();
  await page.getByRole('option').first().click();

  // 拉取明细
  await page.getByRole('button', { name: /从销售订单拉取物料明细/ }).click();

  // 明细应被填充（>0 行）
  const rowCount = await page.locator('tbody tr').count();
  expect(rowCount).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
