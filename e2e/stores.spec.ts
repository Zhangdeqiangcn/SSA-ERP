import { test, expect, waitForAppReady, storeAppended, expectLocalStorageHas } from './ssa-fixtures';

/**
 * 回归加固：直接驱动每个业务 store 的 add 动作，断言
 *   ① 增量真正写入 store 内存状态（证明 add 确为「追加」，而非 addArr 类静默失效）
 *   ② 对已持久化到浏览器本地存储的 store，断言落盘生效（刷新后仍在）
 * 每个 store 独立成 test，互不影响；「读 localStorage」改用轮询（expect.poll），
 * 不持久化的列表（material / warehouse-inbound / production-workOrders / sales-salesOrders 等
 * 已迁 D1 或 partialize 排除）只读内存状态，避免架构演进后的断言过时型假失败。
 */

type Case = { key: string; hook: string; action: string; persisted: boolean };

// persisted 按各 store 的 persist partialize 白名单标注：
//   true  = 被测列表确实落 localStorage（purchase/price/quality/bom/finance/flow）
//   false = 被测列表不落 localStorage（material 去持久化 / warehouse-inbound / production-workOrders
//           / sales-salesOrders / vendor 均迁 D1 或被 partialize 排除），仅验证内存追加即可
const STORES: Case[] = [
  { key: 'material', hook: 'useMaterialStore', action: 'addMaterial', persisted: false },
  { key: 'vendor', hook: 'useVendorStore', action: 'addVendor', persisted: false },
  { key: 'purchase', hook: 'usePurchaseStore', action: 'addPurchaseRequest', persisted: true },
  { key: 'price', hook: 'usePriceStore', action: 'addPriceInquiry', persisted: true },
  { key: 'warehouse', hook: 'useWarehouseStore', action: 'addInboundOrder', persisted: false },
  { key: 'quality', hook: 'useQualityStore', action: 'addInspectionTask', persisted: true },
  { key: 'bom', hook: 'useBOMStore', action: 'addBOM', persisted: true },
  { key: 'production', hook: 'useProductionStore', action: 'addWorkOrder', persisted: false },
  { key: 'sales', hook: 'useSalesStore', action: 'addSalesOrder', persisted: false },
  { key: 'finance', hook: 'useFinanceStore', action: 'addInvoice', persisted: true },
  { key: 'flow', hook: 'useFlowStore', action: 'addInspectionNotice', persisted: true },
];

for (const s of STORES) {
  test(`store ${s.hook}.${s.action} 真正追加（${s.persisted ? '内存+本地存储' : '仅内存'}）`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

    await page.goto('/');
    await waitForAppReady(page);

    // 清空历史，从初始 Mock 开始（仅清本地持久化切片，避免污染）
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('ssa-erp-'))
        .forEach((k) => localStorage.removeItem(k));
    });
    await page.reload();
    await waitForAppReady(page);

    const marker = `REGTEST_${s.key}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    await page.evaluate(
      ({ hook, action, marker }) => {
        const st = (window as any).__ssaStores[hook].getState();
        st[action]({ id: marker, name: marker, code: marker });
      },
      { hook: s.hook, action: s.action, marker }
    );

    // ① 内存状态追加（与持久化策略无关，轮询防时序）
    await expect.poll(() => storeAppended(page, s.hook, marker), { timeout: 10000 }).toBe(true);

    // ② 持久化落盘（仅对确实持久化该列表的 store 验证；刷新后仍含标记）
    if (s.persisted) {
      await expectLocalStorageHas(page, marker);
      await page.reload();
      await waitForAppReady(page);
      await expectLocalStorageHas(page, marker);
    }

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });
}
