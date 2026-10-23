// V3.108.0 仓库域详情页视觉验证（正式本地环境 8799）
// 流程：API 登录拿 Cookie → 逐列表页（触发 store 种子自填）→ 点首行查看 → 详情页截图+锚点断言
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://127.0.0.1:8799';
const OUT = 'screenshots/v3-108-verify';
mkdirSync(OUT, { recursive: true });
const CRED = { username: 'e2e_admin_261021073145-tmlc', password: 'E2eProd!2026' };
// RequireAuth 只认 zustand 持久化登录态（auth-storage）；API 登录后再注入本地态，刷新不跳登录页
const AUTH_STORAGE = JSON.stringify({
  state: {
    currentUser: {
      id: 'user_e2e_admin_tmlc', name: 'E2E 管理员', role: 'admin', department: 'QA',
      username: 'e2e_admin_261021073145-tmlc', org_id: 'org_6786e87f81b04a3180dd9d388b062ca1',
    },
    isAuthenticated: true,
  },
  version: 0,
});

// 列表页 → 预期锚点（详情页应出现的文字）
const PAGES = [
  { list: '/warehouse/inbound', anchor: '入库' },
  { list: '/warehouse/outbound', anchor: '出库' },
  { list: '/warehouse/check', anchor: '盘点' },
  { list: '/warehouse/inspection-notice', anchor: '报检' },
  { list: '/warehouse/transfer', anchor: '转储' },
  { list: '/warehouse/adjustment', anchor: '调整' },
  { list: '/warehouse/fg-inbound', anchor: '成品入库' },
  { list: '/warehouse/serial', anchor: '序列号' },
  { list: '/warehouse/consignment', anchor: '寄售' },
  { list: '/warehouse/batch', anchor: '批次' },
  { list: '/warehouse/wave-rfid', anchor: '波次' },
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
  try { window.localStorage.setItem('auth-storage', value); } catch { /* ignore */ }
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
    if (rowCount === 0) { r.note = '列表 0 行（种子未填或无数据）'; results.push(r); continue; }

    // 点首行查看入口，四级级联：自定义查看按钮 → 编号链接 → MoreVert菜单 → 首格可点文本
    const clickRes = await page.evaluate(() => {
      const row = document.querySelector('tbody tr');
      if (!row) return null;
      const btn = row.querySelector('button[aria-label*="查看"], button[aria-label*="详情"]');
      if (btn) { btn.click(); return 'btn'; }
      const link = row.querySelector('[data-testid="row-code-link"]');
      if (link) { link.click(); return 'link'; }
      const more = row.querySelector('button svg[data-testid="MoreVertIcon"]')?.closest('button');
      if (more) { more.click(); return 'more'; }
      const firstCell = row.querySelector('td');
      if (firstCell) {
        // 优先点最内层文本元素（p/span），外层 Box 容器没有 onClick
        const inner = firstCell.querySelector('p') || firstCell.querySelector('span') || firstCell;
        inner.click(); return 'cell';
      }
      return null;
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
    const hasAnchor = body.includes(cfg.anchor) && (body.includes('基本信息') || body.includes('操作历史') || body.includes('明细'));
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

console.log('\n===== V3.108.0 仓库域详情页视觉验证（本地 8799）=====');
let pass = 0;
for (const r of results) {
  if (r.ok) pass++;
  console.log(`${r.ok ? '✅' : '❌'} ${r.page.padEnd(28)} | ${r.note}${r.url ? ' → ' + r.url : ''}`);
}
console.log(`\n通过 ${pass}/${results.length}`);
const realErrors = consoleErrors.filter((e) => !/401|favicon|Failed to load resource/i.test(e));
console.log(realErrors.length ? `\n控制台错误 ${realErrors.length} 条：` : '\n控制台 0 有效错误');
realErrors.slice(0, 15).forEach((e) => console.log('  - ' + e));
