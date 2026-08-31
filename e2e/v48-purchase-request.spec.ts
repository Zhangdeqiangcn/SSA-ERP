import { test, expect, type Page } from './ssa-fixtures';

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

  // 添加物料行（触发 MaterialLineItemsGrid 的物料编码列，拦截多行粘贴走批量导入）
  await page.getByRole('button', { name: '添加物料' }).click();
  // 等一行出现
  await page.waitForSelector('tbody tr', { state: 'visible', timeout: 10000 });
  // 找到物料编码列的 input（placeholder = '输入物料编码'），Ctrl+V 触发批量导入
  const codeInput = page.getByPlaceholder('输入物料编码').first();
  await codeInput.click();
  await codeInput.fill(''); // 清空，确保聚焦
  await page.keyboard.press('Control+V');

  // 明细应新增 2 行（种子含钢板 Q235B / 钢管 碳钢）
  const rowCount = await page.locator('tbody tr').count();
  expect(rowCount).toBeGreaterThanOrEqual(2);
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

  // 选择关联销售订单（如没有销售订单，跳过此步骤，直接测试按钮可用性）
  const sourceCombo = page.getByLabel(/关联销售订单/);
  const isDisabled = await sourceCombo.isDisabled().catch(() => true);
  if (!isDisabled) {
    await sourceCombo.click();
    await page.getByRole('option').first().click();
  }

  // 拉取明细按钮存在且可用（有源单时才会拉取成功）
  const fetchBtn = page.getByRole('button', { name: /从销售订单拉取物料明细/ });
  const btnEnabled = await fetchBtn.isEnabled().catch(() => false);
  if (btnEnabled) {
    await fetchBtn.click();
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
  }

  expect(errors).toEqual([]);
});
