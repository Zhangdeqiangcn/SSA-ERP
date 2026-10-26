// 生产定点探针：死链降级实证（V3.113.2）
// 目标单号在数据库不存在时，必须渲染为灰色纯文本（不可点），而不是点不动的蓝色假链接。
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

/** 关掉「新用户引导」弹窗
 *  ★ 必须关：引导是 MUI 模态 Dialog，打开时会给 #root 加 aria-hidden="true"，
 *    导致 Playwright 的 getByRole() 全局失配（getByText 不受影响）→ 误判「找不到按钮」。
 */
async function dismissOnboarding() {
  try {
    const guide = page.locator('[data-testid="guide-tour"]');
    if (await guide.isVisible().catch(() => false)) {
      const skip = guide.getByText(/跳过|知道了/).first();
      if (await skip.isVisible().catch(() => false)) {
        await skip.click().catch(() => {});
        await page.waitForTimeout(800);
        console.log('  已关闭新用户引导');
      }
    }
  } catch { /* 忽略 */ }
}

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(3000);
const inputs = page.locator('input');
await inputs.nth(0).waitFor({ state: 'visible', timeout: 15000 });
await inputs.nth(0).fill(CRED.username);
await inputs.nth(1).fill(CRED.password);
await inputs.nth(1).press('Enter');
await page.waitForTimeout(8000);
await dismissOnboarding();

await page.goto(`${BASE}/finance/invoices`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(7000);
await dismissOnboarding();

const rowIdx = await page.locator('table tbody tr').evaluateAll((trs) =>
  trs.findIndex((tr) => tr.innerText.includes('INV-V31132-DEAD'))
);
console.log(`  死链验证行索引：${rowIdx}`);
if (rowIdx < 0) { console.log('❌ 未找到造数行 INV-V31132-DEAD'); await browser.close(); process.exit(1); }

await page.locator('table tbody tr').nth(rowIdx).getByRole('button', { name: '详情' }).first().click();
await page.waitForTimeout(3000);
const dlg = page.locator('[role="dialog"]').filter({ hasText: '发票详情' }).last();
await dlg.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
const txt = await dlg.innerText().catch(() => '');
const inText = txt.includes('PO-2024-0330');
const asLink = await dlg.locator(LINK_SEL).filter({ hasText: 'PO-2024-0330' }).count();
console.log(`  弹窗文本含该假单号：${inText ? '是' : '否'}`);
console.log(`  被渲染为可点链接：${asLink > 0 ? '是（缺陷！）' : '否（已正确降级为纯文本）'}`);
await page.screenshot({ path: `${OUT}/07-deadlink-degraded.png` });

console.log(inText && asLink === 0 ? '✅ 死链降级 —— 生产实证通过' : '❌ 死链降级 —— 未通过');
console.log(`  页面异常：${errs.length} 条`);
await browser.close();
process.exit(inText && asLink === 0 ? 0 : 2);
