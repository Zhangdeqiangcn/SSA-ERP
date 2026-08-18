const { chromium } = require('playwright');
const BASE = process.env.BASE || 'https://ssa-erp.pages.dev';
const TS = Date.now();

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.getByText('注册新账号', { exact: true }).click();
  await page.getByLabel('用户名').fill('crt' + TS);
  await page.getByLabel('密码（至少6位）').fill('abc12345');
  await page.getByLabel('姓名').fill('创建');
  await page.getByLabel('公司码（同事填相同码即共享同一份数据）').fill('crtco');
  await page.getByLabel('公司名称（选填，首次注册时创建组织）').fill('创建公司');
  await page.getByRole('button', { name: /注.*册/ }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });

  await page.goto(BASE + '/sales/customers/create', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  console.log('--- buttons on create page ---');
  const btns = await page.getByRole('button').allInnerTexts();
  console.log(JSON.stringify(btns));
  await page.getByLabel('客户名称（企业全称）').fill('调试客户X');
  await page.waitForTimeout(300);
  console.log('--- after fill, buttons ---');
  const btns2 = await page.getByRole('button').allInnerTexts();
  console.log(JSON.stringify(btns2));
  // 尝试点击保存
  try {
    await page.getByRole('button', { name: '保存' }).click({ timeout: 8000 });
    console.log('✅ 点击保存成功');
  } catch (e) {
    console.log('❌ 点击保存失败:', e.message.split('\n')[0]);
    // 截图提示
    const box = await page.getByRole('button', { name: '保存' }).count();
    console.log('保存按钮数量:', box);
  }
  await page.waitForTimeout(2000);
  console.log('URL now:', page.url());
  await browser.close();
})();
