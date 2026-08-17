import { test, expect } from '@playwright/test';

/**
 * 端到端验证「销售订单 → 销售出库」全链路是否跑通，并验证业务数据已持久化到 localStorage。
 *
 * 关键假设变更（相较早期版本）：
 *   各业务 store 已通过 zustand persist 中间件持久化到浏览器 localStorage，
 *   因此【每次新增 / 修改 / 删除都会实时落盘】，刷新页面数据不再丢失。
 *
 * 测试步骤：
 *   1. 进入「全流程自检面板」，先清空本地 store 前缀的 localStorage，保证从初始 Mock 开始
 *   2. 点击「一键填充演示链路」→ 写入各模块 store（SO/BOM/MRP/PR/WO/领料/成品入库/发货）
 *   3. 断言自检面板链路完成度 8/8
 *   4. 【持久化验证·面板级】整页刷新后，面板仍显示 8/8（证明已写入 localStorage）
 *   5. 【持久化验证·列表级】销售订单列表出现种子 SO，刷新后仍出现（证明 localStorage 真正落盘）
 *   6. 逐节点点击「查看」→ 客户端路由跳转（不刷新）→ 断言目标列表出现对应种子数据
 *   7. 全程收集 pageerror / console.error，最终断言为零（覆盖此前崩溃的白屏问题）
 */
const NODES: { key: string; expect: string; desc: string }[] = [
  { key: 'so', expect: 'SO-SEED', desc: '销售订单' },
  { key: 'bom', expect: 'BOM-SEED', desc: 'BOM' },
  { key: 'mrp', expect: 'MAT-STEEL-001', desc: 'MRP 运算（按物料编码）' },
  { key: 'pr', expect: 'PR-SEED', desc: '采购申请' },
  { key: 'wo', expect: 'WO-SEED', desc: '生产工单' },
  { key: 'pick', expect: 'OUT-SEED', desc: '领料出库' },
  { key: 'fg', expect: 'FG-SEED', desc: '成品入库' },
  { key: 'ship', expect: 'SH-SEED', desc: '销售发货' },
];

test('SO → 销售出库 全流程打通 + 数据持久化(localStorage) 验证', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('validateDOMNesting')) errors.push('console.error: ' + msg.text());
  });
  // 种子函数 / 重置确认会弹 dialog，自动接受
  page.on('dialog', (d) => d.accept());

  // 1. 进入自检面板，并清空历史本地数据，保证从初始 Mock 开始
  await page.goto('/test/flow');
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('ssa-erp-'))
      .forEach((k) => localStorage.removeItem(k));
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: '全流程自检面板' })).toBeVisible();

  // 2. 一键填充演示链路
  await page.getByRole('button', { name: '一键填充演示链路' }).click();

  // 3. 断言自检面板链路完成度 8/8
  await expect(page.getByText(/链路完成度\s*8\/8/)).toBeVisible();

  // 4. 持久化验证（面板级）：整页刷新后数据仍在 localStorage 中
  await page.reload();
  await expect(page.getByRole('heading', { name: '全流程自检面板' })).toBeVisible();
  await expect(page.getByText(/链路完成度\s*8\/8/)).toBeVisible();

  // 5. 持久化验证（列表级）：销售订单列表刷新后种子 SO 仍在
  const soCard = page.getByTestId('flow-node-so');
  await soCard.getByRole('button', { name: '查看' }).click();
  await expect(page.getByText('SO-SEED', { exact: false }).first()).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText('SO-SEED', { exact: false }).first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('link', { name: '全流程自检' }).click();
  await expect(page.getByRole('heading', { name: '全流程自检面板' })).toBeVisible();

  // 6. 其余节点逐节点验证
  for (let i = 1; i < NODES.length; i++) {
    const node = NODES[i];
    const card = page.getByTestId(`flow-node-${node.key}`);
    await card.getByRole('button', { name: '查看' }).click();
    await expect(page.getByText(node.expect, { exact: false }).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole('link', { name: '全流程自检' }).click();
    await expect(page.getByRole('heading', { name: '全流程自检面板' })).toBeVisible();
  }

  // 7. 全程无运行时错误（覆盖此前 canShip 未定义导致的白屏 / 死节点崩溃）
  expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
});
