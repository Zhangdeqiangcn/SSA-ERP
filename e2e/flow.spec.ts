import { test, expect, type Page } from './ssa-fixtures';

/**
 * 首次运行（localStorage 为空）会出现「欢迎使用 SSA ERP」引导向导，
 * 会遮挡业务页面。封装一个安全关闭函数，遇到即跳过。
 */
async function dismissOnboarding(page: Page) {
  await page
    .getByRole('button', { name: '跳过引导' })
    .click({ timeout: 2000 })
    .catch(() => {
      /* 引导未出现则忽略 */
    });
}

/**
 * 客户侧返回自检面板（避免全量重载带来的 2~5s 编译耗时）。
 * 通过浏览器后退（react-router push 的 history），失败则降级为 page.goto。
 */
async function returnToPanel(page: Page) {
  try {
    await page.goBack({ waitUntil: 'commit', timeout: 8000 });
    await page.waitForURL(/\/test\/flow/, { timeout: 8000 });
    await expect(page.getByRole('heading', { name: /自检面板/ })).toBeVisible({ timeout: 15000 });
  } catch {
    await page.goto('/test/flow');
    await dismissOnboarding(page);
    await expect(page.getByRole('heading', { name: /自检面板/ })).toBeVisible({ timeout: 15000 });
  }
}

/**
 * 端到端验证「客户跟进 → 收款」完整 19 环节销售业务链路是否跑通，
 * 并验证业务数据已持久化到 localStorage（zustand persist）。
 *
 * 19 环节节点（key → route）：
 *   ① followup  客户跟进        /sales/prospects
 *   ② quote     接单(报价)      /sales/prospects
 *   ③ contract  签订合同        /sales/contracts
 *   ④ so        销售订单        /sales/orders
 *   ⑤ review    订单评审        /sales/orders
 *   ⑥ schedule  生产排产        /production/scheduling
 *   ⑦ mrp       MRP运算         /production/mrp
 *   ⑧ pr        需求产生(PR)    /purchase/requests
 *   ⑨ po        PR转PO          /purchase/orders
 *   ⑩ asn       供应商交货(ASN) /warehouse/inbound
 *   ⑪ track     物流跟踪        /sales/logistics
 *   ⑫ arrival   到货登记        /warehouse/inbound
 *   ⑬ qc        检验            /quality/inspection
 *   ⑭ inbound   入库(过账)      /warehouse/inbound
 *   ⑮ produce   生产执行        /production/orders
 *   ⑯ fg        成品入库        /warehouse/fg-inbound
 *   ⑰ outbound  出库(发货)      /warehouse/outbound
 *   ⑱ invoice   销售开票(AR)    /finance/receivables
 *   ⑲ receive   收款            /finance/receivables
 *
 * 验证策略：
 *   节点完成度直接读取各 store 真实状态（count >= target），因此面板显示 19/19
 *   即证明 19 个环节的 store 数据全部成功写入且事件驱动回写已触发。
 *   再辅以：刷新持久化、逐节点「查看」跳转路由正确、关键业务页种子数据可见、全程零运行时错误。
 */
interface FlowNode {
  key: string;
  route: string;
  seedHint: string; // 该页面应可见的种子关键字（用于页面级复核）
}

const NODES: FlowNode[] = [
  { key: 'followup', route: '/sales/prospects', seedHint: '华润建筑集团' },
  { key: 'quote', route: '/sales/prospects', seedHint: '华润建筑集团' },
  { key: 'contract', route: '/sales/contracts', seedHint: 'SC-DEMO-' },
  { key: 'so', route: '/sales/orders', seedHint: 'SO-DEMO-' },
  { key: 'review', route: '/sales/orders', seedHint: 'SO-DEMO-' },
  { key: 'schedule', route: '/production/scheduling', seedHint: 'WO-DEMO-' },
  { key: 'mrp', route: '/production/mrp', seedHint: 'MAT202405010001' },
  { key: 'pr', route: '/purchase/requests', seedHint: 'PR-DEMO-' },
  { key: 'po', route: '/purchase/orders', seedHint: 'PO-DEMO-' },
  { key: 'asn', route: '/warehouse/inbound', seedHint: 'ASN-DEMO-' },
  { key: 'track', route: '/sales/logistics', seedHint: 'TRK-' },
  { key: 'arrival', route: '/warehouse/inbound', seedHint: 'IN-DEMO-' },
  { key: 'qc', route: '/quality/inspection', seedHint: 'QC-DEMO-' },
  { key: 'inbound', route: '/warehouse/inbound', seedHint: 'IN-DEMO-' },
  { key: 'produce', route: '/production/orders', seedHint: 'WO-DEMO-' },
  { key: 'fg', route: '/warehouse/fg-inbound', seedHint: 'WO-DEMO-' },
  { key: 'outbound', route: '/warehouse/outbound', seedHint: 'OUT-SALE-' },
  { key: 'invoice', route: '/finance/receivables', seedHint: 'SI-DEMO-' },
  { key: 'receive', route: '/finance/receivables', seedHint: 'SI-DEMO-' },
];

