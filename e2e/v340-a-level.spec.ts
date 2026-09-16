import { test, expect } from './ssa-fixtures';

/**
 * V3.4.0 A 级整改回归（A3 废品率 / A4 多语言 / A5 容量守护）
 *
 * 三条断言对应本轮「最容易在下次改动中被悄悄改回去」的行为，因此固化：
 *   A3 —— MRP 必须使用 BOM 的废品率（此前维护了却从未被计算使用）
 *   A4 —— 语言切换必须真正改变界面文案（此前字典只有 14 条、实际调用 1 处）
 *   A5 —— 容量守护页必须能打开且不报错（此前根本没有这个可观测入口）
 */

// ── A3：MRP 使用 BOM 废品率 ──
test('A3 MRP 使用废品率：结果表出现废品率列且毛需求标注损耗', { timeout: 90000 }, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(`console: ${m.text()}`);
  });

  await page.goto('http://localhost:3000/production/mrp');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await expect(page.getByText('MRP 物料需求计划')).toBeVisible({ timeout: 15000 });

  const computeBtn = page.getByTestId('mrp-compute');
  await expect(computeBtn).toBeVisible();
  await computeBtn.click();
  await page.waitForTimeout(1200);

  // 结果区渲染
  await expect(page.getByTestId('mrp-summary')).toBeVisible({ timeout: 8000 });

  // 表头必须有「废品率」列
  await expect(page.getByText('废品率', { exact: true }).first()).toBeVisible();

  // 有净需求行时：毛需求单元格（mrp-gross）与废品率单元格（mrp-scrap-rate）都要存在
  const rowCount = await page.getByTestId('mrp-result-row').count();
  if (rowCount > 0) {
    await expect(page.getByTestId('mrp-gross').first()).toBeVisible();
    await expect(page.getByTestId('mrp-scrap-rate').first()).toBeVisible();
  }

  expect(errors, `控制台/页面错误:\n${errors.join('\n')}`).toEqual([]);
});

// ── A4：多语言切换真正生效 ──
test('A4 多语言底座：切换到英文后侧栏与顶栏文案随之变化', { timeout: 90000 }, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(`console: ${m.text()}`);
  });

  await page.goto('http://localhost:3000/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  // 先在中文态确认侧栏有中文导航
  await expect(page.getByText('物料列表').first()).toBeVisible({ timeout: 15000 });

  // 通过顶栏语言快切切到英文
  const localeBtn = page.getByTestId('header-locale');
  await expect(localeBtn).toBeVisible({ timeout: 8000 });
  await localeBtn.click();
  await page.getByTestId('header-locale-en-US').click();
  await page.waitForTimeout(1000);

  // 侧栏导航应变英文（物料列表 → Material List）
  await expect(page.getByText('Material List').first()).toBeVisible({ timeout: 8000 });

  // 切回中文，确认可逆（避免只能单向切换）
  await localeBtn.click();
  await page.getByTestId('header-locale-zh-CN').click();
  await page.waitForTimeout(800);
  await expect(page.getByText('物料列表').first()).toBeVisible({ timeout: 8000 });

  expect(errors, `控制台/页面错误:\n${errors.join('\n')}`).toEqual([]);
});

// ── A5：数据容量守护页可访问 ──
test('A5 数据容量守护：页面可打开并渲染主体', { timeout: 90000 }, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(`console: ${m.text()}`);
  });

  await page.goto('http://localhost:3000/platform/data-capacity');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  await expect(page.getByText('数据容量守护').first()).toBeVisible({ timeout: 15000 });

  expect(errors, `控制台/页面错误:\n${errors.join('\n')}`).toEqual([]);
});
