import { test, expect, type Page } from './ssa-fixtures';

/**
 * B6 价目表回写 + 供应商黑名单硬拦截专项（P1 流程闭环第六战役，目标 V2.41）：
 *   B6-1 采购订单选黑名单供应商 → 预警横幅 + 暂存/提交均被硬拦截不落库
 *   B6-2 询价发布含黑名单供应商 → 选项过滤 + 发布硬拦截不落库
 *   B6-3 供应商门户黑名单身份报价 → 横幅 + 提交被拦截不落库
 *   B6-4 非黑名单供应商采购订单正常落库（对照，验证无误拦）
 *   B6-5 价格审批通过 → 价目表项 writtenBack=true 且回写物料主数据 standardPrice + getActivePrice 命中
 *   B6-6 采购订单行项目选「供应商+物料」自动带出价目表价并展示「价目表价」Chip
 */

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

const bootstrap = async (page: Page, path = '/') => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto(path);
  await page.waitForFunction(() => (window as any).__ssaStores);
};

/** 模拟门户登录（写 sessionStorage.vendorPortalUser），重载到目标门户页 */
const portalGoto = async (page: Page, code: string, path: string) => {
  const names: Record<string, string> = {
    V001: '钢铁联合集团',
    V002: '华东铝业有限公司',
    'V-NEW': '新申请演示账号',
    'V-BLACK': '辽宁沈阳五金机电有限公司',
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

// ═══════════════════════════════════════════════════════════════
test('B6-1 采购订单选黑名单供应商(ven-011)：预警横幅 + 提交被硬拦截不落库', async ({ page }) => {
  const errors = await captureErrors(page);
  const alerts: string[] = [];
  page.on('dialog', async (d) => {
    alerts.push(d.message());
    await d.dismiss();
  });

  await bootstrap(page, '/purchase/orders/create');
  await expect(page.getByRole('heading', { name: '新建采购订单' })).toBeVisible();

  // 选黑名单供应商 ven-011（辽宁沈阳五金机电有限公司）
  await page.getByLabel('订单标题').fill('B6-1 黑名单拦截测试');
  const vendor = page.getByRole('combobox', { name: '主供应商' });
  await vendor.fill('沈阳');
  await page.getByRole('option').first().click();

  // 加一行物料
  await page.getByRole('button', { name: '添加物料' }).click();
  const mat = page.getByPlaceholder('输入物料名称');
  await mat.click();
  await mat.fill('钢板');
  await page.getByRole('option').first().click();
  await page.locator('[data-testid^="po-cell-unitPrice-"]').fill('1000');

  // 预警横幅出现
  await expect(page.getByTestId('po-vendor-blacklist')).toBeVisible();
  await expect(page.getByTestId('po-vendor-blacklist')).toContainText('黑名单');

  const before = await page.evaluate(
    () => (window as any).__ssaStores.usePurchaseStore.getState().purchaseOrders.length,
  );

  // 提交订单 → 应被拦截（不落库）
  await page.getByRole('button', { name: '提交订单', exact: true }).click();

  await expect.poll(() => alerts.length, { timeout: 5000 }).toBeGreaterThan(0);
  expect(alerts[0]).toContain('黑名单');

  const after = await page.evaluate(
    () => (window as any).__ssaStores.usePurchaseStore.getState().purchaseOrders.length,
  );
  expect(after).toBe(before); // 未落库
  const blacklistedPO = await page.evaluate(
    () => (window as any).__ssaStores.usePurchaseStore.getState().purchaseOrders.filter((o: any) => o.vendorId === 'ven-011').length,
  );
  expect(blacklistedPO).toBe(0);

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B6-2 询价发布含黑名单供应商：选项已过滤 + 选中后被拉黑则硬拦截不落库', async ({ page }) => {
  const errors = await captureErrors(page);
  const alerts: string[] = [];
  page.on('dialog', async (d) => {
    alerts.push(d.message());
    await d.dismiss();
  });

  await bootstrap(page, '/price/inquiry/create');
  await expect(page.getByRole('heading', { name: '新建询价单' })).toBeVisible();

  // 过滤提示：已按黑名单屏蔽至少 1 家
  await expect(page.getByTestId('inquiry-blacklist-hint')).toBeVisible();
  await expect(page.getByTestId('inquiry-blacklist-hint')).toContainText('已按黑名单规则屏蔽');

  // 黑名单供应商不可选为询价对象
  const vendor = page.getByLabel('目标供应商');
  await vendor.fill('沈阳');
  await expect(page.getByRole('option', { name: /辽宁沈阳五金机电有限公司/ })).toHaveCount(0);

  // 选一个正常供应商 ven-001
  await vendor.fill('宝钢');
  await page.getByRole('option').first().click();

  // 通过「新增物料」来源加一行物料
  await page.locator('.MuiFormControl-root', { hasText: '选择需求来源' }).locator('.MuiSelect-select').click();
  await page.getByRole('option', { name: /新增物料/ }).click();
  await page.locator('table input[type="checkbox"]').first().check();
  await page.getByRole('button', { name: /批量加入明细/ }).click();
  await expect(page.getByText('物料明细')).toBeVisible();

  await page.getByLabel('询价标题').fill('B6-2 询价黑名单拦截测试');
  await page.getByLabel('报价截止日期').fill('2026-12-31');

  // 选中供应商后再把 ven-001 拉黑（模拟"选完才被拉黑"的时间差）
  await page.evaluate(() =>
    (window as any).__ssaStores.useVendorStore.getState().setVendorBlacklist('ven-001', true, '测试拉黑'),
  );

  const before = await page.evaluate(
    () => (window as any).__ssaStores.usePriceStore.getState().priceInquiries.length,
  );

  await page.getByRole('button', { name: '发布询价', exact: true }).click();

  await expect.poll(() => alerts.length, { timeout: 5000 }).toBeGreaterThan(0);
  expect(alerts[0]).toContain('黑名单');

  const after = await page.evaluate(
    () => (window as any).__ssaStores.usePriceStore.getState().priceInquiries.length,
  );
  expect(after).toBe(before); // 未落库

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B6-3 门户黑名单身份(ven-011)报价被拦截：横幅 + 提交不落库', async ({ page }) => {
  const errors = await captureErrors(page);
  const alerts: string[] = [];
  page.on('dialog', async (d) => {
    alerts.push(d.message());
    await d.dismiss();
  });

  // 登录为 V-BLACK → ven-011（种子黑名单供应商）
  await portalGoto(page, 'V-BLACK', '/vendor-portal/quotation');

  // 横幅可见
  await expect(page.getByTestId('portal-blacklist-banner')).toBeVisible();
  await expect(page.getByTestId('portal-blacklist-banner')).toContainText('黑名单');

  // 为 ven-011 注入一张待报价询价单，打开报价对话框尝试提交
  await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    S.usePriceStore.getState().addPriceInquiry({
      id: 'inq-b6-bl',
      inquiryNo: 'INQ-B6-BL',
      title: 'B6 黑名单报价测试',
      status: 'published',
      deadline: '2026-12-31',
      currency: 'CNY',
      targetVendorIds: ['ven-011'],
      items: [
        {
          id: 'bi1',
          materialId: 'mat-001',
          materialCode: 'M001',
          materialName: '钢板Q235B',
          specification: '6mm',
          unit: '张',
          quantity: 10,
          estimatedPrice: 1000,
          estimatedAmount: 10000,
        },
      ],
      totalEstimatedAmount: 10000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'e2e',
      updatedBy: 'e2e',
    });
  });

  // 待报价列表出现该单据 → 通过「更多」菜单「查看」打开报价
  const row = page.locator('tr', { hasText: 'INQ-B6-BL' }).first();
  await row.getByRole('button').first().click();
  await page.getByRole('menuitem', { name: '查看', exact: true }).click();

  // 填报价有效期并提交
  await page.getByLabel('报价有效期至').fill('2026-12-31');
  await page.getByRole('button', { name: '提交报价', exact: true }).click();

  await expect.poll(() => alerts.length, { timeout: 5000 }).toBeGreaterThan(0);
  expect(alerts[0]).toContain('黑名单');

  // 报价未落库
  const count = await page.evaluate(
    () => (window as any).__ssaStores.usePriceStore.getState().vendorQuotations.filter((q: any) => q.vendorId === 'ven-011').length,
  );
  expect(count).toBe(0);

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B6-4 非黑名单供应商(ven-003)采购订单正常落库（对照，无误拦）', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page, '/purchase/orders/create');
  await expect(page.getByRole('heading', { name: '新建采购订单' })).toBeVisible();

  await page.getByLabel('订单标题').fill('B6-4 正常落库对照');
  const vendor = page.getByRole('combobox', { name: '主供应商' });
  await vendor.fill('苏州');
  await page.getByRole('option').first().click();

  await page.getByRole('button', { name: '添加物料' }).click();
  const mat = page.getByPlaceholder('输入物料名称');
  await mat.click();
  await mat.fill('钢板');
  await page.getByRole('option').first().click();
  await page.locator('[data-testid^="po-cell-unitPrice-"]').fill('1000');

  // 正常供应商不展示黑名单横幅
  await expect(page.getByTestId('po-vendor-blacklist')).toHaveCount(0);

  const before = await page.evaluate(
    () => (window as any).__ssaStores.usePurchaseStore.getState().purchaseOrders.length,
  );
  await page.getByRole('button', { name: '提交订单', exact: true }).click();
  await page.waitForFunction(
    (b) => (window as any).__ssaStores.usePurchaseStore.getState().purchaseOrders.length > b,
    before,
    { timeout: 5000 },
  );
  const after = await page.evaluate(
    () => (window as any).__ssaStores.usePurchaseStore.getState().purchaseOrders.length,
  );
  expect(after).toBe(before + 1);

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B6-5 价格审批(pa-001)通过 → 价目表项 writtenBack=true + 回写物料标准价 + getActivePrice 命中', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page);

  // 审批前：种子 pl-001 尚未回写；mat-001 标准价待回写
  const before = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const pl = S.usePriceStore.getState().priceList.find((p: any) => p.id === 'pl-001');
    return { plWrittenBack: !!pl?.writtenBack, matStd: S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-001')?.standardPrice };
  });
  expect(before.plWrittenBack).toBe(false); // 审批前未回写

  // 种子 pa-001 已是 approved；先重置为 pending，再审批，验证"审批通过即回写主数据"
  await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    S.usePriceStore.getState().updatePriceApproval('pa-001', { status: 'pending' });
  });

  // 审批 pa-001（重置为 pending 后）→ 事件驱动回写
  await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    S.usePriceStore.getState().approvePriceApproval('pa-001', {
      id: 'par-b6',
      approver: 'e2e',
      action: 'approve',
      comments: 'B6 自动审批',
      operatedAt: now,
      nodeName: '采购经理审批',
    });
  });

  const after = await page.evaluate(() => {
    const S = (window as any).__ssaStores;
    const pl = S.usePriceStore.getState().priceList.find((p: any) => p.id === 'pl-001');
    const mat = S.useMaterialStore.getState().materials.find((m: any) => m.id === 'mat-001');
    const active = S.usePriceStore.getState().getActivePrice('ven-003', 'mat-001');
    return {
      plWrittenBack: !!pl?.writtenBack,
      plSyncedAt: pl?.syncedAt,
      plErpId: pl?.erpPriceId,
      matStd: mat?.standardPrice,
      activeHit: !!active && active.status === 'active',
    };
  });

  expect(after.plWrittenBack).toBe(true); // 价目表项已标记回写
  expect(after.plSyncedAt).toBeTruthy();
  expect(after.plErpId).toBeTruthy();
  expect(after.matStd).toBe(4050); // 回写物料主数据标准价（pa-001 mat-001 单价）
  expect(after.activeHit).toBe(true); // getActivePrice 命中有效价目表价

  expect(errors).toEqual([]);
});

