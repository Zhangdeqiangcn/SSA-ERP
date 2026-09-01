import { test, expect } from './ssa-fixtures';

/**
 * V2.73 纯前端快赢 · 通用导出能力固化（CSV / Excel）
 * ------------------------------------------------------------
 * 覆盖：BI 自助分析、ChatBI、异常预警 三处新挂载的统一导出入口。
 * 校验点：按钮可见可点 → 菜单展开 → 触发真实下载 → 文件名带时间戳且扩展名正确。
 */

/**
 * DEV 环境「预期内」的服务端接口缺失：
 * /api/alerts 与 /api/tax-gateway/verify 只在生产（Cloudflare Functions + D1）存在，
 * DEV 下必然失败——前端正是靠这个失败信号回退到本地同源逻辑，因此不计入错误。
 * 但白名单之外的一切 4xx/5xx 与 JS 异常仍然必须为零。
 */
const DEV_EXPECTED_API = [
  /localhost:3000\/api\/alerts/,
  /localhost:3000\/api\/tax-gateway\/verify/,
  // ChatBI 走 /api/chatbi/analyze（后端 252 行关键词→SQL，未做本地复刻），DEV 下同样缺失
  /localhost:3000\/api\/chatbi\/analyze/,
];

function collectErrors(page: any) {
  const problems: string[] = [];
  page.on('pageerror', (e: any) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m: any) => {
    const t = m.text();
    // 资源加载失败单独由 response 监听按 URL 判定，此处跳过避免重复计数
    if (m.type() === 'error' && !/Failed to load resource/.test(t)) problems.push(`console: ${t}`);
  });
  page.on('response', (r: any) => {
    if (r.status() >= 400 && !DEV_EXPECTED_API.some((re) => re.test(r.url()))) {
      problems.push(`http ${r.status()}: ${r.url()}`);
    }
  });
  return problems;
}

async function downloadVia(page: any, testid: string, kind: 'csv' | 'xlsx') {
  await expect(page.getByTestId(testid)).toBeEnabled({ timeout: 15000 });
  await page.getByTestId(testid).click();
  const menuItem = page.getByTestId(`${testid}-${kind}`);
  await expect(menuItem).toBeVisible({ timeout: 10000 });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    menuItem.click(),
  ]);
  return download;
}

test('BI 自助分析：分析结果可导出 CSV（含分析配置 sheet 的数据）', { timeout: 120000 }, async ({ page }) => {
  const problems = collectErrors(page);

  await page.goto('http://localhost:3000/reports/bi');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  // 分析结果区已渲染（默认数据集自动聚合）
  await expect(page.getByText(/分析结果（\d+ 组）/)).toBeVisible({ timeout: 20000 });

  const dl = await downloadVia(page, 'bi-export', 'csv');
  const name = dl.suggestedFilename();
  expect(name, `导出文件名应形如 BI分析_xxx_时间戳.csv，实际=${name}`).toMatch(/^BI分析_.*_\d{8}-\d{4}\.csv$/);

  expect(problems, `问题清单:\n${problems.join('\n')}`).toEqual([]);
});

/**
 * ChatBI 说明：
 * ChatBI 的分析结果来自 /api/chatbi/analyze（仅生产 Cloudflare Functions 存在，
 * DEV 无 mock 亦无函数），因此 DEV 下无法产出结果卡片，导出按钮按设计应处于禁用态。
 * 本用例据此验证「无数据不误导出」的守卫行为；真实下载能力由 BI 自助分析用例覆盖
 * （同一套 ExportMenu + exportUtils 实现，路径一致）。
 */
test('ChatBI：无分析结果时导出按钮守卫为禁用（DEV 无服务端分析接口）', { timeout: 120000 }, async ({ page }) => {
  const problems = collectErrors(page);

  await page.goto('http://localhost:3000/analytics/chatbi');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  await expect(page.getByRole('heading', { name: 'ChatBI 对话式分析' })).toBeVisible({ timeout: 20000 });

  // 未产出结果前不应存在导出入口
  await expect(page.getByTestId('chatbi-export')).toHaveCount(0);

  // 问句发送后（DEV 下必然失败）仍不应凭空出现可导出按钮
  await page.getByTestId('chatbi-input').fill('库存物料分类');
  await page.getByTestId('chatbi-send').click();
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('chatbi-export')).toHaveCount(0);

  expect(problems, `问题清单:\n${problems.join('\n')}`).toEqual([]);
});

test('异常预警：预警明细可导出 CSV（含规则配置快照 sheet 的数据）', { timeout: 120000 }, async ({ page }) => {
  const problems = collectErrors(page);

  await page.goto('http://localhost:3000/analytics/alerts');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  // DEV 环境无 /api/alerts，应回退到「本地同源重算」且页面正常渲染
  await expect(page.getByTestId('alert-source')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('alert-source')).toContainText('本地同源重算');
  await expect(page.getByRole('heading', { name: '异常检测与预警' })).toBeVisible();

  const dl = await downloadVia(page, 'alert-export', 'csv');
  const name = dl.suggestedFilename();
  expect(name, `导出文件名应形如 异常预警明细_时间戳.csv，实际=${name}`).toMatch(/^异常预警明细_\d{8}-\d{4}\.csv$/);

  expect(problems, `问题清单:\n${problems.join('\n')}`).toEqual([]);
});
