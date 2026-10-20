// 只读侦察：用真实浏览器把 SSA ERP 主要前端路由逐个走一遍，抓运行期缺陷。
// 禁止修改源码 / 禁止 git 提交。运行：
//   cd 项目根 && <node> scripts/_sweep_frontend_live.mjs [base]
// 仅点击「非破坏性」按钮（查询/搜索/筛选/刷新/新建/新增/添加），避免任何数据写入。

import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'https://ssa-erp.pages.dev';
const cred = JSON.parse(readFileSync(new URL('./prod-e2e/.e2e-credentials.json', import.meta.url), 'utf8'));
const RAW = 'tmp/frontend-sweep-raw.log';
mkdirSync('tmp', { recursive: true });
if (existsSync(RAW)) writeFileSync(RAW, '');

// 仅 concrete（无 :param）的叶子路由；覆盖全部要求业务域。
const ROUTES = [
  // 基础数据 / 物料 / 供应商 / 客户 / 仓库
  '/dashboard', '/profile',
  '/material/list', '/material/categories', '/material/approvals', '/material/create', '/material/valuation',
  '/vendor/list', '/vendor/register', '/vendor/blacklist', '/vendor/rating', '/vendor/performance', '/vendor/risk', '/vendor/approvals',
  '/sales/customers', '/sales/customers/create', '/sales/prospects',
  '/warehouse/master',
  // BOM
  '/bom/list', '/bom/create', '/bom/cost-rollup',
  // 采购全链路
  '/purchase/requests', '/purchase/create', '/purchase/orders', '/purchase/orders/create', '/purchase/track',
  '/purchase/approvals', '/purchase/framework', '/purchase/returns', '/purchase/info-records', '/purchase/source-list',
  // 价格 / 询价 / 比价
  '/price/inquiry', '/price/inquiry/create', '/price/comparisons', '/price/approvals', '/price/approval/new', '/price/list',
  // 销售全链路
  '/sales/orders', '/sales/orders/create', '/sales/quotation', '/sales/invoices', '/sales/returns', '/sales/atp',
  '/sales/contracts', '/sales/contracts/create', '/sales/analysis', '/sales/funnel', '/sales/projects',
  '/sales/logistics', '/sales/rebates', '/sales/customer-abc', '/sales/triparty',
  // 库存
  '/warehouse/inbound', '/warehouse/inbound/create', '/warehouse/outbound', '/warehouse/outbound/create',
  '/warehouse/fg-inbound', '/warehouse/check', '/warehouse/inventory', '/warehouse/batch', '/warehouse/aging',
  '/warehouse/barcode', '/warehouse/inspection-notice', '/warehouse/transfer', '/warehouse/adjustment',
  '/warehouse/serial', '/warehouse/trace', '/warehouse/consignment', '/warehouse/wave-rfid',
  // 生产
  '/production/orders', '/production/routes', '/production/mrp', '/production/report', '/production/capacity',
  '/production/operation-reporting', '/production/wip', '/production/cost', '/production/aps', '/production/versions',
  '/production/ecn', '/production/subcontract', '/production/crp', '/production/equipment', '/production/mto',
  '/production/scheduling', '/production/spc', '/production/gantt', '/production/repetitive', '/production/mes', '/production/sop',
  // 质量
  '/quality/inspection', '/quality/unqualified', '/quality/pdca', '/quality/report', '/quality/standards',
  '/quality/aql', '/quality/inspection-lot', '/quality/8d', '/quality/spc', '/quality/lab', '/quality/fmea', '/quality/coa',
  // 财务
  '/finance/invoices', '/finance/payments', '/finance/entries', '/finance/trial-balance', '/finance/chart-accounts',
  '/finance/vouchers', '/finance/three-way', '/finance/report', '/finance/tax', '/finance/project-accounting',
  '/finance/cash-flow', '/finance/exchange-rates', '/finance/aging', '/finance/auxiliary', '/finance/budget',
  '/finance/receivables', '/finance/payables', '/finance/copa', '/finance/cash', '/finance/bi', '/finance/esg',
  '/finance/statements', '/finance/fixed-assets', '/finance/closing', '/finance/consolidated',
  // 审批（各模块审批中心）
  '/material/approvals', '/vendor/approvals', '/purchase/approvals', '/price/approvals', '/price/approval/new',
  // 打印预览
  '/warehouse/barcode',
  // 平台 / 低代码 / 工作流
  '/platform/lowcode', '/platform/workflow', '/platform/integrations', '/platform/field-permissions',
  '/platform/i18n', '/platform/data-capacity',
  // 报表 / 分析 / 设置
  '/reports', '/reports/designer', '/reports/bi', '/reports/permissions',
  '/analytics/cockpit', '/analytics/forecast', '/analytics/ocr', '/analytics/chatbi', '/analytics/alerts',
  '/analytics/price', '/analytics/invoice-verify',
  '/settings', '/test/flow', '/help/manual',
];

