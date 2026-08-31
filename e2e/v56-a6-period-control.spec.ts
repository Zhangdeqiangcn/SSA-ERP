import { test, expect, type Page } from './ssa-fixtures';

/**
 * A6 会计期间与期末结账管控专项：
 * ① 会计期间主数据（整年 12 期会计日历，预置 open）
 * ② 已结账期间凭证硬管控（新增/修改/删除/过账/冲销全部拒绝）
 * ③ 反结账后恢复记账能力
 * ④ 期末结账页 UI 全链路（损益结转 → 结账 → 锁定提示 → 反结账）
 */

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

const gotoClosing = async (page: Page) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/finance/closing');
  await expect(page.getByRole('heading', { name: '期末结账' })).toBeVisible();
  await page.waitForFunction(() => (window as any).__ssaStores);
};

/** 通过 store 直接把期间置为已结账（跳过 UI，聚焦管控断言） */
const closePeriodByStore = async (page: Page, period: string) => {
  await page.evaluate((p) => {
    (window as any).__ssaStores.useFinanceLedgerStore.getState().upsertClosing(p, {
      status: 'closed',
      closedBy: 'e2e',
      closedAt: new Date().toISOString(),
    });
  }, period);
};

/** 填一行分录：摘要 / 科目 / 借或贷金额 */
const fillLine = async (
  page: Page,
  idx: number,
  summary: string,
  accountKeyword: string,
  side: 'debit' | 'credit',
  amount: number
) => {
  await page.getByTestId(`vi-summary-${idx}`).locator('input').fill(summary);
  const acc = page.getByTestId(`vi-account-${idx}`).locator('input');
  await acc.click();
  await acc.fill(accountKeyword);
  await page.getByRole('option').first().click();
  await page.getByTestId(`vi-${side}-${idx}`).locator('input').fill(String(amount));
};

test('A6-1 会计期间主数据：预置整年 12 期会计日历，默认全部可记账', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoClosing(page);

  // store 层：closingPeriods 预置 12 期，且全部为 open
  const summary = await page.evaluate(() => {
    const list = (window as any).__ssaStores.useFinanceLedgerStore.getState().closingPeriods;
    return {
      count: list.length,
      allOpen: list.every((c: any) => c.status === 'open'),
      first: list[0]?.period,
      last: list[list.length - 1]?.period,
    };
  });
  expect(summary.count).toBe(12);
  expect(summary.allOpen).toBe(true);
  expect(summary.first).toBe('2026-01');
  expect(summary.last).toBe('2026-12');

  // UI 层：会计日历表 12 行，均显示「可记账」
  await expect(page.getByTestId('pc-calendar')).toBeVisible();
  await expect(page.getByTestId('pc-cal-row-2026-01')).toBeVisible();
  await expect(page.getByTestId('pc-cal-row-2026-12')).toBeVisible();
  await expect(page.getByTestId('pc-period-count')).toContainText('12 期');
  await expect(page.getByTestId('pc-period-count')).toContainText('已结 0');
  await expect(page.getByTestId('pc-cal-row-2026-06').getByText('可记账')).toBeVisible();

  // 反结账按钮在未结账时不可用
  await expect(page.getByTestId('pc-reopen')).toBeDisabled();

  expect(errors).toEqual([]);
});

