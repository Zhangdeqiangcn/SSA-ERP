import { test, expect, expectLocalStorageHas } from './ssa-fixtures';

/**
 * V2.9 表单提交 → store add 动作 → 持久化 集成测试（V2.78.0 根治 flake 版）。
 * 背景：store 的 add 动作曾出现 `addArr` 误写成 `set` 的回归（只更新内存副本、未真正追加）。
 * 本文件通过【真实 UI 表单】驱动，验证「组件 → action → store」链路在运行态正确。
 *
 * 根治要点（V2.78.0 复盘）：
 *   - 很多业务 store 在 V2.70 / V2.74.5 后不再把被测列表持久化到 localStorage
 *     （material→直连 D1、warehouse.inboundOrders / sales.salesOrders 被 persist 的 partialize 排除），
 *     故「刷新后 localStorage 含标记」的断言天生失败，应改为「仅验证 store 内存状态追加」。
 *   - 确实持久化的 store（purchase / price / bom / materialApproval）未登录态写入同步，但仍可能因
 *     机器过载出现时序 flake，故 localStorage 断言统一改用 expectLocalStorageHas（轮询）。
 *   每个用例断言：
 *   ① 提交后记录进入对应 store 的运行时状态（window.__ssaStores）
 *   ② 对持久化 store：刷新后仍可从 localStorage 读回（轮询）
 *   ③ 全程零 pageerror / console.error
 */

type PageEx = import('@playwright/test').Page;

test.setTimeout(180_000);
test.use({ expect: { timeout: 60_000 } });

const waitStores = (page: PageEx) =>
  page.waitForFunction(() => (window as unknown as Record<string, unknown>).__ssaStores);

const recordExists = (page: PageEx, hook: string, field: string, marker: string) =>
  page.evaluate(
    ({ hook, field, marker }: { hook: string; field: string; marker: string }) => {
      const arr = (window as unknown as Record<string, any>).__ssaStores[hook].getState()[field] as unknown[];
      return Array.isArray(arr) && arr.some((r: unknown) => JSON.stringify(r).includes(marker));
    },
    { hook, field, marker }
  );

let errors: string[] = [];

