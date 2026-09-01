// 受管 dev server 预热：先真实浏览器加载关键路由，让 vite 完成首屏编译
// （vite 服务端缓存 transform 结果，预热后正式 E2E 的首次 goto 不再冷编译超时）。
// 用法：先 `npm run dev` 后台起来且 3000 可响应，再 `node e2e/warmup.mjs`。
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';
const routes = ['/', '/finance/exchange-rates', '/settings'];

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', () => {});

for (const r of routes) {
  try {
    await page.goto(BASE + r, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  } catch (e) {
    console.error('warmup goto failed:', r, e?.message);
  }
  try {
    await page.waitForFunction(
      () => {
        const s = window.__ssaStores;
        const root = document.getElementById('root');
        return !!(s && s.useMaterialStore) && !!root && root.childElementCount > 0;
      },
      undefined,
      { timeout: 90_000 }
    );
  } catch (e) {
    console.error('warmup app-ready failed:', r, e?.message);
  }
}

// 触发「API接口文档」标签页 → 编译 APIDocTab + ApiKeyManager
try {
  await page.getByText('API接口文档').click();
  await page.waitForTimeout(2500);
} catch (e) {
  console.error('warmup API tab failed:', e?.message);
}

await browser.close();
console.log('warmup done');
