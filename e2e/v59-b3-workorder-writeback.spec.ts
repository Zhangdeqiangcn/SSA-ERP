import { test, expect, type Page } from './ssa-fixtures';

/**
 * B3 完工回写专项（P1 流程闭环第三战役）：
 * 工单完工 → 自动 ①回写工单状态(completed)+合格数量+实际完工日期+实际生产成本
 *            ②生成成品入库单（type='production'）过账库存（wh-002 成品仓）
 *            ③生成生产成本凭证（借 1405 库存商品 / 贷 5001 生产成本 = 工单 actualTotalCost）
 *            ④同步成品入库台账（FinishedGoodsInbound）
 * 对标 SAP 生产收货 101，与 B2 委外收货（借1405/贷1408/贷2201）对称。
 */

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

/** 打开应用并清空持久化，确保 store 回到种子态 */
const bootstrap = async (page: Page, path = '/') => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto(path);
  await page.waitForFunction(() => (window as any).__ssaStores);
};

/** 读取物料当前库存 */
const stockOf = (page: Page, materialId: string) =>
  page.evaluate(
    (mid) =>
      (window as any).__ssaStores.useMaterialStore
        .getState()
        .materials.find((m: any) => m.id === mid)?.currentStock ?? 0,
    materialId
  );

/** 读取指定来源单号的凭证分录（借贷科目 + 金额） */
const voucherLinesOf = (page: Page, sourceNo: string) =>
  page.evaluate((no) => {
    const vs = (window as any).__ssaStores.useFinanceStore.getState().vouchers;
    const v = vs.find((x: any) => x.sourceNo === no);
    if (!v) return null;
    return {
      voucherNo: v.voucherNo,
      items: v.items.map((i: any) => ({
        accountCode: i.accountCode,
        debit: i.debit,
        credit: i.credit,
      })),
      totalDebit: v.items.reduce((s: number, i: any) => s + (i.debit || 0), 0),
      totalCredit: v.items.reduce((s: number, i: any) => s + (i.credit || 0), 0),
    };
  }, sourceNo);

