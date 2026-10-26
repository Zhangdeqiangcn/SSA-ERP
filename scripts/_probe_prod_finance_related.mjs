// 生产定点探针：财务域详情弹窗「来源单号」可点跳转（V3.113.2）
// 用法：node scripts/_probe_prod_finance_related.mjs
//       BASE=https://ssa-erp.pages.dev  可覆盖环境
//
// ★ 选择器与定位约定（均为实测踩坑后修正，勿回退）：
//   1) MUI 的 <Link component="button"> 实际渲染为 <button class="MuiLink-root">，
//      既不是 <a> 也不是 button.component-link —— 旧写法必然匹配不到。
//   2) MUI Dialog 关闭后 DOM 仍保留，getByRole('dialog') 会同时命中多个节点；
//      必须按弹窗标题文本筛选（如 filter({ hasText: '发票详情' })）。
//   3) 列表多行时不要用 getByRole('button',{name:'详情'}).first()，要按数据行内文本定位行号。
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = process.env.BASE || 'https://ssa-erp.pages.dev';
const OUT = 'screenshots/prod-finance-related-probe';
mkdirSync(OUT, { recursive: true });
const CRED = { username: 'e2e_supervisor', password: 'E2e-de5e1cd55c024c488214!A9k' };
const LINK_SEL = 'button.MuiLink-root, a.MuiLink-root';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('[pageerror] ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errs.push('[console] ' + m.text().slice(0, 200));
});

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

/** 关掉「新用户引导」弹窗（否则拦截 pointer events，点不到链接）
 *  ★ 双重作用：① 拦截 pointer events；② 引导是 MUI 模态 Dialog，打开时会给 #root 加
 *    aria-hidden="true"，导致 Playwright getByRole() 全局失配 → 误判「找不到详情按钮」。
 *    所以每次导航后都要调一次。
 */
async function dismissOnboarding() {
  try {
    const guide = page.locator('[data-testid="guide-tour"]');
    if (await guide.isVisible().catch(() => false)) {
      // ★ 只点「跳过/知道了」：绝不能匹配「关闭」——「关闭」是发票/付款详情弹窗的按钮名，
      //   误点会把刚打开的详情弹窗关掉（曾导致探针误判「弹窗为空」）。
      const skip = guide.getByText(/跳过|知道了/).first();
      if (await skip.isVisible().catch(() => false)) {
        await skip.click().catch(() => {});
        await page.waitForTimeout(800);
        console.log('  已关闭新用户引导');
      }
    }
  } catch { /* 忽略 */ }
}

/** 按弹窗标题文本锁定（避开残留 Dialog 节点） */
function dialogByTitle(text) {
  return page.locator('[role="dialog"]').filter({ hasText: text }).last();
}

const results = [];
const ok = (scene, note) => { console.log(`  ✅ ${scene} —— ${note}`); results.push({ scene, ok: true }); };
const bad = (scene, note) => { console.log(`  ❌ ${scene} —— ${note}`); results.push({ scene, ok: false }); };

if (!(await login())) {
  console.log('❌ 多次尝试后仍无法登录');
  await browser.close();
  process.exit(1);
}
await dismissOnboarding();

