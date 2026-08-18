const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3001';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message, '\nSTACK:', (e.stack || '').split('\n').slice(0, 12).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE.ERR:', m.text().split('\n').slice(0, 8).join('\n')); });

  // 注入一个已登录的本地会话（无需后端），以进入主系统复现 #300
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('ssa-erp-auth-token', 'dummy-token-for-diagnosis');
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { currentUser: { id: 'u1', name: '诊断', role: 'admin', department: 'IT' }, isAuthenticated: true, token: 'dummy-token-for-diagnosis' },
      version: 0,
    }));
  });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  console.log('FINAL URL:', page.url());
  await browser.close();
})();
