import { test, expect, type Page } from './ssa-fixtures';

/**
 * 供应商注册 → 审批 → 落库 全链路 E2E
 *
 * P0-1 行为变更（深度对标文档）：供应商注册不再直接写入供应商主数据，
 * 而是生成「供应商注册申请」(VendorApplication) 进入审批队列；
 * 审批「批准注册」后才创建正式供应商 (Vendor) 落库到 /vendor/list。
 * 本文件覆盖该闭环：注册 → 申请入队 → 审批 → 供应商落库/持久化 → 详情/编辑/删除。
 *
 * 全程采集 pageerror / console.error，最终断言为零（防白屏回归）。
 */

let errorCount = 0;
const uniqueName = `E2E供应商${Date.now()}`;

test.beforeEach(async ({ page }) => {
  errorCount = 0;
  page.on('pageerror', () => errorCount++);
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('Failed to load resource') && !msg.text().includes('validateDOMNesting')) errorCount++;
  });
});

/** 走完「注册并提交 → 审批队列查询 → 多步审批（逐提交下一步）→ 终审批准 → 供应商落库」全流程 */
const registerAndApprove = async (page: Page, name: string) => {
  // 1. 注册向导提交申请
  await page.goto('/vendor/register');
  await expect(page.getByRole('heading', { name: '供应商注册申请' })).toBeVisible();
  await page.getByLabel('企业全称 *').fill(name);
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: '下一步' }).click();
  }
  await page.getByRole('button', { name: '提交注册申请' }).click();
  await expect(page.getByText('注册申请已提交！')).toBeVisible();

  // 2. 申请进入审批队列
  await page.goto('/vendor/approvals');
  await page.getByLabel('企业名称').fill(name);
  await page.getByRole('button', { name: '查询' }).click();
  await expect(page.getByText(name).first()).toBeVisible();

  // 3. 多步审批：反复打开详情，点「提交下一步」推进，直到末步出现「批准注册」
  //    （每个「提交下一步」会关闭详情弹窗，需重新打开；默认账号为 admin，各步均有权限）
  const row = page.locator('tbody tr', { hasText: name });
  for (let step = 0; step < 6; step++) {
    await row.locator('td:last-child button').click();
    await page.getByRole('menuitem', { name: '查看' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const approveBtn = page.getByRole('button', { name: '批准注册' });
    if (await approveBtn.count() > 0) {
      await approveBtn.click();
      break;
    }
    await page.getByRole('button', { name: '提交下一步' }).click();
  }

  // 4. 正式供应商落库到列表
  await page.goto('/vendor/list');
  await expect(page.getByText(name).first()).toBeVisible();
};

test('注册→审批→供应商落库到列表并持久化', async ({ page }) => {
  await registerAndApprove(page, uniqueName);

  // 刷新后仍在（证明落盘 localStorage）
  await page.reload();
  await expect(page.getByText(uniqueName).first()).toBeVisible();

  // 详情页读 store（点名称进入详情）
  await page.getByText(uniqueName).first().click();
  await expect(page.getByRole('heading', { name: '基本信息' })).toBeVisible();

  expect(errorCount).toBe(0);
});

test('供应商详情编辑/删除持久化到 store', async ({ page }) => {
  const name2 = `E2E供应商${Date.now()}`;
  await registerAndApprove(page, name2);

  // 进入详情
  await page.getByText(name2).first().click();
  await expect(page.getByRole('heading', { name: '基本信息' })).toBeVisible();

  // 编辑：改联系人并保存
  await page.getByRole('button', { name: '编辑' }).click();
  const contactInput = page.getByRole('dialog').getByLabel('联系人');
  await contactInput.fill('E2E联系人X');
  await page.getByRole('dialog').getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('E2E联系人X').first()).toBeVisible();

  // 刷新后编辑仍在
  await page.reload();
  await expect(page.getByText('E2E联系人X').first()).toBeVisible();

  // 删除：确认后返回列表，刷新后不再出现
  await page.getByRole('button', { name: '删除' }).click();
  await page.getByRole('button', { name: '确认删除' }).click();
  await expect(page).toHaveURL(/\/vendor\/list$/);
  await page.reload();
  await expect(page.getByText('E2E联系人X')).toHaveCount(0);

  expect(errorCount).toBe(0);
});
