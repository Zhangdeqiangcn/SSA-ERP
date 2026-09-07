import { test, expect } from './ssa-fixtures';

// B9 AQL 抽样固化：输入批量大小→自动计算并回填样本量 n；动态检验规则 tab 可渲染
test('B9 AQL 抽样方案计算 + 动态检验规则', { timeout: 60000 }, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(`console: ${m.text()}`); });

  await page.goto('http://localhost:3000/quality/aql');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await expect(page.getByRole('heading', { name: 'AQL 抽样检验方案' })).toBeVisible({ timeout: 15000 });

  // 输入批量大小（MUI number TextField 渲染为 spinbutton，第一个即批量大小）
  const lotInput = page.getByRole('spinbutton').first();
  await lotInput.fill('1200');
  await page.waitForTimeout(300);

  // 计算后样本量 n 自动回填到 aql-sample-size 输入框
  const sampleSizeInput = page.getByTestId('aql-sample-size');
  await expect(sampleSizeInput).toBeVisible();
  const n = await sampleSizeInput.inputValue();
  expect(Number(n), `样本量 n 应已回填且 > 0，实际="${n}"`).toBeGreaterThan(0);

  // 切换「动态检验规则」tab，验证动态规则区渲染
  await page.getByRole('tab', { name: '动态检验规则' }).click();
  await page.waitForTimeout(300);
  await expect(page.getByTestId('aql-dynamic-rules')).toBeVisible();
  await expect(page.getByText('当前检验模式：正常检验', { exact: true })).toBeVisible();

  expect(errors, `控制台/页面错误:\n${errors.join('\n')}`).toEqual([]);
});
