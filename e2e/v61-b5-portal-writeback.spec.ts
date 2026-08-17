import { test, expect, type Page } from '@playwright/test';

/**
 * B5 门户回写主流程专项（P1 流程闭环第四战役）：
 *   B5-1 订单确认回写主系统（门户确认 → PO 状态推进 vendorConfirmed）+ 幂等
 *   B5-2 报价回写主系统（门户提交报价 → priceStore 写入 + 询价单状态 quotation_received）+ 幂等
 *   B5-3 供应商资料回写主系统（门户保存 → vendor.profilePending 待审区；甲方审核并入主数据）
 *   B5-4 统一身份源（门户登录 code V002 → 主数据 ven-002，消除硬编码 ven-001）
 *   B5-5 门户 UI 全链路无白屏
 */

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

/** 清空持久化并打开应用，确保 store 回到种子态 */
const bootstrap = async (page: Page, path = '/') => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto(path);
  await page.waitForFunction(() => (window as any).__ssaStores);
};

/** 模拟门户登录（写 sessionStorage.vendorPortalUser），并重载到目标门户页 */
const portalGoto = async (page: Page, code: string, path: string) => {
  const names: Record<string, string> = {
    V001: '钢铁联合集团',
    V002: '华东铝业有限公司',
    'V-NEW': '新申请演示账号',
  };
  await page.goto('/');
  await page.evaluate(
    (args) => {
      sessionStorage.setItem(
        'vendorPortalUser',
        JSON.stringify({ code: args.code, name: args.name, role: '正式供应商' }),
      );
    },
    { code, name: names[code] || names.V001 },
  );
  await page.evaluate(() => localStorage.clear());
  await page.goto(path);
  await page.waitForFunction(() => (window as any).__ssaStores);
};

/** DataTable 行操作通过「更多」菜单的「查看」触发（非行点击） */
const openRowByMenu = async (page: Page, marker: string) => {
  const row = page.locator('tr', { hasText: marker }).first();
  await row.getByRole('button').first().click();
  await page.getByRole('menuitem', { name: '查看', exact: true }).click();
};