const SAFE_BTN = ['查询', '搜索', '筛选', '刷新', '重置', '新建', '新增', '添加'];
const log = (s) => { process.stdout.write(s + '\n'); appendFileSync(RAW, s + '\n'); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

let pageErrors = [], consoleErrors = [], failedReq = [];
page.on('pageerror', (e) => pageErrors.push('pageerror: ' + (e.stack || e.message || String(e))));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('console.error: ' + m.text()); });
page.on('response', (r) => { if (r.status() >= 400) failedReq.push(`${r.status()} ${r.url()}`); });

// ── 登录 ──
log(`\n═══ 登录 ${BASE} ═══`);
try {
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('[data-testid="login-username"] input').fill(cred.username);
  await page.locator('[data-testid="login-password"] input').fill(cred.password);
  await page.locator('[data-testid="login-submit"]').click();
  await page.waitForTimeout(5000);
} catch (e) { log('  登录异常: ' + e.message); }
const token = await page.evaluate(() => localStorage.getItem('ssa-erp-auth-token')).catch(() => null);
log(`  登录令牌: ${token ? 'OK' : 'MISSING'}`);
if (!token) { log('  ❌ 登录失败，终止'); await browser.close(); process.exit(1); }

// ── 逐页实访 ──
const records = [];
let nVisited = 0, nWhite = 0, nBlockErr = 0, nEmptyList = 0, nNoReact = 0;
for (const route of ROUTES) {
  pageErrors = []; consoleErrors = []; failedReq = [];
  const rec = { route, bodyLen: -1, white: false, rows: -1, hasGrid: false, btns: 0, react: 'N/A', errors: [], failed: [] };
  try {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) { rec.note = 'goto-error: ' + e.message; }
  await page.waitForTimeout(2800);

  try {
    rec.bodyLen = await page.evaluate(() => document.body.innerText.length);
    rec.white = rec.bodyLen > 0 && rec.bodyLen < 200;
    // 列表行数：MUI DataGrid 走 role=grid，原生表走 table tbody
    rec.rows = await page.evaluate(() => {
      const grid = document.querySelector('[role="grid"]');
      if (grid) { const r = grid.querySelectorAll('[role="row"]'); return Math.max(0, r.length - 1); }
      const t = document.querySelector('table');
      if (t) return t.querySelectorAll('tbody tr').length;
      return -1;
    });
    rec.hasGrid = await page.evaluate(() => !!document.querySelector('table, [role="grid"]'));
    rec.btns = await page.evaluate(() => document.querySelectorAll('button, a[role="button"]').length);
  } catch (e) { rec.note = (rec.note || '') + ' eval-error: ' + e.message; }

  // 轻量按钮交互（只读/打开型）：点第一个安全按钮，看是否有反应
  rec.react = 'no-safe-btn';
  try {
    const handle = await page.evaluateHandle((keys) => {
      const els = [...document.querySelectorAll('button, a[role="button"]')];
      return els.find((el) => { const t = (el.innerText || '').trim(); return keys.some((k) => t.includes(k)); }) || null;
    }, SAFE_BTN);
    const clicked = handle.asElement();
    if (clicked) {
      const label = (await clicked.innerText().catch(() => '')) || '';
      const beforeUrl = page.url();
      const beforeDialog = await page.locator('[role="dialog"]').count();
      await clicked.click({ timeout: 5000 });
      await page.waitForTimeout(1800);
      const afterDialog = await page.locator('[role="dialog"]').count();
      const afterUrl = page.url();
      const errAfter = pageErrors.length + consoleErrors.length;
      const reacted = (afterDialog > beforeDialog) || (afterUrl !== beforeUrl) || (errAfter > 0);
      rec.react = reacted ? `react:click[${label.trim().slice(0,8)}]` : `NO-REACT:click[${label.trim().slice(0,8)}]`;
      if (!reacted) rec.note = (rec.note || '') + ' 按钮无反应';
    }
  } catch (e) { rec.react = 'click-error: ' + e.message.slice(0, 60); }

  rec.errors = [...pageErrors, ...consoleErrors];
  rec.failed = [...failedReq];
  if (rec.white) nWhite++;
  if (rec.errors.length) nBlockErr++;
  if (rec.hasGrid && rec.rows === 0) nEmptyList++;
  if (rec.react.startsWith('NO-REACT')) nNoReact++;
  nVisited++;

  const line = `【${route}】 body=${rec.bodyLen} 白屏=${rec.white} 列表行数=${rec.rows} 按钮数=${rec.btns} 交互=${rec.react} 运行期错误=${rec.errors.length} 失败请求=${rec.failed.length}` + (rec.note ? ` 备注=${rec.note}` : '');
  log(line);
  for (const er of rec.errors) log('     ‼ ' + er.slice(0, 240));
  for (const f of rec.failed.slice(0, 6)) log('     ⚠ ' + f);
  records.push(rec);
}

