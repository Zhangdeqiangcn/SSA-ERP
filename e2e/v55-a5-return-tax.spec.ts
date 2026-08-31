import { test, expect, Page } from './ssa-fixtures';

/**
 * A5 退货红冲税额写死 0 的 bug 修复 E2E
 * 覆盖：
 *  A5-1 销售退货 → 红字发票税额=净额×税率、AR红冲销项税额非0、应收账款含税、凭证借贷平衡
 *  A5-2 采购退货 → 应付冲销含税、补进项税红冲分录、凭证借贷平衡
 *  A5-3 幂等：重复 completeReturn 不重复生成凭证
 */

async function fresh(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByText('仪表盘', { exact: true }).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(300);
}

test.beforeEach(async ({ page }) => {
  await fresh(page);
});

test('A5-1 销售退货红冲：红字发票税额=净额×税率，AR红冲销项税额非0、应收账款含税且借贷平衡', async ({ page }) => {
  const res = await page.evaluate(() => {
    const mk = () => { const n = new Date().toISOString(); return { createdAt: n, updatedAt: n, createdBy: 't', updatedBy: 't' }; };
    const st: any = (window as any).__ssaStores;
    // 净额 1000，无原始 SO（回落默认税率 13%）→ 期望税额 130、价税合计 1130
    const r = {
      id: 'e2e-sr-a5', returnNo: 'SR-E2E-A5', salesOrderNo: 'SO-E2E-A5', customerName: '测试客户',
      status: 'draft', returnDate: '2026-07-15', reason: '质量',
      items: [{ id: 'sri1', materialId: 'mat-001', materialCode: 'STEEL-001', materialName: '钢板', unit: 'kg', quantity: 10, unitPrice: 100, amount: 1000 }],
      totalAmount: 1000, ...mk(),
    } as any;
    st.useSalesAdvancedStore.getState().addReturn(r);
    st.useSalesAdvancedStore.getState().completeReturn(r.id);

    const inv = st.useSalesAdvancedStore.getState().salesInvoices.find((i: any) => i.linkedReturnNo === 'SR-E2E-A5');
    const entries = st.useFinanceStore.getState().accountEntries.filter(
      (e: any) => e.voucherNo && e.voucherNo.startsWith('V-ARCN')
    );
    const revenue = entries.find((e: any) => e.debitAccount === '主营业务收入');
    const outputTax = entries.find((e: any) => e.debitAccount === '应交税费-应交增值税');
    const ar = entries.find((e: any) => e.creditAccount === '应收账款');
    const debit = entries.reduce((s: number, e: any) => s + (e.debitAccount ? e.amount : 0), 0);
    const credit = entries.reduce((s: number, e: any) => s + (e.creditAccount ? e.amount : 0), 0);
    return {
      invType: inv?.invoiceType,
      invAmount: inv?.amount,
      invTax: inv?.taxAmount,
      invTotal: inv?.totalAmount,
      revenue: revenue?.amount,
      outputTax: outputTax?.amount,
      ar: ar?.amount,
      debit,
      credit,
      entryCount: entries.length,
    };
  });

  expect(res.invType).toBe('credit_note');
  expect(res.invAmount).toBeCloseTo(1000, 2);
  expect(res.invTax).toBeCloseTo(130, 2); // 1000 × 13% = 130（修复：不再写死 0）
  expect(res.invTotal).toBeCloseTo(1130, 2); // 1000 + 130（修复：价税合计不再等于净额）
  expect(res.revenue).toBeCloseTo(1000, 2);
  expect(res.outputTax).toBeCloseTo(130, 2); // 修复：销项税额红冲非 0
  expect(res.ar).toBeCloseTo(1130, 2); // 修复：应收账款=含税
  expect(res.debit).toBeCloseTo(res.credit, 2); // 借贷平衡
  expect(res.entryCount).toBe(3);
});

