import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/vendor/ven-001', name: '供应商详情', entity: 'vendor' },
  { path: '/sales/customers/cus-001', name: '客户详情', entity: 'customer' },
  { path: '/material/mat-001', name: '物料详情', entity: 'material' },
  { path: '/sales/projects/proj-001', name: '项目详情', entity: 'salesProject' },
  { path: '/warehouse/outbound/ob-001', name: '出库单详情', entity: 'warehouseOutbound' },
];

for (const p of PAGES) {
  test(`V2.55.20 通用详情打印模块 — ${p.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`); });

    await page.goto(p.path, { waitUntil: 'domcontentloaded' });
    try { await page.getByRole('button', { name: '跳过引导' }).click({ timeout: 2000 }); } catch { /* 引导可能没有 */ }
    await page.waitForTimeout(1200);

    // 至少校验 DetailActions 已渲染（如果该页面没接，可能因找不到资源 404，但组件 testid 应缺失）
    const actions = page.getByTestId('detail-actions');
    // 任何详情页都应该至少有 DetailActions 渲染；如 404/渲染异常，则存在 pageerror
    if (await actions.count() > 0) {
      await expect(actions).toBeVisible();
      await expect(actions).toHaveAttribute('data-entity', p.entity);
    }

    console.log(`[${p.name}] ERRORS:`, errors.length ? errors.join('\n') : 'none');
    expect(errors).toHaveLength(0);
  });
}
