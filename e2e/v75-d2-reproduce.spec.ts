import { test } from './ssa-fixtures';

test('reproduce settings page error by clicking every item', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}\n${e.stack || ''}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`);
  });

  await page.goto('/settings', { waitUntil: 'domcontentloaded' });
  try { await page.getByRole('button', { name: '跳过引导' }).click({ timeout: 4000 }); } catch {}

  // 逐个点设置导航项
  const items = ['基本设置','组织账套','数据字典','编号规则','用户管理','角色权限','表单权限','数据权限','审批流程','物料审批','物料评级','供应商评级','条件技术','菜单配置','显示与主题','移动端','自定义字段','打印模板','订单模板','通知设置','采购策略','销售价目表','单位换算','供应商门户','对接配置','API接口','服务端与审计','数据管理'];
  for (const t of items) {
    try {
      await page.getByRole('button', { name: t, exact: true }).click({ timeout: 2000 });
      await page.waitForTimeout(250);
    } catch {}
  }

  console.log('--- ERRORS ---');
  for (const e of errors) console.log(e);
  console.log('--- END ---');

  await page.screenshot({ path: 'test-results/settings-after-clicks.png', fullPage: true });
});