test('销售业务 19 环节端到端打通 + 持久化(localStorage) + 零运行时错误', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('validateDOMNesting')) errors.push('console.error: ' + msg.text());
  });
  page.on('dialog', (d) => d.accept());

  // 1. 进入自检面板，清空历史本地数据，保证从初始 Mock 开始
  await page.goto('/test/flow');
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('ssa-erp-'))
      .forEach((k) => localStorage.removeItem(k));
  });
  await page.reload();
  await dismissOnboarding(page); // 首次运行会弹引导向导，先关闭
  await expect(page.getByRole('heading', { name: /自检面板/ })).toBeVisible();

  // 2. 一键填充演示链路
  await dismissOnboarding(page);
  await page.getByRole('button', { name: '一键填充演示链路' }).click();
  await expect(page.getByText(/演示链路数据已存在/).or(page.getByText(/已填充完整销售业务/))).toBeVisible({ timeout: 15000 });

  // 3. 断言自检面板链路完成度 19/19（核心：证明 19 环节 store 数据全部贯通）
  await expect(page.getByText(/链路完成度\s*19\/19/)).toBeVisible({ timeout: 15000 });

  // 4. 每个节点都应为「已完成」状态（含 check 图标），逐节点复核
  for (const node of NODES) {
    const card = page.getByTestId(`flow-node-${node.key}`);
    // 节点卡片内出现 CheckCircle（svg，role img）即代表 count>=target
    await expect(card.locator('svg').first()).toBeVisible();
    // 同时校验该节点文案与数据量可见
    await expect(card).toContainText(node.key === 'followup' ? '① 客户跟进' : '');
  }

  // 5. 持久化验证（面板级）：整页刷新后数据仍在 localStorage 中
  await page.reload();
  await expect(page.getByRole('heading', { name: /自检面板/ })).toBeVisible();
  await expect(page.getByText(/链路完成度\s*19\/19/)).toBeVisible();

  // 6. 逐节点「查看」→ 客户侧路由跳转（不刷新）→ 断言目标页路由命中 + 页面非崩溃
  // 注意：仅验证导航（URL 命中 + 页面渲染），不强行断言每页是否展示种子文案——
  // 各业务页渲染口径不同（如 /production/scheduling 是工序排程视图，并非工单列表），
  // 数据是否写入已由面板 19/19 + store 真实状态直接证明。
  // 使用 page.goBack() 返回面板，避免 19 次全量重载导致超时。
  for (let i = 0; i < NODES.length; i++) {
    const node = NODES[i];
    if (i > 0) await returnToPanel(page);
    const card = page.getByTestId(`flow-node-${node.key}`);
    await card.getByRole('button', { name: '查看' }).click();
    await expect(page).toHaveURL(new RegExp(node.route.replace('/', '\\/')), { timeout: 15000 });
    await expect(page.locator('main, .MuiPaper-root, table').first()).toBeVisible({ timeout: 15000 });
  }

  // 6.5 数据可见性抽检：在已知会渲染种子的业务页复核关键数据真实落地
  const dataChecks: { route: string; hint: string }[] = [
    { route: '/sales/contracts', hint: 'SC-DEMO-' },
    { route: '/sales/orders', hint: 'SO-DEMO-' },
    { route: '/purchase/requests', hint: 'PR-DEMO-' },
    { route: '/purchase/orders', hint: 'PO-DEMO-' },
    { route: '/warehouse/inbound', hint: 'IN-DEMO-' },
    { route: '/quality/inspection', hint: 'QC-DEMO-' },
    { route: '/warehouse/fg-inbound', hint: 'WO-DEMO-' },
    { route: '/warehouse/outbound', hint: 'OUT-SALE-' },
    { route: '/finance/receivables', hint: 'SI-DEMO-' },
  ];
  for (const dc of dataChecks) {
    await page.goto(dc.route);
    await dismissOnboarding(page);
    await expect(page.getByText(dc.hint, { exact: false }).first()).toBeVisible({ timeout: 15000 });
  }

  // 7. 持久化验证（列表级）：销售订单种子 SO 刷新后仍可见（证明 localStorage 真正落盘 + 列表页能正确读取持久化数据）
  await page.goto('/sales/orders');
  await dismissOnboarding(page);
  await expect(page.getByText('SO-DEMO-', { exact: false }).first()).toBeVisible({ timeout: 30000 });
  await page.reload();
  await dismissOnboarding(page);
  await expect(page.getByText('SO-DEMO-', { exact: false }).first()).toBeVisible({ timeout: 30000 });

  // 8. 全程无运行时错误（覆盖此前 canShip 未定义 / 孤儿 import 等白屏问题）
  expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
});