test('A6-2 已结账期间硬管控：新增/修改/删除/过账/冲销凭证全部被拒', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoClosing(page);

  // 先在 2026-01 建一张草稿凭证（此时期间仍 open）
  const created = await page.evaluate(() => {
    const fs = (window as any).__ssaStores.useFinanceStore.getState();
    return fs.createVoucher({
      date: '2026-01-20',
      items: [
        { id: 'l1', lineNo: 1, summary: '期间管控测试', accountCode: '6602', accountName: '管理费用', debit: 800, credit: 0 },
        { id: 'l2', lineNo: 2, summary: '期间管控测试', accountCode: '1002', accountName: '银行存款', debit: 0, credit: 800 },
      ],
      createdBy: 'e2e',
    });
  });
  expect(created.ok).toBe(true);

  // 结账 2026-01
  await closePeriodByStore(page, '2026-01');

  // 结账后：新增凭证被拒
  const blockedCreate = await page.evaluate(() => {
    const fs = (window as any).__ssaStores.useFinanceStore.getState();
    return fs.createVoucher({
      date: '2026-01-25',
      items: [
        { id: 'x1', lineNo: 1, summary: '越界记账', accountCode: '6602', accountName: '管理费用', debit: 100, credit: 0 },
        { id: 'x2', lineNo: 2, summary: '越界记账', accountCode: '1002', accountName: '银行存款', debit: 0, credit: 100 },
      ],
      createdBy: 'e2e',
    });
  });
  expect(blockedCreate.ok).toBe(false);
  expect(blockedCreate.message).toContain('2026-01 已结账');

  // 结账后：修改 / 删除 / 过账 均被拒
  const ops = await page.evaluate((no) => {
    const fs = (window as any).__ssaStores.useFinanceStore.getState();
    const v = fs.vouchers.find((x: any) => x.voucherNo === no);
    const upd = fs.updateVoucher(v.id, { remark: '试图修改' });
    const del = fs.deleteVoucher(v.id);
    fs.reviewVoucher(v.id, 'e2e');
    const post = (window as any).__ssaStores.useFinanceStore.getState().postVoucher(v.id, 'e2e');
    return { upd, del, post };
  }, created.voucherNo);
  expect(ops.upd.ok).toBe(false);
  expect(ops.upd.message).toContain('已结账');
  expect(ops.del.ok).toBe(false);
  expect(ops.del.message).toContain('已结账');
  expect(ops.post.ok).toBe(false);
  expect(ops.post.message).toContain('已结账');

  // 凭证确实没有被删除（管控是"拒绝"而不是"静默失败"）
  const stillThere = await page.evaluate(
    (no) => (window as any).__ssaStores.useFinanceStore.getState().vouchers.some((x: any) => x.voucherNo === no),
    created.voucherNo
  );
  expect(stillThere).toBe(true);

  // 其他未结账期间不受影响
  const otherPeriod = await page.evaluate(() => {
    const fs = (window as any).__ssaStores.useFinanceStore.getState();
    return fs.createVoucher({
      date: '2026-03-10',
      items: [
        { id: 'o1', lineNo: 1, summary: '开放期间记账', accountCode: '6602', accountName: '管理费用', debit: 300, credit: 0 },
        { id: 'o2', lineNo: 2, summary: '开放期间记账', accountCode: '1002', accountName: '银行存款', debit: 0, credit: 300 },
      ],
      createdBy: 'e2e',
    });
  });
  expect(otherPeriod.ok).toBe(true);

  expect(errors).toEqual([]);
});

test('A6-3 反结账后恢复记账：openPeriod 打回 open 并清空结账痕迹', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoClosing(page);

  await closePeriodByStore(page, '2026-02');

  const blocked = await page.evaluate(() => {
    const fs = (window as any).__ssaStores.useFinanceStore.getState();
    return fs.createVoucher({
      date: '2026-02-10',
      items: [
        { id: 'b1', lineNo: 1, summary: '结账期间记账', accountCode: '6602', accountName: '管理费用', debit: 500, credit: 0 },
        { id: 'b2', lineNo: 2, summary: '结账期间记账', accountCode: '1002', accountName: '银行存款', debit: 0, credit: 500 },
      ],
      createdBy: 'e2e',
    });
  });
  expect(blocked.ok).toBe(false);

  // 反结账
  const reopen = await page.evaluate(() =>
    (window as any).__ssaStores.useFinanceLedgerStore.getState().openPeriod('2026-02', 'e2e')
  );
  expect(reopen.ok).toBe(true);
  expect(reopen.message).toContain('已反结账');

  // 结账痕迹已清空
  const after = await page.evaluate(() =>
    (window as any).__ssaStores.useFinanceLedgerStore.getState().getClosing('2026-02')
  );
  expect(after.status).toBe('open');
  expect(after.closedBy).toBeFalsy();
  expect(after.closedAt).toBeFalsy();

  // 恢复记账能力
  const ok = await page.evaluate(() => {
    const fs = (window as any).__ssaStores.useFinanceStore.getState();
    return fs.createVoucher({
      date: '2026-02-11',
      items: [
        { id: 'r1', lineNo: 1, summary: '反结账后记账', accountCode: '6602', accountName: '管理费用', debit: 500, credit: 0 },
        { id: 'r2', lineNo: 2, summary: '反结账后记账', accountCode: '1002', accountName: '银行存款', debit: 0, credit: 500 },
      ],
      createdBy: 'e2e',
    });
  });
  expect(ok.ok).toBe(true);

  // 重复反结账应被拒（已是 open）
  const again = await page.evaluate(() =>
    (window as any).__ssaStores.useFinanceLedgerStore.getState().openPeriod('2026-02', 'e2e')
  );
  expect(again.ok).toBe(false);

  expect(errors).toEqual([]);
});

