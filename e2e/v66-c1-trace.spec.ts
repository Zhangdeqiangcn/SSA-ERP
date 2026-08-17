import { test, expect, type Page } from '@playwright/test';

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

test('C1-1 批次追溯穿透：成品批次 F20240620X 反向上游穿透至原料供应商（上海宝钢 / 采购订单）', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/warehouse/trace');

  await page.getByTestId('trace-query').locator('input').fill('F20240620X');
  await page.getByTestId('trace-run').click();

  // 反向上游：成品批次 → 工单 WO20240601001 → 领料耗用原料批次 B20240601X → 原料采购入库 → 上海宝钢 / PO20240601001
  await expect(page.getByTestId('trace-backward')).toContainText('WO20240601001');
  await expect(page.getByTestId('trace-backward')).toContainText('B20240601X');
  await expect(page.getByTestId('trace-backward')).toContainText('上海宝钢钢铁贸易有限公司');
  await expect(page.getByTestId('trace-backward')).toContainText('PO20240601001');

  expect(errors).toEqual([]);
});

test('C1-2 批次追溯穿透：原料批次 B20240601X 正向下游穿透至成品批次 F20240620X（投产去向）', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/warehouse/trace');

  await page.getByTestId('trace-query').locator('input').fill('B20240601X');
  await page.getByTestId('trace-run').click();

  // 正向下游：原料批次 → 生产领料（工单 WO20240601001）→ 成品入库 F20240620X
  await expect(page.getByTestId('trace-forward')).toContainText('WO20240601001');
  await expect(page.getByTestId('trace-forward')).toContainText('F20240620X');

  expect(errors).toEqual([]);
});

test('C1-3 序列号追溯：SN-2024-0001 → 交流接触器（批次 HQ20240508）→ 反向深圳华强 / 正向宁波钢结构', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/warehouse/trace');

  await page.getByTestId('trace-query').locator('input').fill('SN-2024-0001');
  await page.getByTestId('trace-run').click();

  // 序列号信息面板
  await expect(page.getByTestId('serial-info')).toContainText('交流接触器 CJX2');
  await expect(page.getByTestId('serial-info')).toContainText('HQ20240508');

  // 反向上游：批次 HQ20240508 采购入库 → 深圳华强电气有限公司
  await expect(page.getByTestId('trace-backward')).toContainText('深圳华强电气有限公司');
  // 正向下游：销售出库 → 宁波钢结构有限公司
  await expect(page.getByTestId('trace-forward')).toContainText('宁波钢结构有限公司');

  expect(errors).toEqual([]);
});
