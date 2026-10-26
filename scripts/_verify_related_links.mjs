// V3.113.0 详情页「关联单据」可点跳转专项视觉验证（本地 8799）
// 流程：API 登录 → 逐列表页点首行进详情 → 断言 #related-docs 区块 → 提取上下游链接 → 实际点击验证跳转
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://127.0.0.1:8799';
const OUT = 'screenshots/v3-113-related';
mkdirSync(OUT, { recursive: true });
const CRED = { username: 'e2e_supervisor', password: 'E2e-de5e1cd55c024c488214!A9k' };
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

// 列表页 → 说明
const PAGES = [
  { list: '/purchase/orders', label: '采购订单详情' },
  { list: '/warehouse/inbound', label: '入库单详情' },
  { list: '/warehouse/outbound', label: '出库单详情' },
  { list: '/sales/logistics', label: '物流发货详情' },
  { list: '/sales/orders', label: '销售订单详情' },
  { list: '/sales/invoices', label: '销售发票详情' },
];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const login = await context.request.post(`${BASE}/api/auth/login`, { data: CRED });
if (login.status() !== 200) {
  console.error('登录失败', login.status(), await login.text());
  await browser.close();
  process.exit(1);
}
console.log('✅ 登录成功');

const page = await context.newPage();
await page.addInitScript((value) => {
  try {
    window.localStorage.setItem('auth-storage', value);
    window.localStorage.setItem('ssa-erp-session', '1');
  } catch { /* ignore */ }
}, AUTH_STORAGE);
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => consoleErrors.push('[pageerror] ' + e.message.slice(0, 160)));

// 首次进入关闭欢迎引导弹窗（避免遮挡断言与截图）
async function dismissOnboarding() {
  try {
    const skip = page.locator('button:has-text("跳过引导")');
    if (await skip.count() > 0) { await skip.first().click({ timeout: 2000 }); await page.waitForTimeout(400); }
  } catch { /* 无弹窗则忽略 */ }
}

