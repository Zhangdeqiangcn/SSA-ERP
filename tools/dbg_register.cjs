const { chromium } = require('playwright');
const BASE = process.env.BASE || 'https://ssa-erp.pages.dev';
const TS = Date.now();
const U = 'dbg' + TS;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('response', (r) => { if (r.url().includes('/api/')) console.log('API', r.status(), r.url()); });
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE.ERR', m.text()); });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));

  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.getByText('注册新账号', { exact: true }).click();
  await page.getByLabel('用户名').fill(U);
  await page.getByLabel('密码（至少6位）').fill('abc12345');
  await page.getByLabel('姓名').fill('调试');
  await page.getByLabel('公司码（同事填相同码即共享同一份数据）').fill('dbgco');
  await page.getByLabel('公司名称（选填，首次注册时创建组织）').fill('调试公司');
  await page.getByRole('button', { name: /注.*册/ }).click();
  await page.waitForTimeout(4000);
  console.log('URL after register click:', page.url());
  // 抓取页面上可能出现的错误提示
  const errText = await page.locator('p, div, span').filter({ hasText: /错误|失败|已存在|至少|必填/ }).allInnerTexts().catch(() => []);
  console.log('可见提示:', errText.slice(0, 5));
  const token = await page.evaluate(() => localStorage.getItem('ssa-erp-auth-token'));
  console.log('token present:', !!token, 'len', token ? token.length : 0);
  const auth = await page.evaluate(() => localStorage.getItem('auth-storage'));
  console.log('auth-storage:', auth ? auth.slice(0, 200) : 'null');
  await browser.close();
})();
