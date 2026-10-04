import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// 前端白盒单测配置（FE-001 落地）。
// 复用前端既有的 `@` → `src` 路径别名，保证被测文件里的 `@/types` 等导入可解析。
// 纯函数/工具不依赖浏览器环境，用 node 环境即可，无需 jsdom。
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['test/unit/**/*.test.ts'],
    globals: false,
  },
});
