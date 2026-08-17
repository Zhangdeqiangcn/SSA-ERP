import { test, expect, Page } from '@playwright/test';

/**
 * V2.26 供应商门户·对账单→开票全流程 E2E
 * 覆盖 F5：勾选已发货订单发起对账单 → 采购/财务审批 → 发起开票申请 → 客户同意 → 开具发票并登记台账。
 * 遵循 ssa-erp-e2e 规则：通过 DEV-only window.__ssaStores 直接断言 store，而非依赖分页后的列表文本。
 */
test.setTimeout(180_000);
test.use({ expect: { timeout: 60_000 } });

async function waitStores(page: Page) {
  await page.waitForFunction(() => (window as any).__ssaStores && (window as any).__ssaStores.useFlowStore);
}
async function recordExists(page: Page, hook: string, field: string, marker: string): Promise<boolean> {
  return page.evaluate(
    ([h, f, m]) => {
      const st = (window as any).__ssaStores[h]?.getState?.();
      const arr = st?.[f];
      if (!Array.isArray(arr)) return false;
      return arr.some((r: any) => JSON.stringify(r).includes(m));
    },
    [hook, field, marker],
  );
}

test.describe('V2.26 供应商门户·对账单→开票全流程', () => {
  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        !msg.text().includes('validateDOMNesting') &&
        !msg.text().includes('A props object containing a "key" prop')
      ) {
        errors.push('console.error: ' + msg.text());
      }
    });
    (page as any)._errors = errors;
  });

  test('对账单发起→审批→开票申请→客户同意→开票 全链路', async ({ page }) => {
    // 供应商门户需先登录（sessionStorage 校验）。直接注入会话态，跳过 800ms 登录延时与重定向竞态。
    await page.goto('/vendor-portal/login');
    // 清空持久化 store，避免历史运行残留的对账单/开票请求污染断言（vendor 登录态在 sessionStorage，不受影响）
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() =>
      sessionStorage.setItem(
        'vendorPortalUser',
        JSON.stringify({ name: '钢铁联合集团', code: 'V001', password: 'vendor123', role: '正式供应商' }),
      ),
    );
    await page.goto('/vendor-portal/finance/statements');
    await waitStores(page);

    // 页面渲染无白屏
    await expect(page.getByText('财务管理')).toBeVisible();
    await expect(page.getByRole('button', { name: '发起对账单' })).toBeVisible();

    // 1) 发起对账单：勾选已发货订单并提交审批
    await page.getByRole('button', { name: '发起对账单' }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByText('发起对账单')).toBeVisible();
    await dlg.getByRole('checkbox').first().check();
    await expect(dlg.getByPlaceholder('物料名称')).toBeVisible();
    await dlg.getByRole('button', { name: '提交审批' }).click();
    await expect
      .poll(() => recordExists(page, 'useFlowStore', 'vendorStatements', '"status":"submitted"'))
      .toBe(true);

    // 2) 模拟采购/财务审批通过
    await expect(page.getByRole('button', { name: '模拟审批通过' }).first()).toBeVisible();
    await page.getByRole('button', { name: '模拟审批通过' }).first().click();
    await expect
      .poll(() => recordExists(page, 'useFlowStore', 'vendorStatements', '"status":"submitted"'))
      .toBe(false);

    // 3) 发起开票申请（立即发起）
    await page.getByRole('button', { name: '发起开票' }).first().click();
    const dlg2 = page.getByRole('dialog');
    await expect(dlg2.getByText('发起开票申请')).toBeVisible();
    await dlg2.getByRole('button', { name: '立即发起' }).click();
    await expect
      .poll(() => recordExists(page, 'useFlowStore', 'vendorInvoiceRequests', '"status":"submitted"'))
      .toBe(true);

    // 4) 切换到开票申请页，模拟客户同意
    await page.getByRole('tab', { name: '开票申请' }).click();
    await expect(page.getByRole('button', { name: '模拟客户同意' }).first()).toBeVisible();
    await page.getByRole('button', { name: '模拟客户同意' }).first().click();
    await expect(page.getByRole('button', { name: '开票' }).first()).toBeVisible();

    // 5) 发票版面预览 → 开电子票 → 登记财务台账 + 回写已开票
    // 注意：面板头部按钮「发起开票申请」也含 "开票" 子串，必须用 exact 命中表格行内的「开票」按钮
    await page.getByRole('button', { name: '开票', exact: true }).first().click();
    const dlg3 = page.getByRole('dialog');
    await expect(dlg3.getByText('发票开具预览')).toBeVisible();
    await dlg3.getByRole('button', { name: '开电子票' }).click();
    await expect
      .poll(() => recordExists(page, 'useFinanceStore', 'invoices', '"status":"submitted"'))
      .toBe(true);
    await expect
      .poll(() => recordExists(page, 'useFlowStore', 'vendorInvoiceRequests', '"status":"issued"'))
      .toBe(true);

    const errors = (page as any)._errors as string[];
    expect(errors).toEqual([]);
  });
});
