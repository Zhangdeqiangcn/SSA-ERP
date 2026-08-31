/**
 * SSA ERP E2E 共享 fixture
 *
 * 问题背景：大量用例在 `page.goto(...)` 后用固定 `waitForTimeout(400)` 再读取
 * `window.__ssaStores`。SPA 水合偶尔慢于 400ms，导致 `__ssaStores` 为 undefined，
 * 抛出 `Cannot read properties of undefined (reading 'useMaterialStore')` 等偶发失败
 * （环境性 flake，非业务逻辑回归）。
 *
 * 修复：覆盖 `page.goto` / `page.reload`，使其在每次导航后等待 store 真正就绪
 * （hydration 完成 + React 根已挂载 + 文档 load），从源头消除水合竞态与「紧随
 * 导航的 evaluate 撞上客户端重定向」两类 flake。等待带 `.catch` 兜底，绝不阻塞测试。
 */
import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** 等待前端 store 水合完成（window.__ssaStores 可用）且 React 根已挂载 */
export async function waitForAppReady(page: Page, timeout = 15000): Promise<void> {
  // 1) store 注入（fire-and-forget import('./stores')）
  await page
    .waitForFunction(
      () => {
        const s = (window as any).__ssaStores;
        return !!(s && s.useMaterialStore && typeof s.useMaterialStore.getState === 'function');
      },
      undefined,
      { timeout }
    )
    .catch(() => {});
  // 2) 文档 load 完成（含客户端重定向后的最终文档）
  await page.waitForLoadState('load').catch(() => {});
  // 3) React 根已挂载子节点——兜住「store 先就绪、随后客户端重定向」的间隙
  await page
    .waitForFunction(
      () => {
        const root = document.getElementById('root');
        return !!root && root.childElementCount > 0;
      },
      undefined,
      { timeout: 5000 }
    )
    .catch(() => {});
}

/**
 * 导航容错的 store 读取：把调用方的箭头函数直接作为 pageFunction 传入 page.evaluate，
 * 仅在外层包「遇到 Execution context destroyed(导航中) 自动重试」的容错。
 * 用法：safeEval(page, () => (window as any).__ssaStores.useX.getState().y)
 * 用于紧跟 resetAndReady / goto 后立即读 store 的场景，杜绝导航竞态导致的偶发失败。
 */
export async function safeEval<T = any>(page: Page, fn: () => T, timeout = 15000): Promise<T> {
  const start = Date.now();
  let lastErr: unknown;
  while (Date.now() - start < timeout) {
    try {
      return await page.evaluate(fn);
    } catch (e: any) {
      if (/Execution context was destroyed|because of a navigation/i.test(e?.message || '')) {
        lastErr = e;
        await page
          .waitForFunction(() => !!(window as any).__ssaStores)
          .catch(() => {});
        continue;
      }
      throw e;
    }
  }
  throw lastErr ?? new Error('safeEval timed out');
}

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    const origGoto = page.goto.bind(page);
    const origReload = page.reload.bind(page);
    // 包裹 goto / reload：导航完成后等待 store + 根挂载就绪，消除两类竞态 flake
    (page as any).goto = (url?: any, options?: any) =>
      (async () => {
        const resp = await origGoto(url, options);
        await waitForAppReady(page);
        return resp;
      })();
    (page as any).reload = (options?: any) =>
      (async () => {
        const resp = await origReload(options);
        await waitForAppReady(page);
        return resp;
      })();
    await use(page);
  },
});

export { expect };
export type { Page };
