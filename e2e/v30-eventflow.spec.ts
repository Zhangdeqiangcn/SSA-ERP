import { test, expect } from '@playwright/test';

/**
 * V3.0 事件驱动自动流转 E2E：
 *  - 入库确认（completed）→ 自动过账库存（数量增加）并持久化
 *  - 出库完成（completed）→ 自动扣减库存（数量减少）并持久化
 *  - 价格审批通过 → 自动生成价目表（下游单）并持久化
 * 验证“手工衔接”已升级为“事件驱动”，且数据一致性落盘。
 */

type PageEx = import('@playwright/test').Page;

test.setTimeout(180_000);
test.use({ expect: { timeout: 60_000 } });

const waitStores = (page: PageEx) =>
  page.waitForFunction(() => (window as unknown as Record<string, unknown>).__ssaStores);

const invQtyById = (page: PageEx, id: string) =>
  page.evaluate((mid: string) => {
    const recs = (window as unknown as Record<string, any>).__ssaStores.useWarehouseStore.getState().inventoryRecords as any[];
    const r = recs.find((x) => x.id === mid);
    return r ? r.quantity : null;
  }, id);

const invQtyByMat = (page: PageEx, materialId: string, warehouseId: string) =>
  page.evaluate(
    (p: { m: string; w: string }) => {
      const recs = (window as unknown as Record<string, any>).__ssaStores.useWarehouseStore.getState().inventoryRecords as any[];
      const r = recs.find((x) => x.materialId === p.m && x.warehouseId === p.w);
      return r ? r.quantity : 0;
    },
    { m: materialId, w: warehouseId }
  );

let errors: string[] = [];

test.describe('事件驱动自动流转', () => {
  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('dialog', (d) => d.accept());
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (msg) => {
      const t = msg.text();
      if (msg.type() === 'error' && !t.includes('validateDOMNesting') && !t.includes('A props object containing a "key" prop')) {
        errors.push('console.error: ' + t);
      }
    });
  });

  test('入库确认 → 自动更新库存并持久化', async ({ page }) => {
    await page.goto('/warehouse/inbound/create');
    await waitStores(page);

    const info = await page.evaluate(() => {
      const S = (window as unknown as Record<string, any>).__ssaStores;
      const po = S.usePurchaseStore.getState().purchaseOrders[0];
      const item = po.items[0];
      // 入库单实际过账到表单默认选中的仓库（当前组织下首个可见仓库），
      // 与 InboundForm 的 visibleWarehouses[0] 行为一致；种子 PO 无 warehouseId 字段，
      // 不能写死 'WH001'（实际仓库主数据 id 为 'wh-001'）。
      const orgId = S.useOrgStore.getState().currentOrgId;
      const whs = S.useWarehouseMasterStore.getState().warehouses;
      const vis = whs.filter((w: any) => !w.orgId || !orgId || w.orgId === orgId);
      const wid = vis[0]?.id || 'wh-001';
      return {
        orderNo: po.orderNo,
        materialId: item.materialId || item.id,
        warehouseId: wid,
        qty: (item.orderedQuantity || 0) - (item.deliveredQuantity || 0),
      };
    });

    const before = await invQtyByMat(page, info.materialId, info.warehouseId);

    await page.getByLabel('采购订单号').fill(info.orderNo);
    await page.getByRole('button', { name: '查询' }).click();
    await page.getByRole('button', { name: '确认入库' }).click();

    // 入库过账后该物料库存应增加 qty
    await expect
      .poll(() => invQtyByMat(page, info.materialId, info.warehouseId), { timeout: 15_000 })
      .toBe(before + info.qty);

    // 刷新后仍然保留（持久化）
    await page.reload();
    await waitStores(page);
    const persisted = await invQtyByMat(page, info.materialId, info.warehouseId);
    expect(persisted, `入库库存未持久化（期望 ${before + info.qty}，实际 ${persisted}）`).toBe(before + info.qty);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('出库完成 → 自动扣减库存并持久化', async ({ page }) => {
    await page.goto('/warehouse/inventory');
    await waitStores(page);

    const before = await page.evaluate(() => {
      const recs = (window as unknown as Record<string, any>).__ssaStores.useWarehouseStore.getState().inventoryRecords as any[];
      const r = recs[0];
      return { id: r.id, materialId: r.materialId, warehouseId: r.warehouseId, qty: r.quantity };
    });
    const deduct = Math.min(before.qty, 5);

    await page.evaluate(
      (p: { mid: string; wid: string; q: number }) => {
        (window as unknown as Record<string, any>).__ssaStores.useWarehouseStore.getState().addOutboundOrder({
          id: `ob-e2e-${Date.now()}`,
          outboundNo: `OBE2E${Date.now()}`,
          type: 'sale',
          status: 'completed',
          customerId: 'c1',
          customerName: '测试客户',
          warehouseId: p.wid,
          warehouseName: '主仓库',
          operator: 'E2E',
          outboundDate: new Date().toISOString().slice(0, 10),
          items: [{ id: `obi-${Date.now()}`, materialId: p.mid, quantity: p.q }],
        });
      },
      { mid: before.materialId, wid: before.warehouseId, q: deduct }
    );

    await expect.poll(() => invQtyById(page, before.id), { timeout: 15_000 }).toBe(before.qty - deduct);

    await page.reload();
    await waitStores(page);
    const persisted = await invQtyById(page, before.id);
    expect(persisted, `出库库存未持久化（期望 ${before.qty - deduct}，实际 ${persisted}）`).toBe(before.qty - deduct);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('价格审批通过 → 自动生成价目表并持久化', async ({ page }) => {
    await page.goto('/price/approvals');
    await waitStores(page);

    const apprId = await page.evaluate(() => {
      const list = (window as unknown as Record<string, any>).__ssaStores.usePriceStore.getState().priceApprovals as any[];
      const pending = list.find((a) => a.status === 'pending') || list[0];
      return pending.id;
    });

    await page.goto(`/price/approval/${apprId}`);
    await waitStores(page);

    await page.getByRole('button', { name: '审批通过' }).click();
    await page.getByLabel('审批意见').fill('价格合理，同意采购');
    await page.getByRole('dialog').getByRole('button', { name: '确认' }).click();

    // 审批通过后应自动生成价目表（下游单）
    await expect
      .poll(
        () =>
          page.evaluate((id: string) => {
            const pl = (window as unknown as Record<string, any>).__ssaStores.usePriceStore.getState().priceList as any[];
            return pl.some((x) => x.sourceApprovalId === id);
          }, apprId),
        { timeout: 15_000 }
      )
      .toBe(true);

    // 刷新后仍然保留（持久化）
    await page.reload();
    await waitStores(page);
    const persisted = await page.evaluate((id: string) => {
      const pl = (window as unknown as Record<string, any>).__ssaStores.usePriceStore.getState().priceList as any[];
      return pl.some((x) => x.sourceApprovalId === id);
    }, apprId);
    expect(persisted, '价目表未持久化').toBe(true);

    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });
});
