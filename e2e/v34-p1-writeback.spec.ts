import { test, expect, type Page } from './ssa-fixtures';

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) errors.push(msg.text());
  });
  return errors;
};

// P1-3：采购收货 → 回写采购订单（已交数量 + 状态）
test('采购入库完成回写采购订单：已交数量增加、状态推进为已收货', async ({ page }) => {
  const errors = await captureErrors(page);

  // 1) 进入新建入库单（采购收货）
  await page.goto('/warehouse/inbound/create');
  await expect(page.getByRole('heading', { name: '新建入库单' })).toBeVisible();

  // 2) 查询一个存在的采购订单 PO20240506001（po-001，单行 钢板 Q235B 30 吨，初始已交 0）
  await page.getByLabel('采购订单号').fill('PO20240506001');
  await page.getByRole('button', { name: '查询' }).click();
  await expect(page.getByText('PO20240506001').first()).toBeVisible();

  // 3) 确认入库（complete-inbound 按钮触发 addInboundOrder → 过账库存 + 回写 PO）
  await page.getByTestId('complete-inbound').click();

  // 4) 完成后回到入库列表，且无白屏
  await expect(page.getByRole('heading', { name: '入库管理' })).toBeVisible();
  expect(errors).toEqual([]);

  // 5) 进入采购订单详情，验证回写结果：进度 100% / 状态已收货
  await page.goto('/purchase/orders/po-001');
  await expect(page.getByRole('heading', { name: 'PO20240506001' })).toBeVisible();

  // 整体收货进度应达到 100%（已交 = 订单数量）
  await expect(page.getByText('收货入库，进度：100%')).toBeVisible();
  expect(errors).toEqual([]);
});

// P1-3（兜底）：即便 UI 细节变化，至少保证入库完成页不白屏
test('采购入库完成页无白屏（兜底）', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/warehouse/inbound/create');
  await expect(page.getByRole('heading', { name: '新建入库单' })).toBeVisible();
  await page.getByLabel('采购订单号').fill('PO20240506001');
  await page.getByRole('button', { name: '查询' }).click();
  await expect(page.getByText('PO20240506001').first()).toBeVisible();
  await page.getByTestId('complete-inbound').click();
  await expect(page.getByRole('heading', { name: '入库管理' })).toBeVisible();
  expect(errors).toEqual([]);
});
