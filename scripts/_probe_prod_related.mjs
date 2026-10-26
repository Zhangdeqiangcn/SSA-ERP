// 生产定点探针：详情页「关联单据」区块 + 链接点击跳转（真实登录）
// 用法：node scripts/_probe_prod_related.mjs     （BASE 可覆盖，默认生产）
//       MAX_CLICK=3  控制每个页面最多实点几个链接（默认 3，避免下游条目多时超时）
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = process.env.BASE || 'https://ssa-erp.pages.dev';
const MAX_CLICK = Number(process.env.MAX_CLICK || 3);
const OUT = 'screenshots/prod-related-probe';
mkdirSync(OUT, { recursive: true });
const CRED = { username: 'e2e_supervisor', password: 'E2e-de5e1cd55c024c488214!A9k' };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('[pageerror] ' + e.message));

// ── 真实登录（浏览器种 HttpOnly 会话 Cookie，与真人操作一致）──
// 注意：页面上有多个同名「登录」按钮，用密码框回车提交最稳；失败时重试 3 次。
async function login() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    const inputs = page.locator('input');
    await inputs.nth(0).waitFor({ state: 'visible', timeout: 15000 });
    await inputs.nth(0).fill(CRED.username);
    await inputs.nth(1).fill(CRED.password);
    await inputs.nth(1).press('Enter');
    await page.waitForTimeout(7000);
    const onApp = !(await page.locator('body').innerText()).includes('忘记密码');
    console.log(`  登录尝试 ${attempt}：${onApp ? '成功' : '失败'}`);
    if (onApp) return true;
  }
  return false;
}

if (!(await login())) {
  console.log('❌ 多次尝试后仍无法登录');
  await browser.close();
  process.exit(1);
}
console.log('当前 URL:', page.url().replace(BASE, '') || '/');
const cookies = await ctx.cookies(BASE);
console.log('会话 Cookie:', cookies.map((c) => c.name).join(',') || '无');

// ── 关闭「新用户引导」弹窗（会拦截指针事件，导致链接点不动）──
async function dismissOnboarding() {
  try {
    const skip = page.locator('button:has-text("跳过引导")');
    if ((await skip.count()) > 0) { await skip.first().click({ timeout: 3000 }); await page.waitForTimeout(500); }
  } catch { /* 无弹窗则忽略 */ }
}

// ── 1) 列表页行数 ──
for (const [url, label] of [['/warehouse/inbound', '入库单列表'], ['/purchase/orders', '采购订单列表']]) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  await dismissOnboarding();
  const rows = await page.locator('table tbody tr').count();
  console.log(`  ${label} ${url} | 表格行数=${rows}`);
}

// ── 2) 直连详情页断言 ──
const DETAILS = [
  { url: '/warehouse/inbound/inb-e2e-prod', label: '入库单详情(本次补种)' },
  { url: '/purchase/orders/po_a7043d4aa68e47ffb88531134a33106a', label: '采购订单详情(上游，上游链接实际指向)' },
];

for (const d of DETAILS) {
  console.log(`\n—— ${d.label} ${d.url}`);
  await page.goto(`${BASE}${d.url}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  await dismissOnboarding();
  const hasBlock = await page.locator('#related-docs').count();
  console.log(`  关联区块 #related-docs: ${hasBlock > 0 ? '存在' : '不存在'}`);
  if (hasBlock > 0) {
    console.log(`  区块文本: ${(await page.locator('#related-docs').innerText()).replace(/\s+/g, ' ').slice(0, 160)}`);
    const links = page.locator('#related-docs button.MuiLink-root');
    const n = await links.count();
    console.log(`  可点链接数: ${n}（本次实点前 ${Math.min(n, MAX_CLICK)} 个）`);
    for (let i = 0; i < Math.min(n, MAX_CLICK); i++) {
      const label = (await links.nth(i).innerText()).trim();
      const before = page.url();
      await links.nth(i).click();
      await page.waitForTimeout(3000);
      const after = page.url();
      console.log(`   ➜ 点击「${label}」 ${before === after ? '❌未跳转' : '✅跳转到 ' + after.replace(BASE, '')}`);
      if (before !== after) {
        await page.goto(`${BASE}${d.url}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(4000);
        await dismissOnboarding();
      }
    }
    await page.screenshot({ path: `${OUT}/${d.url.replace(/[^a-z0-9]/gi, '_')}.png` });
  } else {
    console.log(`  页面首段: "${(await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 220)}"`);
  }
}

console.log('\n控制台未捕获异常:', errs.length ? errs.slice(0, 5) : '0 条');
await browser.close();
