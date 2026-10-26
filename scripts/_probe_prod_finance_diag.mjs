// 生产诊断：发票页结构 + 401/404 来源（V3.113.2 验证辅助）
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = process.env.BASE || 'https://ssa-erp.pages.dev';
const OUT = 'screenshots/prod-finance-related-probe';
mkdirSync(OUT, { recursive: true });
const CRED = { username: 'e2e_supervisor', password: 'E2e-de5e1cd55c024c488214!A9k' };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const net = [];
page.on('response', async (r) => {
  const st = r.status();
  if (st === 401 || st === 404) net.push(`${st} ${r.request().method()} ${r.url().replace(BASE, '')}`);
});
const errs = [];
page.on('pageerror', (e) => errs.push('[pageerror] ' + e.message));

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(3000);
const inputs = page.locator('input');
await inputs.nth(0).fill(CRED.username);
await inputs.nth(1).fill(CRED.password);
await inputs.nth(1).press('Enter');
await page.waitForTimeout(7000);

// 关引导
try {
  const g = page.locator('[data-testid="guide-tour"]');
  if (await g.isVisible().catch(() => false)) {
    const s = g.getByText(/跳过|知道了|关闭/).first();
    if (await s.isVisible().catch(() => false)) { await s.click(); await page.waitForTimeout(800); }
  }
} catch {}

net.length = 0;
await page.goto(`${BASE}/finance/invoices`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(7000);
try {
  const g = page.locator('[data-testid="guide-tour"]');
  if (await g.isVisible().catch(() => false)) {
    const s = g.getByText(/跳过|知道了|关闭/).first();
    if (await s.isVisible().catch(() => false)) { await s.click(); await page.waitForTimeout(800); }
  }
} catch {}

const bodyText = await page.locator('body').innerText();
console.log('=== 发票页关键文本 ===');
console.log('含「发票管理」：', bodyText.includes('发票管理'));
console.log('含「详情」：', bodyText.includes('详情'));
console.log('含「暂无」：', bodyText.includes('暂无'));
console.log('含「关联采购单」：', bodyText.includes('关联采购单'));
const buttons = await page.locator('button').allInnerTexts();
console.log('页面按钮清单：', JSON.stringify(buttons.filter(Boolean).slice(0, 30)));
const rows = await page.locator('table tbody tr').count();
console.log('表格行数：', rows);
if (rows > 0) {
  console.log('首行文本：', (await page.locator('table tbody tr').first().innerText()).replace(/\s+/g, ' ').slice(0, 200));
}
await page.screenshot({ path: `${OUT}/07-invoice-page.png`, fullPage: false });

console.log('\n=== 401/404 请求（去重前 25 条） ===');
const uniq = [...new Set(net)];
uniq.slice(0, 25).forEach((n) => console.log('  ' + n));
console.log(`  合计 ${net.length} 条 / 去重 ${uniq.length} 条`);
console.log('\n=== 页面异常 ===');
errs.slice(0, 10).forEach((e) => console.log('  ' + e));

await browser.close();
