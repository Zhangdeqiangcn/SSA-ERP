#!/usr/bin/env node
// ============================================================
// SSA ERP · 生产部署脚本（固化「先 apply D1 迁移，再 deploy」SOP）
// ------------------------------------------------------------
// 根因（V2.76.0 生产事故）：`wrangler pages deploy` 只传前端 + Functions，
//   不会 apply D1 迁移。迁移 0019（serial_movements 补 created_at/created_by）
//   写好了却从未推到远程生产 D1 → 序列号创建在生产全断（POST 500）。
//   事后靠 `d1 execute --remote` 手动补列才修复。
// 本脚本把「deploy 前先 apply 远程迁移」变成强制步骤，杜绝遗漏：
//   - `d1 migrations apply --remote` 幂等：已 apply 的迁移自动跳过，
//     只补未应用的新迁移，可安全反复执行。
//   - 然后 `pages deploy` 传前端 + 函数。
//
// 用法：
//   npm run deploy            # 注入 .env.local 凭据 → apply 远程迁移 → 部署
// 前置：dist/ 已构建（先 npm run build）；根目录 .env.local 含 CLOUDFLARE_API_TOKEN。
// ============================================================
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const NODE = process.execPath;
const localWrangler = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
// wrangler 不在项目本地 node_modules 时：优先读环境变量 WRANGLER_BIN，
// 否则回退到本机隔离 workspace 的安装。强哥机器若路径不同，请设 WRANGLER_BIN
// 指向你的 wrangler.js，或先 `npm i -D wrangler` 让本地 node_modules 可用。
const FALLBACK_WRANGLER = 'C:/Users/zhangdeqiang/.workbuddy/binaries/node/workspace/node_modules/wrangler/bin/wrangler.js';
const WRANGLER = process.env.WRANGLER_BIN || (existsSync(localWrangler) ? localWrangler : FALLBACK_WRANGLER);
const DB = 'ssa-erp-db';

// 1) 注入 .env.local（wrangler 不自动读取，非交互环境必须）
const envPath = resolve(root, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  console.log('✅ 已注入 .env.local 凭据');
} else {
  console.warn('⚠️ 未找到 .env.local，CLOUDFLARE_API_TOKEN 可能缺失（非交互环境会失败）');
}

function run(args) {
  console.log(`\n▶ wrangler ${args.join(' ')}`);
  const r = spawnSync(NODE, [WRANGLER, ...args], { stdio: 'inherit', env: process.env, cwd: root });
  if (r.status !== 0) {
    console.error(`❌ 步骤失败（exit=${r.status}）：wrangler ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

// 2) 强制 apply 远程 D1 迁移（幂等：已应用跳过，未应用补上）
run(['d1', 'migrations', 'apply', DB, '--remote']);

// 3) 部署前端 + Functions
run(['pages', 'deploy', 'dist', '--project-name', 'ssa-erp']);

console.log('\n✅ 部署完成：远程 D1 迁移已 apply（幂等）+ 前端/函数已部署。');
