const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3001';
const TS = Date.now();

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errs.push('CONSOLE.ERR: ' + m.text()); });

  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.getByText('注册新账号', { exact: true }).click();
  await page.getByLabel('用户名').fill('app' + TS);
  await page.getByLabel('密码（至少6位）').fill('abc12345');
  await page.getByLabel('姓名').fill('应用');
  await page.getByLabel('公司码（同事填相同码即共享同一份数据）').fill('appco');
  await page.getByLabel('公司名称（选填，首次注册时创建组织）').fill('应用公司');
  await page.getByRole('button', { name: /注.*册/ }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
  await page.waitForTimeout(3000);

  const bodyText = await page.locator('body').innerText().catch(() => '');
  console.log('BODY SNIPPET (first 600):\n', bodyText.slice(0, 600));
  console.log('\n--- errors ---', errs.length);
  errs.slice(0, 8).forEach((e) => console.log(e));
  await browser.close();
})();
