import { test, expect, type Page } from './ssa-fixtures';

/**
 * B10 采购订单变更单（P1 Phase 2 唯一空白项）：
 * ① 未收货 PO 变更 → 生成新版本（version+1、history 留痕 V1 快照、字段更新）
 * ② 已收货 PO 变更被锁定（ok:false，不落库、无新版本）
 * ③ UI 全链路：详情页「变更订单」→ 改交期/数量 → 填原因 → 确认 → 版本历史差异可见
 * ④ UI 锁定：已收货订单「变更订单」按钮禁用
 * 对标 SAP ME2N 订单变更版本 / 金蝶 PO 变更单留痕
 */

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

const bootstrap = async (page: Page, path = '/') => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto(path, { timeout: 120000 });
  await page.waitForFunction(() => (window as any).__ssaStores);
};

test('B10-1 未收货 PO 变更：生成新版本 V2 + 历史快照 + 字段更新', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page);

  const r = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const before = S.usePurchaseStore.getState().purchaseOrders.find((o: any) => o.id === 'po-001');
    const oldDelivery = before.expectedDeliveryDate;
    const oldFirstQty = before.items[0].orderedQuantity;

    const res = S.usePurchaseStore.getState().changePurchaseOrder(
      'po-001',
      {
        expectedDeliveryDate: '2026-09-30',
        items: (before.items as any[]).map((it, i) =>
          i === 0 ? { ...it, orderedQuantity: 20, unitPrice: 5000, amount: 100000, taxAmount: 13000, amountWithTax: 113000, priceWithTax: 5650 } : it
        ),
      },
      '交期延后+数量调整'
    );

    const after = S.usePurchaseStore.getState().purchaseOrders.find((o: any) => o.id === 'po-001');
    return {
      ok: res.ok, newVersion: res.version, afterVersion: after.version,
      historyLen: (after.history || []).length,
      histV: after.history?.[0]?.version,
      histReason: after.history?.[0]?.changeReason,
      histDelivery: after.history?.[0]?.snapshot?.expectedDeliveryDate,
      histQty: after.history?.[0]?.snapshot?.items?.[0]?.orderedQuantity,
      newDelivery: after.expectedDeliveryDate,
      firstQty: after.items[0].orderedQuantity,
      oldDelivery, oldFirstQty,
    };
  });

  expect(r.ok).toBe(true);
  expect(r.newVersion).toBe(2);
  expect(r.afterVersion).toBe(2);
  expect(r.historyLen).toBe(1);            // 快照入历史
  expect(r.histV).toBe(1);                 // 记录的是变更前版本 V1
  expect(r.histReason).toBe('交期延后+数量调整');
  expect(r.histDelivery).toBe(r.oldDelivery); // 历史快照 = 变更前交期
  expect(r.histQty).toBe(r.oldFirstQty);      // 历史快照 = 变更前数量
  expect(r.newDelivery).toBe('2026-09-30');   // 新版本字段已更新
  expect(r.firstQty).toBe(20);

  expect(errors).toEqual([]);
});

test('B10-2 已收货 PO 锁定：变更被拦截（ok:false 不落库）', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page);

  const r = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const before = S.usePurchaseStore.getState().purchaseOrders.find((o: any) => o.id === 'po-003');
    const res = S.usePurchaseStore.getState().changePurchaseOrder('po-003', { expectedDeliveryDate: '2026-10-01' }, '尝试变更已收货订单');
    const after = S.usePurchaseStore.getState().purchaseOrders.find((o: any) => o.id === 'po-003');
    return {
      ok: res.ok, error: res.error,
      version: after.version, historyLen: (after.history || []).length,
      delivery: after.expectedDeliveryDate, beforeDelivery: before.expectedDeliveryDate,
    };
  });

  expect(r.ok).toBe(false);
  expect(r.error).toContain('禁止变更');
  expect(r.version).toBeUndefined();         // 未生成新版本
  expect(r.historyLen).toBe(0);              // 无历史留痕
  expect(r.delivery).toBe(r.beforeDelivery); // 字段未被改动

  expect(errors).toEqual([]);
});

test('B10-3 UI 全链路：变更订单 → 确认 → 版本历史差异可见', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page, '/purchase/orders/po-001');

  await expect(page.getByRole('button', { name: '变更订单' })).toBeVisible({ timeout: 120000 });

  // 打开变更对话框
  await page.getByRole('button', { name: '变更订单' }).click();
  await expect(page.getByText(/变更采购订单/)).toBeVisible({ timeout: 15000 });

  // 改交期
  await page.getByLabel('预计交货日期').fill('2026-09-15');
  // 改第一行数量
  await page.getByLabel('数量').first().fill('15');
  // 填原因（必填，否则确认按钮禁用）
  await page.getByLabel(/变更原因/).fill('UI 端到端变更测试');
  await page.getByRole('button', { name: '确认变更' }).click();

  // 变更成功 → 详情 actions 显示「版本历史（V2）」
  await expect(page.getByRole('button', { name: /版本历史（V2）/ })).toBeVisible({ timeout: 15000 });

  // 打开版本历史 → 差异对比可见
  await page.getByRole('button', { name: /版本历史/ }).click();
  await expect(page.getByText('V1 → V2')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/原因：UI 端到端变更测试/)).toBeVisible();
  await expect(page.getByText(/交期：/)).toBeVisible();       // 交期差异行
  await expect(page.getByText(/数量 30 → 15/)).toBeVisible(); // 数量差异行（po-001 首行 30 → 15）

  expect(errors).toEqual([]);
});

test('B10-4 UI 锁定：已收货订单「变更订单」按钮禁用', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page, '/purchase/orders/po-003');

  await expect(page.getByRole('button', { name: '变更订单' })).toBeVisible({ timeout: 120000 });
  await expect(page.getByRole('button', { name: '变更订单' })).toBeDisabled();

  expect(errors).toEqual([]);
});