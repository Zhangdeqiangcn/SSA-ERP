// 一次性脚本：V3.15.9 低代码设计器「演示版」标注 —— 真实浏览器访问验收
// 用法：node scripts/_verify_lowcode_page_live.mjs [base]
// 目的：前端改页面必须实访确认「横幅渲染 + 页面不白屏 + 无运行期报错」。
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'https://ssa-erp.pages.dev';
const cred = JSON.parse(readFileSync(new URL('./prod-e2e/.e2e-credentials.json', import.meta.url), 'utf8'));

let pass = 0, fail = 0;
const ok = (n, c, e = '') => { if (c) { pass++; console.log(`  ✅ ${n}${e ? ' — ' + e : ''}`); } else { fail++; console.log(`  ❌ ${n}${e ? ' — ' + e : ''}`); } };

console.log(`\n══ 低代码设计器标注 · 真实浏览器验收 ══\n基址：${BASE}\n`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
const failedReq = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
page.on('response', (r) => { if (r.status() >= 400) failedReq.push(`${r.status()} ${r.url()}`); });

try {
  console.log('① 登录');
  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 60000 });
  const userBox = page.locator('[data-testid="login-username"] input');
  const passBox = page.locator('[data-testid="login-password"] input');
  await userBox.waitFor({ timeout: 20000 });
  await userBox.fill(cred.username);
  await passBox.fill(cred.password);
  await page.locator('[data-testid="login-submit"]').click();
  await page.waitForTimeout(5000);
  ok('登录后离开登录页', !/\/login/.test(page.url()), `url=${page.url()}`);
  const token = await page.evaluate(() => localStorage.getItem('ssa-erp-auth-token'));
  ok('已取得会话令牌', !!token, token ? 'token 存在' : '未取到 token');

  console.log('② 访问低代码设计器页面 /platform/lowcode');
  await page.goto(BASE + '/platform/lowcode', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);

  const banner = page.locator('[data-testid="lowcode-demo-banner"]');
  const bannerCount = await banner.count();
  ok('横幅元素已渲染', bannerCount === 1, `count=${bannerCount}`);
  if (bannerCount > 0) {
    const txt = (await banner.innerText()).replace(/\s+/g, '');
    ok('横幅文案正确', txt.includes('当前为设计器演示版') && txt.includes('尚未接入后端表单引擎'), txt.slice(0, 46) + '…');
  }

  const title = await page.locator('text=低代码单据设计器').count();
  ok('页面本身正常渲染（非白屏）', title > 0, `标题命中 ${title} 处`);

  const bodyText = await page.evaluate(() => document.body.innerText.length);
  ok('页面有实际内容', bodyText > 200, `正文长度 ${bodyText}`);

  console.log('③ 页面原有功能未被破坏');
  const tabs = await page.locator('[role="tab"]').count();
  ok('三个页签仍在（表单定义/数据填报/提交记录）', tabs === 3, `tabs=${tabs}`);
  const addBtn = await page.locator('[data-testid="lc-form-add"]').count();
  ok('「新建表单」按钮仍在', addBtn === 1, `count=${addBtn}`);

  console.log('④ 运行期报错检查');
  // 只关心「脚本层」报错（未定义引用 / 组件崩溃）；资源 404 单独列出判断归属
  const scriptErr = errors.filter((e) => e.startsWith('pageerror'));
  ok('无运行期 JS 脚本报错（白屏根因）', scriptErr.length === 0, scriptErr.length ? scriptErr.slice(0, 3).join(' | ') : '0 条');
  if (failedReq.length) {
    console.log(`  ⚠️  资源请求失败 ${failedReq.length} 条（需判断是否本次引入）：`);
    for (const f of failedReq.slice(0, 8)) console.log(`      ${f}`);
  } else {
    console.log('  ✅ 无资源请求失败');
  }

  await page.screenshot({ path: 'tmp/lowcode-banner-verify.png', fullPage: false });
  console.log('  截图已存：tmp/lowcode-banner-verify.png');
} catch (e) {
  fail++;
  console.log(`  ❌ 执行异常：${e.message}`);
} finally {
  await browser.close();
}

console.log(`\n══ 结果：${pass} 通过 / ${fail} 失败 ══\n`);
process.exit(fail === 0 ? 0 : 1);
