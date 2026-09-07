import { test, expect } from './ssa-fixtures';

test('V2.55.20 货源清单物料编码列 + 联动 selector 回归', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(`[console.error] ${m.text()}`); });

  // 1) 货源清单页：新增的「物料编码」列 + 编码值
  await page.goto('/purchase/source-list', { waitUntil: 'domcontentloaded' });
  try { await page.getByRole('button', { name: '跳过引导' }).click({ timeout: 3000 }); } catch { /* 无引导 */ }
  // 等待页面标题渲染
  await expect(page.getByRole('heading', { name: '货源清单' })).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(600);

  // 列头出现「物料编码」
  await expect(page.getByText('物料编码', { exact: true }).first()).toBeVisible();
  // 种子数据编码可见（monospace 渲染）
  await expect(page.getByText('MAT-001', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('MAT-002', { exact: true }).first()).toBeVisible();

  // 2) 按物料编码筛选：输入 MAT-002 应只剩该物料行
  // FilterBar 的关键词输入（通过 MUI InputLabel 定位，避开顶栏搜索框）
  const keyword = page.getByLabel(/关键词/).first();
  await keyword.fill('MAT-002');
  await keyword.press('Enter'); // 触发 FilterBar 表单 onSubmit → setFilterData
  await page.waitForTimeout(600);
  // MAT-001 应消失，MAT-002 仍在
  await expect(page.getByText('MAT-001', { exact: true })).toHaveCount(0);
  await expect(page.getByText('MAT-002', { exact: true }).first()).toBeVisible();
  // 清除筛选（点重置按钮）
  await page.getByRole('button', { name: '重置' }).click();
  await page.waitForTimeout(400);

  // 3) 采购订单表单：联动 selector 运行期无报错（getActiveSourcesByVendor 编译/运行通过）
  await page.goto('/purchase/order/create', { waitUntil: 'domcontentloaded' });
  try { await page.getByRole('button', { name: '跳过引导' }).click({ timeout: 3000 }); } catch { /* 无引导 */ }
  await page.waitForTimeout(1500);

  // 存档
  await page.screenshot({ path: 'test-results/v78-orderform.png', fullPage: true });

  console.log('--- ERRORS ---');
  for (const e of errors) console.log(e);
  console.log('--- END ---');
  // 全程 0 pageerror / 0 console.error
  expect(errors).toHaveLength(0);
});