const results = [];
for (const cfg of PAGES) {
  const r = { list: cfg.list, label: cfg.label, detailUrl: '', blockFound: false, upstream: '', downstream: '', clickOk: null, clickTarget: '', note: '' };
  try {
    await page.goto(`${BASE}${cfg.list}`, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(3000); // 等 store load + 种子自填
    await dismissOnboarding();

    const rowCount = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
    if (rowCount === 0) { r.note = '列表 0 行（无数据）'; results.push(r); continue; }

    // 四级级联进详情（与既有 _verify_*_details 同款）
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
      row.click(); return 'row';
    });
    if (!clickRes) { r.note = `列表 ${rowCount} 行但无查看入口`; results.push(r); continue; }
    if (clickRes === 'more') {
      await page.waitForTimeout(600);
      const ok = await page.evaluate(() => {
        const item = [...document.querySelectorAll('.MuiMenuItem-root')].find((el) => el.innerText.includes('查看'));
        if (item) { item.click(); return true; }
        return false;
      });
      if (!ok) { r.note = 'MoreVert 菜单无「查看」项'; results.push(r); continue; }
    }

    await page.waitForTimeout(3000);
    await dismissOnboarding();
    r.detailUrl = page.url().replace(BASE, '');

    // 断言「关联单据」区块（ObjectPage 渲染 id=related-docs）
    const block = await page.evaluate(() => {
      const sec = document.querySelector('#related-docs');
      if (!sec) return { found: false, upstream: '', downstream: '' };
      const boxes = [...sec.querySelectorAll(':scope > div > div, :scope > div *')];
      let upstream = '';
      let downstream = '';
      // 依标签文本找同级链接
      const findByLabel = (label) => {
        const el = [...sec.querySelectorAll('p, span, div')].find((n) => n.children.length === 0 && n.textContent.trim() === label);
        if (!el) return '';
        const holder = el.parentElement?.querySelector('button');
        return holder ? holder.textContent.trim() : '';
      };
      upstream = findByLabel('上游单号');
      downstream = findByLabel('下游单号');
      return { found: true, upstream, downstream };
    });
    r.blockFound = block.found;
    r.upstream = block.upstream;
    r.downstream = block.downstream;

    if (!block.found) {
      r.note = '详情页正常，但无关联关系（区块按设计不显示）';
      await page.screenshot({ path: `${OUT}/${cfg.list.replace(/\//g, '_')}.png`, fullPage: true });
      results.push(r);
      continue;
    }

    // 逐条点击区块内全部链接（带重试区分「时序未加载」与「目标单不存在」）
    const links = page.locator('#related-docs button.MuiLink-root');
    const linkCount = await links.count();
    if (linkCount === 0) {
      r.note = '区块存在但无可点链接（异常）';
      r.clickOk = false;
    } else {
      const detailUrl = page.url();
      const perLink = [];
      for (let i = 0; i < linkCount; i++) {
        // 每次点击前确保停在详情页
        if (page.url() !== detailUrl) {
          await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
          await page.waitForTimeout(2000);
          await dismissOnboarding();
        }
        const linkText = (await links.nth(i).textContent())?.trim() || `#${i}`;
        let navigated = false;
        let finalUrl = '';
        for (let attempt = 1; attempt <= 3; attempt++) {
          await links.nth(i).click({ timeout: 5000 });
          await page.waitForTimeout(1500 + attempt * 1200);
          finalUrl = page.url();
          if (finalUrl !== detailUrl) { navigated = true; break; }
        }
        let notFound = false;
        if (navigated) {
          const body = await page.evaluate(() => document.body.innerText);
          notFound = body.includes('不存在，请返回列表重新选择');
        }
        perLink.push({ text: linkText, ok: navigated && !notFound, target: finalUrl.replace(BASE, ''), notFound });
      }
      r.clickResults = perLink;
      r.clickOk = perLink.length > 0 && perLink.every((p) => p.ok);
      r.clickTarget = perLink.map((p) => `${p.text}${p.ok ? '→' + p.target : '→未跳转'}`).join(' ; ');
      r.note = perLink.every((p) => p.ok) ? '全部链接点击跳转成功' : perLink.some((p) => p.ok) ? '部分链接跳转成功' : '全部链接未跳转（疑似目标 store 无该单号）';
    }
    // 区块本身截图
    if (page.url().replace(BASE, '') !== r.detailUrl) {
      await page.goto(`${BASE}${r.detailUrl}`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await dismissOnboarding();
    }
    await page.screenshot({ path: `${OUT}/${cfg.list.replace(/\//g, '_')}.png`, fullPage: true });
  } catch (e) {
    r.note = '异常：' + e.message.slice(0, 100);
  }
  results.push(r);
}

await browser.close();

console.log('\n===== V3.113.0 详情页「关联单据」可点跳转验证（本地 8799）=====');
for (const r of results) {
  const blockTag = r.blockFound ? '有区块' : '无区块';
  const clickTag = r.clickOk === null ? '—' : (r.clickOk ? '✅跳转' : '❌跳转');
  console.log(`${r.note.startsWith('异常') || r.note.includes('异常') ? '❌' : '✅'} ${r.list.padEnd(22)} | ${blockTag} | 上游[${r.upstream || '-'}] 下游[${r.downstream || '-'}] | ${clickTag} ${r.clickTarget || ''} | ${r.note}${r.detailUrl ? ' → ' + r.detailUrl : ''}`);
}
const withBlock = results.filter((r) => r.blockFound);
const clickPassed = results.filter((r) => r.clickOk === true).length;
const clickFailed = results.filter((r) => r.clickOk === false).length;
console.log(`\n区块出现 ${withBlock.length}/${results.length}；点击跳转 成功 ${clickPassed} / 失败 ${clickFailed}`);
const realErrors = consoleErrors.filter((e) => !/401|favicon|Failed to load resource|Download the React DevTools/i.test(e));
console.log(realErrors.length ? `\n控制台错误 ${realErrors.length} 条：` : '\n控制台 0 有效错误');
realErrors.slice(0, 15).forEach((e) => console.log('  - ' + e));
