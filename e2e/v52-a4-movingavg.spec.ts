import { test, expect } from '@playwright/test';

/**
 * A4-① 移动平均价滚动 — 专项 E2E
 * 覆盖：入库过账后移动平均价/库存金额滚动正确、重复过账幂等、物料估值页移动平均价只读。
 */

test('A4-1 移动平均价滚动（入库过账后单价=加权平均）', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);

  const res = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const m = S.useMaterialStore.getState().materials[0];
    const prevStock = m.currentStock || 0;
    const prevValue = typeof m.stockValue === 'number' ? m.stockValue : prevStock * (m.price || 0);
    const Q = 120;
    const P = 55.5;
    const oid = 'INB-A4-E2E-' + Date.now();
    S.useWarehouseStore.getState().addInboundOrder({
      id: oid,
      inboundNo: oid,
      type: 'purchase',
      warehouseId: 'wh-001',
      operator: 'E2E',
      inboundDate: '2026-08-05',
      status: 'completed',
      items: [
        {
          id: 'i1',
          materialId: m.id,
          materialCode: m.code,
          materialName: m.name,
          actualQuantity: Q,
          unitPrice: P,
          qualityStatus: 'qualified',
        },
      ],
    } as any);
    const m2 = S.useMaterialStore.getState().materials.find((x: any) => x.id === m.id);
    const expStock = prevStock + Q;
    const expValue = prevValue + Q * P;
    const expPrice = expStock > 0 ? expValue / expStock : P;
    return {
      prevStock,
      prevValue,
      Q,
      P,
      newStock: m2.currentStock,
      newPrice: m2.movingAvgPrice,
      newVal: m2.stockValue,
      expStock,
      expValue,
      expPrice,
    };
  });

  expect(res.newStock).toBeCloseTo(res.expStock, 3);
  expect(res.newPrice).toBeCloseTo(res.expPrice, 3);
  expect(res.newVal).toBeCloseTo(res.expValue, 2);
  // 恒等式：库存金额 ≈ 数量 × 移动平均价
  expect(res.newVal).toBeCloseTo(res.newStock * (res.newPrice as number), 2);
});

test('A4-1 同一入库单重复过账不重复滚价（幂等）', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);

  const res = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const m = S.useMaterialStore.getState().materials[0];
    const Q = 80;
    const P = 40;
    const oid = 'INB-A4-IDEM-' + Date.now();
    const make = () => ({
      id: oid,
      inboundNo: oid,
      type: 'purchase',
      warehouseId: 'wh-001',
      operator: 'E2E',
      inboundDate: '2026-08-05',
      status: 'completed',
      items: [
        {
          id: 'i1',
          materialId: m.id,
          materialCode: m.code,
          materialName: m.name,
          actualQuantity: Q,
          unitPrice: P,
          qualityStatus: 'qualified',
        },
      ],
    } as any);

    S.useWarehouseStore.getState().addInboundOrder(make());
    const afterFirst = S.useMaterialStore.getState().materials.find((x: any) => x.id === m.id);
    const firstStock = afterFirst.currentStock;
    const firstPrice = afterFirst.movingAvgPrice;

    // 重复以同一 id 再次过账：应被 inventoryPosted/costPosted 幂等拦截，不再滚价
    S.useWarehouseStore.getState().addInboundOrder(make());
    const afterSecond = S.useMaterialStore.getState().materials.find((x: any) => x.id === m.id);

    return {
      firstStock,
      firstPrice,
      secondStock: afterSecond.currentStock,
      secondPrice: afterSecond.movingAvgPrice,
    };
  });

  expect(res.secondStock).toBe(res.firstStock);
  expect(res.secondPrice).toBe(res.firstPrice);
});

test('A4-1 估值页：移动平均价只读 + 库存金额展示', async ({ page }) => {
  await page.goto('/material/valuation');
  await page.getByTestId('material-valuation').waitFor();
  // 移动平均价改为自动滚动（只读），页面应有只读提示
  await expect(page.getByText('自动滚动')).toBeVisible();
  // 列表至少有 1 行且移动平均价已初始化（种子已 normalize）
  await expect(page.getByTestId('mv-row').first()).toBeVisible();
});