// ── 场景 1：发票管理详情弹窗「关联采购单」是否可点 ──
async function checkInvoice() {
  console.log('\n【场景1】发票管理 → 详情弹窗 → 关联采购单');
  await page.goto(`${BASE}/finance/invoices`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(7000);
  await dismissOnboarding();
  const rows = await page.locator('table tbody tr').count();
  console.log(`  发票列表行数：${rows}`);
  if (rows === 0) { bad('发票详情', '列表无数据（生产 fin_invoices 可能为空）'); return; }

  // 按数据行定位（不取首行：首行可能是 mock 行）
  const rowIdx = await page.locator('table tbody tr').evaluateAll((trs) =>
    trs.findIndex((tr) => tr.innerText.includes('INV-V31132-001'))
  );
  console.log(`  真实数据行索引：${rowIdx}`);
  if (rowIdx < 0) { bad('发票详情', '未找到造数行 INV-V31132-001'); return; }

  await page.locator('table tbody tr').nth(rowIdx).getByRole('button', { name: '详情' }).first().click();
  await page.waitForTimeout(3000);
  await dismissOnboarding();
  const dlg = dialogByTitle('发票详情');
  await dlg.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  const txt = await dlg.innerText().catch(() => '');
  console.log(`  弹窗含「关联采购单」：${txt.includes('关联采购单') ? '是' : '否'}`);
  console.log(`  弹窗含「关联单据」区块：${txt.includes('关联单据') ? '是' : '否'}`);
  await page.screenshot({ path: `${OUT}/01-invoice-detail.png` });

  const link = dlg.locator(LINK_SEL).filter({ hasText: /PO/ }).first();
  const hasLink = await link.isVisible().catch(() => false);
  console.log(`  「关联采购单」渲染为可点链接：${hasLink ? '是' : '否'}`);
  if (hasLink) {
    const label = await link.innerText();
    const before = page.url();
    await link.click().catch(() => {});
    await page.waitForTimeout(3000);
    const after = page.url();
    const moved = before !== after;
    console.log(`  链接文本：${label}`);
    console.log(`  点击后 URL 变化：${moved ? `是（${before} → ${after}）` : `否（仍为 ${after}）`}`);
    await page.screenshot({ path: `${OUT}/02-invoice-link-jump.png` });
    if (moved) ok('发票详情·关联采购单', `${label} 跳转 ${after}`);
    else bad('发票详情·关联采购单', `URL 未变化（${after}）`);
  } else {
    bad('发票详情·关联采购单', '未渲染为可点链接');
  }
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(800);
}

// ── 场景 2：付款计划 → 详情弹窗 + 列表关联列可点 ──
async function checkPaymentPlan() {
  console.log('\n【场景2】付款计划 → 详情弹窗 → 关联采购单/关联发票');
  await page.goto(`${BASE}/finance/payments`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(7000);
  await dismissOnboarding();
  const rows = await page.locator('table tbody tr').count();
  console.log(`  付款计划列表行数：${rows}`);
  await page.screenshot({ path: `${OUT}/03-payment-plan-list.png` });

  if (rows === 0) { bad('付款计划详情', '列表无数据'); return; }

  // 列表「关联采购单/发票」列是否有可点链接
  const listLink = page.locator('table').locator(LINK_SEL).filter({ hasText: /PO|INV/ }).first();
  const listHasLink = await listLink.isVisible().catch(() => false);
  console.log(`  列表「关联采购单/发票」列渲染为可点链接：${listHasLink ? '是' : '否'}`);
  if (listHasLink) {
    const before = page.url();
    await listLink.click().catch(() => {});
    await page.waitForTimeout(3000);
    const after = page.url();
    if (before !== after) ok('付款计划列表关联列', `跳转 ${after}`);
    else bad('付款计划列表关联列', `URL 未变化（${after}）`);
  } else bad('付款计划列表关联列', '未渲染为链接');

  // 详情弹窗
  await page.goto(`${BASE}/finance/payments`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(7000);
  await dismissOnboarding();
  const rowIdx = await page.locator('table tbody tr').evaluateAll((trs) =>
    trs.findIndex((tr) => tr.innerText.includes('PP-V31132-001'))
  );
  console.log(`  真实数据行索引：${rowIdx}`);
  if (rowIdx < 0) { bad('付款计划详情', '未找到造数行 PP-V31132-001'); return; }

  await page.locator('table tbody tr').nth(rowIdx).getByRole('button', { name: '详情' }).first().click();
  await page.waitForTimeout(3000);
  await dismissOnboarding();
  const dlg = dialogByTitle('付款详情');
  await dlg.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  // 等待关联链接渲染（关联源 store 水合异步）
  await dlg.locator(LINK_SEL).first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  const txt = await dlg.innerText().catch(() => '');
  console.log(`  弹窗含「关联采购单」：${txt.includes('关联采购单') ? '是' : '否'}`);
  console.log(`  弹窗含「关联单据」区块：${txt.includes('关联单据') ? '是' : '否'}`);
  const hasPoField = /关联采购单[\s\S]{0,80}?PO20240506001/.test(txt);
  const hasInvField = /关联发票[\s\S]{0,80}?INV-V31132-001/.test(txt);
  console.log(`  「关联采购单」字段只含采购单号：${hasPoField ? '是' : '否'}`);
  console.log(`  「关联发票」字段只含发票号：${hasInvField ? '是' : '否'}`);
  await page.screenshot({ path: `${OUT}/04-payment-plan-detail.png` });

  const dlgLinks = dlg.locator(LINK_SEL).filter({ hasText: /PO|INV/ });
  const n = await dlgLinks.count();
  console.log(`  弹窗内可点链接数：${n}`);
  if (n >= 2) {
    const texts = [];
    for (let i = 0; i < n; i++) texts.push(await dlgLinks.nth(i).innerText());
    console.log(`  弹窗链接清单：${JSON.stringify(texts)}`);
    const before = page.url();
    await dlgLinks.first().click().catch(() => {});
    await page.waitForTimeout(3000);
    const after = page.url();
    if (before !== after) ok('付款计划详情·来源单号', `${texts[0]} 跳转 ${after}`);
    else bad('付款计划详情·来源单号', `URL 未变化（${after}）`);
  } else {
    console.log(`  弹窗全文：${txt.replace(/\s+/g, ' ').slice(0, 300)}`);
    bad('付款计划详情·来源单号', `可点链接仅 ${n} 个（预期≥2）`);
  }
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(800);
}

// ── 场景 3：记账凭证 → 编辑弹窗「来源单据」行 ──
async function checkVoucher() {
  console.log('\n【场景3】记账凭证 → 编辑弹窗 → 来源单据');
  await page.goto(`${BASE}/finance/vouchers`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(7000);
  await dismissOnboarding();
  const rows = await page.locator('table tbody tr').count();
  console.log(`  凭证列表行数：${rows}`);
  await page.screenshot({ path: `${OUT}/05-voucher-list.png` });
  if (rows === 0) { bad('凭证来源单据', '列表无数据'); return; }

  // ★ 凭证操作按钮随状态机变化（已过账只有「冲销」、草稿才有「修改」），遍历找草稿行。
  let editIdx = -1;
  for (let i = 0; i < rows; i++) {
    if (await page.locator('table tbody tr').nth(i).getByRole('button', { name: '修改' }).count() > 0) { editIdx = i; break; }
  }
  console.log(`  可编辑（草稿）凭证行索引：${editIdx}`);
  if (editIdx < 0) { bad('凭证来源单据', '无可编辑凭证（全部已过账/已审核）'); return; }

  await page.locator('table tbody tr').nth(editIdx).getByRole('button', { name: '修改' }).first().click();
  await page.waitForTimeout(3000);
  await dismissOnboarding();
  const dlg = dialogByTitle('编辑凭证');
  await dlg.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  const txt = await dlg.innerText().catch(() => '');
  const hasSrcRow = txt.includes('来源单据');
  console.log(`  弹窗含「来源单据」行：${hasSrcRow ? '是' : '否'}`);
  await page.screenshot({ path: `${OUT}/06-voucher-edit.png` });
  if (hasSrcRow) {
    const n = await dlg.locator(LINK_SEL).count();
    console.log(`  弹窗内可点链接数：${n}`);
    ok('凭证·来源单据行', `已渲染（弹窗可点链接 ${n} 个）`);
  } else bad('凭证·来源单据行', '未渲染');
}

await checkInvoice();
await checkPaymentPlan();
await checkVoucher();

console.log('\n════════ 探针结论 ════════');
for (const r of results) {
  console.log(`  ${r.ok ? '✅' : '❌'} ${r.scene}`);
}
const failed = results.filter((r) => !r.ok);
console.log(`  通过 ${results.length - failed.length}/${results.length}`);
console.log(`  控制台/页面异常（已排除资源加载失败）：${errs.length} 条`);
for (const e of errs.slice(0, 10)) console.log('   ' + e);

await browser.close();
process.exit(failed.length > 0 ? 2 : 0);
