import { test, expect, type Page } from './ssa-fixtures';

/**
 * v69 — C4 字段级权限扩展（只读/必填/脱敏）+ Webhook 鉴权/重试 专项验收
 *
 * 覆盖对标文档 C4（字段权限扩展 + Webhook 鉴权/重试 | 平台）：
 *   C4-1 字段权限模式扩展：平台字段权限页将 sales.customerName 切到「脱敏」，
 *        store.getFieldMode 返回 'mask'，行状态芯片显示「脱敏」。
 *   C4-2 销售订单列表脱敏落地：开启脱敏后，销售订单列表客户列呈掩码（非明文）。
 *   C4-3 Webhook 鉴权/重试：集成中心新建 Webhook 配置 Bearer + 重试 2 次，
 *        store 配置落库；触发事件后调用日志写入（投递路径被执行）。
 *
 * 每个用例开局清空 ssa-erp-* localStorage，从初始 Mock 起步，保证状态确定。
 */

test.setTimeout(180_000);
test.use({ expect: { timeout: 60_000 } });

const resetAndReady = async (page: Page) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__ssaStores);
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('ssa-erp-'))
      .forEach((k) => localStorage.removeItem(k));
  });
  await page.reload();
  await page.waitForFunction(() => (window as any).__ssaStores);
};

const captureErrors = (page: Page, errors: string[]) => {
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' &&
        !m.text().includes('validateDOMNesting') &&
        !m.text().includes('A props object containing a "key" prop') &&
        // 忽略浏览器对“资源加载失败”的噪声（Webhook 触发外部地址不可达、非应用 bug）
        !m.text().includes('Failed to load resource') &&
        !m.text().includes('net::ERR_FAILED')) {
      errors.push('console.error: ' + m.text());
    }
  });
};

const getState = (page: Page, expr: string) =>
  page.evaluate((e) => {
    const S = (window as any).__ssaStores;
    // eslint-disable-next-line no-eval
    return eval(e);
  }, expr);

test.describe('v69 C4 字段权限扩展 + Webhook 鉴权/重试', () => {
  test('C4-1 字段权限模式扩展：sales.customerName 切到脱敏 → store + 芯片更新', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);
    await resetAndReady(page);

    await page.goto('/platform/field-permissions');
    await page.waitForFunction(() => (window as any).__ssaStores);

    // 切模块到销售
    await page.getByTestId('fp-module').click();
    await page.getByRole('option', { name: '销售' }).click();

    // 将 customerName 模式改为「脱敏」
    await page.getByTestId('fp-mode-customerName').click();
    await page.getByRole('option', { name: '脱敏' }).click();

    // store 状态应落库为 mask
    const mode = await getState(page, `S.useFieldPermissionStore.getState().getFieldMode('sales','customerName')`);
    expect(mode, 'customerName 字段模式应为 mask').toBe('mask');

    // 行状态芯片应显示「脱敏」
    await expect(page.getByTestId('fp-chip-customerName')).toHaveText('脱敏');

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('C4-2 销售订单列表脱敏落地：开启脱敏后客户列呈掩码', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);
    await resetAndReady(page);

    // 读取首条订单信息（来自初始 Mock，页面在 '/' 已加载 store）
    const info = await getState(
      page,
      `(() => { const o = S.useSalesStore.getState().salesOrders; return o.length ? { id: o[0].id, name: o[0].customerName } : null; })()`
    );
    expect(info, '应有种子销售订单').toBeTruthy();

    // 通过 store 直接开启 sales.customerName 脱敏
    await getState(page, `S.useFieldPermissionStore.getState().setFieldMode('sales','customerName','mask')`);

    await page.goto('/sales/orders');
    await page.waitForSelector(`[data-testid="so-cust-${info.id}"]`, { timeout: 30_000 });

    const cellText = await page.getByTestId(`so-cust-${info.id}`).innerText();
    const expected = await getState(page, `S.maskValue('${info.name.replace(/'/g, "\\'")}')`);
    expect(cellText, '客户列应呈掩码（首位+末位保留）').toBe(expected);
    expect(cellText, '掩码不应等于明文').not.toBe(info.name);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('C4-3 Webhook 鉴权/重试：新建 Bearer + 重试2 → 配置落库 + 触发写日志', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);
    await resetAndReady(page);

    await page.goto('/platform/integrations');
    await page.waitForFunction(() => (window as any).__ssaStores);

    // 切到 Webhook 管理 tab
    await page.getByRole('tab', { name: 'Webhook 管理' }).click();
    await page.getByTestId('ih-add').click();

    await page.getByTestId('ih-name').locator('input').fill('C4-鉴权钩子');
    await page.getByTestId('ih-url').locator('input').fill('https://example.com/hooks/c4');

    // 鉴权方式选 Bearer
    await page.getByTestId('ih-auth-type').click();
    await page.getByRole('option', { name: 'Bearer Token' }).click();
    await page.getByTestId('ih-auth-token').locator('input').fill('secret-token-123');

    // 失败重试次数
    await page.getByTestId('ih-retry').locator('input').fill('2');

    await page.getByTestId('ih-add-confirm').click();

    // store 中应存在配置了 authType=bearer 且 retry=2 的 Webhook
    const cfg = await getState(
      page,
      `(() => { const w = S.useIntegrationStore.getState().webhooks.find(x => x.name === 'C4-鉴权钩子'); return w ? { authType: w.authType, retry: w.retry, token: w.authToken } : null; })()`
    );
    expect(cfg, '新 Webhook 应已落库').not.toBeNull();
    expect(cfg.authType, '鉴权方式应为 bearer').toBe('bearer');
    expect(cfg.retry, '重试次数应为 2').toBe(2);
    expect(cfg.token, 'Bearer Token 应保存').toBe('secret-token-123');

    // 触发该事件（sales.order.created），应至少写入一条调用日志
    const before = await getState(page, 'S.useIntegrationStore.getState().webhookLogs.length');
    await page.getByRole('tab', { name: '调用日志' }).click();
    await page.getByTestId('ih-event').click();
    await page.getByRole('option', { name: 'sales.order.created' }).click();
    await page.getByTestId('ih-trigger').click();
    await page.waitForTimeout(500);
    const after = await getState(page, 'S.useIntegrationStore.getState().webhookLogs.length');
    expect(after, '触发后应写入至少一条调用日志').toBeGreaterThan(before);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });
});
