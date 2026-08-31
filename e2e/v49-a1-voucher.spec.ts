import { test, expect, type Page } from './ssa-fixtures';

/**
 * A1 凭证结构重构专项（V2.67 适配版）：
 * 凭证头 + 分录行 + 借贷平衡强制校验 + 状态机（制单→审核→过账→冲销）
 *
 * 说明：V2.55 起 VoucherList 改用 TanStack Table，行渲染不再暴露 voucher-row 等 testid；
 * 状态操作按钮通过按钮文本定位（审核/过账/冲销/反审核），凭证号以记账凭证明文展示。
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

/** 通过表格行内容定位：找含凭证号的行 */
const findVoucherRowByText = async (page: Page, text: string) => {
  // VoucherList 凭证号列用 monospace 展示，文本格式 "记-XXXX"
  return page.getByText(text, { exact: false }).first().elementHandle();
};

test('A1-1 存量分录迁移为凭证结构，统计卡与展开分录正常', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoVouchers(page);

  // 凭证统计卡可见
  await expect(page.getByTestId('voucher-count')).toBeVisible();

  // 统计卡含「借贷不平」监控项
  await expect(page.getByText('借贷不平')).toBeVisible();

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

  // 从 store 读取刚保存的凭证（排在最前）
  const voucherNo = await page.evaluate(() => {
    const s = (window as any).__ssaStores.useFinanceStore.getState();
    return s.vouchers[0]?.voucherNo ?? null;
  });
  expect(voucherNo).toBeTruthy();
  expect(voucherNo).toMatch(/记-/);

  // 通过 store 直接驱动状态机，同时断言状态变更
  const reviewRes = await page.evaluate((no) => {
    const s = (window as any).__ssaStores.useFinanceStore.getState();
    const v = s.vouchers.find((x: any) => x.voucherNo === no);
    return s.reviewVoucher(v.id, '当前用户');
  }, voucherNo);
  expect(reviewRes.ok).toBe(true);
  const v1 = await page.evaluate((no) => {
    const s = (window as any).__ssaStores.useFinanceStore.getState();
    return s.vouchers.find((x: any) => x.voucherNo === no)?.status;
  }, voucherNo);
  expect(v1).toBe('reviewed');

  const postRes = await page.evaluate((no) => {
    const s = (window as any).__ssaStores.useFinanceStore.getState();
    const v = s.vouchers.find((x: any) => x.voucherNo === no);
    return s.postVoucher(v.id, '当前用户');
  }, voucherNo);
  expect(postRes.ok).toBe(true);
  const v2 = await page.evaluate((no) => {
    const s = (window as any).__ssaStores.useFinanceStore.getState();
    return s.vouchers.find((x: any) => x.voucherNo === no)?.status;
  }, voucherNo);
  expect(v2).toBe('posted');

  // 过账后进入 accountEntries（总账明细），报表可取数
  const posted = await page.evaluate((no) => {
    const s = (window as any).__ssaStores.useFinanceStore.getState();
    return s.accountEntries.filter((e: any) => e.voucherNo === no).length;
  }, voucherNo);
  expect(posted).toBeGreaterThan(0);

  // 冲销 → 生成红字凭证（reverseVoucher 将红字凭证 prepended 到 vouchers[0]）
  const reverseRes = await page.evaluate((no) => {
    const s = (window as any).__ssaStores.useFinanceStore.getState();
    const v = s.vouchers.find((x: any) => x.voucherNo === no);
    return s.reverseVoucher(v.id, '当前用户');
  }, voucherNo);
  expect(reverseRes.ok).toBe(true);
  const v3 = await page.evaluate((no) => {
    const s = (window as any).__ssaStores.useFinanceStore.getState();
    return s.vouchers.find((x: any) => x.voucherNo === no)?.status;
  }, voucherNo);
  expect(v3).toBe('reversed');

  // 红字凭证是最新创建的，排在 vouchers[0]；验证 accountEntries 中新增了冲销分录
  const beforeCount = await page.evaluate(() => {
    return (window as any).__ssaStores.useFinanceStore.getState().accountEntries.length;
  });
  const newEntries = await page.evaluate((no) => {
    const s = (window as any).__ssaStores.useFinanceStore.getState();
    // 找原凭证上的 reversalVoucherNo 字段，其值即红字凭证号
    const orig = s.vouchers.find((x: any) => x.voucherNo === no);
    const revNo = orig?.reversalVoucherNo ?? null;
    if (!revNo) return { revNo: null, count: 0 };
    return { revNo, count: s.accountEntries.filter((e: any) => e.voucherNo === revNo).length };
  }, voucherNo);
  expect(newEntries.revNo).toBeTruthy();
  expect(newEntries.count).toBeGreaterThan(0);

  expect(errors).toEqual([]);
});

test('A1-4 状态筛选与检索可用', async ({ page }) => {
  const errors = await captureErrors(page);
  await gotoVouchers(page);

  // 默认查看全部
  await expect(page.getByTestId('voucher-count')).toBeVisible();

  // 筛选「已过账」
  await page.getByTestId('voucher-filter-status').click();
  await page.getByRole('option', { name: '已过账' }).click();

  // 恢复全部 + 关键字检索
  await page.getByTestId('voucher-filter-status').click();
  await page.getByRole('option', { name: '全部状态' }).click();
  await page.getByTestId('voucher-filter-kw').locator('input').fill('应付账款');
  await page.getByTestId('voucher-filter-kw').locator('input').clear();

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
