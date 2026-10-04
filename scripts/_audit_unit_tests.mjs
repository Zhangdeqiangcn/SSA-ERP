#!/usr/bin/env node
// ============================================================
// SSA ERP · 前端白盒单测门禁（FE-001 · 纳入六项门禁）
// ------------------------------------------------------------
// 调用 vitest run 跑 test/unit 下所有白盒单测；任一用例失败 → exit 1（阻断）。
// EPERM 规避见 vitest.config.ts 注释：isolate:false 让模块缓存写盘发生在主进程
// （沙箱 brokered-fs-shim 在主进程放行临时目录写入，worker 内则拒绝），故本脚本
// 不再重定向 TEMP/TMP，直接沿用默认系统临时目录即可。
// ============================================================
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const NODE = process.execPath;

const r = spawnSync(
  NODE,
  [resolve(root, 'node_modules/vitest/vitest.mjs'), 'run', '--no-coverage'],
  { stdio: 'inherit', cwd: root }
);
const code = r.status ?? (r.error ? -1 : 0);

if (code === 0) {
  console.log('   ✅ 前端白盒单测通过');
  process.exit(0);
} else {
  console.log(`   ❌ 前端白盒单测失败（exit=${code}）— 阻断`);
  process.exit(1);
}