test('A5-2 采购退货红冲：应付冲销含税、补进项税红冲分录、凭证借贷平衡', async ({ page }) => {
  const res = await page.evaluate(() => {
    const mk = () => { const n = new Date().toISOString(); return { createdAt: n, updatedAt: n, createdBy: 't', updatedBy: 't' }; };
    const st: any = (window as any).__ssaStores;
    const r = {
      id: 'e2e-pr-a5', returnNo: 'PR-E2E-A5', purchaseOrderNo: 'PO-E2E-A5', vendorId: 'ven-001', vendorName: '供应商',
      status: 'draft', returnDate: '2026-07-15', reason: '质量',
      items: [{ id: 'pri1', materialId: 'mat-001', materialCode: 'STEEL-001', materialName: '钢板', unit: 'kg', quantity: 50, unitPrice: 40, amount: 2000 }],
      totalAmount: 2000, ...mk(),
    } as any;
    st.usePurchaseAdvancedStore.getState().addReturn(r);
    st.usePurchaseAdvancedStore.getState().completeReturn(r.id);

    const entries = st.useFinanceStore.getState().accountEntries.filter(
      (e: any) => e.voucherNo && e.voucherNo.startsWith('V-APCN')
    );
    const ap = entries.find((e: any) => e.debitAccount === '应付账款');
    const material = entries.find((e: any) => e.creditAccount === '原材料');
    const inputTax = entries.find((e: any) => e.creditAccount === '应交税费-应交增值税');
    const debit = entries.reduce((s: number, e: any) => s + (e.debitAccount ? e.amount : 0), 0);
    const credit = entries.reduce((s: number, e: any) => s + (e.creditAccount ? e.amount : 0), 0);
    return {
      ap: ap?.amount,
      material: material?.amount,
      inputTax: inputTax?.amount,
      debit,
      credit,
      entryCount: entries.length,
    };
  });

  expect(res.ap).toBeCloseTo(2260, 2); // 2000 + 260（修复：应付改为含税，原写净额 2000）
  expect(res.material).toBeCloseTo(2000, 2); // 原材料净额不变
  expect(res.inputTax).toBeCloseTo(260, 2); // 修复：补进项税红冲分录（原缺失）
  expect(res.debit).toBeCloseTo(res.credit, 2); // 借贷平衡
  expect(res.entryCount).toBe(3);
});

test('A5-3 退货完成幂等：重复 completeReturn 不重复生成凭证', async ({ page }) => {
  const counts = await page.evaluate(() => {
    const mk = () => { const n = new Date().toISOString(); return { createdAt: n, updatedAt: n, createdBy: 't', updatedBy: 't' }; };
    const st: any = (window as any).__ssaStores;
    const r = {
      id: 'e2e-pr-idem', returnNo: 'PR-E2E-IDEM', purchaseOrderNo: 'PO-E2E-IDEM', vendorId: 'ven-001', vendorName: '供应商',
      status: 'draft', returnDate: '2026-07-15', reason: '质量',
      items: [{ id: 'pri1', materialId: 'mat-001', materialCode: 'STEEL-001', materialName: '钢板', unit: 'kg', quantity: 10, unitPrice: 40, amount: 400 }],
      totalAmount: 400, ...mk(),
    } as any;
    st.usePurchaseAdvancedStore.getState().addReturn(r);
    st.usePurchaseAdvancedStore.getState().completeReturn(r.id);
    const afterFirst = st.useFinanceStore.getState().accountEntries.filter(
      (e: any) => e.voucherNo && e.voucherNo.startsWith('V-APCN')
    ).length;
    // 重复调用（已完成应被守卫拦截）
    st.usePurchaseAdvancedStore.getState().completeReturn(r.id);
    const afterSecond = st.useFinanceStore.getState().accountEntries.filter(
      (e: any) => e.voucherNo && e.voucherNo.startsWith('V-APCN')
    ).length;
    return { afterFirst, afterSecond };
  });
  expect(counts.afterFirst).toBe(3);
  expect(counts.afterSecond).toBe(3); // 幂等：无新增
});
