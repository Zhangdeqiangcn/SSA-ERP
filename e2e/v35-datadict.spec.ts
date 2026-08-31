import { test, expect } from './ssa-fixtures';

/**
 * V2.12 P2-1 数据字典单一数据源 E2E：
 *  - 设置页「数据字典」Tab 渲染、分类列表可见（防白屏 + 单一数据源入口可达）
 *  - 在数据字典新增选项 → 写入 useDataDictStore 并持久化到 ssa-erp-datadict，
 *    且物料表单单位下拉（直接读 store）实时同步出现该选项
 *  - 重置某分类 → 自定义项清除、默认值恢复并持久化
 */

type PageEx = import('@playwright/test').Page;

test.setTimeout(180_000);
test.use({ expect: { timeout: 60_000 } });

const waitStores = (page: PageEx) =>
  page.waitForFunction(() => (window as unknown as Record<string, unknown>).__ssaStores);

let errors: string[] = [];

test.describe('P2-1 数据字典单一数据源', () => {
  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('dialog', (d) => d.accept());
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (msg) => {
      const t = msg.text();
      if (
        msg.type() === 'error' &&
        !t.includes('validateDOMNesting') &&
        !t.includes('A props object containing a "key" prop')
      ) {
        errors.push('console.error: ' + t);
      }
    });
  });

  test('数据字典 Tab 渲染 + 分类列表可见', async ({ page }) => {
    await page.goto('/settings');
    await waitStores(page);
    await page.getByRole('button', { name: '数据字典' }).click();
    await expect(page.getByRole('heading', { name: '数据字典' }).first()).toBeVisible();
    // 左侧分类列表中应能看到「计量单位」「付款方式」（用 button 角色避免与详情标题重名）
    await expect(page.getByRole('button', { name: '计量单位' })).toBeVisible();
    await expect(page.getByRole('button', { name: '付款方式' })).toBeVisible();
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('数据字典新增单位 → 单一数据源持久化 + 物料表单同步', async ({ page }) => {
    const marker = `E2EUNIT${Date.now()}`;
    await page.goto('/settings');
    await waitStores(page);
    await page.getByRole('button', { name: '数据字典' }).click();

    // 「计量单位」为默认选中分类，直接点详情区「添加」
    await page.getByRole('button', { name: '添加' }).click();
    await page.getByRole('dialog').getByLabel('名称').fill(marker);
    await page.getByRole('dialog').getByRole('button', { name: '保存' }).click();

    // 1) 列表中出现该选项（Chip）
    await expect(page.getByText(marker, { exact: false })).toBeVisible();

    // 2) 写入 useDataDictStore（单一数据源）
    expect(
      await page.evaluate(
        (m: string) =>
          (window as unknown as Record<string, any>).__ssaStores.useDataDictStore
            .getState()
            .units.includes(m),
        marker
      )
    ).toBe(true);

    // 3) 持久化到 ssa-erp-datadict
    expect(
      await page.evaluate(
        (m: string) => (localStorage.getItem('ssa-erp-datadict') ?? '').includes(m),
        marker
      )
    ).toBe(true);

    // 4) 物料表单单位下拉（直接读 store）实时同步出现该选项
    await page.goto('/material/create');
    await waitStores(page);
    await page.getByLabel('单位').click();
    await expect(page.getByRole('option', { name: marker })).toBeVisible();

    // 5) 刷新后仍然持久化
    await page.reload();
    await waitStores(page);
    expect(
      await page.evaluate(
        (m: string) =>
          (window as unknown as Record<string, any>).__ssaStores.useDataDictStore
            .getState()
            .units.includes(m),
        marker
      )
    ).toBe(true);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('数据字典重置某分类 → 恢复默认并持久化', async ({ page }) => {
    const marker = `E2ERESET${Date.now()}`;
    await page.goto('/settings');
    await waitStores(page);
    await page.getByRole('button', { name: '数据字典' }).click();

    // 先自定义一个单位
    await page.getByRole('button', { name: '添加' }).click();
    await page.getByRole('dialog').getByLabel('名称').fill(marker);
    await page.getByRole('dialog').getByRole('button', { name: '保存' }).click();
    await expect(page.getByText(marker, { exact: false })).toBeVisible();

    // 重置「计量单位」分类（默认选中）。注：该按钮被 Tooltip 包裹，可访问名为 Tooltip 标题「恢复该类默认」
    await page.getByRole('button', { name: '恢复该类默认' }).click();
    await expect(page.getByText(marker, { exact: false })).toHaveCount(0);

    // 默认值（件）恢复
    expect(
      await page.evaluate(() =>
        (window as unknown as Record<string, any>).__ssaStores.useDataDictStore
          .getState()
          .units.includes('件')
      )
    ).toBe(true);

    // 持久化：刷新后自定义项不再存在
    await page.reload();
    await waitStores(page);
    await page.getByRole('button', { name: '数据字典' }).click();
    expect(
      await page.evaluate(
        (m: string) =>
          (window as unknown as Record<string, any>).__ssaStores.useDataDictStore
            .getState()
            .units.includes(m),
        marker
      )
    ).toBe(false);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });
});
