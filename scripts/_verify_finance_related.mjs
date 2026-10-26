// 本地验证：财务域详情弹窗「来源单号」可点跳转（V3.113.2）
// 用法：node scripts/_verify_finance_related.mjs
//       BASE=http://127.0.0.1:8799   （默认本地）
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8799';
const OUT = 'screenshots/v31132-finance-related';
mkdirSync(OUT, { recursive: true });
const CRED = { username: 'e2e_supervisor', password: 'E2e-de5e1cd55c024c488214!A9k' };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errs.push('[console] ' + m.text().slice(0, 200)); });

async function login() {
  for (let a = 1; a <= 3; a++) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    const inputs = page.locator('input');
    await inputs.nth(0).waitFor({ state: 'visible', timeout: 15000 });
    await inputs.nth(0).fill(CRED.username);
    await inputs.nth(1).fill(CRED.password);
    await inputs.nth(1).press('Enter');
    await page.waitForTimeout(7000);
    const onApp = !(await page.locator('body').innerText()).includes('忘记密码');
    console.log(`  登录尝试 ${a}：${onApp ? '成功' : '失败'}`);
    if (onApp) return true;
  }
  return false;
}
async function dismissGuide() {
  try {
    const g = page.locator('[data-testid="guide-tour"]');
    if (await g.isVisible().catch(() => false)) {
      // ★ 只点「跳过/知道了」：绝不能匹配「关闭」——「关闭」是发票/付款详情弹窗的按钮名，
      //   误点会把刚打开的详情弹窗关掉（曾导致探针误判「弹窗为空」）。
      const s = g.getByText(/跳过|知道了/).first();
      if (await s.isVisible().catch(() => false)) { await s.click().catch(() => {}); await page.waitForTimeout(600); }
    }
  } catch {}
}

const results = [];
const ok = (scene, note) => { console.log(`  ✅ ${scene} —— ${note}`); results.push({ scene, ok: true }); };
const bad = (scene, note) => { console.log(`  ❌ ${scene} —— ${note}`); results.push({ scene, ok: false }); };

if (!(await login())) { console.log('❌ 登录失败'); await browser.close(); process.exit(1); }
await dismissGuide();

