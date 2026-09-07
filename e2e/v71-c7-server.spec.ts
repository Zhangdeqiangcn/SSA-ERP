import { test, expect, type Page } from './ssa-fixtures';

/**
 * v71 — C7 服务端化（多用户会话 + 落库审计 + 持久化抽象层）专项验收
 *
 * 覆盖对标文档 C7（服务端化 | 全局）：
 *   C7-1 顶栏会话切换器：切换到「李明」→ sessionStore.current.userName 更新 + 顶栏显示同步。
 *   C7-2 写操作落库审计：新增销售价目表项 → auditStore.records +1，且记录的操作人 = 当前会话用户。
 *   C7-3 设置-服务端与审计面板：展示存储驱动 / 数据表数量 / 审计条数，且审计条数与 store 一致。
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
    if (m.type() === 'error' && !m.text().includes('Failed to load resource') &&
        !m.text().includes('validateDOMNesting') &&
        !m.text().includes('A props object containing a "key" prop')) {
      errors.push('console.error: ' + m.text());
    }
  });
};

test.describe('v71 C7 服务端化：多用户会话 / 落库审计 / 持久化抽象', () => {
  test('C7-1 顶栏会话切换器：切换到李明后会话与顶栏同步', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);
    await resetAndReady(page);

    // 初始会话为默认管理员张德强
    const before = await page.evaluate(() =>
      (window as any).__ssaStores.useSessionStore.getState().current.userName
    );
    expect(before).toBe('张德强');

    // 顶栏会话切换器 → 李明（u2）
    await page.getByTestId('session-switcher').click();
    await page.getByTestId('session-opt-u2').click();
    await expect(page.getByRole('listbox')).toHaveCount(0);

    const after = await page.evaluate(() => {
      const s = (window as any).__ssaStores.useSessionStore.getState();
      return { name: s.current.userName, role: s.current.role, historyLen: s.history.length };
    });
    expect(after.name).toBe('李明');
    expect(after.role).toBe('qa_engineer');
    expect(after.historyLen).toBe(1); // 上一任会话进历史

    // 顶栏显示同步
    await expect(page.getByTestId('session-switcher')).toContainText('李明');

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('C7-2 写操作落库审计：新增销售价目表项 → 审计 +1 且记录当前操作人', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);
    await resetAndReady(page);

    // 先切换会话到王芳（u3），验证审计记录的是"当前会话人"而非硬编码
    await page.evaluate(() => (window as any).__ssaStores.useSessionStore.getState().switchUser('u3'));

    const before = await page.evaluate(() =>
      (window as any).__ssaStores.useAuditStore.getState().records.length
    );

    // 走 store 写操作（等价于设置页点"新增价目表项"）
    await page.evaluate(() => {
      (window as any).__ssaStores.useSalesPriceStore.getState().addPriceItem({
        customerId: '', customerName: '', materialId: 'mat-003', materialCode: 'MAT202405010003',
        materialName: 'H型钢 Q345B', basePrice: 4800, discountRate: 3, status: 'active',
      });
    });

    const after = await page.evaluate(() => {
      const recs = (window as any).__ssaStores.useAuditStore.getState().records;
      return { len: recs.length, top: recs[0] };
    });
    expect(after.len).toBe(before + 1);
    expect(after.top.entity).toBe('salesPrice');
    expect(after.top.action).toBe('create');
    expect(after.top.userName).toBe('王芳');
    expect(after.top.summary).toContain('H型钢 Q345B');

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('C7-3 设置-服务端与审计面板：状态卡与审计列表落地', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);
    await resetAndReady(page);

    // 先造两条审计
    await page.evaluate(() => {
      const st = (window as any).__ssaStores.useSalesPriceStore.getState();
      st.addPriceItem({
        customerId: '', customerName: '', materialId: 'mat-004', materialCode: 'MAT202405010004',
        materialName: '螺栓 M10', basePrice: 2.5, discountRate: 0, status: 'active',
      });
      st.addPromotion({ name: 'C7 验收促销', type: 'percent', value: 5, enabled: true });
    });

    await page.goto('/settings');
    await page.waitForFunction(() => (window as any).__ssaStores);
    await page.getByRole('button', { name: '服务端与审计' }).click();

    await expect(page.getByTestId('srv-driver')).toContainText('local');
    await expect(page.getByTestId('srv-current-user')).toContainText('张德强');

    // 面板审计条数应与 store 一致，且不少于刚造的 2 条
    const storeCount = await page.evaluate(() =>
      (window as any).__ssaStores.useAuditStore.getState().records.length
    );
    expect(storeCount).toBeGreaterThanOrEqual(2);
    await expect(page.getByTestId('srv-audit-count')).toHaveText(String(storeCount));

    // 数据表数量 > 0（localStorage 里已有 ssa-erp-* 集合）
    const collections = await page.getByTestId('srv-collections').textContent();
    expect(Number(collections)).toBeGreaterThan(0);

    // 审计列表出现刚才两条摘要
    await expect(page.getByText('新增促销活动：C7 验收促销')).toBeVisible();

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });
});
