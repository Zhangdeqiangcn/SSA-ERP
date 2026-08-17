# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: v32-p0-deadlinks.spec.ts >> v32 P0 死链修复 >> 生产·工艺路线新建真实落库
- Location: e2e\v32-p0-deadlinks.spec.ts:113:3

# Error details

```
Error: page.evaluate: Execution context was destroyed, most likely because of a navigation
```

# Test source

```ts
  18  | test.use({ expect: { timeout: 60_000 } });
  19  | 
  20  | const resetAndReady = async (page: Page) => {
  21  |   await page.goto('/');
  22  |   await page.waitForFunction(() => (window as any).__ssaStores);
  23  |   await page.evaluate(() => {
  24  |     Object.keys(localStorage)
  25  |       .filter((k) => k.startsWith('ssa-erp-'))
  26  |       .forEach((k) => localStorage.removeItem(k));
  27  |   });
  28  |   await page.reload();
  29  |   await page.waitForFunction(() => (window as any).__ssaStores);
  30  | };
  31  | 
  32  | const captureErrors = (page: Page, errors: string[]) => {
  33  |   page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  34  |   page.on('console', (m) => {
  35  |     if (m.type() === 'error' &&
  36  |         !m.text().includes('validateDOMNesting') &&
  37  |         !m.text().includes('A props object containing a "key" prop')) {
  38  |       errors.push('console.error: ' + m.text());
  39  |     }
  40  |   });
  41  | };
  42  | 
  43  | test.describe('v32 P0 死链修复', () => {
  44  |   test('仓储·盘点单新建并过账调整库存', async ({ page }) => {
  45  |     const errors: string[] = [];
  46  |     captureErrors(page, errors);
  47  | 
  48  |     await resetAndReady(page);
  49  |     const before = await page.evaluate(() => (window as any).__ssaStores.useWarehouseStore.getState().checkTasks.length);
  50  | 
  51  |     await page.goto('/warehouse/check');
  52  |     await page.getByRole('button', { name: '新建盘点' }).click();
  53  | 
  54  |     // 选择第一个「有库存」的仓库，保证盘点明细非空
  55  |     const whName = await page.evaluate(() => {
  56  |       const st = (window as any).__ssaStores.useWarehouseStore.getState();
  57  |       const map = new Map<string, string>();
  58  |       st.inventoryRecords.forEach((r: any) => { if (r.warehouseId) map.set(r.warehouseId, r.warehouseName || r.warehouseId); });
  59  |       for (const [id, name] of map.entries()) {
  60  |         if (st.inventoryRecords.filter((r: any) => r.warehouseId === id).length > 0) return name;
  61  |       }
  62  |       return null;
  63  |     });
  64  |     expect(whName, '应存在有库存的仓库').toBeTruthy();
  65  | 
  66  |     await page.getByLabel('仓库').click();
  67  |     await page.getByRole('option', { name: whName as string }).click();
  68  |     await page.getByTestId('check-create-confirm').click();
  69  | 
  70  |     const afterCreate = await page.evaluate(() => (window as any).__ssaStores.useWarehouseStore.getState().checkTasks.length);
  71  |     expect(afterCreate, '盘点单应 +1').toBe(before + 1);
  72  | 
  73  |     // 等待盘点任务页渲染
  74  |     await page.getByRole('button', { name: '完成盘点' }).waitFor();
  75  | 
  76  |     const ctx = await page.evaluate(() => {
  77  |       const st = (window as any).__ssaStores.useWarehouseStore.getState();
  78  |       const t = st.checkTasks[st.checkTasks.length - 1];
  79  |       const first = t.items[0];
  80  |       const r = st.inventoryRecords.find((x: any) => x.materialId === first.materialId && x.locationId === first.locationId);
  81  |       return {
  82  |         taskId: t.id,
  83  |         items: t.items.map((i: any) => ({ book: i.bookQuantity, materialId: i.materialId, locationId: i.locationId })),
  84  |         beforeQty: r ? r.quantity : null,
  85  |       };
  86  |     });
  87  |     expect(ctx.items.length, '盘点单应有明细行').toBeGreaterThan(0);
  88  | 
  89  |     // 填写盘点数量：首行盘盈 +10，其余等于账面
  90  |     const inputs = page.locator('table input[type="number"]');
  91  |     const n = await inputs.count();
  92  |     for (let i = 0; i < n; i++) {
  93  |       const val = i === 0 ? ctx.items[i].book + 10 : ctx.items[i].book;
  94  |       await inputs.nth(i).fill(String(val));
  95  |     }
  96  | 
  97  |     await page.getByRole('button', { name: '完成盘点' }).click();
  98  | 
  99  |     const res = await page.evaluate((c: any) => {
  100 |       const st = (window as any).__ssaStores.useWarehouseStore.getState();
  101 |       const t = st.checkTasks.find((x: any) => x.id === c.taskId);
  102 |       const r = st.inventoryRecords.find((x: any) => x.materialId === c.items[0].materialId && x.locationId === c.items[0].locationId);
  103 |       return { status: t?.status, qty: r ? r.quantity : null };
  104 |     }, ctx);
  105 | 
  106 |     expect(res.status, '盘点任务应标记完成').toBe('completed');
  107 |     if (ctx.beforeQty !== null) {
  108 |       expect(res.qty, '首行盘盈 +10 应调整库存').toBe(ctx.beforeQty + 10);
  109 |     }
  110 |     expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  111 |   });
  112 | 
  113 |   test('生产·工艺路线新建真实落库', async ({ page }) => {
  114 |     const errors: string[] = [];
  115 |     captureErrors(page, errors);
  116 | 
  117 |     await resetAndReady(page);
> 118 |     const before = await page.evaluate(() => (window as any).__ssaStores.useProductionStore.getState().processRoutes.length);
      |                               ^ Error: page.evaluate: Execution context was destroyed, most likely because of a navigation
  119 | 
  120 |     await page.goto('/production/routes');
  121 |     await page.getByRole('button', { name: '新建工艺路线' }).click();
  122 |     await page.getByTestId('route-no').locator('input').fill(`RT-E2E-${Date.now()}`);
  123 |     await page.getByTestId('route-name').locator('input').fill('E2E工艺路线');
  124 |     await page.getByTestId('route-product').locator('input').fill('E2E产品');
  125 |     await page.getByLabel('工序名称').first().fill('下料');
  126 |     await page.getByLabel('工作中心').first().fill('CNC中心');
  127 |     await page.getByTestId('route-save').click();
  128 | 
  129 |     const after = await page.evaluate(() => (window as any).__ssaStores.useProductionStore.getState().processRoutes.length);
  130 |     expect(after, '工艺路线应 +1').toBe(before + 1);
  131 |     expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  132 |   });
  133 | 
  134 |   test('生产·工单新建真实落库（不再跳转空 MRP 壳）', async ({ page }) => {
  135 |     const errors: string[] = [];
  136 |     captureErrors(page, errors);
  137 | 
  138 |     await resetAndReady(page);
  139 |     const before = await page.evaluate(() => (window as any).__ssaStores.useProductionStore.getState().workOrders.length);
  140 | 
  141 |     await page.goto('/production/orders');
  142 |     await page.getByRole('button', { name: '新建工单' }).click();
  143 |     await page.getByTestId('wo-product').locator('input').fill('E2E生产产品');
  144 |     await page.getByTestId('wo-save').click();
  145 | 
  146 |     const after = await page.evaluate(() => (window as any).__ssaStores.useProductionStore.getState().workOrders.length);
  147 |     expect(after, '工单应 +1').toBe(before + 1);
  148 |     expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  149 |   });
  150 | 
  151 |   test('销售·意向客户新增真实落库', async ({ page }) => {
  152 |     const errors: string[] = [];
  153 |     captureErrors(page, errors);
  154 | 
  155 |     await resetAndReady(page);
  156 |     const before = await page.evaluate(() => (window as any).__ssaStores.useSalesStore.getState().prospects.length);
  157 | 
  158 |     await page.goto('/sales/prospects');
  159 |     await page.getByRole('button', { name: '新增意向客户' }).click();
  160 |     await page.getByTestId('prospect-company').locator('input').fill(`E2E公司${Date.now()}`);
  161 |     await page.getByTestId('prospect-save').click();
  162 | 
  163 |     const after = await page.evaluate(() => (window as any).__ssaStores.useSalesStore.getState().prospects.length);
  164 |     expect(after, '意向客户应 +1').toBe(before + 1);
  165 |     expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  166 |   });
  167 | 
  168 |   test('价格·价目表手工录入真实落库', async ({ page }) => {
  169 |     const errors: string[] = [];
  170 |     captureErrors(page, errors);
  171 | 
  172 |     await resetAndReady(page);
  173 |     const before = await page.evaluate(() => (window as any).__ssaStores.usePriceStore.getState().priceList.length);
  174 | 
  175 |     await page.goto('/price/list');
  176 |     await page.getByRole('button', { name: '手工录入' }).click();
  177 |     await page.getByTestId('price-material').locator('input').fill(`E2E物料${Date.now()}`);
  178 |     await page.getByTestId('price-vendor').locator('input').fill('E2E供应商');
  179 |     await page.getByTestId('price-unitprice').locator('input').fill('99');
  180 |     await page.getByTestId('price-save').click();
  181 | 
  182 |     const after = await page.evaluate(() => (window as any).__ssaStores.usePriceStore.getState().priceList.length);
  183 |     expect(after, '价目表项应 +1').toBe(before + 1);
  184 |     expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  185 |   });
  186 | });
  187 | 
```