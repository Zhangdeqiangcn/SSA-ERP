// 一次性脚本：对照组 —— 确认 /api/state/* 404 是既有现象，而非 V3.15.9 引入
// 做法：登录后分别访问「工作台（未被本轮改动）」与「低代码页（本轮改动）」，
//       比较两页的 /api/state 404 数量与键名是否一致。
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'https://ssa-erp.pages.dev';
const cred = JSON.parse(readFileSync(new URL('./prod-e2e/.e2e-credentials.json', import.meta.url), 'utf8'));

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 60000 });
await page.locator('[data-testid="login-username"] input').fill(cred.username);
await page.locator('[data-testid="login-password"] input').fill(cred.password);
await page.locator('[data-testid="login-submit"]').click();
await page.waitForTimeout(5000);

async function measure(path, label) {
  const misses = [];
  const onResp = (r) => { if (r.url().includes('/api/state/') && r.status() === 404) misses.push(r.url().split('/api/state/')[1]); };
  page.on('response', onResp);
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  page.off('response', onResp);
  console.log(`\n【${label}】${path}`);
  console.log(`  /api/state 404 数量：${misses.length}`);
  console.log(`  键名：${[...new Set(misses)].sort().join('、') || '（无）'}`);
  return [...new Set(misses)].sort();
}

const dash = await measure('/dashboard', '对照组 · 工作台（本轮未改动）');
const low = await measure('/platform/lowcode', '实验组 · 低代码页（本轮改动）');

const same = JSON.stringify(dash) === JSON.stringify(low);
console.log(`\n══ 判定 ══`);
console.log(`两组 /api/state 缺失键集合${same ? '完全一致' : '不一致'}`);
console.log(same
  ? '✅ 结论：/api/state/* 404 是既有现象（前端按「键不存在」容错处理），与 V3.15.9 改动无关。'
  : '⚠️  结论：两组不一致，需进一步排查低代码页新增的缺失键。');
if (!same) {
  console.log('  低代码页独有：' + low.filter((k) => !dash.includes(k)).join('、'));
}

await browser.close();
process.exit(0);
