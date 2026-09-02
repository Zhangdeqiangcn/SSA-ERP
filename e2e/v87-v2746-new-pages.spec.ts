import { test, expect } from './ssa-fixtures';

/**
 * V2.74.6 整页缺失补齐 A 轮（P2-07/08/09）固化用例
 * ------------------------------------------------------------
 * 覆盖：
 *  1) 波次RFID：页面可达 + 新建波次落库 + 下达并拣货推进状态 + 模拟 RFID 扫描写入流水
 *  2) 重复制造：页面可达 + 新建生产线 + 产量报工触发倒冲（合格数 × 单件标准耗用）+ 倒冲明细可见
 *  3) MES集成：页面可达 + 四个 Tab 均可渲染 + 新建连接 + 批量同步
 * 全程零 pageerror / 零控制台错误（白屏守卫）
 */

const BASE = 'http://localhost:3000';

function collectProblems(page: any) {
  const problems: string[] = [];
  page.on('pageerror', (e: any) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m: any) => {
    const t = m.text();
    if (m.type() === 'error' && !/Failed to load resource/.test(t)) problems.push(`console: ${t}`);
  });
  return problems;
}

/** 勾选数据表第一行（兼容表头是否有全选框） */
async function checkFirstRow(page: any) {
  const boxes = page.locator('table input[type="checkbox"]');
  await boxes.first().waitFor({ timeout: 20000 });
  const n = await boxes.count();
  await boxes.nth(n > 1 ? 1 : 0).check();
}

test('V2.74.6-1 波次RFID：新建波次 → 下达并拣货 → RFID 扫描写入流水', { timeout: 180000 }, async ({ page }) => {
  const problems = collectProblems(page);

  await page.goto(`${BASE}/warehouse/wave-rfid`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: /波次RFID/ })).toBeVisible({ timeout: 30000 });

  // 1) 新建波次
  await page.getByRole('button', { name: '新建波次' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('名称').fill('E2E测试波次');
  await dlg.getByLabel('仓库').fill('E2E成品仓');
  await dlg.getByRole('button', { name: '保存' }).click();
  await expect(dlg).toBeHidden({ timeout: 15000 });
  await expect(page.getByText('E2E测试波次')).toBeVisible({ timeout: 15000 });

  // 2) 行操作「更多」→ 查看 → 下达并拣货（状态推进为「拣货中」）
  const row = page.locator('tbody tr', { hasText: 'E2E测试波次' }).first();
  await row.locator('button').last().click();
  await page.getByRole('menuitem', { name: '查看' }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '下达并拣货' }).click();
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15000 });

  // 3) RFID 事件 Tab：模拟扫描 → 写入流水
  await page.getByRole('tab', { name: /RFID事件/ }).click();
  await expect(page.getByRole('button', { name: '模拟扫描' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '模拟扫描' }).click();
  const sdlg = page.getByRole('dialog');
  await sdlg.getByLabel('标签ID').fill('E2E-RFID-TAG-001');
  await sdlg.getByRole('button', { name: '写入流水' }).click();
  await expect(sdlg).toBeHidden({ timeout: 15000 });
  await expect(page.getByText('E2E-RFID-TAG-001')).toBeVisible({ timeout: 15000 });

  expect(problems, `页面异常：\n${problems.join('\n')}`).toEqual([]);
});

test('V2.74.6-2 重复制造：新建生产线 → 产量报工触发倒冲', { timeout: 180000 }, async ({ page }) => {
  const problems = collectProblems(page);

  await page.goto(`${BASE}/production/repetitive`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: /重复制造/ })).toBeVisible({ timeout: 30000 });

  // 1) 新建生产线
  await page.getByRole('button', { name: '新建生产线' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('名称', { exact: true }).fill('E2E测试产线');
  await dlg.getByRole('button', { name: '保存' }).click();
  await expect(dlg).toBeHidden({ timeout: 15000 });
  await expect(page.getByText('E2E测试产线')).toBeVisible({ timeout: 15000 });

  // 2) 切到周期 Tab → 勾选首行 → 倒冲明细（记录当前累计）
  await page.getByRole('tab', { name: /周期/ }).click();
  await checkFirstRow(page);

  await page.getByTestId('rep-backflush-detail').click();
  const before = await page.getByRole('dialog').locator('tbody tr').allInnerTexts();
  await page.getByRole('button', { name: '关闭' }).click();
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15000 });

  // 3) 产量报工 100 件 → 触发倒冲
  await checkFirstRow(page);
  await page.getByRole('button', { name: '产量报工' }).click();
  const rdlg = page.getByRole('dialog');
  await rdlg.getByLabel('合格数量').fill('100');
  await rdlg.getByLabel('报废数量').fill('2');
  await rdlg.getByRole('button', { name: '确认报工并倒冲' }).click();
  await expect(rdlg).toBeHidden({ timeout: 15000 });

  // 4) 复查倒冲明细：累计消耗应已增长（合格数 100 × 单件标准耗用）
  await checkFirstRow(page);
  await page.getByRole('button', { name: '倒冲明细' }).click();
  const after = await page.getByRole('dialog').locator('tbody tr').allInnerTexts();
  expect(after.length).toBeGreaterThan(0);
  expect(after.join('|')).not.toEqual(before.join('|'));
  await page.getByRole('button', { name: '关闭' }).click();

  expect(problems, `页面异常：\n${problems.join('\n')}`).toEqual([]);
});

test('V2.74.6-3 MES集成：四 Tab 可渲染 + 新建连接 + 同步', { timeout: 180000 }, async ({ page }) => {
  const problems = collectProblems(page);

  await page.goto(`${BASE}/production/mes`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: /MES集成/ })).toBeVisible({ timeout: 30000 });

  // 1) 四个 Tab 均可渲染且不白屏
  for (const name of [/连接配置/, /设备状态/, /在制品/, /工序报工/]) {
    await page.getByRole('tab', { name }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('heading', { name: /MES集成/ })).toBeVisible();
  }

  // 2) 回到连接配置 → 新建连接
  await page.getByRole('tab', { name: /连接配置/ }).click();
  await page.getByRole('button', { name: '新建连接' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('名称', { exact: true }).fill('E2E测试MES连接');
  await dlg.getByRole('button', { name: '保存' }).click();
  await expect(dlg).toBeHidden({ timeout: 15000 });
  await expect(page.getByText('E2E测试MES连接')).toBeVisible({ timeout: 15000 });

  // 3) 勾选首行 → 同步（置 connected + 记录 lastSyncAt）
  await checkFirstRow(page);
  await page.getByTestId('mes-conn-sync').click();
  await page.waitForTimeout(800);
  await expect(page.getByRole('heading', { name: /MES集成/ })).toBeVisible();

  expect(problems, `页面异常：\n${problems.join('\n')}`).toEqual([]);
});
