const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://localhost:3002';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.stack || e.message)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()); });

  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log('GOTO ERROR:', e.message);
  }
  await page.waitForTimeout(2500);

  console.log('FINAL URL:', page.url());
  console.log('PAGE TITLE:', await page.title());
  const html = await page.content();
  console.log('BODY LENGTH:', html.length);
  // 是否白屏（body 基本没内容）
  const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
  console.log('BODY TEXT SNIPPET:', bodyText.slice(0, 200).replace(/\n/g, ' '));

  console.log('--- ERRORS (' + errors.length + ') ---');
  errors.slice(0, 8).forEach((e) => console.log(e.split('\n').slice(0, 4).join('\n')));

  await browser.close();
})();
