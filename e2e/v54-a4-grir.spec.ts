import { test, expect } from '@playwright/test';

/**
 * A4-③ GR/IR 暂估 — 专项 E2E
 * 覆盖：采购收货生成暂估凭证(借1403/贷2201)、发票校验冲暂估(借2201)+进项税(借2221)+应付(贷2202)、
 *      GR/IR 全程对账（暂估归零）与发票凭证生成幂等。
 */

test('A4-3 采购收货 → GR/IR 暂估凭证(借1403/贷2201) + 库存增加', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);

  const res = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const m = S.useMaterialStore.getState().materials[0];
    const prevStock = m.currentStock;
    const Q = 20;
    const P = 50; // 未税单价
    const oid = 'IN-A4-GRIR-' + Date.now();
    S.useWarehouseStore.getState().addInboundOrder({
      id: oid,
      inboundNo: oid,
      type: 'purchase',
      sourceNo: 'PO-A4-TEST',
      vendorId: 'v-a4',
      vendorName: 'A4测试供应商',
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
          expectedQuantity: Q,
          actualQuantity: Q,
          qualityStatus: 'qualified',
          unitPrice: P,
        },
      ],
    } as any);
    const m2 = S.useMaterialStore.getState().materials.find((x: any) => x.id === m.id);
    const v = S.useFinanceStore.getState().vouchers.find((x: any) => x.sourceNo === oid);
    const debitLine = v?.items.find((it: any) => it.accountCode === '1403');
    const creditLine = v?.items.find((it: any) => it.accountCode === '2201');
    return {
      prevStock,
      newStock: m2.currentStock,
      Q,
      hasVoucher: !!v,
      debit: debitLine?.debit,
      credit: creditLine?.credit,
      exp: Q * P,
    };
  });

  expect(res.hasVoucher).toBe(true);
  expect(res.debit).toBeCloseTo(res.exp, 2);
  expect(res.credit).toBeCloseTo(res.exp, 2);
  expect(res.newStock).toBeCloseTo(res.prevStock + res.Q, 3);
});

test('A4-3 发票校验 → 冲暂估(借2201) + 进项税(借2221) + 确认应付(贷2202)', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);

  const res = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const id = 'INV-A4-' + Date.now();
    const amount = 1000;
    const taxAmount = 130;
    const totalAmount = amount + taxAmount;
    S.useFinanceStore.getState().addInvoice({
      id,
      invoiceNo: id,
      vendorName: 'A4测试供应商',
      invoiceDate: '2026-08-05',
      amount,
      taxAmount,
      totalAmount,
      voucherGenerated: false,
    } as any);
    const vno = S.useFinanceStore.getState().generateVoucherFromInvoice(id);
    const v = S.useFinanceStore.getState().vouchers.find((x: any) => x.sourceNo === id);
    const grir = v?.items.find((it: any) => it.accountCode === '2201');
    const vat = v?.items.find((it: any) => it.accountCode === '2221');
    const ap = v?.items.find((it: any) => it.accountCode === '2202');
    return {
      hasVoucher: !!v,
      vno,
      grirDebit: grir?.debit,
      vatDebit: vat?.debit,
      apCredit: ap?.credit,
      amount,
      taxAmount,
      totalAmount,
    };
  });

  expect(res.hasVoucher).toBe(true);
  expect(res.vno).toBeTruthy();
  expect(res.grirDebit).toBeCloseTo(res.amount, 2); // 冲销收货时挂的暂估
  expect(res.vatDebit).toBeCloseTo(res.taxAmount, 2);
  expect(res.apCredit).toBeCloseTo(res.totalAmount, 2);
});

test('A4-3 GR/IR 全程对账：收货挂暂估 → 发票校验冲平归零 + 生成幂等', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);

  const res = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const m = S.useMaterialStore.getState().materials[0];
    const Q = 20;
    const P = 50;
    const grAmount = Q * P; // 未税，与发票未税金额一致

    // 1) 采购收货：生成暂估凭证（贷 2201 = grAmount）
    const oid = 'IN-A4-RECON-' + Date.now();
    S.useWarehouseStore.getState().addInboundOrder({
      id: oid,
      inboundNo: oid,
      type: 'purchase',
      sourceNo: 'PO-A4-RECON',
      vendorId: 'v-a4',
      vendorName: 'A4测试供应商',
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
          expectedQuantity: Q,
          actualQuantity: Q,
          qualityStatus: 'qualified',
          unitPrice: P,
        },
      ],
    } as any);

    const sum2201 = () =>
      S.useFinanceStore.getState().vouchers.reduce(
        (acc: number, v: any) =>
          acc +
          v.items.reduce(
            (a: number, it: any) => (it.accountCode === '2201' ? a + (it.credit || 0) - (it.debit || 0) : a),
            0
          ),
        0
      );
    const grBalance = sum2201(); // 收货后：2201 贷方挂账 = grAmount

    // 2) 发票校验：冲暂估（借 2201 = grAmount）+ 确认应付
    const invId = 'INV-A4-RECON-' + Date.now();
    S.useFinanceStore.getState().addInvoice({
      id: invId,
      invoiceNo: invId,
      vendorName: 'A4测试供应商',
      invoiceDate: '2026-08-05',
      amount: grAmount,
      taxAmount: Math.round(grAmount * 0.13 * 100) / 100,
      totalAmount: grAmount + Math.round(grAmount * 0.13 * 100) / 100,
      voucherGenerated: false,
    } as any);
    const vno1 = S.useFinanceStore.getState().generateVoucherFromInvoice(invId);
    const afterBalance = sum2201(); // 冲平后：2201 余额应为 0

    // 3) 幂等：同一发票重复生成不应再产生凭证
    const vno2 = S.useFinanceStore.getState().generateVoucherFromInvoice(invId);
    const vCount = S.useFinanceStore.getState().vouchers.filter((x: any) => x.sourceNo === invId).length;

    return { grAmount, grBalance, afterBalance, vno1, vno2, vCount };
  });

  expect(res.grBalance).toBeCloseTo(res.grAmount, 2); // 收货后暂估挂账
  expect(res.afterBalance).toBeCloseTo(0, 2); // 发票校验后冲平归零
  expect(res.vno1).toBeTruthy();
  expect(res.vno2).toBeNull(); // 幂等：重复生成返回 null
  expect(res.vCount).toBe(1); // 仅 1 张发票凭证
});
