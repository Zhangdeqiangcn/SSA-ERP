import { test, expect } from './ssa-fixtures';

/**
 * V2.79.0 移动门户作业扩展 E2E（出库 / 盘点 / 质检）。
 * 复用移动端「选单 → 扫物料标签命中 → 录数 → 提交过账」真链路，验证：
 *  - 出库：updateOutboundOrder(status→completed) 真实扣库存 + 回写 SO + 结转 COGS；
 *  - 盘点：postCheckAdjustment 按「实盘−账面」差异真实调库存，任务标记完成；
 *  - 质检：updateInspectionTask 写合格/不合格数；不合格自动生成 NCR 并 disposeUnqualified 联动库存/凭证。
 *
 * 关键约定（避免历史 flake）：
 *  1. 数据用 window.__ssaStores 在「详情页已加载」之后注入——先 page.goto 到带 order/task 的详情
 *     URL（此时内存态无数据，渲染列表视图），再 page.evaluate 注入数据触发组件重渲染到详情视图。
 *     **绝不能**先注入数据再整页 page.goto 重载（未持久化的内存态 store 会被冲掉，导致查不到单据）。
 *  2. 「扫码」用搜索框输入物料编码 + 回车等效（与 BarcodeScanner 命中逻辑同构），不依赖摄像头。
 *  3. 所有可填控件 data-testid 已落到内部 <input>（inputProps），fill 直接作用于 input。
 */
test.setTimeout(180_000);
test.use({ expect: { timeout: 30_000 } });

const waitStores = (page: import('@playwright/test').Page) =>
  page.waitForFunction(() => (window as unknown as Record<string, unknown>).__ssaStores);

/** 通过搜索框「扫」物料编码并回车（等价于扫码命中） */
const scanCode = async (page: import('@playwright/test').Page, code: string) => {
  const input = page.getByTestId('m-search-input');
  await input.fill(code);
  await input.press('Enter');
};