await browser.close();

// ── 汇总 & 落盘 ──
const defects = [];
for (const r of records) {
  if (r.white) defects.push({ route: r.route, step: `访问 ${r.route}`, err: `白屏 body.innerText.length=${r.bodyLen}`, level: '致命' });
  for (const er of r.errors) defects.push({ route: r.route, step: `访问 ${r.route}`, err: er.slice(0, 300), level: er.startsWith('pageerror') ? '严重' : '中等' });
  if (r.hasGrid && r.rows === 0) defects.push({ route: r.route, step: `访问 ${r.route} 列表`, err: '关键列表 0 行（需判断无数据 or 接口挂）', level: '中等' });
  if (r.react.startsWith('NO-REACT')) defects.push({ route: r.route, step: `点击页面首个安全按钮（查询/新建等）`, err: '主按钮点击后无任何反应（无弹窗/跳转/toast）', level: '中等' });
  if (r.failed.length) for (const f of r.failed) defects.push({ route: r.route, step: `接口请求`, err: `状态码>=400：${f}`, level: '严重' });
}

const md = [];
md.push('# SSA ERP 前端实访侦察报告（只读）');
md.push('');
md.push(`- 生产站点：${BASE}`);
md.push(`- 生成时间：${new Date().toISOString()}`);
md.push(`- 路由清单总数（src/App.tsx 中 concrete 叶子路由，已剔除 :param 详情页）：${ROUTES.length}`);
md.push(`- 实访页面数：${nVisited}`);
md.push(`- 白屏数：${nWhite}`);
md.push(`- 阻断报错数（pageerror/console.error 任一）：${nBlockErr}`);
md.push(`- 列表空白数（有表格/网格但 0 行）：${nEmptyList}`);
md.push(`- 按钮无反应数（首个安全按钮点击无反应）：${nNoReact}`);
md.push(`- 缺陷条数：${defects.length}`);
md.push('');
md.push('## 缺陷明细表');
md.push('');
md.push('| 页面路径 | 复现步骤 | 报错原文 | 分级建议 |');
md.push('| --- | --- | --- | --- |');
for (const d of defects) md.push(`| ${d.route} | ${d.step} | ${String(d.err).replace(/\|/g, '\\|').slice(0, 280)} | ${d.level} |`);
if (!defects.length) md.push('| — | — | 未发现明显运行期缺陷 | — |');
md.push('');
md.push('## 逐页原始记录（关键片段）');
md.push('');
for (const r of records) {
  const bits = [`路径=${r.route}`, `正文长=${r.bodyLen}`, `白屏=${r.white}`, `列表行=${r.rows}`, `按钮=${r.btns}`, `交互=${r.react}`, `错误数=${r.errors.length}`, `失败请求=${r.failed.length}`];
  md.push('- ' + bits.join(' | ') + (r.note ? ` | 备注=${r.note}` : ''));
  for (const er of r.errors) md.push('    - ‼ ' + er.slice(0, 240));
  for (const f of r.failed.slice(0, 6)) md.push('    - ⚠ ' + f);
}
md.push('');
md.push('> 说明：白屏判定 body.innerText.length<200；列表空白判定「存在 table/role=grid 但数据行=0」，可能系真实无数据而非故障，需结合接口失败请求二次确认。按钮无反应仅针对「查询/搜索/筛选/刷新/新建/新增/添加」等只读/打开型按钮，刻意未点击提交/保存/删除等写操作以遵守只读原则。');

writeFileSync('tmp/bugfix-frontend.md', md.join('\n'), 'utf8');
log(`\n═══ 完成：实访 ${nVisited} 页 / 白屏 ${nWhite} / 阻断报错 ${nBlockErr} / 列表空白 ${nEmptyList} / 按钮无反应 ${nNoReact} / 缺陷 ${defects.length} ═══`);
log('报告已落盘：tmp/bugfix-frontend.md');
process.exit(0);
