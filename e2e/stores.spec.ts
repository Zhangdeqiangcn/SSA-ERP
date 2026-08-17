import { test, expect } from '@playwright/test';

/**
 * 回归加固：直接驱动每个业务 store 的 add 动作，断言
 *   ① 增量真正写入对应 localStorage（证明 add 确为「追加」，而非 addArr 类静默失效）
 *   ② 整页刷新后增量仍在（证明 persist 落盘生效）
 * 这样任何把 `addArr` 误写成 `setter([...])` 的回归都会被立即抓出。
 */

type Case = { key: string; hook: string; action: string };

const STORES: Case[] = [
  { key: 'material', hook: 'useMaterialStore', action: 'addMaterial' },
  { key: 'vendor', hook: 'useVendorStore', action: 'addVendor' },
  { key: 'purchase', hook: 'usePurchaseStore', action: 'addPurchaseRequest' },
  { key: 'price', hook: 'usePriceStore', action: 'addPriceInquiry' },
  { key: 'warehouse', hook: 'useWarehouseStore', action: 'addInboundOrder' },
  { key: 'quality', hook: 'useQualityStore', action: 'addInspectionTask' },
  { key: 'bom', hook: 'useBOMStore', action: 'addBOM' },
  { key: 'production', hook: 'useProductionStore', action: 'addWorkOrder' },
  { key: 'sales', hook: 'useSalesStore', action: 'addSalesOrder' },
  { key: 'finance', hook: 'useFinanceStore', action: 'addInvoice' },
  { key: 'flow', hook: 'useFlowStore', action: 'addInspectionNotice' },
];

test('全部业务 store 的 add 均真正追加并持久化到 localStorage', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  await page.goto('/');
  await page.waitForFunction(() => (window as any).__ssaStores);

  // 清空历史，从初始 Mock 开始
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('ssa-erp-'))
      .forEach((k) => localStorage.removeItem(k));
  });
  await page.reload();
  await page.waitForFunction(() => (window as any).__ssaStores);

  const markers: string[] = [];
  for (const s of STORES) {
    const marker = `REGTEST_${s.key}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    markers.push(marker);
    await page.evaluate(
      ({ hook, action, marker }) => {
        const st = (window as any).__ssaStores[hook].getState();
        st[action]({ id: marker, name: marker, code: marker });
      },
      { hook: s.hook, action: s.action, marker }
    );

    const found = await page.evaluate((m) => {
      return Object.keys(localStorage).some(
        (k) => k.startsWith('ssa-erp-') && (localStorage.getItem(k) ?? '').includes(m)
      );
    }, marker);
    expect(found, `store ${s.hook}.${s.action} 未将增量写入 localStorage（疑似 add 未真正追加）`).toBe(true);
  }

  // 持久化回归：整页刷新后所有 marker 仍应存在
  await page.reload();
  await page.waitForFunction(() => (window as any).__ssaStores);
  for (const marker of markers) {
    const stillThere = await page.evaluate((m) => {
      return Object.keys(localStorage).some(
        (k) => k.startsWith('ssa-erp-') && (localStorage.getItem(k) ?? '').includes(m)
      );
    }, marker);
    expect(stillThere, `刷新后 marker 丢失：${marker}`).toBe(true);
  }

  expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
});
