// 复现供应商注册页"企业类型"下拉无反应问题
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      errors.push(`${m.type().toUpperCase()}: ${m.text()}`);
    }
  });

  const BASE = process.env.BASE || 'http://localhost:3001';
  await page.goto(`${BASE}/vendor-portal/register`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 截图初始状态
  await page.screenshot({ path: '/tmp/repro-1-initial.png', fullPage: false });
  console.log('截图保存: /tmp/repro-1-initial.png');

  // 第 0 个 MuiSelect
  const companyTypeSelect = page.locator('.MuiSelect-select').first();
  console.log('MuiSelect 数:', await page.locator('.MuiSelect-select').count());

  console.log('\n--- 点击 Select ---');
  await companyTypeSelect.click();
  await page.waitForTimeout(800);

  // 截图下拉打开
  await page.screenshot({ path: '/tmp/repro-2-open.png', fullPage: false });
  console.log('截图保存: /tmp/repro-2-open.png');

  const items = page.locator('[role="option"]');
  const count = await items.count();
  console.log('可见选项数:', count);
  for (let i = 0; i < count; i++) {
    const text = await items.nth(i).textContent();
    console.log(`  [${i}] ${text}`);
  }

  if (count === 0) {
    console.log('❌ 下拉没打开');
    await browser.close();
    return;
  }

  console.log('\n--- 点击 贸易商 ---');
  const trader = items.filter({ hasText: '贸易商' });
  console.log('贸易商 选项存在:', await trader.count());
  if (await trader.count() === 0) {
    console.log('❌ 找不到贸易商选项');
    await browser.close();
    return;
  }
  await trader.first().click();
  await page.waitForTimeout(1000);

  // 截图
  await page.screenshot({ path: '/tmp/repro-3-after-click.png', fullPage: false });

  const stillOpen = await page.locator('[role="listbox"]').isVisible().catch(() => false);
  console.log('下拉是否还开着:', stillOpen);

  const displayValue = await companyTypeSelect.textContent();
  console.log('Select 显示值:', displayValue);

  console.log('\n--- 错误信息 ---');
  if (errors.length === 0) console.log('无错误');
  else errors.forEach((e) => console.log('  ' + e));

  await browser.close();
})();
