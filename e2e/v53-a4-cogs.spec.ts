import { test, expect } from '@playwright/test';

/**
 * A4-② 出库 COGS 凭证 — 专项 E2E
 * 覆盖：销售出库结转(借6401/贷1405)、生产领料结转(借5001/贷1403)、重复过账幂等。
 */

test('A4-2 销售出库 → 结转成本凭证(借6401/贷1405) + 库存减少', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);

  const res = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const m = S.useMaterialStore.getState().materials[0];
    const prevStock = m.currentStock;
    const prevVal = m.stockValue;
    const unitCost = m.movingAvgPrice;
    const Q = 10;
    const oid = 'OUT-A4-E2E-' + Date.now();
    S.useWarehouseStore.getState().addOutboundOrder({
      id: oid,
      outboundNo: oid,
      type: 'sale',
      warehouseId: 'wh-001',
      operator: 'E2E',
      outboundDate: '2026-08-05',
      status: 'completed',
      items: [{ id: 'o1', materialId: m.id, materialCode: m.code, materialName: m.name, quantity: Q }],
    } as any);
    const m2 = S.useMaterialStore.getState().materials.find((x: any) => x.id === m.id);
    const v = S.useFinanceStore.getState().vouchers.find((x: any) => x.sourceNo === oid);
    const debitLine = v?.items.find((it: any) => it.accountCode === '6401');
    const creditLine = v?.items.find((it: any) => it.accountCode === '1405');
    return {
      prevStock,
      prevVal,
      unitCost,
      Q,
      newStock: m2.currentStock,
      newVal: m2.stockValue,
      hasVoucher: !!v,
      debit: debitLine?.debit,
      credit: creditLine?.credit,
      expCost: Math.round(Q * (unitCost as number) * 100) / 100,
    };
  });

  expect(res.hasVoucher).toBe(true);
  expect(res.debit).toBeCloseTo(res.expCost, 2);
  expect(res.credit).toBeCloseTo(res.expCost, 2);
  expect(res.newStock).toBeCloseTo(res.prevStock - res.Q, 3);
  expect(res.newVal).toBeCloseTo(res.prevVal - res.expCost, 2);
});

test('A4-2 生产领料 → 结转成本凭证(借5001/贷1403)', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);

  const res = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const m = S.useMaterialStore.getState().materials[1];
    const Q = 5;
    const oid = 'OUT-A4-PICK-' + Date.now();
    S.useWarehouseStore.getState().addOutboundOrder({
      id: oid,
      outboundNo: oid,
      type: 'pick',
      warehouseId: 'wh-001',
      operator: 'E2E',
      outboundDate: '2026-08-05',
      status: 'completed',
      items: [{ id: 'o1', materialId: m.id, materialCode: m.code, materialName: m.name, quantity: Q }],
    } as any);
    const v = S.useFinanceStore.getState().vouchers.find((x: any) => x.sourceNo === oid);
    const debitLine = v?.items.find((it: any) => it.accountCode === '5001');
    const creditLine = v?.items.find((it: any) => it.accountCode === '1403');
    const costAmount = Q * (m.movingAvgPrice as number);
    return {
      hasVoucher: !!v,
      debit: debitLine?.debit,
      credit: creditLine?.credit,
      expCost: Math.round(costAmount * 100) / 100,
    };
  });

  expect(res.hasVoucher).toBe(true);
  expect(res.debit).toBeCloseTo(res.expCost, 2);
  expect(res.credit).toBeCloseTo(res.expCost, 2);
});

test('A4-2 同一出库单重复过账不重复结转（幂等）', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);

  const res = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const m = S.useMaterialStore.getState().materials[0];
    const Q = 7;
    const oid = 'OUT-A4-IDEM-' + Date.now();
    const make = () => ({
      id: oid,
      outboundNo: oid,
      type: 'sale',
      warehouseId: 'wh-001',
      operator: 'E2E',
      outboundDate: '2026-08-05',
      status: 'completed',
      items: [{ id: 'o1', materialId: m.id, materialCode: m.code, materialName: m.name, quantity: Q }],
    } as any);

    S.useWarehouseStore.getState().addOutboundOrder(make());
    const afterFirst = S.useMaterialStore.getState().materials.find((x: any) => x.id === m.id);
    const firstStock = afterFirst.currentStock;
    const vCount1 = S.useFinanceStore.getState().vouchers.filter((x: any) => x.sourceNo === oid).length;

    // 重复以同一 id 再次过账：应被 inventoryPosted/cogsPosted 幂等拦截
    S.useWarehouseStore.getState().addOutboundOrder(make());
    const afterSecond = S.useMaterialStore.getState().materials.find((x: any) => x.id === m.id);
    const vCount2 = S.useFinanceStore.getState().vouchers.filter((x: any) => x.sourceNo === oid).length;

    return {
      firstStock,
      secondStock: afterSecond.currentStock,
      vCount1,
      vCount2,
    };
  });

  expect(res.secondStock).toBe(res.firstStock);
  expect(res.vCount1).toBe(1);
  expect(res.vCount2).toBe(1);
});