// ═══════════════════════════════════════════════════════════════
test('B6-6 采购订单行项目选「供应商+物料」自动带出价目表价并展示「价目表价」Chip', async ({ page }) => {
  const errors = await captureErrors(page);
  await bootstrap(page, '/purchase/orders/create');
  await expect(page.getByRole('heading', { name: '新建采购订单' })).toBeVisible();

  await page.getByLabel('订单标题').fill('B6-6 价目表联动');
  // 供应商选 ven-003（江苏苏州五金批发有限公司），与种子价目表 pl-001 匹配
  const vendor = page.getByRole('combobox', { name: '主供应商' });
  await vendor.fill('苏州');
  await page.getByRole('option').first().click();

  // 物料选 mat-001（钢板Q235B）→ 自动带出价目表价 pl-001（ven-003+mat-001）
  await page.getByRole('button', { name: '添加物料' }).click();
  const mat = page.getByPlaceholder('输入物料名称');
  await mat.click();
  await mat.fill('钢板');
  await page.getByRole('option').first().click();

  // 价目表价 Chip 可见（sourceApprovalNo = PA20240517001）
  const chip = page.getByText(/价目表 PA20240517001/).first();
  await expect(chip).toBeVisible();
  await expect(chip).toContainText('PA20240517001');

  // 单价应被价目表价自动带出（pl-001 单价 4050）
  await expect(page.locator('[data-testid^="po-cell-unitPrice-"]').first()).toHaveValue('4050');

  expect(errors).toEqual([]);
});
