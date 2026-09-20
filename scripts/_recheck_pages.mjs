// 复核：上一轮 6 个「白屏」经核对均为巡检脚本猜错路由（真实路由里不存在），
// 这里换成从 src 路由清单里取到的真实路径重测，得到可信的页面可用率。
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = 'https://ssa-erp.pages.dev';
const cred = JSON.parse(readFileSync(new URL('./prod-e2e/.e2e-credentials.json', import.meta.url), 'utf8'));

const PAGES = [
  ['财务-试算平衡(原猜/ledger)', '/finance/trial-balance'],
  ['财务-科目表(原猜/accounts)', '/finance/chart-accounts'],
  ['财务-分录', '/finance/entries'],
  ['财务-应收', '/finance/receivables'],
  ['审批-采购审批(原猜/pending)', '/purchase/approvals'],
  ['审批-价格审批', '/price/approvals'],
  ['首页/驾驶舱(原猜/dashboard)', '/'],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
let crash = [];
page.on('pageerror', (e) => crash.push(e.message));

await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 60000 });
await page.locator('[data-testid="login-username"] input').fill(cred.username);
await page.locator('[data-testid="login-password"] input').fill(cred.password);
await page.locator('[data-testid="login-submit"]').click();
await page.waitForTimeout(5000);

let ok = 0;
for (const [name, path] of PAGES) {
  crash = [];
  const failed = [];
  const onResp = (r) => { if (r.status() >= 400 && !r.url().includes('/api/state/')) failed.push(r.status() + ' ' + r.url()); };
  page.on('response', onResp);
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1500);
  const bodyLen = await page.evaluate(() => document.body.innerText.length);
  page.off('response', onResp);
  const good = bodyLen >= 200 && crash.length === 0;
  if (good) ok++;
  console.log(`  ${good ? '✅' : '❌'} ${name.padEnd(28)} body=${String(bodyLen).padStart(5)} 崩溃=${crash.length} 业务接口失败=${failed.length}${failed.length ? ' | ' + failed[0] : ''}`);
}
await browser.close();
console.log(`\n══ 真实路径复核：${ok}/${PAGES.length} 可用 ══`);
