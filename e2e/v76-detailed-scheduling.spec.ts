import { test, expect, type Page } from './ssa-fixtures';

/**
 * v76 — P2-04 详细工序排程「锁单 / 锚定」真实生效验收
 * ------------------------------------------------------------
 * 修复前：详细排产页 DetailedScheduling 写入「工序级锁 wo.id:op.id」+ anchorDate，
 *       但甘特引擎 GanttSchedule 只读「工单级 wo.id」锁、且从不消费 anchorDate
 *       → 详细页的锁 / 锚对真实排产完全无效（P2-04 被标「壳」）。
 * 修复后：GanttSchedule 新增 woLockState 聚合（工序级 → 工单级）+ 重排消费 anchorDate。
 *
 * 验收点：
 *   C1 详细页对 wo-001 首工序设「锚定日 D」 → 甘特「自动重排(正排)」后
 *       wo-001 计划开始日 == D（锚定钉住真正生效）。
 *   C2 详细页对 wo-001 首工序仅「锁单」(不设锚) → 甘特「自动重排」后
 *       wo-001 计划开始日保持不变（锁单防移动真正生效）。
 *
 * 直接调用 productionSchedulingStore 的 setAnchor / toggleLock（与详细页完全相同代码路径），
 * 写入工序级 key，验证甘特聚合消费 —— 这正是 P2-04「壳」变真功能的关键闭环。
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
    if (m.type() === 'error') {
      const t = m.text();
      // 已知无害的 React 开发期警告（与排产逻辑无关），不计入本用例错误。
      if (t.includes('validateDOMNesting')) return;
      if (t.includes('A props object containing a "key" prop')) return;
      // 基础设施噪声：vite.config.ts 将 /api 代理到 localhost:8788（wrangler pages dev）。
      // E2E 不启动 wrangler，代理目标不可达 → 浏览器报 "Failed to load resource: 500"。
      // 这不是应用错误，而是代理层（无后端）的预期行为。MSW 无法拦截此 500
      // （Vite 代理在 HTTP 层拦截，先于浏览器 Service Worker/MSW 执行）。
      if (t.startsWith('Failed to load resource:') && t.includes('status of 500')) return;
      errors.push('console.error: ' + t);
    }
  });
};

const getWoDate = (page: Page, id: string, field: 'plannedStartDate' | 'plannedEndDate') =>
  page.evaluate(
    ([wid, f]) => (window as any).__ssaStores.useProductionStore.getState().workOrders.find((w: any) => w.id === wid)?.[f],
    [id, field] as const
  );

// 取 wo-001 首工序的工序级锁 key（与 DetailedScheduling 写入格式一致：wo.id:op.id）
const getWoOpKey = (page: Page) =>
  page.evaluate(() => {
    const s = (window as any).__ssaStores;
    const wo = s.useProductionStore.getState().workOrders.find((w: any) => w.id === 'wo-001');
    if (!wo) return null;
    const routes = s.useProductionStore.getState().processRoutes || [];
    const route =
      routes.find((r: any) => r.id === wo.routeId) ||
      routes.find((r: any) => r.routeNo === wo.routeNo) ||
      routes.find((r: any) => r.productCode === wo.productCode);
    if (!route || !route.operations?.length) return null;
    return `${wo.id}:${route.operations[0].id}`;
  });

const addDays = (s: string, n: number): string => {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
};

const getWindowStart = (page: Page) =>
  page.evaluate(() => {
    const wos = (window as any).__ssaStores.useProductionStore.getState().workOrders
      .filter((w: any) => ['draft', 'released', 'in_progress'].includes(w.status));
    return wos.reduce((min: string, w: any) => (w.plannedStartDate < min ? w.plannedStartDate : min), wos[0].plannedStartDate);
  });

test.describe('v76 P2-04 详细工序排程锁/锚真实生效', () => {
  test('C1 详细页锚定日钉住 wo-001 计划开始日', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);
    await resetAndReady(page);

    const opKey = await getWoOpKey(page);
    expect(opKey, '应取得 wo-001 首工序锁 key').toBeTruthy();

    // 锚定日 = 当前窗口最早日 + 3 天（明显晚于顺排游标，证明钉住而非巧合）
    const windowStart = await getWindowStart(page);
    const anchor = addDays(windowStart, 3);

    await page.evaluate(
      ({ k, d }) => {
        (window as any).__ssaStores.useProductionSchedulingStore.getState().setAnchor(k, d);
      },
      { k: opKey, d: anchor }
    );

    // 进入甘特页，正排自动重排
    await page.goto('/production/gantt');
    // 等待甘特页内容渲染（SPA 路由切换 + Tab 激活为异步，warm server 下 load 事件早于 React 提交）
    await page.getByRole('heading', { name: /甘特排产/ }).waitFor({ timeout: 10_000 });
    await page.getByTestId('gantt-auto-reschedule').click();
    // 等待 React 提交 handleAutoReschedule 的状态更新（woLockState / conflicts / dialog）
    await page.waitForTimeout(500);

    const start = await getWoDate(page, 'wo-001', 'plannedStartDate');
    expect(start, `wo-001 计划开始日应被锚定钉住为 ${anchor}，实际 ${start}`).toBe(anchor);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('C2 详细页锁单防止 wo-001 被自动重排移动', async ({ page }) => {
    const errors: string[] = [];
    captureErrors(page, errors);
    await resetAndReady(page);

    const opKey = await getWoOpKey(page);
    expect(opKey, '应取得 wo-001 首工序锁 key').toBeTruthy();

    const before = await getWoDate(page, 'wo-001', 'plannedStartDate');

    await page.evaluate((k) => {
      (window as any).__ssaStores.useProductionSchedulingStore.getState().toggleLock(k);
    }, opKey);

    await page.goto('/production/gantt');
    // 等待甘特页内容渲染（SPA 路由切换 + Tab 激活为异步，warm server 下 load 事件早于 React 提交）
    await page.getByRole('heading', { name: /甘特排产/ }).waitFor({ timeout: 10_000 });
    await page.getByTestId('gantt-auto-reschedule').click();
    // 等待 React 提交 handleAutoReschedule 的状态更新
    await page.waitForTimeout(500);

    const after = await getWoDate(page, 'wo-001', 'plannedStartDate');
    expect(after, `锁定的 wo-001 计划开始日应保持不变（${before}），实际 ${after}`).toBe(before);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });
});
