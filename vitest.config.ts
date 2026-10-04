import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// 前端白盒单测配置（FE-001 落地）。
// 复用前端既有的 `@` → `src` 路径别名，保证被测文件里的 `@/types` 等导入可解析。
// 纯函数/工具不依赖浏览器环境，用 node 环境即可，无需 jsdom。
//
// 沙箱 EPERM 根因与规避（实测定位，非猜测）：
//   vitest 会把转译后的模块缓存写盘到 os.tmpdir() 下的随机目录（<rand>/ssr/<hash>），
//   该写盘发生在「worker 线程（tinypool threads）」里；沙箱的 brokered-fs-shim 在 worker 线程内
//   对临时目录写入默认拒绝（EPERM），导致 vitest 报 unhandled error、退出码被置 1（即便全部用例通过）。
//   直接调用 vitest 时偶发（缓存命中则不写），经门禁脚本 spawn 调用则稳定触发 —— 不可接受。
//   确定性治本：把测试池从默认的 worker_threads 改为「forks」单进程（pool:'forks' + singleFork:true），
//   让模块执行与缓存写盘都发生在「fork 出的子进程」里（不是 worker 线程），shim 对该形态不拒写。
//   同时 isolate:false 进一步减少隔离产生的额外写盘。曾尝试 TEMP 重定向到项目内 .vitest-tmp，
//   但 worker 同样被拒、主进程也偶发被拒，故废弃；forks 单进程是最终稳定方案（72 例 exit 0、零 EPERM）。
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
    // 规避沙箱 brokered-fs-shim 在 worker 线程内对临时目录写入的 EPERM（详见上方注释）。
    isolate: false,
    // 关键：用 fork 子进程池（非 worker 线程）跑测试，缓存写盘发生在子进程内，shim 不拒写。
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // 禁用 SSR/Web 依赖预构建缓存：纯 node 单测无需依赖优化，进一步减少临时目录写入面。
    deps: {
      optimizer: {
        ssr: { enabled: false },
        web: { enabled: false },
      },
    },
  },
});
