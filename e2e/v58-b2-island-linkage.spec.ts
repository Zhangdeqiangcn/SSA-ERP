import { test, expect, type Page } from '@playwright/test';

/**
 * B2 三岛后台联动专项（P1 流程闭环第二战役）：
 * ① 委外发料 → 自动生成 type='subcontract' 出库单，真实扣减原材料库存
 *    并生成凭证（借 1408 委托加工物资 / 贷 1403 原材料）——对标 SAP 541
 * ② 委外收货 → 自动生成 type='subcontract' 入库单，成品按「发出材料成本 + 加工费」入账
 *    并生成凭证（借 1405 库存商品 / 贷 1408 + 贷 2201 加工费暂估）
 * ③ 发料幂等：重复发料不重复扣库存
 * ④ 序列号自动登记：serialized 物料入库过账 → SerialMaster 自动建档为在库 + 轨迹
 * ⑤ 序列号自动核销：serialized 物料出库过账 → FIFO 核销状态 + 追加轨迹
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
test('B2-1 委外发料自动生成出库单并真实扣减原材料库存（对标 SAP 541）', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page);

  // 种子 sub-001 已是 issued 状态，另建一张 draft 单用于发料
  const before = await stockOf(page, 'mat-002');
  expect(before).toBeGreaterThan(0);

  const result = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const now = new Date().toISOString();
    S.useSubcontractStore.getState().addOrder({
      id: 'sub-e2e-1',
      orderNo: 'SUB-E2E-001',
      type: 'process',
      materialId: 'mat-001',
      materialCode: 'MAT202405010001',
      materialName: '钢板 Q235B',
      vendorId: 'ven-001',
      vendorName: '精工外协加工厂',
      qty: 5,
      issueItems: [],
      status: 'draft',
      planDate: '2026-08-20',
      processFee: 100,
      receivedQty: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: 'e2e',
      updatedBy: 'e2e',
    });
    const ok = S.useSubcontractStore.getState().issueMaterials('sub-e2e-1', [
      { materialId: 'mat-002', materialCode: 'MAT202405010002', materialName: '钢管 碳钢', unit: '根', qty: 10 },
    ]);
    const o = S.useSubcontractStore.getState().orders.find((x: any) => x.id === 'sub-e2e-1');
    const ob = S.useWarehouseStore
      .getState()
      .outboundOrders.find((x: any) => x.outboundNo === o.issueOutboundNo);
    return {
      ok,
      status: o.status,
      issueOutboundNo: o.issueOutboundNo,
      obType: ob?.type,
      obStatus: ob?.status,
      obPosted: ob?.inventoryPosted,
      obQty: ob?.items?.[0]?.quantity,
      obCostAmount: ob?.items?.[0]?.costAmount,
    };
  });

  expect(result.ok).toBe(true);
  expect(result.status).toBe('issued');
  expect(result.issueOutboundNo).toMatch(/^OB-SUB-/);
  expect(result.obType).toBe('subcontract'); // 出库类型为委外发料
  expect(result.obStatus).toBe('completed');
  expect(result.obPosted).toBe(true); // 已过账库存
  expect(result.obQty).toBe(10);
  expect(result.obCostAmount).toBeGreaterThan(0); // 已按移动平均价结转成本

  // 库存真实扣减 10
  const after = await stockOf(page, 'mat-002');
  expect(after).toBe(before - 10);

  // 凭证：借 1408 委托加工物资 / 贷 1403 原材料，借贷平衡
  const v = await voucherLinesOf(page, result.issueOutboundNo!);
  expect(v).not.toBeNull();
  expect(v!.items.some((i: any) => i.accountCode === '1408' && i.debit > 0)).toBe(true);
  expect(v!.items.some((i: any) => i.accountCode === '1403' && i.credit > 0)).toBe(true);
  expect(Math.abs(v!.totalDebit - v!.totalCredit)).toBeLessThan(0.01);

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B2-2 委外收货自动入库：成品成本=发出材料+加工费，并计提加工费应付暂估', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page);

  const beforeFinished = await stockOf(page, 'mat-001');

  const result = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const now = new Date().toISOString();
    S.useSubcontractStore.getState().addOrder({
      id: 'sub-e2e-2',
      orderNo: 'SUB-E2E-002',
      type: 'process',
      materialId: 'mat-001',
      materialCode: 'MAT202405010001',
      materialName: '钢板 Q235B',
      vendorId: 'ven-001',
      vendorName: '精工外协加工厂',
      qty: 5,
      issueItems: [],
      status: 'draft',
      planDate: '2026-08-20',
      processFee: 200, // 单件加工费 200
      receivedQty: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: 'e2e',
      updatedBy: 'e2e',
    });
    S.useSubcontractStore.getState().issueMaterials('sub-e2e-2', [
      { materialId: 'mat-002', materialCode: 'MAT202405010002', materialName: '钢管 碳钢', unit: '根', qty: 10 },
    ]);
    const issued = S.useSubcontractStore.getState().orders.find((x: any) => x.id === 'sub-e2e-2');
    const issueOb = S.useWarehouseStore
      .getState()
      .outboundOrders.find((x: any) => x.outboundNo === issued.issueOutboundNo);
    const materialCost = (issueOb?.items || []).reduce((s: number, i: any) => s + (i.costAmount || 0), 0);

    // 全量收货 5 件
    const ok = S.useSubcontractStore.getState().receiveSubcontract('sub-e2e-2');
    const o = S.useSubcontractStore.getState().orders.find((x: any) => x.id === 'sub-e2e-2');
    const ib = S.useWarehouseStore
      .getState()
      .inboundOrders.find((x: any) => x.inboundNo === (o.receiptInboundNos || [])[0]);
    return {
      ok,
      status: o.status,
      receivedQty: o.receivedQty,
      inboundNo: ib?.inboundNo,
      ibType: ib?.type,
      ibPosted: ib?.inventoryPosted,
      ibQty: ib?.items?.[0]?.actualQuantity,
      ibAmount: ib?.items?.[0]?.amount,
      materialCost,
      expectedTotal: Math.round((materialCost + 200 * 5) * 100) / 100,
    };
  });

  expect(result.ok).toBe(true);
  expect(result.status).toBe('received');
  expect(result.receivedQty).toBe(5);
  expect(result.inboundNo).toMatch(/^IB-SUB-/);
  expect(result.ibType).toBe('subcontract');
  expect(result.ibPosted).toBe(true);
  expect(result.ibQty).toBe(5);
  // 成品入库金额 = 发出材料成本 + 加工费(200×5)
  expect(Math.abs(result.ibAmount! - result.expectedTotal)).toBeLessThan(0.05);

  // 成品库存增加 5
  const afterFinished = await stockOf(page, 'mat-001');
  expect(afterFinished).toBe(beforeFinished + 5);

  // 凭证：借 1405 / 贷 1408 材料 + 贷 2201 加工费暂估，借贷平衡
  const v = await voucherLinesOf(page, result.inboundNo!);
  expect(v).not.toBeNull();
  const debit1405 = v!.items.find((i: any) => i.accountCode === '1405');
  const credit1408 = v!.items.find((i: any) => i.accountCode === '1408');
  const credit2201 = v!.items.find((i: any) => i.accountCode === '2201');
  expect(debit1405?.debit).toBeGreaterThan(0);
  expect(credit1408?.credit).toBeGreaterThan(0);
  expect(credit2201?.credit).toBeGreaterThan(0);
  // 加工费暂估 = 200 × 5 = 1000
  expect(Math.abs((credit2201?.credit ?? 0) - 1000)).toBeLessThan(0.05);
  expect(Math.abs(v!.totalDebit - v!.totalCredit)).toBeLessThan(0.01);

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B2-3 委外发料幂等：重复发料不重复生成出库单、不重复扣库存', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page);

  const result = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const now = new Date().toISOString();
    S.useSubcontractStore.getState().addOrder({
      id: 'sub-e2e-3',
      orderNo: 'SUB-E2E-003',
      type: 'process',
      materialId: 'mat-001',
      materialCode: 'MAT202405010001',
      materialName: '钢板 Q235B',
      vendorId: 'ven-001',
      vendorName: '精工外协加工厂',
      qty: 3,
      issueItems: [],
      status: 'draft',
      planDate: '2026-08-20',
      processFee: 50,
      receivedQty: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: 'e2e',
      updatedBy: 'e2e',
    });
    const line = [
      { materialId: 'mat-002', materialCode: 'MAT202405010002', materialName: '钢管 碳钢', unit: '根', qty: 6 },
    ];
    const first = S.useSubcontractStore.getState().issueMaterials('sub-e2e-3', line);
    const stockAfterFirst =
      S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-002')?.currentStock ?? 0;
    const second = S.useSubcontractStore.getState().issueMaterials('sub-e2e-3', line);
    const stockAfterSecond =
      S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-002')?.currentStock ?? 0;
    const obCount = S.useWarehouseStore
      .getState()
      .outboundOrders.filter((x: any) => x.sourceNo === 'SUB-E2E-003').length;
    return { first, second, stockAfterFirst, stockAfterSecond, obCount };
  });

  expect(result.first).toBe(true);
  expect(result.second).toBe(false); // 第二次被幂等拦截
  expect(result.stockAfterSecond).toBe(result.stockAfterFirst); // 库存不再变化
  expect(result.obCount).toBe(1); // 只生成一张出库单

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B2-4 序列号自动登记：serialized 物料入库过账后自动建档为在库并写入轨迹', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page);

  const result = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const now = new Date().toISOString();
    const before = S.useWarehouseAdvancedStore.getState().serialMasters.length;
    // mat-009 交流接触器 CJX2 为序列号管控物料
    S.useWarehouseStore.getState().addInboundOrder({
      id: 'ib-e2e-sn',
      inboundNo: 'IB-E2E-SN-001',
      type: 'purchase',
      status: 'completed',
      warehouseId: 'wh-001',
      warehouseName: '主仓库-A区',
      operator: 'e2e',
      inboundDate: now.slice(0, 10),
      items: [
        {
          id: 'ibi-e2e-sn',
          materialId: 'mat-009',
          materialCode: 'MAT202405010009',
          materialName: '交流接触器 CJX2',
          expectedQuantity: 3,
          actualQuantity: 3,
          qualityStatus: 'qualified',
          unitPrice: 128,
        },
      ],
      createdAt: now,
      updatedAt: now,
      createdBy: 'e2e',
      updatedBy: 'e2e',
    });
    const sms = S.useWarehouseAdvancedStore
      .getState()
      .serialMasters.filter((s: any) => s.materialId === 'mat-009' && s.inboundDate === now.slice(0, 10));
    return {
      before,
      created: sms.length,
      allInStock: sms.every((s: any) => s.status === 'in_stock'),
      firstNo: sms[0]?.serialNo,
      firstMove: sms[0]?.movements?.[0],
      hasWarehouse: sms.every((s: any) => s.warehouseId === 'wh-001'),
    };
  });

  expect(result.created).toBe(3); // 按数量 3 自动建 3 个序列号
  expect(result.allInStock).toBe(true);
  expect(result.firstNo).toMatch(/^SN-IB-E2E-SN-001-001$/);
  expect(result.firstMove?.type).toBe('inbound');
  expect(result.firstMove?.docNo).toBe('IB-E2E-SN-001');
  expect(result.hasWarehouse).toBe(true);

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B2-5 序列号自动核销：销售出库 FIFO 置为已发货、委外发料置为在途，轨迹连续', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page);

  const result = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const now = new Date().toISOString();
    const d = now.slice(0, 10);
    // 先入库 4 个序列号
    S.useWarehouseStore.getState().addInboundOrder({
      id: 'ib-e2e-sn2',
      inboundNo: 'IB-E2E-SN-002',
      type: 'purchase',
      status: 'completed',
      warehouseId: 'wh-001',
      operator: 'e2e',
      inboundDate: d,
      items: [
        {
          id: 'ibi-e2e-sn2',
          materialId: 'mat-009',
          materialCode: 'MAT202405010009',
          materialName: '交流接触器 CJX2',
          expectedQuantity: 4,
          actualQuantity: 4,
          qualityStatus: 'qualified',
          unitPrice: 128,
        },
      ],
      createdAt: now, updatedAt: now, createdBy: 'e2e', updatedBy: 'e2e',
    });

    // 销售出库 2 个 → shipped
    S.useWarehouseStore.getState().addOutboundOrder({
      id: 'ob-e2e-sn-sale',
      outboundNo: 'OB-E2E-SN-SALE',
      type: 'sale',
      status: 'completed',
      warehouseId: 'wh-001',
      customerName: 'E2E 客户',
      operator: 'e2e',
      outboundDate: d,
      items: [
        {
          id: 'obi-e2e-1',
          materialId: 'mat-009',
          materialCode: 'MAT202405010009',
          materialName: '交流接触器 CJX2',
          quantity: 2,
        },
      ],
      createdAt: now, updatedAt: now, createdBy: 'e2e', updatedBy: 'e2e',
    });

    // 委外发料 1 个 → in_transit
    S.useWarehouseStore.getState().addOutboundOrder({
      id: 'ob-e2e-sn-sub',
      outboundNo: 'OB-E2E-SN-SUB',
      type: 'subcontract',
      status: 'completed',
      warehouseId: 'wh-001',
      operator: 'e2e',
      outboundDate: d,
      items: [
        {
          id: 'obi-e2e-2',
          materialId: 'mat-009',
          materialCode: 'MAT202405010009',
          materialName: '交流接触器 CJX2',
          quantity: 1,
        },
      ],
      createdAt: now, updatedAt: now, createdBy: 'e2e', updatedBy: 'e2e',
    });

    const sms = S.useWarehouseAdvancedStore
      .getState()
      .serialMasters.filter((s: any) => s.serialNo.startsWith('SN-IB-E2E-SN-002-'))
      .sort((a: any, b: any) => a.serialNo.localeCompare(b.serialNo));
    return {
      total: sms.length,
      statuses: sms.map((s: any) => s.status),
      shippedMove: sms[0]?.movements?.[1],
      subMove: sms[2]?.movements?.[1],
      lastMovements: sms[3]?.movements?.length,
      customer: sms[0]?.customerName,
    };
  });

  expect(result.total).toBe(4);
  // FIFO：前 2 个销售发货、第 3 个委外在途、第 4 个仍在库
  expect(result.statuses).toEqual(['shipped', 'shipped', 'in_transit', 'in_stock']);
  expect(result.shippedMove?.type).toBe('delivery');
  expect(result.shippedMove?.docNo).toBe('OB-E2E-SN-SALE');
  expect(result.subMove?.type).toBe('subcontract');
  expect(result.subMove?.docNo).toBe('OB-E2E-SN-SUB');
  expect(result.lastMovements).toBe(1); // 未出库的只有入库一条轨迹
  expect(result.customer).toBe('E2E 客户');

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B2-6 委外页面 UI 全链路：发料 → 收货 → 状态与关联单据可见', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page, '/production/subcontract');
  await expect(page.getByRole('heading', { name: '委外加工' })).toBeVisible();

  // 种子 sub-001 为 issued，直接点收货
  const row = page.getByTestId('sub-row').filter({ hasText: 'SUB-2026-001' });
  await expect(row).toHaveCount(1);
  await row.getByTestId('sub-receive').click();

  // 收货后状态变「已收货」，已收/应收 = 20/20，出现关联入库单号
  await expect(row.getByText('已收货')).toBeVisible();
  await expect(row.getByTestId('sub-received')).toHaveText('20 / 20');
  await expect(row.getByTestId('sub-ib-no')).toContainText('IB-SUB-');

  // 入库单列表能看到「委外收货」类型
  await page.goto('/warehouse/inbound');
  await expect(page.getByText('委外收货').first()).toBeVisible();

  expect(errors).toEqual([]);
});
