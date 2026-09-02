import { test, expect } from '@playwright/test';

/**
 * C 轮整页补齐（V2.74.8）冒烟用例
 * 覆盖三项新页面：S&OP 销售与运营计划（P2-10）/ BI 集成（P2-19）/ ESG 报告（P2-30）
 * 仅做「路由可达 + 核心 CRUD/切换 不报错」的冒烟，不覆盖全部字段。
 *
 * V2.75.0 起 S&OP 已迁真实 D1（/api/entities/sop，根治双通道参考实现）：
 * 数据主源为 Cloudflare D1，dev/MSW 无此端点 → 新建走乐观更新后回退 Mock，UI 不报错。
 * 故 S&OP 用例仅验证 UI 流程（弹窗打开/填写/保存关闭），**跨刷新持久化以生产部署为真验证**。
 */

test.describe('V2.74.8 C 轮整页补齐冒烟', () => {
  test('S&OP 销售与运营计划（P2-10）：路由可达 + 新建计划 UI 流程（保存关闭不报错）', async ({ page }) => {
    await page.goto('/production/sop');
    await expect(page.getByText('S&OP 销售与运营计划（P2-10）')).toBeVisible();

    // 统计卡渲染
    await expect(page.getByText('需求预测合计')).toBeVisible();
    await expect(page.getByText('已审批/执行')).toBeVisible();

    // 新建流程：弹窗打开并填写供需（保存动作不抛错、弹窗正常关闭即视为通过）
    await page.getByRole('button', { name: '新建 S&OP 计划' }).click();
    await page.getByLabel('计划期').fill('2026-12');
    await page.getByLabel('需求预测(吨)').fill('1000');
    await page.getByLabel('供应计划(吨)').fill('1200');
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByRole('button', { name: '新建 S&OP 计划' })).toBeVisible();
  });

  test('BI 集成（P2-19）：路由可达 + 同步全部 + 新建连接写入表格', async ({ page }) => {
    await page.goto('/finance/bi');
    await expect(page.getByText('BI 集成（P2-19）')).toBeVisible();

    // 统计卡渲染（统计卡 caption 与表格状态 Chip 文案重复，需用 Paper 作用域精确匹配）
    await expect(page.getByText('连接总数')).toBeVisible();
    await expect(page.locator('div.MuiPaper-root:has-text("已连接")').first()).toBeVisible();

    // 同步全部按钮可点击且不应报错
    await page.getByTestId('bi-conn-sync').click();
    await expect(page.getByRole('button', { name: '同步全部' })).toBeVisible();

    const before = await page.locator('tbody tr').count();
    await page.getByRole('button', { name: '新建连接' }).click();

    await page.getByLabel('连接名称').fill('本地 Superset 看板');
    await page.getByLabel('服务地址 / Endpoint').fill('https://bi.internal.local');
    await page.getByLabel('数据集 / 看板').fill('经营驾驶舱');

    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByRole('button', { name: '新建连接' })).toBeVisible();
    const after = await page.locator('tbody tr').count();
    expect(after).toBe(before + 1);
  });

  test('ESG 报告（P2-30）：路由可达 + E/S/G 三 Tab + 新增指标写入当前分类', async ({ page }) => {
    await page.goto('/finance/esg');
    await expect(page.getByText('ESG 报告（P2-30）')).toBeVisible();

    // 三分类 Tab 齐全
    await expect(page.getByRole('tab', { name: '环境 Environmental' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '社会 Social' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '治理 Governance' })).toBeVisible();

    // 默认 E 分类有种子行
    await expect(page.locator('tbody tr').first()).toBeVisible();
    const beforeE = await page.locator('tbody tr').count();
    expect(beforeE).toBeGreaterThan(0);

    // 新增一条 E 分类指标
    await page.getByRole('button', { name: '新增 ESG 指标' }).click();
    await page.getByLabel('指标名称').fill('单位产品碳排放');
    await page.getByLabel('实际值').fill('1.8');
    await page.getByLabel('单位').fill('tCO2/吨钢');
    await page.getByRole('button', { name: '保存' }).click();

    await expect(page.getByRole('button', { name: '新增 ESG 指标' })).toBeVisible();
    const afterE = await page.locator('tbody tr').count();
    expect(afterE).toBe(beforeE + 1);

    // 切到 G 治理分类，应渲染出治理种子行
    await page.getByRole('tab', { name: '治理 Governance' }).click();
    await expect(page.locator('tbody tr').first()).toBeVisible();
    expect(await page.locator('tbody tr').count()).toBeGreaterThan(0);
  });
});
