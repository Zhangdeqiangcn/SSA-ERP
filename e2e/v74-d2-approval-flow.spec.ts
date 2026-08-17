import { test, expect, type Page } from '@playwright/test';

/**
 * v74 — 审批流深度定制（请求 D 第二部分 · V2.55.19）运行期冒烟验收
 *
 * 目标：确认审批流配置页在运行期无白屏 / 无「组件未 import」类报错，且
 * 深度定制 UI（标准/简化切换、节点编辑器中的审批人类型 / 会签模式 / 结构化条件）可正常渲染。
 * 重点防御：本项目曾 4 次复发「MUI 组件/图标用了没 import」运行期白屏，本 spec 通过
 * pageerror + console.error 捕获验证。
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
        !m.text().includes('A props object containing a "key" prop')) {
      errors.push('console.error: ' + m.text());
    }
  });
};

test.describe('v74 审批流深度定制 运行期冒烟', () => {
  test('V2.55.19-1 审批配置页渲染 + 标准/简化切换 + 节点编辑器新控件', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);
    await resetAndReady(page);

    // 进入系统设置 → 审批与工作流 → 审批流程
    await page.goto('/settings');
    // 关闭首次访问引导弹窗（resetAndReady 清空 localStorage 后必然出现，会拦截后续点击）
    await page.getByRole('button', { name: '跳过引导' }).click();
    await page.getByRole('button', { name: '审批流程', exact: true }).click();

    // 标题与模块列表应渲染
    await expect(page.getByText('审批流程设置')).toBeVisible();
    await expect(page.getByText('采购申请')).toBeVisible();

    // 标准 → 简化：首个流程（销售订单，含 optional 节点）切换后显示简化提示
    const simplifyBtn = page.getByRole('button', { name: '简化' }).first();
    await simplifyBtn.click();
    await expect(page.getByText('简化模式', { exact: false })).toBeVisible();

    // 切回标准：提示消失
    await page.getByRole('button', { name: '标准' }).first().click();
    await expect(page.getByText('简化模式', { exact: false })).toHaveCount(0);

    // 打开节点编辑器，校验深度定制控件存在
    await page.getByTestId('edit-flow-sales_order').click();
    await expect(page.getByText('编辑审批流程 - 销售订单')).toBeVisible();
    // 4 个 V2.55.19 核心新控件（审批人类型 / 会签模式 / 结构化条件 / 跳过规则）通过 data-testid 稳定定位
    await expect(page.getByTestId('af-approver-type-so-1')).toBeVisible();
    await expect(page.getByTestId('af-mode-so-1')).toBeVisible();
    await expect(page.getByTestId('af-conditions-so-1')).toBeVisible();
    await expect(page.getByTestId('af-skip-so-1')).toBeVisible();

    // 关闭对话框
    await page.getByRole('button', { name: '取消' }).click();

    // 全程无运行期错误
    expect(errors, '运行期不应有 pageerror / console.error：\n' + errors.join('\n')).toHaveLength(0);
  });
});
