/**
 * V3.103.1 针对性生产实测：物料明细「手敲物料编码 → 回车 → 自动回填名称/规格/单位/预估单价」。
 * 背景：强哥反馈该交互在 V3.103.0 上不生效（根因=Autocomplete 缺 autoHighlight/autoSelect）。
 * 本脚本对生产 https://ssa-erp.pages.dev 做真实浏览器验证，跑完清理测试物料。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const BASE = 'https://ssa-erp.pages.dev';
const cred = JSON.parse(readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'prod-e2e', '.e2e-credentials.json'), 'utf8'));
const stamp = `VRF${Date.now().toString().slice(-8)}`;
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: 'zh-CN' });
const page = await ctx.newPage();

try {
  // 1) 界面登录（前端启动校验本地会话，须走真实登录流程）
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const userBox = page.locator('input').nth(0);
  const passBox = page.locator('input[type="password"]').first();
  await userBox.fill(cred.username);
  await passBox.fill(cred.password);
  await page.getByRole('button', { name: /登\s*录/ }).last().click();
  await page.waitForTimeout(3500);
  check('登录生产', !page.url().includes('/login'), `url=${page.url()}`);
  if (page.url().includes('/login')) throw new Error('login failed');
  const token = '';

  // 2) 建验证物料
  const mk = await page.request.post(`${BASE}/api/materials`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    data: {
      code: stamp, name: '回填验证物料', specification: 'SPEC-VRF-1031', unit: '个',
      materialType: 'raw', price: 42.5, standardPrice: 42.5, status: 'active',
      remarks: 'V3.103.1 回填交互验证，跑完即删',
    },
  });
  check('创建验证物料', mk.status() === 201, `status=${mk.status()}`);
  const mat = await mk.json().catch(() => ({}));
  const mid = mat?.data?.id;

  // 3) 打开新建采购申请
  await page.goto(`${BASE}/purchase/create`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=pr-add]', { state: 'attached', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 关新手引导弹窗（盖住整页会拦截点击）
  const skipBtn = page.getByRole('button', { name: /跳过引导/ });
  if (await skipBtn.count()) { await skipBtn.click().catch(() => {}); await page.waitForTimeout(800); }
  // 关右下角「数据在其他设备已被修改」提示
  const knowBtn = page.getByRole('button', { name: /知道了/ });
  if (await knowBtn.count()) { await knowBtn.click().catch(() => {}); await page.waitForTimeout(500); }

  // 4) 确保有明细行（无则点「添加物料明细」）
  await page.waitForSelector('[data-testid=pr-add]', { state: 'attached', timeout: 30000 });
  await page.waitForTimeout(2000);          // 等懒加载渲染稳定
  let codeInput = page.locator('input[placeholder="输入物料编码"]').first();
  if (!(await codeInput.count())) {
    await page.locator('[data-testid=pr-add]').evaluate((el) => (el).click());
    await page.waitForTimeout(1000);
    codeInput = page.locator('input[placeholder="输入物料编码"]').first();
  }
  check('物料明细行存在', (await codeInput.count()) > 0);

  // 5) ★ 核心验证：手敲物料编码 → 按回车（不点下拉）
  await codeInput.click();
  await codeInput.fill(stamp);
  await page.waitForTimeout(500);           // 等 autoHighlight 高亮首匹配
  await codeInput.press('Enter');
  await page.waitForTimeout(1200);          // 等回填渲染

  // 6) 断言四列回填
  const nameVal = await page.locator('input[placeholder="输入物料名称"]').first().inputValue();
  check('物料名称自动回填', nameVal === '回填验证物料', `实际="${nameVal}"`);

  const bodyText = await page.locator('table').first().innerText();
  check('规格自动回填', bodyText.includes('SPEC-VRF-1031'));
  check('单位自动回填', /\b个\b/.test(bodyText));
  check('预估单价自动回填', /42\.5/.test(bodyText));

  // 7) 截图留证
  await page.screenshot({ path: 'test-reports/material-autofill-verify.png', fullPage: false });
  console.log('📸 截图: test-reports/material-autofill-verify.png');
} catch (e) {
  check('脚本执行', false, String(e).slice(0, 300));
  await page.screenshot({ path: 'test-reports/material-autofill-verify-error.png' }).catch(() => {});
} finally {
  // 8) 清理验证物料
  try {
    if (mid) {
      const del = await page.request.delete(`${BASE}/api/materials/${mid}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      console.log(`🧹 清理验证物料: status=${del.status()}`);
    }
  } catch { /* ignore */ }
  await browser.close();
}

const fails = results.filter((r) => !r.ok);
console.log(`\n结论：${fails.length === 0 ? '✅ 全部通过' : `❌ ${fails.length} 项失败`}（共 ${results.length} 项）`);
process.exit(fails.length === 0 ? 0 : 1);
