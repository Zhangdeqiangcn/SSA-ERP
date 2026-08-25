import { test, expect } from '@playwright/test';

/**
 * 防回归：详情页脏数据白屏防御
 * Bug #1 销售项目详情：project.milestones/exceptions 缺失时曾整页白屏
 * Bug #2 出库单详情：order.items 缺失时曾白屏
 * 注入缺必填数组字段的脏数据后，页面应正常渲染（兜底为空），不得白屏。
 */

async function loginAsAdmin(page: any) {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { currentUser: { id: 'u1', name: '测试员', role: 'admin' }, isAuthenticated: true, token: 'fake' },
      version: 0,
    }));
  });
  await page.reload();
  await page.waitForFunction(() => (window as any).__ssaStores);
}

test('ProjectDetail 在 milestones/exceptions 缺失时不白屏', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  await loginAsAdmin(page);

  const id = 'probe-broken-project';
  await page.evaluate((pid) => {
    const sales = (window as any).__ssaStores.useSalesStore.getState();
    // 故意缺失 milestones / exceptions（模拟旧版 localStorage 脏数据）
    sales.addProject({
      id: pid, projectNo: 'PRJ-BROKEN', projectName: '脏数据项目',
      customerName: 'X', status: 'in_progress',
      startDate: '2024-01-01', endDate: '2024-12-31',
      contractAmount: 1, receivedAmount: 0, budget: 1, actualCost: 0, progress: 10,
      manager: 'Z', team: ['Z'], linkedOrders: [],
    });
  }, id);

  await page.goto('/sales/projects/' + id);
  await page.waitForTimeout(800);

  const rootLen = await page.evaluate(() => document.getElementById('root')?.innerHTML.length || 0);
  const bodyText = await page.evaluate(() => document.body.innerText);
  expect(rootLen).toBeGreaterThan(1000);
  expect(errors).toHaveLength(0);
  // 缺失字段应有兜底层（暂无异常 / 无里程碑）
  expect(bodyText).toContain('暂无异常');
});

test('OutboundDetail 在 items 缺失时不白屏', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (  e) => errors.push('pageerror: ' + e.message));

  await loginAsAdmin(page);

  const id = 'probe-broken-outbound';
  await page.evaluate((pid) => {
    const wh = (window as any).__ssaStores.useWarehouseStore.getState();
    // 故意缺失 items（模拟脏数据）
    wh.addOutboundOrder({
      id: pid, outboundNo: 'OUT-BROKEN', type: 'sale', status: 'pending',
      warehouseName: '主仓', operator: 'Z', outboundDate: '2024-01-01',
    } as any);
  }, id);

  await page.goto('/warehouse/outbound/' + id);
  await page.waitForTimeout(800);

  const rootLen = await page.evaluate(() => document.getElementById('root')?.innerHTML.length || 0);
  expect(rootLen).toBeGreaterThan(1000);
  expect(errors).toHaveLength(0);
});
