import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 配置
 * - 端口 3000 与 vite.config 保持一致
 * - reuseExistingServer: 若已手动启动 dev server 则复用，否则自动拉起 `npm run dev`
 * - 系统为纯前端 Mock：刷新页面数据重置为初始 Mock，因此 E2E 在单次会话内完成种子填充+逐节点校验
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 300_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
