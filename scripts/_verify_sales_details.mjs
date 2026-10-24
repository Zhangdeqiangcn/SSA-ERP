// V3.111.0 销售域详情页视觉验证（正式本地环境 8799）
// 流程：API 登录拿 Cookie → 逐列表页（触发 store 种子自填）→ 点首行查看 → 详情页截图+锚点断言
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://127.0.0.1:8799';
const OUT = 'screenshots/v3-111-verify';
mkdirSync(OUT, { recursive: true });
const CRED = { username: 'e2e_supervisor', password: 'E2e-de5e1cd55c024c488214!A9k' };
// RequireAuth 只认 zustand 持久化登录态（auth-storage）；API 登录后再注入本地态，刷新不跳登录页
const AUTH_STORAGE = JSON.stringify({
  state: {
    currentUser: {
      id: 'user_e2e_supervisor', name: 'E2E 测试超管', role: 'super_admin', department: null,
      username: 'e2e_supervisor', org_id: 'org_e2e_sandbox',
    },
    isAuthenticated: true,
  },
  version: 0,
});

// 列表页 → 预期锚点（详情页应出现的明细区文字）
const PAGES = [
  { list: '/sales/logistics', anchor: '发货明细' },
  { list: '/sales/prospects', anchor: '意向产品' },
  { list: '/sales/triparty', anchor: '结算状态' },
  { list: '/sales/quotation', anchor: '报价明细' },
  { list: '/sales/invoices', anchor: '发票明细' },
  { list: '/sales/returns', anchor: '退货明细' },
];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// 1. API 登录（Cookie 自动进 context jar）
const login = await context.request.post(`${BASE}/api/auth/login`, { data: CRED });
if (login.status() !== 200) {
  console.error('登录失败', login.status(), await login.text());
  await browser.close();
  process.exit(1);
}
console.log('✅ 登录成功');

const page = await context.newPage();
// 每个文档加载前写入持久化登录态（addInitScript 在页面脚本前执行）
await page.addInitScript((value) => {
  try {
    window.localStorage.setItem('auth-storage', value);
    // V3.112.0：同步注入会话标记（真实登录会写 ssa-erp-session），使 isAuthed() 类守卫与真实态一致
    window.localStorage.setItem('ssa-erp-session', '1');
  } catch { /* ignore */ }
}, AUTH_STORAGE);
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => consoleErrors.push('[pageerror] ' + e.message.slice(0, 160)));

const results = [];
for (const cfg of PAGES) {
  const r = { page: cfg.list, ok: false, note: '', url: '' };
  try {
    await page.goto(`${BASE}${cfg.list}`, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(3500); // 等 store load + 种子自填

    const rowCount = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
    if (rowCount === 0) { r.note = '列表 0 行（无数据）'; results.push(r); continue; }

    // 点首行查看入口，四级级联：自定义查看按钮 → 编号链接 → MoreVert菜单 → 首行整体点击（onView 绑行）
    const clickRes = await page.evaluate(() => {
      const row = document.querySelector('tbody tr');
      if (!row) return null;
      const btn = row.querySelector('button[aria-label*="查看"], button[aria-label*="详情"], button[title*="查看"], button[title*="详情"]')
        || [...row.querySelectorAll('button')].find((b) => b.innerText && b.innerText.includes('查看'));
      if (btn) { btn.click(); return 'btn'; }
      const link = row.querySelector('[data-testid="row-code-link"]');
      if (link) { link.click(); return 'link'; }
      const more = row.querySelector('button svg[data-testid="MoreVertIcon"]')?.closest('button');
      if (more) { more.click(); return 'more'; }
      // 兜底：直接点整行（onView 绑在 TableRow 的场景）
      row.click(); return 'row';
    });
    if (!clickRes) { r.note = `列表 ${rowCount} 行但无查看入口`; results.push(r); continue; }
    // MoreVert 菜单形态：等菜单展开后点「查看」
    if (clickRes === 'more') {
      await page.waitForTimeout(600);
      const menuClicked = await page.evaluate(() => {
        const items = [...document.querySelectorAll('.MuiMenuItem-root')];
        const viewItem = items.find((el) => el.innerText.includes('查看'));
        if (viewItem) { viewItem.click(); return true; }
        return false;
      });
      if (!menuClicked) { r.note = 'MoreVert 菜单无「查看」项'; results.push(r); continue; }
    }

    await page.waitForTimeout(3000);
    r.url = page.url().replace(BASE, '');
    const body = await page.evaluate(() => document.body.innerText);
    const notFound = body.includes('不存在，请返回列表重新选择');
    const hasAnchor = body.includes(cfg.anchor) && /(基本信息|操作历史|明细|金额汇总|进度概览|供需平衡|发料明细|保养说明|倒冲明细|变更内容|关联|返回)/.test(body);
    r.ok = hasAnchor && !notFound;
    r.note = notFound ? '详情页报「不存在」' : hasAnchor ? `渲染正常（入口=${clickRes}）` : '未找到锚点';
    const name = cfg.list.replace(/\//g, '_').replace(/^_/, '');
    await page.screenshot({ path: `${OUT}/${name}.png` });
  } catch (e) {
    r.note = '异常：' + e.message.slice(0, 100);
  }
  results.push(r);
}

await browser.close();

console.log('\n===== V3.111.0 销售域详情页视觉验证（本地 8799）=====');
let pass = 0;
for (const r of results) {
  if (r.ok) pass++;
  console.log(`${r.ok ? '✅' : '❌'} ${r.page.padEnd(26)} | ${r.note}${r.url ? ' → ' + r.url : ''}`);
}
console.log(`\n通过 ${pass}/${results.length}`);
const realErrors = consoleErrors.filter((e) => !/401|favicon|Failed to load resource|Download the React DevTools/i.test(e));
console.log(realErrors.length ? `\n控制台错误 ${realErrors.length} 条：` : '\n控制台 0 有效错误');
realErrors.slice(0, 15).forEach((e) => console.log('  - ' + e));