test('A6-4 期末结账页 UI 全链路：损益结转 → 结账锁定 → 反结账', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoClosing(page);

  // 默认选中 2026-01，状态未结账
  await expect(page.getByTestId('pc-status')).toContainText('未结账');

  // 损益结转 → 已损益结转
  await page.getByTestId('pc-profit-close').click();
  await expect(page.getByTestId('pc-status')).toContainText('已损益结转');

  // 结账 → 已结账 + 锁定提示 + 操作按钮禁用
  await page.getByTestId('pc-close').click();
  await expect(page.getByTestId('pc-status')).toContainText('已结账');
  await expect(page.getByTestId('pc-lock-alert')).toContainText('凭证已锁定');
  await expect(page.getByTestId('pc-close')).toBeDisabled();
  await expect(page.getByTestId('pc-profit-close')).toBeDisabled();
  await expect(page.getByTestId('pc-period-count')).toContainText('已结 1');
  await expect(page.getByTestId('pc-cal-row-2026-01').getByText('已锁定')).toBeVisible();

  // 反结账 → 回到未结账，锁定解除
  await expect(page.getByTestId('pc-reopen')).toBeEnabled();
  await page.getByTestId('pc-reopen').click();
  await expect(page.getByTestId('pc-status')).toContainText('未结账');
  await expect(page.getByTestId('pc-period-count')).toContainText('已结 0');
  await expect(page.getByTestId('pc-close')).toBeEnabled();
  await expect(page.getByTestId('pc-cal-row-2026-01').getByText('可记账')).toBeVisible();

  expect(errors).toEqual([]);
});

test('A6-5 凭证页 UI：已结账期间保存凭证被拦截并给出明确提示', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoClosing(page);
  await closePeriodByStore(page, '2026-01');

  await page.goto('/finance/vouchers');
  await expect(page.getByRole('heading', { name: '记账凭证' })).toBeVisible();

  await page.getByTestId('voucher-new-btn').click();
  await expect(page.getByRole('heading', { name: '新增记账凭证' })).toBeVisible();

  // 记账日期落在已结账期间
  await page.getByTestId('voucher-form-date').locator('input').fill('2026-01-18');
  await fillLine(page, 0, '越界记账测试', '管理费用', 'debit', 1200);
  await fillLine(page, 1, '越界记账测试', '银行存款', 'credit', 1200);
  await expect(page.getByTestId('voucher-diff')).toContainText('借贷平衡');

  // 保存被拒：提示明确，对话框不关闭
  await page.getByTestId('voucher-save').click();
  await expect(page.getByTestId('voucher-op-msg')).toContainText('2026-01 已结账');
  await expect(page.getByRole('heading', { name: '新增记账凭证' })).toBeVisible();

  // 改成未结账期间即可保存成功
  await page.getByTestId('voucher-form-date').locator('input').fill('2026-03-18');
  await page.getByTestId('voucher-save').click();
  await expect(page.getByTestId('voucher-op-msg')).toContainText('已保存（制单）');

  expect(errors).toEqual([]);
});