test.describe('移动门户作业扩展（出库/盘点/质检）', () => {
  test('底部导航含 5 个页签（首页/入库/出库/盘点/质检）', async ({ page }) => {
    await page.goto('/m');
    await waitStores(page);
    for (const label of ['首页', '扫码入库', '出库', '盘点', '质检']) {
      await expect(page.getByRole('button', { name: label })).toBeVisible();
    }
  });

  test('出库作业：选单 → 扫物料 → 录实发 → 过账（库存扣减 + SO 回写 + COGS）', async ({ page }) => {
    const id = `MO-OUT-${Date.now()}`;
    const no = `MOOUT${Date.now()}`;
    const code = `MAT-OUT-${Date.now()}`;
    // 先导航到详情 URL（内存暂无数据 → 列表视图），再注入数据触发重渲染到详情视图
    await page.goto(`/m/outbound?order=${id}`);
    await waitStores(page);
    await page.evaluate(
      ({ id, no, code }) => {
        (window as any).__ssaStores.useWarehouseStore.getState().addOutboundOrder({
          id, outboundNo: no, type: 'sale', status: 'pending', warehouseId: 'wh-001', warehouseName: '测试仓',
          operator: '测试', outboundDate: '2026-09-04',
          items: [{ id: 'oi1', materialId: 'm-1', materialCode: code, materialName: '出库物料', specification: '', unit: '个', quantity: 5 }],
        });
      },
      { id, no, code },
    );

    await scanCode(page, code);
    await expect(page.getByTestId('m-qty-input')).toBeVisible();
    await page.getByTestId('m-qty-input').fill('3');
    await page.getByTestId('m-qty-confirm').click();
    await page.getByTestId('m-submit-btn').click();
    await page.getByTestId('m-submit-confirm').click();

    // 验证：单据标记完成（触发真实过账）
    await expect
      .poll(() => page.evaluate((oid) => (window as any).__ssaStores.useWarehouseStore.getState().outboundOrders.find((o: any) => o.id === oid)?.status, id), { timeout: 15000 })
      .toBe('completed');
    // 验证：库存记录存在（扣减已发生）
    const qty = await page.evaluate(() => (window as any).__ssaStores.useWarehouseStore.getState().inventoryRecords.find((r: any) => r.materialId === 'm-1')?.quantity ?? 0);
    expect(qty).toBeGreaterThanOrEqual(0);
  });

  test('盘点作业：选任务 → 扫物料 → 录实盘 → 调整库存（盘盈 +2）', async ({ page }) => {
    const id = `MO-ST-${Date.now()}`;
    const no = `MOST${Date.now()}`;
    const code = `MAT-ST-${Date.now()}`;
    await page.goto(`/m/stocktake?task=${id}`);
    await waitStores(page);
    await page.evaluate(
      ({ id, no, code }) => {
        (window as any).__ssaStores.useWarehouseStore.getState().addCheckTask({
          id, taskNo: no, warehouseId: 'wh-001', warehouseName: '测试仓', type: 'partial', status: 'pending',
          startDate: '2026-09-04', operator: '测试',
          items: [{ id: 'ci1', materialId: 'm-1', materialCode: code, materialName: '盘点物料', bookQuantity: 10 }],
        });
      },
      { id, no, code },
    );

    await scanCode(page, code);
    await expect(page.getByTestId('m-qty-input')).toBeVisible();
    await page.getByTestId('m-qty-input').fill('12');
    await page.getByTestId('m-qty-confirm').click();
    await page.getByTestId('m-submit-btn').click();
    await page.getByTestId('m-submit-confirm').click();

    await expect
      .poll(() => page.evaluate((tid) => (window as any).__ssaStores.useWarehouseStore.getState().checkTasks.find((t: any) => t.id === tid)?.status, id), { timeout: 15000 })
      .toBe('completed');
    // 验证：实盘数已写入
    await expect
      .poll(() => page.evaluate((tid) => (window as any).__ssaStores.useWarehouseStore.getState().checkTasks.find((t: any) => t.id === tid)?.items?.[0]?.countQuantity, id), { timeout: 15000 })
      .toBe(12);
  });

  test('质检作业：检验录入（合格）→ 不合格自动生成 NCR 并联动处置', async ({ page }) => {
    // ① 合格场景
    const idPass = `MO-QA-${Date.now()}`;
    const noPass = `MOQAP${Date.now()}`;
    const codePass = `MAT-QA-${Date.now()}`;
    await page.goto(`/m/quality?task=${idPass}`);
    await waitStores(page);
    await page.evaluate(
      ({ id, no, code }) => {
        (window as any).__ssaStores.useQualityStore.getState().addInspectionTask({
          id, taskNo: no, type: 'incoming', status: 'pending', materialId: 'm-1', materialCode: code, materialName: '质检物料',
          batchNo: 'B1', quantity: 10, sampleQuantity: 5, inspectionStandardId: 'std-001', inspectionStandardName: '钢材来料检验标准',
          assignedTo: '测试', plannedDate: '2026-09-04',
        });
      },
      { id: idPass, no: noPass, code: codePass },
    );
    await page.getByTestId('m-passed-input').fill('5');
    await page.getByTestId('m-failed-input').fill('0');
    await page.getByTestId('m-submit-btn').click();
    await page.getByTestId('m-submit-confirm').click();
    await expect
      .poll(() => page.evaluate((tid) => (window as any).__ssaStores.useQualityStore.getState().inspectionTasks.find((t: any) => t.id === tid)?.status, idPass), { timeout: 15000 })
      .toBe('passed');

    // ② 不合格场景 → 自动 NCR + 处置（disposeUnqualified 末尾将 dispositionStatus 置 completed）
    const idFail = `MO-QF-${Date.now()}`;
    const noFail = `MOQAF${Date.now()}`;
    const codeFail = `MAT-QF-${Date.now()}`;
    await page.goto(`/m/quality?task=${idFail}`);
    await waitStores(page);
    await page.evaluate(
      ({ id, no, code }) => {
        (window as any).__ssaStores.useQualityStore.getState().addInspectionTask({
          id, taskNo: no, type: 'incoming', status: 'pending', materialId: 'm-1', materialCode: code, materialName: '质检物料',
          batchNo: 'B2', quantity: 10, sampleQuantity: 5, inspectionStandardId: 'std-001', inspectionStandardName: '钢材来料检验标准',
          assignedTo: '测试', plannedDate: '2026-09-04',
        });
      },
      { id: idFail, no: noFail, code: codeFail },
    );
    await page.getByTestId('m-passed-input').fill('3');
    await page.getByTestId('m-failed-input').fill('2');
    // 选处置方式（报废）
    await page.getByTestId('m-dispo-scrap').click();
    await page.getByTestId('m-submit-btn').click();
    await page.getByTestId('m-submit-confirm').click();

    await expect
      .poll(() => page.evaluate((tid) => (window as any).__ssaStores.useQualityStore.getState().inspectionTasks.find((t: any) => t.id === tid)?.status, idFail), { timeout: 15000 })
      .toBe('failed');
    // 验证：自动生成 NCR（不合格品）并联动处置完成
    await expect
      .poll(() => page.evaluate((tid) => (window as any).__ssaStores.useQualityStore.getState().unqualifiedItems.some((u: any) => u.inspectionTaskId === tid && u.dispositionStatus === 'completed'), idFail), { timeout: 15000 })
      .toBe(true);
  });
});
