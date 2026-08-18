const { chromium } = require('playwright');

const BASE = process.env.BASE || 'https://ssa-erp.pages.dev';
const CO = 'xinguang'; // 公司码（共享标识）
const ORG = '新光专用汽车';
const TS = Date.now();
const U1 = 'boss' + TS;
const U2 = 'staff' + TS;
const PW = 'abc12345';
const CUST = '联调测试客户' + TS;

function log(...a) { console.log(...a); }

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // 新组织云端暂无数据，store 水合拉取 /api/state 返回 404 属预期（已本地兜底），不计为错误
    if (t.includes('Failed to load resource') && t.includes('404')) return;
    errors.push('CONSOLE.ERROR: ' + t);
  });

  try {
    // ── 1) 注册老板账号（同时创建组织）──
    log('▶ 打开登录页:', BASE + '/login');
    await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.getByText('注册新账号', { exact: true }).click();
    await page.getByLabel('用户名').fill(U1);
    await page.getByLabel('密码（至少6位）').fill(PW);
    await page.getByLabel('姓名').fill('张总');
    await page.getByLabel('公司码（同事填相同码即共享同一份数据）').fill(CO);
    await page.getByLabel('公司名称（选填，首次注册时创建组织）').fill(ORG);
    await page.getByRole('button', { name: /注.*册/ }).click();

    // 注册成功会 reload 进入主系统
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
    log('✅ 注册后进入主系统，URL =', page.url());

    // 侧边栏出现（证明 MainLayout 渲染、登录门禁通过）。「客户主数据」在折叠分组内，改用常驻可见的「主数据」
    await page.getByText('主数据', { exact: true }).first().waitFor({ timeout: 10000 });
    log('✅ 主系统侧边栏渲染正常');

    // 新用户首次进入会弹「新手引导」，先跳过（若不存在则忽略）
    try {
      await page.getByRole('button', { name: '跳过引导' }).click({ timeout: 4000 });
      log('✅ 已跳过新手引导');
    } catch { /* 无引导则跳过 */ }

    // ── 2) 新建客户 ──
    await page.goto(BASE + '/sales/customers/create', { waitUntil: 'networkidle', timeout: 30000 });
    await page.getByLabel('客户名称（企业全称）').fill(CUST);
    await page.getByLabel('简称').fill('联调');
    await page.getByRole('button', { name: '保存' }).click();

    // 等待返回列表或看到客户
    await page.waitForTimeout(3000);
    log('✅ 新建客户已提交，当前 URL =', page.url());

    // ── 3) 从 localStorage 取 token，验证数据已同步到 D1 ──
    const token = await page.evaluate(() => localStorage.getItem('ssa-erp-auth-token'));
    if (!token) throw new Error('未找到 auth token（本地存储）');
    const apiRes = await page.evaluate(async (t) => {
      const r = await fetch('/api/state/ssa-erp-customer', { headers: { Authorization: 'Bearer ' + t } });
      return { status: r.status, text: await r.text() };
    }, token);
    log('✅ 云端 ssa-erp-customer 状态:', apiRes.status);
    const synced = apiRes.text.includes(CUST);
    log(synced ? '✅ 客户数据已同步到后端 D1（含 "' + CUST + '"）' : '❌ 云端未找到该客户');
    if (!synced) log('  云端返回:', apiRes.text.slice(0, 300));

    // ── 4) 第二人同公司码注册，验证共享（用独立浏览器上下文，避免复用第一人的登录态）──
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await page2.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page2.getByText('注册新账号', { exact: true }).click();
    await page2.getByLabel('用户名').fill(U2);
    await page2.getByLabel('密码（至少6位）').fill(PW);
    await page2.getByLabel('姓名').fill('李工');
    await page2.getByLabel('公司码（同事填相同码即共享同一份数据）').fill(CO);
    await page2.getByRole('button', { name: /注.*册/ }).click();
    await page2.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
    await page2.waitForTimeout(3000); // 等待注册后的 reload 完全稳定
    const token2 = await page2.evaluate(() => localStorage.getItem('ssa-erp-auth-token'));
    const shared = await page2.evaluate(async (t) => {
      const r = await fetch('/api/state/ssa-erp-customer', { headers: { Authorization: 'Bearer ' + t } });
      return { status: r.status, text: await r.text() };
    }, token2);
    const seesShared = shared.text.includes(CUST);
    log(shared.status === 200 && seesShared
      ? '✅ 同事（同公司码）能看到同一份客户数据 → 多人共享验证通过'
      : '❌ 共享失败 status=' + shared.status);

    log('--- 页面错误数:', errors.length, '---');
    errors.slice(0, 5).forEach((e) => log(e));
    log(synced && seesShared && errors.length === 0 ? '\n🎉 全链路通过：注册/登录/共享/同步均正常' : '\n⚠️ 存在未通过项，见上');
  } catch (e) {
    log('❌ 测试异常:', e.message);
    log('当前 URL:', page.url());
    errors.slice(0, 5).forEach((x) => log(x));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
