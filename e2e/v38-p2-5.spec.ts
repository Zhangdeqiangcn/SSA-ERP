import { test, expect } from './ssa-fixtures';

/**
 * V2.15 P2-5 财务深化 E2E：
 *  - 四页（汇率管理 / 账龄分析 / 辅助核算 / 预算控制）可访问且无明显运行时错误
 *  - 汇率新增 → 写入 useFinanceExtensionStore 并持久化 ssa-erp-finance-ext
 *  - 成本中心新增 → 写入 store + 持久化
 *  - 预算新增 → 写入 store + 持久化，且预算列表执行率渲染
 */

type PageEx = import('@playwright/test').Page;

test.setTimeout(90_000);
test.use({ expect: { timeout: 25_000 } });

const waitStores = (page: PageEx) =>
  page.waitForFunction(() => (window as unknown as Record<string, unknown>).__ssaStores);

let errors: string[] = [];

test.describe('P2-5 财务深化', () => {
  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('dialog', (d) => d.accept());
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (msg) => {
      const t = msg.text();
      if (
        msg.type() === 'error' &&
        !t.includes('validateDOMNesting') &&
        !t.includes('A props object containing a "key" prop') &&
        !t.includes('disabled `button` child to the Tooltip') &&
        // 忽略浏览器对“资源加载失败”的噪声（外部字体/CDN 离线不可达、非应用 bug）
        !t.includes('Failed to load resource') &&
        !t.includes('net::ERR_FAILED')
      ) {
        errors.push('console.error: ' + t);
      }
    });
  });

  test('四个深化页面可访问且无运行时错误', async ({ page }) => {
    const cases: [string, string][] = [
      ['/finance/exchange-rates', '汇率管理'],
      ['/finance/aging', '账龄分析'],
      ['/finance/auxiliary', '辅助核算'],
      ['/finance/budget', '预算控制'],
    ];
    for (const [path, heading] of cases) {
      await page.goto(path);
      await waitStores(page);
      await expect(page.getByRole('heading', { name: new RegExp('^' + heading) })).toBeVisible();
    }
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('汇率管理：新增汇率 → store + 持久化', async ({ page }) => {
    const marker = `9.${Date.now() % 100000}`;
    await page.goto('/finance/exchange-rates');
    await waitStores(page);

    const before = await page.evaluate(
      () => window.__ssaStores.useFinanceExtensionStore.getState().exchangeRates.length
    );

    await page.getByRole('button', { name: '新增汇率' }).click();
    await page.getByRole('dialog').getByLabel(/汇率/).fill(marker);
    await page.getByRole('dialog').getByRole('button', { name: '保存' }).click();

    await expect(page.getByTestId('fx-msg')).toBeVisible();

    // store 增量
    expect(
      await page.evaluate(
        () => window.__ssaStores.useFinanceExtensionStore.getState().exchangeRates.length
      )
    ).toBe(before + 1);

    // 持久化
    await expect
      .poll(
        () => page.evaluate(
          (m: string) => (localStorage.getItem('ssa-erp-finance-ext') ?? '').includes(m),
          marker
        ),
        { timeout: 10_000 }
      )
      .toBe(true);

    // 刷新后仍持久化
    await page.reload();
    await waitStores(page);
    await expect
      .poll(
        () => page.evaluate(
          (m: string) => (localStorage.getItem('ssa-erp-finance-ext') ?? '').includes(m),
          marker
        ),
        { timeout: 10_000 }
      )
      .toBe(true);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('辅助核算：新增成本中心 → store + 持久化', async ({ page }) => {
    const marker = `成本中心${Date.now() % 100000}`;
    await page.goto('/finance/auxiliary');
    await waitStores(page);

    const before = await page.evaluate(
      () => window.__ssaStores.useFinanceExtensionStore.getState().costCenters.length
    );

    await page.getByRole('button', { name: '新增成本中心' }).click();
    await page.getByRole('dialog').getByLabel('名称').fill(marker);
    await page.getByRole('dialog').getByRole('button', { name: '保存' }).click();

    await expect(page.getByTestId('cc-msg')).toBeVisible();

    expect(
      await page.evaluate(
        () => window.__ssaStores.useFinanceExtensionStore.getState().costCenters.length
      )
    ).toBe(before + 1);

    await expect
      .poll(
        () => page.evaluate(
          (m: string) => (localStorage.getItem('ssa-erp-finance-ext') ?? '').includes(m),
          marker
        ),
        { timeout: 10_000 }
      )
      .toBe(true);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('预算控制：新增预算 → store + 持久化 + 执行率渲染', async ({ page }) => {
    const marker = `预算项${Date.now() % 100000}`;
    await page.goto('/finance/budget');
    await waitStores(page);

    const before = await page.evaluate(
      () => window.__ssaStores.useFinanceExtensionStore.getState().budgets.length
    );

    await page.getByRole('button', { name: '新增预算' }).click();
    // 维度是「非原生」MUI Select（FormControl+Select），getByLabel 不解析；
    // 用其 .MuiSelect-select 类定位（限定在含「维度」的 FormControl 内）。
    // 选项渲染在 portal（dialog 之外），须用 page 级 getByRole('option') 点击。
    const dimSelect = page
      .getByRole('dialog')
      .locator('.MuiFormControl-root')
      .filter({ hasText: '维度' })
      .locator('.MuiSelect-select');
    await dimSelect.click();
    await page.getByRole('option', { name: '科目' }).click();
    await page.getByRole('dialog').getByLabel(/科目名称/).fill(marker);
    await page.getByRole('dialog').getByLabel('预算金额').fill('123456');
    await page.getByRole('dialog').getByRole('button', { name: '保存' }).click();

    await expect(page.getByTestId('budget-msg')).toBeVisible();

    expect(
      await page.evaluate(
        () => window.__ssaStores.useFinanceExtensionStore.getState().budgets.length
      )
    ).toBe(before + 1);

    await expect
      .poll(
        () => page.evaluate(
          (m: string) => (localStorage.getItem('ssa-erp-finance-ext') ?? '').includes(m),
          marker
        ),
        { timeout: 10_000 }
      )
      .toBe(true);

    // 新预算行渲染（含执行率进度条）
    await expect(page.getByText(marker, { exact: false }).first()).toBeVisible();

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });
});
