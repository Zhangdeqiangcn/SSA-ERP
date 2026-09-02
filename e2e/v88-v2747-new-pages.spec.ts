import { test, expect } from '@playwright/test';

/**
 * B 轮整页补齐（V2.74.7）冒烟用例
 * 覆盖三项新页面：三方销售（P2-12）/ COPA 获利分析（P2-13）/ 资金管理（P2-14）
 * 仅做「路由可达 + 核心 CRUD/切换 不报错」的冒烟，不覆盖全部字段。
 * 系统为纯前端 Mock（backendStorage 落 app_state / localStorage），刷新即重置为种子。
 */

test.describe('V2.74.7 B 轮整页补齐冒烟', () => {
  test('三方销售（P2-12）：路由可达 + 新建代销结算单写入表格', async ({ page }) => {
    await page.goto('/sales/triparty');
    await expect(page.getByText('三方销售（P2-12）')).toBeVisible();

    const before = await page.locator('tbody tr').count();
    await page.getByRole('button', { name: '新建代销结算单' }).click();

    await page.getByLabel('三方/经销商名称').fill('成都联销商贸');
    await page.getByLabel('终端客户').fill('攀钢终端用户');
    await page.getByLabel('物料名称').fill('热轧卷板 Q235B');
    await page.getByLabel('数量').fill('10');
    await page.getByLabel('结算单价').fill('4200');

    await page.getByRole('button', { name: '保存' }).click();
    // 弹窗关闭 + 表格新增一行
    await expect(page.getByRole('button', { name: '新建代销结算单' })).toBeVisible();
    const after = await page.locator('tbody tr').count();
    expect(after).toBe(before + 1);
  });

  test('COPA 获利分析（P2-13）：四维度 Tab 渲染 + 切换客户维度出数', async ({ page }) => {
    await page.goto('/finance/copa');
    await expect(page.getByText('获利分析 COPA（P2-13）')).toBeVisible();

    // 四维度 Tab 齐全
    await expect(page.getByRole('tab', { name: '产品' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '客户' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '区域' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '期间' })).toBeVisible();

    // 切到「客户」维度，应渲染出种子行
    await page.getByRole('tab', { name: '客户' }).click();
    await expect(page.locator('tbody tr').first()).toBeVisible();
    expect(await page.locator('tbody tr').count()).toBeGreaterThan(0);
  });

  test('资金管理（P2-14）：账户总余额 + 流水 Tab 新增流水联动', async ({ page }) => {
    await page.goto('/finance/cash');
    await expect(page.getByText('资金管理（P2-14）')).toBeVisible();
    await expect(page.getByText('账户总余额')).toBeVisible();

    // 切到资金流水 Tab
    await page.getByRole('tab', { name: /资金流水/ }).click();
    const before = await page.locator('tbody tr').count();

    await page.getByRole('button', { name: '新增流水' }).click();
    await page.getByLabel('往来方').fill('攀钢回款');
    await page.getByLabel('类别').fill('销售回款');
    await page.getByLabel('金额').fill('5000');
    await page.getByRole('button', { name: '保存' }).click();

    await expect(page.getByRole('button', { name: '新增流水' })).toBeVisible();
    const after = await page.locator('tbody tr').count();
    expect(after).toBe(before + 1);
  });
});
