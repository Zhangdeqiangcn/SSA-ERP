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
import { spawnSync, execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const NODE = process.execPath;
const localWrangler = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
const localBinWrangler = resolve(root, 'node_modules/.bin/wrangler');
// 最后兜底：强哥本机隔离 workspace 的安装（其他机器请设 WRANGLER_BIN 或先 npm i -D wrangler）。
// 注意：本路径**不再是唯一兜底**——优先顺序见 resolveWrangler()。
const FALLBACK_WRANGLER = 'C:/Users/zhangdeqiang/.workbuddy/binaries/node/workspace/node_modules/wrangler/bin/wrangler.js';

// wrangler 解析优先级（去硬编码，跨机器可移植）：
//   ① 环境变量 WRANGLER_BIN（且文件存在）→ ② 项目本地 node_modules/wrangler
//   → ③ 项目本地 .bin/wrangler → ④ 系统 PATH 上的 wrangler（已全局安装）
//   → ⑤ 本机隔离 workspace 兜底（仅在以上皆不可用时）
function resolveWrangler() {
  if (process.env.WRANGLER_BIN && existsSync(process.env.WRANGLER_BIN)) return process.env.WRANGLER_BIN;
  if (existsSync(localWrangler)) return localWrangler;
  if (existsSync(localBinWrangler)) return localBinWrangler;
  try { execSync('wrangler --version', { stdio: 'ignore' }); return 'wrangler'; } catch { /* PATH 上无 wrangler */ }
  return FALLBACK_WRANGLER;
}
const WRANGLER = resolveWrangler();
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

// 1.5) 凭据预检：缺失则**提前**失败，避免「迁移 apply 一半 / 部署中途」才暴露，
//      也避免误把生产库结构改了却部署不上去的半吊子状态。
if (!process.env.CLOUDFLARE_API_TOKEN) {
  console.error('❌ 缺少 CLOUDFLARE_API_TOKEN：未设环境变量且 .env.local 未提供。');
  console.error('   请在 .env.local 写入 CLOUDFLARE_API_TOKEN=...，或先 `export CLOUDFLARE_API_TOKEN=...` 再部署。');
  process.exit(2);
}

// 部署模式开关（纯附加，不改变默认 `npm run deploy` 行为）：
//   --dry     仅 apply 远程 D1 迁移、跳过 pages deploy（验证迁移是否成功用）
//   --preview 发到预览分支（不影响生产主域，面板确认后再手动 promote）
const cliArgs = process.argv.slice(2);
const DRY = cliArgs.includes('--dry');
const PREVIEW = cliArgs.includes('--preview');

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
if (DRY) {
  console.log('\n⏭️  --dry：已 apply 远程迁移，按要求跳过 pages deploy（仅用于验证迁移是否成功）。');
} else if (PREVIEW) {
  const branch = `preview-${Date.now()}`;
  run(['pages', 'deploy', 'dist', '--project-name', 'ssa-erp', '--branch', branch]);
  console.log(`\n🔍 预览部署已发起到分支 ${branch}（不影响生产主域 ssa-erp.pages.dev）。`);
  console.log('   确认无误后在生产面板 promote 该部署，或用 `wrangler pages deployment promote <id>` 转正。');
  console.log('   回滚：先 `wrangler pages deployment list --project-name ssa-erp` 查历史部署 id，再 promote 旧 id 即可。');
} else {
  run(['pages', 'deploy', 'dist', '--project-name', 'ssa-erp']);
  console.log('\n✅ 部署完成：远程 D1 迁移已 apply（幂等）+ 前端/函数已部署到生产主域。');
}
