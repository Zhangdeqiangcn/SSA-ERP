// 验证修复：企业类型用 ToggleButtonGroup
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()); });

  const BASE = process.env.BASE || 'http://localhost:3001';
  await page.goto(`${BASE}/vendor-portal/register`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: '/tmp/fix-1-initial.png' });

  // 检查 ToggleButton 数量
  const toggles = page.locator('[data-testid^="toggle-companyType-"]');
  const count = await toggles.count();
  console.log('企业类型按钮数:', count);
  for (let i = 0; i < count; i++) {
    console.log(' ', await toggles.nth(i).textContent());
  }

  if (count === 0) {
    console.log('❌ ToggleButton 未渲染');
    await browser.close();
    return;
  }

  // 点击"贸易商"
  console.log('\n--- 点击 贸易商 ---');
  await toggles.filter({ hasText: '贸易商' }).first().click();
  await page.waitForTimeout(500);

  // 检查选中状态
  const selected = await page.locator('[data-testid="toggle-companyType-贸易商"]').getAttribute('class');
  console.log('贸易商 class:', selected?.includes('Mui-selected') ? '✅ 已选中' : '❌ 未选中');

  // 再点一个看切换
  console.log('--- 点击 生产商 ---');
  await toggles.filter({ hasText: '生产商' }).first().click();
  await page.waitForTimeout(500);
  const selected2 = await page.locator('[data-testid="toggle-companyType-生产商"]').getAttribute('class');
  console.log('生产商 class:', selected2?.includes('Mui-selected') ? '✅ 已选中' : '❌ 未选中');
  const traderStill = await page.locator('[data-testid="toggle-companyType-贸易商"]').getAttribute('class');
  console.log('贸易商 应取消:', traderStill?.includes('Mui-selected') ? '❌ 仍选中' : '✅ 已取消');

  await page.screenshot({ path: '/tmp/fix-2-after-click.png' });

  console.log('\n--- 错误 ---');
  if (errors.length === 0) console.log('无错误');
  else errors.forEach((e) => console.log('  ' + e));

  await browser.close();
})();
