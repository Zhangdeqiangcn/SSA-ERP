import { test, expect } from './ssa-fixtures';

/**
 * V2.73 纯前端快赢 · 预警规则可配置 UI 固化
 * ------------------------------------------------------------
 * 覆盖：规则配置对话框开合、规则启停联动卡片显隐、阈值参数写入、恢复默认。
 * 注：本用例只验证「前端规则引擎」行为，DEV 下数据源为本地同源重算。
 */

/**
 * DEV 环境「预期内」的服务端接口缺失：/api/alerts 只在生产（Cloudflare Functions + D1）
 * 存在，DEV 下必然失败——前端正是靠这个失败信号回退到本地同源重算，因此不计入错误。
 * 白名单之外的一切 4xx/5xx 与 JS 异常仍然必须为零。
 */
const DEV_EXPECTED_API = [
  /localhost:3000\/api\/alerts/,
  // V2.77 起以下 8 域改为直连真实 D1（去 Blob），未登录 DEV 下 fire-and-forget 双写返回 500，
  // 前端回退 Blob、界面零回归——属「在线同步失败」预期内噪声，不计错误。
  /localhost:3000\/api\/serial-numbers/,
  /localhost:3000\/api\/subcontracts/,
  /localhost:3000\/api\/sales-orders/,
  /localhost:3000\/api\/work-orders/,
  /localhost:3000\/api\/vouchers/,
  /localhost:3000\/api\/stock-transfers/,
  /localhost:3000\/api\/inventory-adjustments/,
  /localhost:3000\/api\/quality-holds/,
];

test('预警规则配置：开合对话框 + 规则启停联动 + 阈值写入 + 恢复默认', { timeout: 120000 }, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !/Failed to load resource/.test(t)) errors.push(`console: ${t}`);
  });
  page.on('response', r => {
    if (r.status() >= 400 && !DEV_EXPECTED_API.some((re) => re.test(r.url()))) {
      errors.push(`http ${r.status()}: ${r.url()}`);
    }
  });

  await page.goto('http://localhost:3000/analytics/alerts');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  // 1) 数据源标识（DEV 无服务端 → 本地同源重算），并确认回退真正生效
  await expect(page.getByTestId('alert-source')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('alert-source')).toContainText('本地同源重算');

  // 2) 打开规则配置
  await page.getByTestId('alert-rules-open').click();
  await expect(page.getByText('预警规则配置')).toBeVisible({ timeout: 10000 });

  // 3) 六条规则开关齐备
  for (const key of ['lowStock', 'overduePO', 'overdueSO', 'expiring', 'credit', 'pendingApproval']) {
    await expect(page.getByTestId(`alert-rule-switch-${key}`)).toBeVisible();
  }

  // 4) 阈值参数可写入：低库存百分比 100 → 50
  const pct = page.getByTestId('alert-rule-lowstock-pct');
  await pct.fill('50');
  await expect(
    page.evaluate(() => {
      const s = (window as any).__ssaStores?.useAlertRuleStore;
      return s ? s.getState().rules.find((r: any) => r.key === 'lowStock')?.params?.ratioPct : null;
    })
  ).resolves.toBe(50);

  // 5) 逾期天数阈值：采购 0 → 3
  await page.getByTestId('alert-rule-overduePO-days').fill('3');
  await expect(
    page.evaluate(() => {
      const s = (window as any).__ssaStores?.useAlertRuleStore;
      return s ? s.getState().rules.find((r: any) => r.key === 'overduePO')?.params?.minDays : null;
    })
  ).resolves.toBe(3);

  // 6) 关闭「库存低于安全库存」规则 → 对应卡片从页面消失
  await page.getByTestId('alert-rule-switch-lowStock').click();
  await page.getByTestId('alert-rules-close').click();
  await page.waitForTimeout(400);
  await expect(page.getByTestId('alert-stock')).toHaveCount(0);

  // 7) 重新打开并「恢复默认」→ 阈值回到 100，卡片恢复
  await page.getByTestId('alert-rules-open').click();
  await page.getByTestId('alert-rules-reset').click();
  await page.waitForTimeout(300);
  await expect(
    page.evaluate(() => {
      const s = (window as any).__ssaStores?.useAlertRuleStore;
      return s ? s.getState().rules.find((r: any) => r.key === 'lowStock')?.params?.ratioPct : null;
    })
  ).resolves.toBe(100);
  await page.getByTestId('alert-rules-close').click();
  await page.waitForTimeout(400);
  await expect(page.getByTestId('alert-stock')).toBeVisible();

  expect(errors, `控制台/页面错误:\n${errors.join('\n')}`).toEqual([]);
});