// ═══════════════════════════════════════════════════════════════
test('B5-1a 订单确认回写主系统：PO 状态推进 vendorConfirmed + 重复确认幂等无副作用', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page);

  const before = await page.evaluate(() => {
    const po = (window as any).__ssaStores.usePurchaseStore.getState().purchaseOrders.find((o: any) => o.id === 'po-002');
    return { status: po?.status, confirmedAt: po?.confirmedAt };
  });
  expect(before.status).not.toBe('vendorConfirmed'); // 种子未确认

  // 第一次确认 → 回写主系统
  const first = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const ok = S.usePurchaseStore.getState().confirmOrderByVendor('po-002', {
      vendorId: 'ven-001',
      operator: '上海宝钢钢铁贸易有限公司',
      note: '按时交货',
    });
    const po = S.usePurchaseStore.getState().purchaseOrders.find((o: any) => o.id === 'po-002');
    return { ok, status: po.status, confirmedBy: po.confirmedBy, confirmedAt: po.confirmedAt };
  });
  expect(first.ok).toBe(true);
  expect(first.status).toBe('vendorConfirmed');
  expect(first.confirmedBy).toBe('上海宝钢钢铁贸易有限公司');
  expect(first.confirmedAt).toBeTruthy();

  // 第二次确认（幂等：应为已处理成功，状态不再变化、不报错）
  const second = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const ok = S.usePurchaseStore.getState().confirmOrderByVendor('po-002', {
      vendorId: 'ven-001',
      operator: '上海宝钢钢铁贸易有限公司',
    });
    const po = S.usePurchaseStore.getState().purchaseOrders.find((o: any) => o.id === 'po-002');
    return { ok, status: po.status, confirmedAt: po.confirmedAt };
  });
  expect(second.ok).toBe(true); // 视为已处理，避免门户重复提交报错
  expect(second.status).toBe('vendorConfirmed'); // 终态不变
  expect(second.confirmedAt).toBe(first.confirmedAt); // 无重复回写

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B5-1b 门户 UI 确认订单 → 回写主系统 PO（对话框点击「确认订单」）', async ({ page }) => {
  const errors = await captureErrors(page);
  await portalGoto(page, 'V001', '/vendor-portal/orders/confirm');

  // 待确认的 voc-002（ven-001 / po-002）在列表中可见
  await expect(page.locator('tr', { hasText: 'VOC20240508001' }).first()).toBeVisible();
  await openRowByMenu(page, 'VOC20240508001');

  // 对话框出现 → 点击「确认订单」
  await page.getByRole('button', { name: '确认订单', exact: true }).click();

  // 主系统 PO 被回写为 vendorConfirmed
  const po = await page.evaluate(() => {
    const po = (window as any).__ssaStores.usePurchaseStore.getState().purchaseOrders.find((o: any) => o.id === 'po-002');
    return { status: po.status };
  });
  expect(po.status).toBe('vendorConfirmed');

  // 门户确认记录本身也置为 confirmed
  const voc = await page.evaluate(() => {
    const v = (window as any).__ssaStores.useFlowStore.getState().vendorOrderConfirms.find((x: any) => x.id === 'voc-002');
    return { status: v.status };
  });
  expect(voc.status).toBe('confirmed');

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B5-2 门户报价回写主系统 + 重复提交幂等（UI 全链路）', async ({ page }) => {
  const errors = await captureErrors(page);
  await portalGoto(page, 'V001', '/vendor-portal/quotation');

  await expect(page.getByText('供应商报价管理').first()).toBeVisible();

  // —— 第一次提交：待报价列表中的 IQ20240508001（ven-001 / inq-001）——
  await openRowByMenu(page, 'IQ20240508001');
  await page.getByLabel('报价有效期至').fill('2026-12-31');
  await page.getByRole('button', { name: '提交报价', exact: true }).click();

  // 成功提示可见
  await expect(page.getByTestId('quotation-submit-result')).toBeVisible();

  const afterFirst = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const qs = S.usePriceStore.getState().vendorQuotations.filter(
      (q: any) => q.inquiryId === 'inq-001' && q.vendorId === 'ven-001',
    );
    const inq = S.usePriceStore.getState().priceInquiries.find((x: any) => x.id === 'inq-001');
    return {
      count: qs.length,
      status: inq.status,
      vendorQuotationId: inq.vendorQuotationId,
      quotationNo: qs[0]?.quotationNo,
    };
  });
  expect(afterFirst.count).toBe(1); // 仅一条
  expect(afterFirst.status).toBe('quotation_received'); // 询价单状态推进
  expect(afterFirst.vendorQuotationId).toBeTruthy(); // 回写关联报价单号

  // —— 重复提交（幂等）：把询价单重置回 published 使其在待报价列表再次出现 ——
  await page.evaluate(() => {
    (window as any).__ssaStores.usePriceStore.getState().updatePriceInquiry('inq-001', { status: 'published' });
  });
  // 切回「待报价」Tab 触发刷新
  await page.getByRole('tab').first().click();
  await openRowByMenu(page, 'IQ20240508001');
  await page.getByLabel('报价有效期至').fill('2026-12-31');
  await page.getByRole('button', { name: '提交报价', exact: true }).click();

  const afterSecond = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const qs = S.usePriceStore.getState().vendorQuotations.filter(
      (q: any) => q.inquiryId === 'inq-001' && q.vendorId === 'ven-001',
    );
    return { count: qs.length, no: qs[0]?.quotationNo };
  });
  expect(afterSecond.count).toBe(1); // 仍仅一条（更新而非新增）
  expect(afterSecond.no).toBe(afterFirst.quotationNo); // 沿用同一报价单号

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B5-3 门户资料回写主系统待审区 + 甲方审核并入主数据（双向闭环）', async ({ page }) => {
  const errors = await captureErrors(page);
  await portalGoto(page, 'V001', '/vendor-portal/profile');

  await expect(page.getByText('供应商资料管理').first()).toBeVisible();

  // 编辑并修改联系电话
  await page.getByRole('button', { name: '编辑资料', exact: true }).click();
  const newPhone = '13900000099';
  await page.getByLabel('联系电话').fill(newPhone);
  await page.getByRole('button', { name: '保存', exact: true }).click();

  // 门户待审横幅可见
  await expect(page.getByTestId('profile-pending-banner')).toBeVisible();

  // 主系统：ven-001 写入 profilePending 待审区（不直接污染主档）
  const pending = await page.evaluate(() => {
    const v = (window as any).__ssaStores.useVendorStore.getState().vendors.find((x: any) => x.id === 'ven-001');
    return {
      profilePendingAt: v.profilePendingAt,
      profilePendingBy: v.profilePendingBy,
      pendingPhone: v.profilePending?.contactPhone,
      masterPhone: v.phone, // 主档电话未被直接覆盖
    };
  });
  expect(pending.profilePendingAt).toBeTruthy();
  expect(pending.profilePendingBy).toBeTruthy();
  expect(pending.pendingPhone).toBe(newPhone);
  expect(pending.masterPhone).not.toBe(newPhone); // 治理：先待审，不覆主档

  // 甲方端：供应商列表出现待审提醒
  await page.goto('/vendor/list');
  await page.waitForFunction(() => (window as any).__ssaStores);
  const alert = page.getByTestId('vendor-profile-pending-alert');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText('上海宝钢钢铁贸易有限公司');

  // 审核通过并并入主数据
  await page.getByTestId('approve-profile-ven-001').click();

  const merged = await page.evaluate(() => {
    const v = (window as any).__ssaStores.useVendorStore.getState().vendors.find((x: any) => x.id === 'ven-001');
    return {
      profilePendingAt: v.profilePendingAt,
      masterPhone: v.phone,
    };
  });
  expect(merged.profilePendingAt).toBeFalsy(); // 待审区清空
  expect(merged.masterPhone).toBe(newPhone); // 待审字段并入主档

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B5-4a 统一身份源：登录 V002 → 质量管理页显示主数据 ven-002 名称', async ({ page }) => {
  const errors = await captureErrors(page);
  await portalGoto(page, 'V002', '/vendor-portal/quality/issues');

  await expect(page.getByText('质量管理').first()).toBeVisible();

  // 期望名称取自主数据 ven-002（非硬编码 ven-001 的「上海宝钢」）
  const expectedName = await page.evaluate(
    () => (window as any).__ssaStores.useVendorStore.getState().vendors.find((v: any) => v.id === 'ven-002')?.name,
  );
  expect(expectedName).toBe('浙江温州紧固件有限公司');

  const chip = page.getByTestId('portal-current-vendor');
  await expect(chip).toBeVisible();
  await expect(chip).toHaveText(expectedName);
  await expect(chip).not.toHaveText('上海宝钢钢铁贸易有限公司');

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B5-4b 统一身份源：登录 V002 → 财务管理页同样显示主数据 ven-002 名称', async ({ page }) => {
  const errors = await captureErrors(page);
  await portalGoto(page, 'V002', '/vendor-portal/finance/statements');

  await expect(page.getByText('财务管理').first()).toBeVisible();

  const expectedName = await page.evaluate(
    () => (window as any).__ssaStores.useVendorStore.getState().vendors.find((v: any) => v.id === 'ven-002')?.name,
  );
  const chip = page.getByTestId('portal-current-vendor');
  await expect(chip).toBeVisible();
  await expect(chip).toHaveText(expectedName);

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B5-5 门户 UI 全链路：各门户页均可打开且无运行时白屏', async ({ page }) => {
  const errors = await captureErrors(page);
  await portalGoto(page, 'V001', '/vendor-portal');

  const routes = [
    '/vendor-portal',
    '/vendor-portal/orders/confirm',
    '/vendor-portal/quotation',
    '/vendor-portal/profile',
    '/vendor-portal/quality/issues',
    '/vendor-portal/finance/statements',
  ];

  for (const r of routes) {
    await page.goto(r);
    await page.waitForFunction(() => (window as any).__ssaStores);
    // 页面存在可见标题，证明整页未白屏
    await expect(page.locator('h1, h2, h3, h4, h5, h6').first()).toBeVisible();
  }

  expect(errors).toEqual([]);
});