// ═══════════════════════════════════════════════════════════════
test('B3-1 工单完工回写：状态/合格数回写 + 成品入库过账 + 生产成本凭证(借1405/贷5001)平衡', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page);

  // wo-002 (WO-2024-0502, PRD-CABINET-001 → mat-fg-002, released) 尚未完工
  const before = await stockOf(page, 'mat-fg-002');

  const result = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const ok = S.useProductionStore.getState().completeWorkOrder('wo-002', {
      completedQuantity: 10,
      scrapQuantity: 0,
      actualTotalCost: 1000,
      operator: '生产主管',
    });
    const wo = S.useProductionStore.getState().workOrders.find((w: any) => w.id === 'wo-002');
    const ib = S.useWarehouseStore
      .getState()
      .inboundOrders.find((o: any) => o.type === 'production' && o.sourceNo === wo.orderNo);
    const after = S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-fg-002')?.currentStock ?? 0;
    return {
      ok,
      status: wo.status,
      qualified: wo.qualifiedQuantity,
      completed: wo.completedQuantity,
      actualEnd: wo.actualEndDate,
      inboundNo: ib?.inboundNo,
      ibType: ib?.type,
      ibPosted: ib?.inventoryPosted,
      ibStatus: ib?.status,
      before: S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-fg-002')?.currentStock ?? 0,
      after,
    };
  });

  expect(result.ok).toBe(true);
  expect(result.status).toBe('completed'); // 工单回写为完工
  expect(result.completed).toBe(10);
  expect(result.qualified).toBe(10); // 合格数 = 完工 - 报废
  expect(result.actualEnd).toBeTruthy(); // 实际完工日期已回写

  // 成品入库单生成并过账库存
  expect(result.inboundNo).toMatch(/^IB-PROD-/);
  expect(result.ibType).toBe('production');
  expect(result.ibPosted).toBe(true); // 已过账库存
  expect(result.ibStatus).toBe('completed');
  expect(result.after).toBe(before + 10); // 成品仓 mat-fg-002 库存 +10

  // 凭证：借 1405 库存商品 / 贷 5001 生产成本 = 1000，借贷平衡
  const v = await voucherLinesOf(page, result.inboundNo!);
  expect(v).not.toBeNull();
  const debit1405 = v!.items.find((i: any) => i.accountCode === '1405');
  const credit5001 = v!.items.find((i: any) => i.accountCode === '5001');
  expect(debit1405?.debit).toBe(1000);
  expect(credit5001?.credit).toBe(1000);
  expect(Math.abs(v!.totalDebit - v!.totalCredit)).toBeLessThan(0.01);

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B3-2 完工含报废：合格数=完工-报废，成品入库数量与凭证金额按合格数与实际成本', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page);

  // wo-001 (WO-2024-0501, PRD-FRAME-001 → mat-fg-001, in_progress) 完工 5 报废 2
  const before = await stockOf(page, 'mat-fg-001');

  const result = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const ok = S.useProductionStore.getState().completeWorkOrder('wo-001', {
      completedQuantity: 5,
      scrapQuantity: 2,
      actualTotalCost: 600,
      operator: '生产主管',
    });
    const wo = S.useProductionStore.getState().workOrders.find((w: any) => w.id === 'wo-001');
    const ib = S.useWarehouseStore
      .getState()
      .inboundOrders.find((o: any) => o.type === 'production' && o.sourceNo === wo.orderNo);
    const after = S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-fg-001')?.currentStock ?? 0;
    return {
      ok,
      status: wo.status,
      completed: wo.completedQuantity,
      scrap: wo.scrapQuantity,
      qualified: wo.qualifiedQuantity,
      actualCost: wo.actualTotalCost,
      inboundNo: ib?.inboundNo,
      ibQty: ib?.items?.[0]?.actualQuantity,
      after,
    };
  });

  expect(result.ok).toBe(true);
  expect(result.status).toBe('completed');
  expect(result.completed).toBe(5);
  expect(result.scrap).toBe(2);
  expect(result.qualified).toBe(3); // 5 - 2 = 3 合格
  expect(result.actualCost).toBe(600); // 实际生产成本回写

  // 仅合格数 3 入成品仓；报废不入
  expect(result.ibQty).toBe(3);
  expect(result.after).toBe(before + 3);

  // 凭证金额 = 实际生产成本 600
  const v = await voucherLinesOf(page, result.inboundNo!);
  expect(v).not.toBeNull();
  const debit1405 = v!.items.find((i: any) => i.accountCode === '1405');
  const credit5001 = v!.items.find((i: any) => i.accountCode === '5001');
  expect(debit1405?.debit).toBe(600);
  expect(credit5001?.credit).toBe(600);
  expect(Math.abs(v!.totalDebit - v!.totalCredit)).toBeLessThan(0.01);

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B3-3 完工幂等：重复完工不重复入库、不重复过账库存、不重复生成凭证', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page);

  const result = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const first = S.useProductionStore.getState().completeWorkOrder('wo-002', {
      completedQuantity: 10,
      scrapQuantity: 0,
      actualTotalCost: 1000,
      operator: '生产主管',
    });
    const stockAfterFirst =
      S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-fg-002')?.currentStock ?? 0;
    const ibCountAfterFirst = S.useWarehouseStore
      .getState()
      .inboundOrders.filter((o: any) => o.type === 'production' && o.sourceNo === 'WO-2024-0502').length;
    const vCountAfterFirst = S.useFinanceStore
      .getState()
      .vouchers.filter((x: any) => x.source === 'production' && (x.sourceNo || '').startsWith('IB-PROD-')).length;

    // 重复完工（应被幂等拦截）
    const second = S.useProductionStore.getState().completeWorkOrder('wo-002', {
      completedQuantity: 10,
      scrapQuantity: 0,
      actualTotalCost: 1000,
      operator: '生产主管',
    });
    const stockAfterSecond =
      S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-fg-002')?.currentStock ?? 0;
    const ibCountAfterSecond = S.useWarehouseStore
      .getState()
      .inboundOrders.filter((o: any) => o.type === 'production' && o.sourceNo === 'WO-2024-0502').length;
    const vCountAfterSecond = S.useFinanceStore
      .getState()
      .vouchers.filter((x: any) => x.source === 'production' && (x.sourceNo || '').startsWith('IB-PROD-')).length;

    return {
      first,
      second,
      stockAfterFirst,
      stockAfterSecond,
      ibCountAfterFirst,
      ibCountAfterSecond,
      vCountAfterFirst,
      vCountAfterSecond,
    };
  });

  expect(result.first).toBe(true);
  expect(result.second).toBe(false); // 第二次被幂等拦截
  expect(result.stockAfterSecond).toBe(result.stockAfterFirst); // 库存不再变化
  expect(result.ibCountAfterSecond).toBe(result.ibCountAfterFirst); // 仅一张入库单
  expect(result.vCountAfterSecond).toBe(result.vCountAfterFirst); // 仅一张凭证

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B3-4 已完工种子工单再完工被拦截，无副作用', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page);

  // wo-003 (WO-2024-0490, PRD-FRAME-001 → mat-fg-001) 种子已是 completed
  const result = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const before = S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-fg-001')?.currentStock ?? 0;
    const ibCountBefore = S.useWarehouseStore
      .getState()
      .inboundOrders.filter((o: any) => o.type === 'production').length;
    const ok = S.useProductionStore.getState().completeWorkOrder('wo-003', {
      completedQuantity: 3,
      scrapQuantity: 0,
      actualTotalCost: 300,
      operator: '生产主管',
    });
    const after = S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-fg-001')?.currentStock ?? 0;
    const ibCountAfter = S.useWarehouseStore
      .getState()
      .inboundOrders.filter((o: any) => o.type === 'production').length;
    return { ok, before, after, ibCountBefore, ibCountAfter };
  });

  expect(result.ok).toBe(false); // 已完工被拦截
  expect(result.after).toBe(result.before); // 库存无副作用
  expect(result.ibCountAfter).toBe(result.ibCountBefore); // 未新增入库单

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B3-5 成品入库台账(FinishedGoodsInbound)同步生成，全字段可追溯', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page);

  const result = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    S.useProductionStore.getState().completeWorkOrder('wo-002', {
      completedQuantity: 10,
      scrapQuantity: 1,
      actualTotalCost: 1100,
      operator: '生产主管',
    });
    const fgi = S.useWarehouseStore
      .getState()
      .finishedGoodsInbounds.find((x: any) => x.workOrderNo === 'WO-2024-0502');
    return fgi
      ? {
          workOrderNo: fgi.workOrderNo,
          productCode: fgi.productCode,
          plannedQty: fgi.plannedQty,
          actualQty: fgi.actualQty,
          qualifiedQty: fgi.qualifiedQty,
          rejectedQty: fgi.rejectedQty,
          warehouseId: fgi.warehouseId,
          warehouseName: fgi.warehouseName,
          status: fgi.status,
          batchNo: fgi.batchNo,
        }
      : null;
  });

  expect(result).not.toBeNull();
  expect(result!.workOrderNo).toBe('WO-2024-0502');
  expect(result!.productCode).toBe('PRD-CABINET-001');
  expect(result!.plannedQty).toBe(10);
  expect(result!.actualQty).toBe(10);
  expect(result!.qualifiedQty).toBe(9); // 10 - 1 报废
  expect(result!.rejectedQty).toBe(1);
  expect(result!.warehouseId).toBe('wh-002'); // 成品仓
  expect(result!.warehouseName).toBe('成品仓');
  expect(result!.status).toBe('completed');
  expect(result!.batchNo).toMatch(/^B\d{8}$/); // 批次号 B+日期

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B3-6 工单详情页「生成成品入库」全链路：点击 → 跳转入库列表 → 显示「生产完工入库」标签', async ({ page }) => {
  const errors = await captureErrors(page);
  // 自动接受 alert（点击后弹窗提示已完工回写）
  page.on('dialog', (d) => d.accept());
  await bootstrap(page, '/production/orders/wo-002');

  await expect(page.getByRole('heading', { name: '工单详情' })).toBeVisible();
  await expect(page.getByText('WO-2024-0502')).toBeVisible();

  // 点击「生成成品入库」按钮（wo-002 为 released，按钮可用）
  await page.getByRole('button', { name: '生成成品入库', exact: true }).click();

  // 跳转到入库列表
  await page.waitForURL('**/warehouse/inbound');
  // 新生成的成品入库单在列表中显示「生产完工入库」标签
  await expect(page.getByText('生产完工入库').first()).toBeVisible();

  expect(errors).toEqual([]);
});
