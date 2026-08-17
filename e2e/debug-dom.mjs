import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));

await page.goto('http://localhost:3000/');
await page.evaluate(() => {
  sessionStorage.setItem('vendorPortalUser', JSON.stringify({ code: 'V001', name: '钢铁联合集团', role: '正式供应商' }));
});
await page.evaluate(() => localStorage.clear());
await page.goto('http://localhost:3000/vendor-portal/orders/confirm');
await page.waitForFunction(() => window.__ssaStores, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(1500);

const row = page.locator('tr', { hasText: 'VOC20240508001' }).first();
console.log('row buttons count =', await row.getByRole('button').count());
console.log('row buttons texts =', JSON.stringify(await row.getByRole('button').allInnerTexts()));

await row.getByRole('button').first().click();
await page.waitForTimeout(600);
console.log('after menu open, menuitem 查看 count =', await page.getByRole('menuitem', { name: '查看', exact: true }).count());
console.log('all menuitems =', JSON.stringify(await page.getByRole('menuitem').allInnerTexts()));

// try click 查看
const viewBtn = page.getByRole('menuitem', { name: '查看', exact: true });
if (await viewBtn.count() > 0) {
  await viewBtn.click();
  await page.waitForTimeout(800);
}
console.log('确认订单 button count =', await page.getByRole('button', { name: '确认订单', exact: true }).count());
console.log('dialog role count =', await page.getByRole('dialog').count());

console.log('errors:', JSON.stringify(errs.slice(0, 8)));
await browser.close();
