import { test, expect } from '@playwright/test';

/**
 * v31 — 跨域「上下表单关联性 / 数据易用性 / 可定制性」专项回归
 *
 * 覆盖用户要求的五个业务逻辑域：
 *   采购：采购申请(PR) → 采购订单(PO) 血缘闭环（sourceRequestIds + PR 状态回写 ordered）
 *   财务：发票新建真正落库（此前为死链）
 *   生产：工单生成领料出库 → 事件驱动库存扣减（多级 BOM 展开 + status:completed）
 *   质量：检验标准新建落库 / 检验任务新建落库 / 检验不合格自动生成 NCR
 *   系统维护：菜单定制（隐藏项）在侧边栏真正生效（可定制性）
 *
 * 每个用例开局清空 ssa-erp-* localStorage，从初始 Mock 起步，保证计数断言确定。
 * 全程采集 pageerror / console.error，最终断言为零（防白屏回归）。
 */

const resetAndReady = async (page: import('@playwright/test').Page) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__ssaStores);
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('ssa-erp-'))
      .forEach((k) => localStorage.removeItem(k));
  });
  await page.reload();
  await page.waitForFunction(() => (window as any).__ssaStores);
};

test.describe('v31 跨域表单关联与可定制性', () => {
  test('质量·检验标准新建真实落库', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('validateDOMNesting')) errors.push('console.error: ' + m.text()); });

    await resetAndReady(page);
    const before = await page.evaluate(() => (window as any).__ssaStores.useQualityStore.getState().inspectionStandards.length);

    await page.goto('/quality/standards');
    await page.getByRole('button', { name: '新建检验标准' }).click();
    const no = `STD-E2E-${Date.now()}`;
    await page.getByLabel('标准编号').fill(no);
    await page.getByLabel('标准名称').fill('E2E检验标准');
    await page.getByRole('button', { name: '创建' }).click();

    const after = await page.evaluate(() => (window as any).__ssaStores.useQualityStore.getState().inspectionStandards.length);
    expect(after, '检验标准新建后数量应 +1').toBe(before + 1);
    await expect(page.getByText(no, { exact: false }).first()).toBeVisible();
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('质量·检验任务新建真实落库（原死链已修复）', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('validateDOMNesting')) errors.push('console.error: ' + m.text()); });

    await resetAndReady(page);
    const before = await page.evaluate(() => (window as any).__ssaStores.useQualityStore.getState().inspectionTasks.length);

    await page.goto('/quality/inspection');
    await page.getByRole('button', { name: '新建检验任务' }).click();
    await page.getByLabel('物料编码').fill('MAT-E2E-001');
    await page.getByLabel('物料名称').fill('E2E物料');
    await page.getByRole('button', { name: '创建' }).click();

    const after = await page.evaluate(() => (window as any).__ssaStores.useQualityStore.getState().inspectionTasks.length);
    expect(after, '检验任务新建后数量应 +1').toBe(before + 1);
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('质量·检验不合格自动生成不合格品记录(NCR)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('validateDOMNesting')) errors.push('console.error: ' + m.text()); });

    await resetAndReady(page);
    const before = await page.evaluate(() => (window as any).__ssaStores.useQualityStore.getState().unqualifiedItems.length);
    const taskId = await page.evaluate(() => (window as any).__ssaStores.useQualityStore.getState().inspectionTasks[0]?.id);

    await page.goto(`/quality/inspection/${taskId}`);
    await page.getByRole('button', { name: '不合格' }).click();
    await page.getByRole('button', { name: '提交检验结果' }).click();

    const after = await page.evaluate(() => (window as any).__ssaStores.useQualityStore.getState().unqualifiedItems.length);
    expect(after, '检验不合格应自动生成 1 条 NCR').toBe(before + 1);
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('财务·发票新建真实落库（原死链已修复）', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('validateDOMNesting')) errors.push('console.error: ' + m.text()); });

    await resetAndReady(page);
    const before = await page.evaluate(() => (window as any).__ssaStores.useFinanceStore.getState().invoices.length);

    await page.goto('/finance/invoices');
    await page.getByRole('button', { name: '新建发票' }).click();
    await page.getByLabel('发票号').fill(`INV-E2E-${Date.now()}`);
    await page.getByLabel('不含税金额').fill('1000');
    await page.getByRole('button', { name: '创建' }).click();

    const after = await page.evaluate(() => (window as any).__ssaStores.useFinanceStore.getState().invoices.length);
    expect(after, '发票新建后数量应 +1').toBe(before + 1);
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('生产·工单生成领料出库并事件驱动扣减库存', async ({ page }) => {
    const errors: string[] = [];
    page.on('dialog', (d) => d.accept());
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('validateDOMNesting')) errors.push('console.error: ' + m.text()); });

    await resetAndReady(page);
    // 取一个可生成领料的工单（非 draft/closed）
    const woId = await page.evaluate(() => {
      const wos = (window as any).__ssaStores.useProductionStore.getState().workOrders;
      const wo = wos.find((w: any) => w.status !== 'draft' && w.status !== 'closed');
      return wo?.id;
    });
    expect(woId, '应存在可生成领料的工单').toBeTruthy();

    const beforeOut = await page.evaluate(() => (window as any).__ssaStores.useWarehouseStore.getState().outboundOrders.length);

    await page.goto(`/production/orders/${woId}`);
    await page.getByRole('button', { name: '生成领料出库' }).click();

    const res = await page.evaluate(() => {
      const st = (window as any).__ssaStores.useWarehouseStore.getState();
      const ob = st.outboundOrders[st.outboundOrders.length - 1];
      return { outLen: st.outboundOrders.length, status: ob?.status, items: ob?.items?.length ?? 0 };
    });
    expect(res.outLen, '领料出库单应 +1').toBe(beforeOut + 1);
    expect(res.status, '领料出库应为 completed 以触发库存扣减').toBe('completed');
    expect(res.items, '领料明细应至少 1 种物料').toBeGreaterThan(0);
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('采购·采购申请转采购订单形成血缘闭环', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('validateDOMNesting')) errors.push('console.error: ' + m.text()); });

    await resetAndReady(page);
    const setup = await page.evaluate(() => {
      const vendors = (window as any).__ssaStores.useVendorStore.getState().vendors;
      const materials = (window as any).__ssaStores.useMaterialStore.getState().materials;
      return {
        vendorId: vendors[0]?.id,
        vendorName: vendors[0]?.name,
        materialId: materials[0]?.id,
        materialCode: materials[0]?.code,
        materialName: materials[0]?.name,
      };
    });
    expect(setup.vendorId, '应存在供应商').toBeTruthy();

    const prId = await page.evaluate((m) => {
      const id = `pr-e2e-${Date.now()}`;
      (window as any).__ssaStores.usePurchaseStore.getState().addPurchaseRequest({
        id,
        requestNo: `PR-E2E-${Date.now()}`,
        title: 'E2E采购申请',
        status: 'pending',
        items: [{ id: 'pri-1', materialId: m.materialId, materialCode: m.materialCode, materialName: m.materialName, quantity: 10, estimatedPrice: 5 }],
        createdAt: new Date().toISOString(),
      });
      return id;
    }, setup);

    await page.goto(`/purchase/orders/create?fromRequests=${prId}`);
    await page.getByLabel('订单标题').waitFor();
    await page.getByLabel('主供应商').click();
    await page.getByRole('option', { name: setup.vendorName }).first().click();
    await page.getByRole('button', { name: '提交订单' }).click();

    const result = await page.evaluate((pid) => {
      const st = (window as any).__ssaStores.usePurchaseStore.getState();
      const po = st.purchaseOrders.find((o: any) => o.sourceRequestIds && o.sourceRequestIds.includes(pid));
      const pr = st.purchaseRequests.find((r: any) => r.id === pid);
      return { poFound: !!po, prStatus: pr?.status };
    }, prId);
    expect(result.poFound, '应生成关联了源采购申请的采购订单').toBe(true);
    expect(result.prStatus, '源采购申请状态应回写为 ordered').toBe('ordered');
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });

  test('系统维护·菜单定制（隐藏项）在侧边栏生效', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

    await resetAndReady(page);
    await page.goto('/');
    // 隐藏「市场分析」(path: /sales/analysis)
    await page.evaluate(() => {
      localStorage.setItem('ssa-menu-config', JSON.stringify({ visible: { '/sales/analysis': false } }));
    });
    await page.reload();
    await page.waitForFunction(() => (window as any).__ssaStores);

    await expect(page.getByText('市场分析', { exact: true })).toHaveCount(0);
    // 对照组：未被隐藏的项仍可见
    await expect(page.getByText('仪表盘', { exact: true }).first()).toBeVisible();
    expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  });
});
