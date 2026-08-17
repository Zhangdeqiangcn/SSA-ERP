# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: v30-eventflow.spec.ts >> 事件驱动自动流转 >> 出库完成 → 自动扣减库存并持久化
- Location: e2e\v30-eventflow.spec.ts:94:3

# Error details

```
Error: page.evaluate: Execution context was destroyed, most likely because of a navigation
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * V3.0 事件驱动自动流转 E2E：
  5   |  *  - 入库确认（completed）→ 自动过账库存（数量增加）并持久化
  6   |  *  - 出库完成（completed）→ 自动扣减库存（数量减少）并持久化
  7   |  *  - 价格审批通过 → 自动生成价目表（下游单）并持久化
  8   |  * 验证“手工衔接”已升级为“事件驱动”，且数据一致性落盘。
  9   |  */
  10  | 
  11  | type PageEx = import('@playwright/test').Page;
  12  | 
  13  | test.setTimeout(180_000);
  14  | test.use({ expect: { timeout: 60_000 } });
  15  | 
  16  | const waitStores = (page: PageEx) =>
  17  |   page.waitForFunction(() => (window as unknown as Record<string, unknown>).__ssaStores);
  18  | 
  19  | const invQtyById = (page: PageEx, id: string) =>
> 20  |   page.evaluate((mid: string) => {
      |        ^ Error: page.evaluate: Execution context was destroyed, most likely because of a navigation
  21  |     const recs = (window as unknown as Record<string, any>).__ssaStores.useWarehouseStore.getState().inventoryRecords as any[];
  22  |     const r = recs.find((x) => x.id === mid);
  23  |     return r ? r.quantity : null;
  24  |   }, id);
  25  | 
  26  | const invQtyByMat = (page: PageEx, materialId: string, warehouseId: string) =>
  27  |   page.evaluate(
  28  |     (p: { m: string; w: string }) => {
  29  |       const recs = (window as unknown as Record<string, any>).__ssaStores.useWarehouseStore.getState().inventoryRecords as any[];
  30  |       const r = recs.find((x) => x.materialId === p.m && x.warehouseId === p.w);
  31  |       return r ? r.quantity : 0;
  32  |     },
  33  |     { m: materialId, w: warehouseId }
  34  |   );
  35  | 
  36  | let errors: string[] = [];
  37  | 
  38  | test.describe('事件驱动自动流转', () => {
  39  |   test.beforeEach(async ({ page }) => {
  40  |     errors = [];
  41  |     page.on('dialog', (d) => d.accept());
  42  |     page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  43  |     page.on('console', (msg) => {
  44  |       const t = msg.text();
  45  |       if (msg.type() === 'error' && !t.includes('validateDOMNesting') && !t.includes('A props object containing a "key" prop')) {
  46  |         errors.push('console.error: ' + t);
  47  |       }
  48  |     });
  49  |   });
  50  | 
  51  |   test('入库确认 → 自动更新库存并持久化', async ({ page }) => {
  52  |     await page.goto('/warehouse/inbound/create');
  53  |     await waitStores(page);
  54  | 
  55  |     const info = await page.evaluate(() => {
  56  |       const S = (window as unknown as Record<string, any>).__ssaStores;
  57  |       const po = S.usePurchaseStore.getState().purchaseOrders[0];
  58  |       const item = po.items[0];
  59  |       // 入库单实际过账到表单默认选中的仓库（当前组织下首个可见仓库），
  60  |       // 与 InboundForm 的 visibleWarehouses[0] 行为一致；种子 PO 无 warehouseId 字段，
  61  |       // 不能写死 'WH001'（实际仓库主数据 id 为 'wh-001'）。
  62  |       const orgId = S.useOrgStore.getState().currentOrgId;
  63  |       const whs = S.useWarehouseMasterStore.getState().warehouses;
  64  |       const vis = whs.filter((w: any) => !w.orgId || !orgId || w.orgId === orgId);
  65  |       const wid = vis[0]?.id || 'wh-001';
  66  |       return {
  67  |         orderNo: po.orderNo,
  68  |         materialId: item.materialId || item.id,
  69  |         warehouseId: wid,
  70  |         qty: (item.orderedQuantity || 0) - (item.deliveredQuantity || 0),
  71  |       };
  72  |     });
  73  | 
  74  |     const before = await invQtyByMat(page, info.materialId, info.warehouseId);
  75  | 
  76  |     await page.getByLabel('采购订单号').fill(info.orderNo);
  77  |     await page.getByRole('button', { name: '查询' }).click();
  78  |     await page.getByRole('button', { name: '确认入库' }).click();
  79  | 
  80  |     // 入库过账后该物料库存应增加 qty
  81  |     await expect
  82  |       .poll(() => invQtyByMat(page, info.materialId, info.warehouseId), { timeout: 15_000 })
  83  |       .toBe(before + info.qty);
  84  | 
  85  |     // 刷新后仍然保留（持久化）
  86  |     await page.reload();
  87  |     await waitStores(page);
  88  |     const persisted = await invQtyByMat(page, info.materialId, info.warehouseId);
  89  |     expect(persisted, `入库库存未持久化（期望 ${before + info.qty}，实际 ${persisted}）`).toBe(before + info.qty);
  90  | 
  91  |     expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  92  |   });
  93  | 
  94  |   test('出库完成 → 自动扣减库存并持久化', async ({ page }) => {
  95  |     await page.goto('/warehouse/inventory');
  96  |     await waitStores(page);
  97  | 
  98  |     const before = await page.evaluate(() => {
  99  |       const recs = (window as unknown as Record<string, any>).__ssaStores.useWarehouseStore.getState().inventoryRecords as any[];
  100 |       const r = recs[0];
  101 |       return { id: r.id, materialId: r.materialId, warehouseId: r.warehouseId, qty: r.quantity };
  102 |     });
  103 |     const deduct = Math.min(before.qty, 5);
  104 | 
  105 |     await page.evaluate(
  106 |       (p: { mid: string; wid: string; q: number }) => {
  107 |         (window as unknown as Record<string, any>).__ssaStores.useWarehouseStore.getState().addOutboundOrder({
  108 |           id: `ob-e2e-${Date.now()}`,
  109 |           outboundNo: `OBE2E${Date.now()}`,
  110 |           type: 'sale',
  111 |           status: 'completed',
  112 |           customerId: 'c1',
  113 |           customerName: '测试客户',
  114 |           warehouseId: p.wid,
  115 |           warehouseName: '主仓库',
  116 |           operator: 'E2E',
  117 |           outboundDate: new Date().toISOString().slice(0, 10),
  118 |           items: [{ id: `obi-${Date.now()}`, materialId: p.mid, quantity: p.q }],
  119 |         });
  120 |       },
```