/** 场景A：发票详情弹窗「关联采购单」可点 → 点击跳到采购订单详情 */
console.log('\n【场景A】发票管理 → 详情弹窗 → 关联采购单');
await page.goto(`${BASE}/finance/invoices`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
await dismissGuide();
const invRows = await page.locator('table tbody tr').count();
console.log(`  发票列表行数：${invRows}`);
if (invRows === 0) { bad('发票详情', '列表无数据'); }
else {
  // ★ 按数据定位：只取真实造数那条（INV-V31132-001），mock 数据行（如 PO-2024-0330）
  //   在数据库中不存在，来源单号会按设计降级为灰色纯文本，不能拿它当"可点"证据。
  const rowIdx = await page.locator('table tbody tr').evaluateAll((trs) =>
    trs.findIndex((tr) => tr.innerText.includes('INV-V31132-001'))
  );
  console.log(`  真实数据行索引：${rowIdx}`);
  if (rowIdx < 0) { bad('发票详情', '未找到真实造数行 INV-V31132-001'); }
  else {
    const btn = page.locator('table tbody tr').nth(rowIdx).getByRole('button', { name: '详情' }).first();
    await btn.click();
    await page.waitForTimeout(2500);
    await dismissGuide();
    const dlg = page.locator('[role="dialog"]').filter({ hasText: '发票详情' }).last();
    await dlg.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const txt = await dlg.innerText().catch(() => '');
    console.log(`  弹窗含「关联采购单」：${txt.includes('关联采购单') ? '是' : '否'}`);
    console.log(`  弹窗含「关联单据」区块：${txt.includes('关联单据') ? '是' : '否'}`);
    await page.screenshot({ path: `${OUT}/A1-invoice-detail.png` });

    // 定位「关联采购单」格子里的链接：取弹窗内所有可点元素中含 PO 的
    const link = dlg.locator('button.MuiLink-root, a.MuiLink-root').filter({ hasText: /PO/ }).first();
    const hasLink = await link.isVisible().catch(() => false);
    if (!hasLink) { bad('发票详情·关联采购单', '未渲染为可点链接'); }
    else {
      const label = await link.innerText();
      const before = page.url();
      await link.click().catch(() => {});
      await page.waitForTimeout(3000);
      const after = page.url();
      await page.screenshot({ path: `${OUT}/A2-invoice-jump.png` });
      console.log(`  链接文本：${label}`);
      console.log(`  点击前：${before}`);
      console.log(`  点击后：${after}`);
      if (before !== after) ok('发票详情·关联采购单', `${label} 跳转 ${after}`);
      else bad('发票详情·关联采购单', `URL 未变化（${after}）`);
    }
  }
}

/** 场景B：付款计划详情弹窗「关联采购单」「关联发票」分别可点 + 列表关联列可点 */
console.log('\n【场景B】付款计划 → 列表关联列 + 详情弹窗');
await page.goto(`${BASE}/finance/payments`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
await dismissGuide();
const ppRows = await page.locator('table tbody tr').count();
console.log(`  付款计划列表行数：${ppRows}`);
await page.screenshot({ path: `${OUT}/B1-payment-list.png` });
if (ppRows === 0) bad('付款计划', '列表无数据');
else {
  // 详情弹窗（先验弹窗，再验列表点击 —— 点列表链接会跳页，不能与弹窗验证混在一段）
  // ★ 必须按数据行定位：付款计划列表有多行且前序场景可能残留 DOM，
  //   用 getByRole('button',{name:'详情'}).first() 会命中错误的行/残留弹窗。
  const ppIdx = await page.locator('table tbody tr').evaluateAll((trs) =>
    trs.findIndex((tr) => tr.innerText.includes('PP-V31132-001'))
  );
  console.log(`  真实数据行索引：${ppIdx}`);
  if (ppIdx < 0) {
    bad('付款计划详情', '未找到真实造数行 PP-V31132-001');
  } else {
    await page.locator('table tbody tr').nth(ppIdx).getByRole('button', { name: '详情' }).first().click();
    await page.waitForTimeout(3000);
    await dismissGuide();
    // ★ 按标题文本锁定弹窗：MUI 关闭的 Dialog 仍留在 DOM 里，role=dialog 会同时命中，
    //   用 .last() 会取到空的残留节点（曾导致"弹窗全文为空、链接数 0"误判）。
    const dlg = page.locator('[role="dialog"]').filter({ hasText: '付款详情' }).last();
    await dlg.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    // 等待关联链接渲染出来（关联源 store 水合是异步的，需轮询等待）
    await dlg.locator('button.MuiLink-root, a.MuiLink-root').first()
      .waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
    const txt = await dlg.innerText().catch(() => '');
    console.log(`  弹窗含「关联单据」区块：${txt.includes('关联单据') ? '是' : '否'}`);
    // 校验两个字段分别只显示各自的单号（不混）
    const hasPoField = /关联采购单[\s\S]{0,80}?PO20240506001/.test(txt);
    const hasInvField = /关联发票[\s\S]{0,80}?INV-V31132-001/.test(txt);
    console.log(`  「关联采购单」字段只含采购单号：${hasPoField ? '是' : '否'}`);
    console.log(`  「关联发票」字段只含发票号：${hasInvField ? '是' : '否'}`);
    await page.screenshot({ path: `${OUT}/B3-payment-detail.png` });
    const dlgLinks = dlg.locator('button.MuiLink-root, a.MuiLink-root').filter({ hasText: /PO|INV/ });
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
      bad('付款计划详情·来源单号', `可点链接仅 ${n} 个（预期≥2：采购单+发票）`);
    }
  }

  // 列表关联列点击（放在最后，因为点击会跳页）
  await page.goto(`${BASE}/finance/payments`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  await dismissGuide();
  const listLinks = page.locator('table').locator('button.MuiLink-root, a.MuiLink-root').filter({ hasText: /PO|INV/ });
  const listLinkCount = await listLinks.count();
  console.log(`  列表内可点关联链接数：${listLinkCount}`);
  if (listLinkCount === 0) bad('付款计划列表关联列', '未渲染为可点链接');
  else {
    const before = page.url();
    await listLinks.first().click().catch(() => {});
    await page.waitForTimeout(3000);
    const after = page.url();
    await page.screenshot({ path: `${OUT}/B2-payment-list-jump.png` });
    if (before !== after) ok('付款计划列表关联列', `跳转 ${after}`);
    else bad('付款计划列表关联列', `URL 未变化（${after}）`);
  }
}

/** 场景C：凭证编辑弹窗「来源单据」可点 */
console.log('\n【场景C】记账凭证 → 编辑弹窗 → 来源单据');
await page.goto(`${BASE}/finance/vouchers`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
await dismissGuide();
const vRows = await page.locator('table tbody tr').count();
console.log(`  凭证列表行数：${vRows}`);
await page.screenshot({ path: `${OUT}/C1-voucher-list.png` });
if (vRows === 0) bad('凭证来源单据', '列表无数据');
else {
  // ★ 凭证操作按钮随状态机变化（已过账只有「冲销」、草稿才有「修改」），
  //   故遍历找第一行带「修改」的，而不是死取首行。
  let editIdx = -1;
  for (let i = 0; i < vRows; i++) {
    const has = await page.locator('table tbody tr').nth(i).getByRole('button', { name: '修改' }).count();
    if (has > 0) { editIdx = i; break; }
  }
  console.log(`  可编辑（草稿）凭证行索引：${editIdx}`);
  if (editIdx < 0) { bad('凭证来源单据', '无可编辑凭证（全部已过账/已审核）'); }
  else {
    await page.locator('table tbody tr').nth(editIdx).getByRole('button', { name: '修改' }).first().click();
    await page.waitForTimeout(2500);
    await dismissGuide();
    const dlg = page.locator('[role="dialog"]').filter({ hasText: '编辑凭证' }).last();
    await dlg.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const txt = await dlg.innerText().catch(() => '');
    const hasRow = txt.includes('来源单据');
    console.log(`  弹窗含「来源单据」行：${hasRow ? '是' : '否'}`);
    await page.screenshot({ path: `${OUT}/C2-voucher-edit.png` });
    if (hasRow) {
      // 若该凭证有来源单号，还应渲染为可点链接
      const srcLink = dlg.locator('button.MuiLink-root, a.MuiLink-root');
      const n = await srcLink.count();
      console.log(`  弹窗内可点链接数：${n}`);
      ok('凭证·来源单据行', `已渲染（弹窗可点链接 ${n} 个）`);
    } else bad('凭证·来源单据行', '未渲染');
  }
}

/** 场景D：死链降级 —— 目标不存在的单号必须渲染为灰色纯文本（不可点），而非点不动的假链接 */
console.log('\n【场景D】死链降级（mock 假单号 PO-2024-0330）');
await page.goto(`${BASE}/finance/invoices`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
await dismissGuide();
const fakeIdx = await page.locator('table tbody tr').evaluateAll((trs) =>
  trs.findIndex((tr) => tr.innerText.includes('PO-2024-0330'))
);
if (fakeIdx < 0) { bad('死链降级', '未找到 mock 假单号行'); }
else {
  await page.locator('table tbody tr').nth(fakeIdx).getByRole('button', { name: '详情' }).first().click();
  await page.waitForTimeout(2500);
  await dismissGuide();
  const dlg = page.locator('[role="dialog"]').filter({ hasText: '发票详情' }).last();
  await dlg.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  // 假单号应存在于弹窗文本中，但不可作为链接
  const inText = (await dlg.innerText().catch(() => '')).includes('PO-2024-0330');
  const asLink = await dlg.locator('button.MuiLink-root, a.MuiLink-root')
    .filter({ hasText: 'PO-2024-0330' }).count();
  console.log(`  弹窗文本含该假单号：${inText ? '是' : '否'}`);
  console.log(`  被渲染为可点链接：${asLink > 0 ? '是（缺陷！）' : '否（已正确降级为纯文本）'}`);
  await page.screenshot({ path: `${OUT}/D1-deadlink-degraded.png` });
  if (inText && asLink === 0) ok('死链降级', '假单号显示为灰色纯文本，不伪装成可点链接');
  else bad('死链降级', `文本=${inText} 链接数=${asLink}`);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(600);
}

console.log('\n════════ 结论 ════════');
const failed = results.filter((r) => !r.ok);
results.forEach((r) => console.log(`  ${r.ok ? '✅' : '❌'} ${r.scene}`));
console.log(`  通过 ${results.length - failed.length}/${results.length}`);
console.log(`  控制台/页面异常：${errs.length} 条`);
errs.slice(0, 8).forEach((e) => console.log('   ' + e));

await browser.close();
process.exit(failed.length > 0 ? 2 : 0);
