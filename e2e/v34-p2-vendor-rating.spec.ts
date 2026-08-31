import { test, expect, type Page } from './ssa-fixtures';

const captureErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    // 仅捕获真正的运行时异常；忽略浏览器对“资源加载失败”的噪声
    // （外部字体/CDN 在离线测试沙箱不可达、Webhook 触发外部地址不可达均会产生 net::ERR_FAILED，非应用 bug）
    if (
      msg.type() === 'error' &&
      !/Failed to load resource|net::ERR_FAILED/.test(msg.text())
    ) {
      errors.push(msg.text());
    }
  });
  return errors;
};

test('设置页：供应商评级 Tab 可打开、配置权重可保存、无白屏', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/settings');
  await page.getByRole('button', { name: '供应商评级' }).click();
  await expect(page.getByTestId('vendor-rating-enabled')).toBeVisible();

  // 修改质量权重并保存
  const qualityWeight = page.getByTestId('vendor-rating-weight-quality');
  await qualityWeight.locator('input').fill('50');
  await page.getByRole('button', { name: '保存', exact: true }).click();

  // 切回并再次打开，确认权重已持久化（无白屏、无报错）
  await page.getByRole('button', { name: '物料评级' }).click();
  await page.getByRole('button', { name: '供应商评级' }).click();
  await expect(qualityWeight.locator('input')).toHaveValue('50');

  expect(errors).toEqual([]);
});

test('供应商详情：实时绩效评级卡片渲染（聚合质量/交期/价格，自动计算等级）', async ({ page }) => {
  const errors = await captureErrors(page);
  await page.goto('/vendor/ven-001');
  await expect(page.getByRole('heading', { name: 'V202401001' })).toBeVisible();

  // 评级卡片存在
  const card = page.getByTestId('vendor-rating');
  await expect(card).toBeVisible();

  // 自动评级应产生 A/B/C/D 等级（数据齐全：采购单 + 价目表 + 检验）
  await expect(card.getByText(/[ABCD] 级/)).toBeVisible();

  expect(errors).toEqual([]);
});