test.describe('表单提交 → store 追加（真实 UI 链路）', () => {
  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('dialog', (d) => d.accept());
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (msg) => {
      const t = msg.text();
      // 良性 / 环境噪声豁免：
      //  - validateDOMNesting 与 MUI Autocomplete "key" prop 警告属 React 渲染良性提示；
      //  - "Failed to load resource" 类 500/404 是网络层资源加载失败（如未登录态 fire-and-forget
      //    双写 D1 后端、MSW mock 未覆盖端点），不反映前端 JS 逻辑错误，不计入失败；
      //  真实 JS 异常仍由 pageerror（上方）与业务 console.error（此处）捕获。
      if (
        msg.type() === 'error' &&
        !t.includes('validateDOMNesting') &&
        !t.includes('A props object containing a "key" prop') &&
        !t.includes('Failed to load resource')
      ) {
        errors.push('console.error: ' + t);
      }
    });
  });

  test('采购申请表单提交 → 写入 purchaseStore（持久化）', async ({ page }) => {
    const marker = `E2E采购${Date.now()}`;
    await page.goto('/purchase/create');
    await waitStores(page);
    await page.getByLabel('标题').fill(marker);
    await page.getByLabel('部门').fill('测试部');
    await page.getByLabel('申请原因').fill('E2E自动化测试原因');
    await page.getByLabel('期望日期').fill('2026-12-31');
    await page.getByRole('button', { name: '添加物料' }).click();
    const row = page.locator('table tbody tr').last();
    await row.getByPlaceholder('输入物料编码').fill('钢板');
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: '提交申请' }).click();
    await page.waitForURL('**/purchase/requests');
    expect(await recordExists(page, 'usePurchaseStore', 'purchaseRequests', marker)).toBe(true);
    await expect(page.getByRole('heading', { name: '采购申请' })).toBeVisible();

    await page.reload();
    await waitStores(page);
    expect(await recordExists(page, 'usePurchaseStore', 'purchaseRequests', marker)).toBe(true);
    await expectLocalStorageHas(page, marker);
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('销售订单表单提交（成功路径）→ 写入 salesStore（仅内存，不持久化）', async ({ page }) => {
    const marker = `E2E销售${Date.now()}`;
    await page.goto('/sales/orders/create');
    await waitStores(page);
    // A3：客户改为主数据 Autocomplete（选信用充足的 C003 新源机械，避免触发硬拦截）
    const combo = page.getByRole('combobox', { name: '客户主数据' });
    await combo.click();
    await combo.fill('新源机械');
    await page.getByRole('option').filter({ hasText: '新源机械' }).first().click();
    // 销售员填唯一标记，用于验证新订单落库（客户是主数据、不可自由命名）
    await page.getByLabel('销售员').fill(marker);
    await page.getByRole('button', { name: '添加物料' }).click();
    const row = page.locator('table tbody tr').last();
    await row.getByPlaceholder('输入物料编码').fill('钢板');
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: '提交订单' }).click();
    await page.waitForURL('**/sales/orders');
    expect(await recordExists(page, 'useSalesStore', 'salesOrders', marker)).toBe(true);
    await expect(page.getByRole('heading', { name: '销售订单管理' })).toBeVisible();
    // 注意：salesOrders 已迁 D1、不持久化 localStorage，仅验证运行时内存追加（刷新后会从 mock 重来）
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('物料新建表单提交 → 写入 materialApprovalStore（审批流，持久化）', async ({ page }) => {
    const marker = `E2E物料${Date.now()}`;
    await page.goto('/material/create');
    await waitStores(page);
    await page.getByLabel('物料分类').click();
    await page.getByRole('option').first().click();
    await page.getByLabel('物料名称').fill(marker);
    await page.getByLabel('单位').fill('个');
    // 物料类型 / 自制外购 为 zod enum.optional()，默认空字符串会被校验拒绝，需显式选择
    await page.getByLabel('物料类型').click();
    await page.getByRole('option').first().click();
    await page.getByLabel('自制/外购').click();
    await page.getByRole('option').first().click();
    // 末位填写编码：置 codeManuallyEdited，避免自动生成覆盖
    await page.getByLabel('物料编码').fill(`MATE2E${Date.now()}`);
    await page.getByRole('button', { name: '保存' }).click();
    // V2.10 起物料新建走审批流：提交后页面内提示，不再直接跳列表
    await expect(page.getByText('已提交物料新增审批')).toBeVisible();
    await page.getByRole('button', { name: '返回物料列表' }).click();
    await page.waitForURL('**/material/list');
    await expect(page.getByRole('heading', { name: '物料列表' })).toBeVisible();

    // 草稿进入审批队列并落盘 localStorage（审批流：不直接写主数据，提交后持久化到审批队列）
    await page.reload();
    await waitStores(page);
    await expectLocalStorageHas(page, marker);
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('BOM 新建并发布 → 写入 bomStore（持久化）', async ({ page }) => {
    const marker = `E2E产品${Date.now()}`;
    await page.goto('/bom/create');
    await waitStores(page);
    await page.getByLabel('产品名称').fill(marker);
    await page.getByRole('button', { name: '发布' }).click();
    // 发布后路由跳转至 /bom/list，直接断言列表标题（避免 URL glob 不稳）
    await expect(page.getByRole('heading', { name: 'BOM 管理' })).toBeVisible();
    expect(await recordExists(page, 'useBOMStore', 'bomList', marker)).toBe(true);

    await page.reload();
    await waitStores(page);
    expect(await recordExists(page, 'useBOMStore', 'bomList', marker)).toBe(true);
    await expectLocalStorageHas(page, marker);
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('询价单新建并发布 → 写入 priceStore（持久化）', async ({ page }) => {
    const marker = `E2E询价${Date.now()}`;
    await page.goto('/price/inquiry/create');
    await waitStores(page);
    await page.getByLabel('询价标题').fill(marker);
    await page.getByLabel('报价截止日期').fill('2026-12-31');
    const vendorName = await page.evaluate(() => {
      const vs = (window as unknown as Record<string, any>).__ssaStores.useVendorStore.getState().vendors;
      return vs && vs.length ? vs[0].name : '';
    });
    expect(vendorName, '种子供应商为空，无法选择目标供应商').toBeTruthy();
    await page.getByLabel('目标供应商').fill(vendorName);
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: '添加物料' }).click();
    const row = page.locator('table tbody tr').last();
    await row.getByPlaceholder('输入物料编码').fill('钢板');
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: '发布询价' }).click();
    await page.waitForURL('**/price/inquiry');
    expect(await recordExists(page, 'usePriceStore', 'priceInquiries', marker)).toBe(true);
    await expect(page.getByRole('heading', { name: '询价单管理' })).toBeVisible();

    await page.reload();
    await waitStores(page);
    expect(await recordExists(page, 'usePriceStore', 'priceInquiries', marker)).toBe(true);
    await expectLocalStorageHas(page, marker);
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('入库单由采购订单生成 → 写入 warehouseStore（仅内存，不持久化）', async ({ page }) => {
    await page.goto('/warehouse/inbound/create');
    await waitStores(page);
    const poNo = await page.evaluate(() => {
      const orders = (window as unknown as Record<string, any>).__ssaStores.usePurchaseStore.getState().purchaseOrders;
      const o = orders.find((x: any) => x.items && x.items.length > 0) || orders[0];
      return o ? o.orderNo : null;
    });
    expect(poNo, '种子采购订单为空，无法生成入库单').toBeTruthy();
    await page.getByLabel('采购订单号').fill(poNo as string);
    await page.getByRole('button', { name: '查询' }).click();
    await expect(page.getByText(poNo as string).first()).toBeVisible();
    await page.getByRole('button', { name: '确认入库' }).click();
    await page.waitForURL('**/warehouse/inbound');
    expect(await recordExists(page, 'useWarehouseStore', 'inboundOrders', poNo as string)).toBe(true);
    await expect(page.getByRole('heading', { name: '入库管理' })).toBeVisible();
    // 注意：inboundOrders 已迁 D1、不持久化 localStorage，仅验证运行时内存追加
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });
});
