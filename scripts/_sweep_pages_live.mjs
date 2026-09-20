// 页面可用率实测（生产域，只读）
// 修正上一版脚本的两个误判来源：
//   ① 把「接口 404 噪音」当成运行期错误 → 这里严格区分 pageerror（真崩溃）与 console.error
//   ② 忽略 /api/state/* 这类已知状态键 404（不影响页面可用，单列统计）
// 用法：node scripts/_sweep_pages_live.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = 'https://ssa-erp.pages.dev';
const cred = JSON.parse(readFileSync(new URL('./prod-e2e/.e2e-credentials.json', import.meta.url), 'utf8'));

// 覆盖 11 个业务域的代表性页面
const PAGES = [
  ['基础数据-物料', '/material/list'], ['基础数据-供应商', '/vendor/list'], ['基础数据-客户', '/sales/customers'],
  ['采购-申请', '/purchase/requests'], ['采购-订单', '/purchase/orders'], ['采购-收货跟踪', '/purchase/track'],
  ['销售-订单', '/sales/orders'], ['销售-报价', '/sales/quotation'], ['销售-发票', '/sales/invoices'],
  ['库存-入库单', '/warehouse/inbound'], ['库存-出库单', '/warehouse/outbound'], ['库存-库存查询', '/warehouse/inventory'],
  ['库存-调拨', '/warehouse/transfer'], ['库存-盘点', '/warehouse/check'],
  ['生产-工单', '/production/orders'], ['生产-工艺路线', '/production/routes'], ['生产-委外', '/production/subcontract'],
  ['财务-凭证', '/finance/vouchers'], ['财务-总账', '/finance/ledger'], ['财务-科目', '/finance/accounts'],
  ['审批-待办', '/approval/pending'], ['审批-流程配置', '/approval/flows'],
  ['打印-模板', '/print/templates'], ['平台-低代码', '/platform/lowcode'],
  ['BOM-清单', '/bom/list'], ['BOM-成本卷算', '/bom/cost-rollup'],
  ['质量-检验', '/quality/inspection'], ['项目', '/sales/projects'],
  ['报表-驾驶舱', '/dashboard'], ['设置-帮助中心', '/settings'],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

let crash = [], noise = [];
page.on('pageerror', (e) => crash.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') noise.push(m.text()); });

console.log('登录中…');
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 60000 });
await page.locator('[data-testid="login-username"] input').fill(cred.username);
await page.locator('[data-testid="login-password"] input').fill(cred.password);
await page.locator('[data-testid="login-submit"]').click();
await page.waitForTimeout(5000);
const token = await page.evaluate(() => localStorage.getItem('ssa-erp-auth-token'));
console.log('令牌：', token ? '已取得' : '未取得');

const rows = [];
for (const [name, path] of PAGES) {
  crash = []; noise = [];
  const failed = [];
  const onResp = (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); };
  page.on('response', onResp);
  let bodyLen = 0, navErr = '';
  try {
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1500);
    bodyLen = await page.evaluate(() => document.body.innerText.length);
  } catch (e) { navErr = String(e.message).slice(0, 60); }
  page.off('response', onResp);
  // /api/state/* 是前端状态键查询，键不存在即 404，属已知噪音，不影响页面可用性
  const stateNoise = failed.filter((f) => f.includes('/api/state/'));
  const realFail = failed.filter((f) => !f.includes('/api/state/'));
  const white = bodyLen < 200;
  rows.push({ name, path, bodyLen, white, crash: crash.length, crashMsg: crash[0] || '', stateNoise: stateNoise.length, realFail: realFail.length, realFailSample: realFail.slice(0, 2).join(' | '), navErr });
  console.log(`  ${white || crash.length ? '❌' : '✅'} ${name.padEnd(14)} body=${String(bodyLen).padStart(5)} 崩溃=${crash.length} 业务接口失败=${realFail.length} 状态键404=${stateNoise.length}`);
}
await browser.close();

const total = rows.length;
const white = rows.filter((r) => r.white).length;
const crashed = rows.filter((r) => r.crash > 0).length;
const okPages = rows.filter((r) => !r.white && r.crash === 0 && !r.navErr).length;
console.log(`\n══ 页面可用率：${okPages}/${total} = ${(okPages / total * 100).toFixed(1)}% ══`);
console.log(`白屏 ${white} 个 / 运行期崩溃 ${crashed} 个`);

writeFileSync('tmp/page-availability.json', JSON.stringify({ total, okPages, white, crashed, rows }, null, 2));
console.log('明细已存 tmp/page-availability.json');
