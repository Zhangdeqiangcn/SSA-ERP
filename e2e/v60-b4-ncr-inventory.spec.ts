import { test, expect, type Page } from './ssa-fixtures';

/**
 * B4 NCR 联动库存（P1 流程闭环第四战役）：
 * 不合格品(NCR) 报废(scrap)处置 → 生成 scrap 出库单 → 真实扣减库存 + 自动生成报废凭证
 *   （借 6602 管理费用 / 贷 1403 原材料[评估类=RAW] 或 1405 库存商品[其他评估类]，金额=缺陷数×移动均价）
 * 其余处置方式（rework/return/concession/isolate/other）仅完成状态闭环，不联动库存/凭证。
 * 对标 SAP：报废损失进管理费用（科目表无 1901 待处理财产损溢 / 6711 营业外支出，按现有 COA 取最贴近科目）。
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

/** 读取物料当前库存与金额 */
const materialInfo = (page: Page, materialId: string) =>
  page.evaluate(
    (mid) => {
      const m = (window as any).__ssaStores.useMaterialStore.getState().materials.find((x: any) => x.id === mid);
      return { currentStock: m?.currentStock ?? 0, stockValue: m?.stockValue ?? 0, valuationClass: m?.valuationClass };
    },
    materialId
  );

/** 读取指定来源单号的凭证分录（借贷科目 + 金额） */
const voucherLinesOf = (page: Page, sourceNo: string) =>
  page.evaluate((no) => {
    const vs = (window as any).__ssaStores.useFinanceStore.getState().vouchers;
    const v = vs.find((x: any) => x.sourceNo === no);
    if (!v) return null;
    return {
      source: v.source,
      items: v.items.map((i: any) => ({ accountCode: i.accountCode, debit: i.debit, credit: i.credit })),
      totalDebit: v.items.reduce((s: number, i: any) => s + (i.debit || 0), 0),
      totalCredit: v.items.reduce((s: number, i: any) => s + (i.credit || 0), 0),
    };
  }, sourceNo);

const scrapOutboundCount = (page: Page) =>
  page.evaluate(() => (window as any).__ssaStores.useWarehouseStore.getState().outboundOrders.filter((o: any) => o.type === 'scrap').length);

const scrapVoucherCount = (page: Page) =>
  page.evaluate(() => (window as any).__ssaStores.useFinanceStore.getState().vouchers.filter((x: any) => x.source === 'scrap').length);

