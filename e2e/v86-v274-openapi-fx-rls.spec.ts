import { test, expect } from './ssa-fixtures';

/**
 * V2.74 E2E：④ RLS 行级策略前端对齐 + ⑤ 开放 API 网关 / 多币种 FX
 *  - 多币种汇率管理页（/finance/exchange-rates）：刷新拉取演示汇率、新增汇率、金额换算
 *  - 开放 API 网关（设置→API接口文档）：API Key 管理 UI 可达、创建弹窗可用
 *  - 回归：应用可正常启动（覆盖 App.tsx 路由切换 + APIDocTab 接入 ApiKeyManager）
 * 注：DEV/E2E 无后端，FX 与 API Key 走本地回退分支，验证「前端不崩 + 回退链路可用」。
 *     fetch /api/* 返回 500 属预期（无后端），组件已 try/catch 回退，不计为运行时错误。
 */

type PageEx = import('@playwright/test').Page;

// 冷编译 + 机器负载下放宽超时，吸收首屏冷启动
test.setTimeout(300_000);
test.use({ expect: { timeout: 120_000 } });

const waitStores = (page: PageEx) =>
  page.waitForFunction(() => (window as unknown as Record<string, unknown>).__ssaStores);

let errors: string[] = [];

test.describe('V2.74 开放网关 / 多币种 FX / RLS 前端对齐', () => {
  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('dialog', (d) => d.accept());
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (msg) => {
      const t = msg.text();
      // 忽略：DOM 嵌套告警、key prop 告警、以及无后端时的网络 4xx/5xx（组件已回退）
      if (msg.type() !== 'error') return;
      if (t.includes('validateDOMNesting')) return;
      if (t.includes('A props object containing a "key" prop')) return;
      if (t.includes('Failed to load resource')) return;
      errors.push('console.error: ' + t);
    });
  });

  test('回归：应用启动无白屏（覆盖路由切换 + APIDocTab 接入），并预热 FX 路由', async ({ page }) => {
    await page.goto('/');
    await waitStores(page);
    await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible();
    // 直接进入 FX 路由，确认 lazy 加载与渲染正常（同时预热 vite 模块缓存）
    await page.goto('/finance/exchange-rates');
    await waitStores(page);
    await expect(page.getByTestId('fx-refresh')).toBeVisible();
    expect(errors, '启动期运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('多币种汇率管理：刷新演示汇率 + 新增 + 换算', async ({ page }) => {
    await page.goto('/finance/exchange-rates');
    await waitStores(page);
    await expect(page.getByTestId('fx-refresh')).toBeVisible();
    await expect(page.getByTestId('fx-add')).toBeVisible();

    // 从外部源刷新（DEV 失败回退演示汇率）→ 应出现 USD 等演示行
    await page.getByTestId('fx-refresh').click();
    await expect(page.getByTestId('fx-del-USD')).toBeVisible({ timeout: 60_000 });

    // 新增一个演示库没有的币种 GBP 汇率
    await page.getByTestId('fx-add').click();
    await page.getByRole('dialog').getByLabel('目标币种').click();
    await page.getByRole('listbox').getByText('GBP').click();
    await page.getByRole('dialog').getByLabel('汇率').fill('8.92');
    await page.getByRole('dialog').getByRole('button', { name: '保存' }).click();
    await expect(page.getByTestId('fx-del-GBP')).toBeVisible({ timeout: 30_000 });

    // 金额换算：100 USD → CNY，结果非占位符
    await page.getByTestId('fx-amount').locator('input').fill('100');
    await page.getByTestId('fx-convert').click();
    await expect(page.getByTestId('fx-result')).not.toHaveText('—', { timeout: 30_000 });

    expect(errors, '汇率页运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('开放 API 网关：API Key 管理 UI 可达 + 创建弹窗可用', async ({ page }) => {
    await page.goto('/settings');
    await waitStores(page);
    // 进入「API接口文档」标签页
    await page.getByText('API接口文档').click();
    await expect(page.getByTestId('api-doc-tree')).toBeVisible();
    // 目录中应包含「开放 API 网关」模块（树内模块按钮，带端点计数徽标）
    await expect(page.getByRole('button', { name: '开放 API 网关' })).toBeVisible();
    // ApiKeyManager 已挂载
    await expect(page.getByTestId('api-key-manager')).toBeVisible();
    await expect(page.getByTestId('ak-create')).toBeVisible();

    // 打开创建弹窗并确认可生成（DEV 走本地回退，验证不崩）
    await page.getByTestId('ak-create').click();
    const dlg = page.getByRole('dialog');
    await expect(dlg).toBeVisible();
    await dlg.getByText('read（只读）').first().waitFor();
    await dlg.getByRole('button', { name: '生成' }).click();
    // 弹窗关闭即视为成功（回退或后端均可）
    await expect(dlg).toBeHidden({ timeout: 30_000 });

    expect(errors, 'API Key 管理运行时错误:\n' + errors.join('\n')).toEqual([]);
  });
});
