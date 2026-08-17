import { test, expect, type Page } from '@playwright/test';

/**
 * A1 凭证结构重构专项：
 * 凭证头 + 分录行 + 借贷平衡强制校验 + 状态机（制单→审核→过账→冲销）
 */

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

const gotoVouchers = async (page: Page) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/finance/vouchers');
  await expect(page.getByRole('heading', { name: '记账凭证' })).toBeVisible();
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

test('A1-1 存量分录迁移为凭证结构，统计卡与展开分录正常', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoVouchers(page);

  // 存量扁平分录已迁移成凭证（凭证头 + 分录行）
  await expect(page.getByTestId('voucher-count')).toContainText('张凭证');
  await expect(page.getByTestId('voucher-row').first()).toBeVisible();

  // 统计卡渲染（含「借贷不平」监控项）
  await expect(page.getByText('借贷不平')).toBeVisible();

  // 展开第一张凭证看到分录明细行
  const firstRow = page.getByTestId('voucher-row').first();
  await firstRow.locator('button').first().click();
  await expect(firstRow.getByText('合计')).toBeVisible();

  expect(errors).toEqual([]);
});

test('A1-2 借贷不平衡时禁止保存，一键补平后可保存', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoVouchers(page);

  await page.getByTestId('voucher-new-btn').click();
  await expect(page.getByRole('heading', { name: '新增记账凭证' })).toBeVisible();

  // 只填借方 → 必然不平衡
  await fillLine(page, 0, '采购原材料', '原材料', 'debit', 10000);

  // 不平衡告警出现，保存按钮禁用
  await expect(page.getByTestId('voucher-balance-tip')).toBeVisible();
  await expect(page.getByTestId('voucher-diff')).toContainText('差额');
  await expect(page.getByTestId('voucher-save')).toBeDisabled();

  // 第二行选科目但金额留空，仍不平衡
  const acc1 = page.getByTestId('vi-account-1').locator('input');
  await acc1.click();
  await acc1.fill('应付账款');
  await page.getByRole('option').first().click();
  await expect(page.getByTestId('voucher-save')).toBeDisabled();

  // 一键补平 → 平衡，保存启用
  await page.getByTestId('voucher-autofill').click();
  await expect(page.getByTestId('voucher-diff')).toContainText('借贷平衡');
  await expect(page.getByTestId('voucher-save')).toBeEnabled();

  await page.getByTestId('voucher-save').click();
  await expect(page.getByTestId('voucher-op-msg')).toContainText('已保存（制单）');

  expect(errors).toEqual([]);
});

test('A1-3 状态机全链路：制单→审核→过账→冲销', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoVouchers(page);

  // 制单：借 管理费用 5000 / 贷 银行存款 5000
  await page.getByTestId('voucher-new-btn').click();
  await fillLine(page, 0, '支付办公费', '管理费用', 'debit', 5000);
  await fillLine(page, 1, '银行付款', '银行存款', 'credit', 5000);
  await expect(page.getByTestId('voucher-diff')).toContainText('借贷平衡');
  await page.getByTestId('voucher-save').click();
  await expect(page.getByTestId('voucher-op-msg')).toContainText('已保存（制单）');

  // 新凭证排在最前，取其凭证号
  const newRow = page.getByTestId('voucher-row').first();
  const voucherNo = (await newRow.getByTestId('voucher-no').innerText()).trim();
  expect(voucherNo).toContain('记-');

  // 制单态：状态芯片为「制单」
  await expect(page.getByTestId(`voucher-status-${voucherNo}`)).toHaveText('制单');

  // 未审核不能过账（过账按钮不存在）
  await expect(page.getByTestId(`voucher-post-${voucherNo}`)).toHaveCount(0);

  // 审核
  await page.getByTestId(`voucher-review-${voucherNo}`).click();
  await expect(page.getByTestId('voucher-op-msg')).toContainText('审核通过');
  await expect(page.getByTestId(`voucher-status-${voucherNo}`)).toHaveText('已审核');

  // 已审核不可删除/修改（按钮不存在）
  await expect(page.getByTestId(`voucher-delete-${voucherNo}`)).toHaveCount(0);

  // 过账 → 写入总账明细
  await page.getByTestId(`voucher-post-${voucherNo}`).click();
  await expect(page.getByTestId('voucher-op-msg')).toContainText('已过账');
  await expect(page.getByTestId(`voucher-status-${voucherNo}`)).toHaveText('已过账');

  // 过账后进入 accountEntries（总账明细），报表可取数
  await page.waitForFunction(() => (window as any).__ssaStores);
  const posted = await page.evaluate(
    (no) =>
      (window as any).__ssaStores.useFinanceStore
        .getState()
        .accountEntries.filter((e: any) => e.voucherNo === no).length,
    voucherNo
  );
  expect(posted).toBe(2);

  // 冲销 → 生成红字凭证（需确认对话框）
  await page.getByTestId(`voucher-reverse-${voucherNo}`).click();
  await page.getByTestId('voucher-reverse-confirm').click();
  await expect(page.getByTestId('voucher-op-msg')).toContainText('红字凭证');
  await expect(page.getByTestId(`voucher-status-${voucherNo}`)).toHaveText('已冲销');

  // 红冲后该科目净发生额归零
  const net = await page.evaluate(() => {
    const s = (window as any).__ssaStores.useFinanceStore.getState();
    return s.accountEntries
      .filter((e: any) => e.debitAccount === '管理费用' && String(e.voucherNo).startsWith('记-'))
      .reduce((sum: number, e: any) => sum + e.amount, 0);
  });
  expect(net).toBe(0);

  expect(errors).toEqual([]);
});

test('A1-4 状态筛选与检索可用', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoVouchers(page);

  // 存量凭证均为已过账
  await page.getByTestId('voucher-filter-status').click();
  await page.getByRole('option', { name: '已过账' }).click();
  await expect(page.getByTestId('voucher-row').first()).toBeVisible();

  // 筛选「制单」应无结果（尚未手工制单）
  await page.getByTestId('voucher-filter-status').click();
  await page.getByRole('option', { name: '制单', exact: true }).click();
  await expect(page.getByText('没有符合条件的凭证。')).toBeVisible();

  // 恢复全部 + 关键字检索
  await page.getByTestId('voucher-filter-status').click();
  await page.getByRole('option', { name: '全部状态' }).click();
  await page.getByTestId('voucher-filter-kw').locator('input').fill('应付账款');
  await expect(page.getByTestId('voucher-row').first()).toBeVisible();

  expect(errors).toEqual([]);
});

test('A1-5 报表兼容：过账凭证进入科目余额表且总账平衡', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoVouchers(page);

  await page.goto('/finance/trial-balance');
  await expect(page.getByTestId('tb-total-debit')).toBeVisible();

  // 科目余额表借贷合计相等（总账平衡）
  const [d, c] = await Promise.all([
    page.getByTestId('tb-total-debit').innerText(),
    page.getByTestId('tb-total-credit').innerText(),
  ]);
  const num = (s: string) => Number(s.replace(/[^\d.]/g, ''));
  expect(num(d)).toBeCloseTo(num(c), 1);

  expect(errors).toEqual([]);
});