// ═══════════════════════════════════════════════════════════════
test('B4-1 报废(scrap)联动：库存扣减 + 报废凭证(借6602/贷1403)平衡 + 状态闭环', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page);

  // uq-001 种子：materialCode=MAT202405010004(mat-004 螺栓 M10, 评估类 RAW, 缺陷数 100)
  const result = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const beforeStock = S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-004')?.currentStock ?? 0;
    const beforeVal = S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-004')?.stockValue ?? 0;

    const ok = S.useQualityStore.getState().disposeUnqualified('uq-001', { disposition: 'scrap', operator: '质量员' });

    const uq = S.useQualityStore.getState().unqualifiedItems.find((x: any) => x.id === 'uq-001');
    const ob = S.useWarehouseStore.getState().outboundOrders.find((o: any) => o.outboundNo === uq.linkedOutboundNo);
    const afterStock = S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-004')?.currentStock ?? 0;
    const afterVal = S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-004')?.stockValue ?? 0;

    return {
      ok,
      dispositionStatus: uq.dispositionStatus,
      actualDisposition: uq.actualDisposition,
      linkedOutboundNo: uq.linkedOutboundNo,
      obType: ob?.type,
      obStatus: ob?.status,
      obPosted: ob?.inventoryPosted,
      obQty: ob?.items?.[0]?.quantity,
      defectQty: uq.defectQuantity,
      beforeStock, afterStock, beforeVal, afterVal,
    };
  });

  expect(result.ok).toBe(true);
  expect(result.dispositionStatus).toBe('completed'); // NCR 状态闭环
  expect(result.actualDisposition).toBe('scrap');
  expect(result.linkedOutboundNo).toMatch(/^OUT-SCRAP-/); // 联动生成的报废出库单

  // 报废出库单：type=scrap / status=completed / 已记账库存
  expect(result.obType).toBe('scrap');
  expect(result.obStatus).toBe('completed');
  expect(result.obPosted).toBe(true);
  expect(result.obQty).toBe(result.defectQty); // 出库数量 = 缺陷数量

  // 库存真实扣减（数量 + 金额）
  expect(result.afterStock).toBe(result.beforeStock - result.defectQty);
  const costAmount = Math.round((result.beforeVal - result.afterVal) * 100) / 100;
  expect(costAmount).toBeGreaterThan(0);

  // 报废凭证：借 6602 管理费用 / 贷 1403 原材料（RAW），借贷平衡
  const v = await voucherLinesOf(page, result.linkedOutboundNo!);
  expect(v).not.toBeNull();
  expect(v!.source).toBe('scrap');
  const debit6602 = v!.items.find((i: any) => i.accountCode === '6602');
  const credit1403 = v!.items.find((i: any) => i.accountCode === '1403');
  expect(debit6602?.debit).toBe(costAmount);  // 借 6602 管理费用
  expect(credit1403?.credit).toBe(costAmount); // 贷 1403 原材料
  expect(Math.abs(v!.totalDebit - v!.totalCredit)).toBeLessThan(0.01); // 借贷平衡

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B4-2 报废幂等：重复报废不重复扣库存、不重复出库、不重复生成凭证', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page);

  const result = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const first = S.useQualityStore.getState().disposeUnqualified('uq-001', { disposition: 'scrap' });
    const stock1 = S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-004')?.currentStock ?? 0;
    const obCount1 = S.useWarehouseStore.getState().outboundOrders.filter((o: any) => o.type === 'scrap').length;
    const vCount1 = S.useFinanceStore.getState().vouchers.filter((x: any) => x.source === 'scrap').length;

    const second = S.useQualityStore.getState().disposeUnqualified('uq-001', { disposition: 'scrap' });
    const stock2 = S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-004')?.currentStock ?? 0;
    const obCount2 = S.useWarehouseStore.getState().outboundOrders.filter((o: any) => o.type === 'scrap').length;
    const vCount2 = S.useFinanceStore.getState().vouchers.filter((x: any) => x.source === 'scrap').length;

    return { first, second, stock1, stock2, obCount1, obCount2, vCount1, vCount2 };
  });

  expect(result.first).toBe(true);
  expect(result.second).toBe(false); // 第二次被幂等拦截
  expect(result.stock2).toBe(result.stock1); // 库存不再变化
  expect(result.obCount2).toBe(result.obCount1); // 仅一张报废出库单
  expect(result.vCount2).toBe(result.vCount1); // 仅一张报废凭证

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B4-3 报废凭证按评估类分流：成品(FG)报废贷 1405 库存商品', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page);

  // 动态创建一条指向成品 mat-fg-001（评估类 FG）的 NCR，报废应贷 1405
  const result = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const id = 'uq-e2e-fg';
    S.useQualityStore.getState().addUnqualifiedItem({
      id,
      itemNo: 'UQ-E2E-FG',
      inspectionTaskId: '',
      inspectionTaskNo: 'E2E',
      materialCode: 'PRD-FRAME-001',
      materialName: '重型钢结构焊接架 H1200',
      batchNo: 'LOT-E2E',
      defectQuantity: 3,
      defectDescription: 'E2E 成品报废',
      disposition: 'scrap',
      dispositionStatus: 'pending',
      responsiblePerson: '质检员',
      dueDate: '2026-01-01',
      createdAt: new Date().toISOString(),
    });
    const beforeStock = S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-fg-001')?.currentStock ?? 0;
    const beforeVal = S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-fg-001')?.stockValue ?? 0;

    const ok = S.useQualityStore.getState().disposeUnqualified(id, { disposition: 'scrap', operator: '质检员' });
    const uq = S.useQualityStore.getState().unqualifiedItems.find((x: any) => x.id === id);
    const afterStock = S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-fg-001')?.currentStock ?? 0;
    const afterVal = S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-fg-001')?.stockValue ?? 0;

    return {
      ok, linkedOutboundNo: uq.linkedOutboundNo, defectQty: uq.defectQuantity,
      beforeStock, afterStock, beforeVal, afterVal,
    };
  });

  expect(result.ok).toBe(true);
  expect(result.afterStock).toBe(result.beforeStock - result.defectQty); // 成品库存扣减
  const costAmount = Math.round((result.beforeVal - result.afterVal) * 100) / 100;

  const v = await voucherLinesOf(page, result.linkedOutboundNo!);
  expect(v).not.toBeNull();
  expect(v!.source).toBe('scrap');
  const debit6602 = v!.items.find((i: any) => i.accountCode === '6602');
  const credit1405 = v!.items.find((i: any) => i.accountCode === '1405');
  const credit1403 = v!.items.find((i: any) => i.accountCode === '1403');
  expect(debit6602?.debit).toBe(costAmount);  // 借 6602 管理费用
  expect(credit1405?.credit).toBe(costAmount); // 贷 1405 库存商品（FG 评估类）
  expect(credit1403).toBeUndefined();          // 非 RAW，不应出现 1403
  expect(Math.abs(v!.totalDebit - v!.totalCredit)).toBeLessThan(0.01);

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B4-4 返工(rework)联动：生成返工入库(库存增加)+凭证(借1403原材料/贷6601生产损失)+状态闭环', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page);

  const result = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const uqItem = S.useQualityStore.getState().unqualifiedItems.find((x: any) => x.id === 'uq-001');
    const defectQty = uqItem.defectQuantity as number;

    const obBefore = S.useWarehouseStore.getState().outboundOrders.filter((o: any) => o.type === 'scrap').length;
    const vBefore = S.useFinanceStore.getState().vouchers.filter((x: any) => x.source === 'scrap').length;
    const stockBefore = S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-004')?.currentStock ?? 0;
    const ibReworkBefore = S.useWarehouseStore.getState().inboundOrders.filter((o: any) => o.type === 'rework').length;
    const vAllBefore = S.useFinanceStore.getState().vouchers.length;

    const ok = S.useQualityStore.getState().disposeUnqualified('uq-001', { disposition: 'rework', operator: '质量员' });

    const uq = S.useQualityStore.getState().unqualifiedItems.find((x: any) => x.id === 'uq-001');
    const obAfter = S.useWarehouseStore.getState().outboundOrders.filter((o: any) => o.type === 'scrap').length;
    const vAfter = S.useFinanceStore.getState().vouchers.filter((x: any) => x.source === 'scrap').length;
    const stockAfter = S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-004')?.currentStock ?? 0;
    const ibReworkAfter = S.useWarehouseStore.getState().inboundOrders.filter((o: any) => o.type === 'rework').length;
    const reworkVoucher = S.useFinanceStore.getState().vouchers.find(
      (x: any) => x.source === 'ocr' && x.sourceNo === uqItem.itemNo && x.items?.some((it: any) => it.accountCode === '1403')
    );
    const reworkInbound = S.useWarehouseStore.getState().inboundOrders.find(
      (o: any) => o.type === 'rework' && o.sourceNo === uqItem.itemNo
    );

    return {
      ok, dispositionStatus: uq.dispositionStatus, actualDisposition: uq.actualDisposition,
      linkedOutboundNo: uq.linkedOutboundNo, linkedInboundNo: uq.linkedInboundNo,
      obBefore, obAfter, vBefore, vAfter, stockBefore, stockAfter, defectQty,
      ibReworkDelta: ibReworkAfter - ibReworkBefore,
      reworkInboundNo: reworkInbound?.inboundNo,
      reworkInboundStatus: reworkInbound?.status,
      hasReworkVoucher: !!reworkVoucher,
      voucherDebit: reworkVoucher?.items?.find((it: any) => it.accountCode === '1403')?.debit,
      voucherCredit: reworkVoucher?.items?.find((it: any) => it.accountCode === '6601')?.credit,
      vAllDelta: S.useFinanceStore.getState().vouchers.length - vAllBefore,
    };
  });

  expect(result.ok).toBe(true);
  expect(result.dispositionStatus).toBe('completed'); // 状态闭环
  expect(result.actualDisposition).toBe('rework');
  expect(result.linkedOutboundNo).toBeUndefined();    // rework 不生成报废出库
  expect(result.linkedInboundNo).toBeDefined();       // rework 生成返工入库
  expect(result.obAfter).toBe(result.obBefore);        // 无新增报废出库
  expect(result.vAfter).toBe(result.vBefore);          // 无 source='scrap' 凭证
  // 库存增加：返工入库过账使 mat-004 currentStock += defectQty
  expect(result.stockAfter).toBe(result.stockBefore + result.defectQty);
  // 生成 1 条 rework 入库单
  expect(result.ibReworkDelta).toBe(1);
  expect(result.reworkInboundNo).toMatch(/^IN-REWORK-/);
  expect(result.reworkInboundStatus).toBe('completed');
  // 生成 1 条凭证（借1403 原材料 / 贷6601 生产损失，金额平衡）
  expect(result.vAllDelta).toBe(1);
  expect(result.hasReworkVoucher).toBe(true);
  expect(result.voucherDebit).toBe(result.voucherCredit);
  expect(result.voucherDebit).toBeGreaterThan(0);

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B4-5 UI 全链路：不合格品页 → 选择报废 → 确认 → 库存联动+凭证反馈', async ({ page }) => {
  const errors = await captureErrors(page);
  page.on('dialog', (d) => d.accept()); // 兼容可能的 alert
  await bootstrap(page, '/quality/unqualified');

  await expect(page.getByTestId('ncr-dispose-uq-001')).toBeVisible();
  await page.getByTestId('ncr-dispose-uq-001').click();

  await expect(page.getByTestId('disposal-confirm')).toBeVisible();
  await page.getByTestId('disposal-method-scrap').click();
  await page.getByTestId('disposal-confirm').click();

  // 反馈提示包含「报废」与「凭证」
  await expect(page.getByText(/报废.*凭证/)).toBeVisible();

  // 校验底层 store 已真正联动
  const r = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const uq = S.useQualityStore.getState().unqualifiedItems.find((x: any) => x.id === 'uq-001');
    const ob = S.useWarehouseStore.getState().outboundOrders.find((o: any) => o.outboundNo === uq.linkedOutboundNo);
    return { status: uq.dispositionStatus, linkedOutboundNo: uq.linkedOutboundNo, obType: ob?.type };
  });
  expect(r.status).toBe('completed');
  expect(r.obType).toBe('scrap');

  expect(errors).toEqual([]);
});
