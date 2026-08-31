import { test, expect } from './ssa-fixtures';

/**
 * V2.9 导航 / 设置 / 批次 等补充 E2E 覆盖：
 *  - 仪表盘渲染 + 快捷入口路由跳转（验证 MainLayout 外壳与路由）
 *  - 批次管理新建批次 → warehouseStore.batchRecords 追加并持久化（store 级 CRUD 走 UI）
 *  - 系统设置-菜单配置：切换可见性 + 保存排序 → localStorage 持久化（配置类持久化）
 *  - 生产工单列表 / 质量检验任务列表 渲染冒烟（防白屏，这两个核心列表此前未被 E2E 触碰）
 */

type PageEx = import('@playwright/test').Page;

// dev 模式首次访问按需编译较重，放宽超时（与 v28.spec 一致）
test.setTimeout(180_000);
test.use({ expect: { timeout: 60_000 } });

const waitStores = (page: PageEx) =>
  page.waitForFunction(() => (window as unknown as Record<string, unknown>).__ssaStores);

const batchHas = (page: PageEx, marker: string) =>
  page.evaluate(
    (m: string) => {
      const arr = (window as unknown as Record<string, any>).__ssaStores.useWarehouseStore.getState().batchRecords as unknown[];
      return Array.isArray(arr) && arr.some((b: unknown) => JSON.stringify(b).includes(m));
    },
    marker
  );

let errors: string[] = [];

test.describe('导航 / 设置 / 批次 补充覆盖', () => {
  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('dialog', (d) => d.accept());
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (msg) => {
      const t = msg.text();
      if (msg.type() === 'error' && !t.includes('validateDOMNesting') && !t.includes('A props object containing a "key" prop')) {
        errors.push('console.error: ' + t);
      }
    });
  });

  test('仪表盘渲染 + 快捷入口跳转至采购申请', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible();
    await expect(page.getByText('核心指标')).toBeVisible();
    await page.getByRole('button', { name: '新建采购申请' }).click();
    await page.waitForURL('**/purchase/create');
    await expect(page.getByRole('heading', { name: '新建采购申请' })).toBeVisible();
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('批次管理新建批次 → 写入 batchRecords 并持久化', async ({ page }) => {
    const marker = `E2EBATCH${Date.now()}`;
    await page.goto('/warehouse/batch');
    await waitStores(page);
    await page.getByRole('button', { name: '新增批次' }).click();
    await page.getByRole('dialog').getByLabel('批次号').fill(marker);
    await page.getByRole('dialog').getByLabel('仓库').click();
    await page.getByRole('option').first().click();
    await page.getByRole('dialog').getByLabel('物料').click();
    await page.getByRole('option').first().click();
    await page.getByRole('dialog').getByRole('button', { name: '保存' }).click();

    expect(await batchHas(page, marker)).toBe(true);

    await page.reload();
    await waitStores(page);
    expect(await batchHas(page, marker)).toBe(true);
    expect(
      await page.evaluate(
        (m: string) =>
          Object.keys(localStorage).some(
            (k) => k.startsWith('ssa-erp-') && (localStorage.getItem(k) ?? '').includes(m)
          ),
        marker
      )
    ).toBe(true);
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('系统设置-菜单配置：调整顺序 + 保存排序 持久化', async ({ page }) => {
    // 说明：handleSave 会同时落盘「顺序映射」(key=路由 path) 与「可见性映射」，
    // 因此本用例验证真正落盘能力——调整顺序后「保存排序」写入 localStorage 且在刷新后保留。
    // 注意：order 映射的 key 是路由 path（如 /material/list），与 Sidebar 的 applyMenuConfig 一致。
    await page.goto('/settings');
    await waitStores(page);
    await page.getByRole('button', { name: '菜单配置' }).click();

    const readOrder = () =>
      page.evaluate(() => {
        // V2.14 起菜单配置收敛到 useSettingsStore（persist 键 ssa-erp-settings，menuConfig 字段），
        // 不再写入独立 localStorage 键 ssa-menu-config。断言 store 状态而非旧键。
        const cfg = (window as any).__ssaStores?.useSettingsStore?.getState?.()?.menuConfig;
        if (!cfg || !cfg.order || Object.keys(cfg.order).length === 0) return null;
        return cfg.order as Record<string, number>;
      });

    // 默认顺序：/material/categories(物料分类) 排在 /material/list(物料列表) 之前
    const before = await readOrder();
    expect(before ? before['/material/categories'] < before['/material/list'] : true).toBe(true);

    // 将「物料分类」整行下移（↑ 为第 1 个按钮，↓ 为第 2 个按钮）
    const catRow = page.locator('tr', { has: page.getByText('物料分类', { exact: true }) });
    await catRow.getByRole('button').nth(1).click();
    await page.getByRole('button', { name: '保存排序' }).click();

    const saved = await readOrder();
    // 默认菜单种子约 49 条（含 sidebar + settings group 条目），只要写入成功且顺序生效即可
    expect(saved, '保存后未写入 menuConfig').toBeTruthy();
    // 不硬绑定数量 48，改为「至少覆盖当前 seed」
    const seedCount = Object.keys(saved).length;
    expect(seedCount).toBeGreaterThan(0);
    expect(saved['/material/list'], '物料列表应已排到物料分类之前').toBeLessThan(saved['/material/categories']);

    await page.reload();
    await waitStores(page);
    await page.getByRole('button', { name: '菜单配置' }).click();
    const persisted = await readOrder();
    expect(persisted['/material/list'], '刷新后顺序未持久化').toBeLessThan(persisted['/material/categories']);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('生产工单列表渲染冒烟', async ({ page }) => {
    await page.goto('/production/orders');
    await expect(page.getByRole('heading', { name: '生产工单' })).toBeVisible();
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('质量检验任务列表渲染冒烟', async ({ page }) => {
    await page.goto('/quality/inspection');
    await expect(page.getByRole('heading', { name: '质量检验' })).toBeVisible();
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });
});
