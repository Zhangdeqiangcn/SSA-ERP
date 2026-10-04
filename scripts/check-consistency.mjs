#!/usr/bin/env node
// ============================================================
// SSA ERP · 一致性检查编排（常规检查）
// ------------------------------------------------------------
// 把 4 个核对程序串成一键检查，纳入"常规检查"流程：
//   ① _verify_registries_vs_db.mjs  登记表 ↔ 生产库        （阻断项，需远端 D1）
//   ② _verify_routes.mjs            前端调用 ↔ 后端路由    （阻断项，本地静态）
//   ③ _probe_route_exist.mjs        生产端点存在性探针      （默认非阻断，需线上部署；--strict 升级为阻断）
//   ④ _sweep_api_live.mjs           后端端点全量真实巡检    （V3.20.0 新增；**仅 --live 时跑**，阻断）
//
// 为什么 ④ 要单独用 --live 开关、而不进默认流程：
//   ③ 只做只读探测，④ 会**创建再删除测试数据**（打生产库）。默认门禁必须是无副作用的，
//   否则任何人跑一次本地检查都会动到线上数据。要用时显式开：`npm run check -- --live`。
//
// 设计取舍（第一性原理）：
//   · ①②③④ 都失败会"静默"让能力失效，但四者依赖不同：
//     ①② 在提交/构建期即可判定（本地静态或远端库结构），应该阻断；
//     ③ 必须打真实线上部署才有意义，构建期往往还没部署，故默认非阻断，
//        由发布流程在 deploy 之后跑 `npm run check:smoke` 或 `npm run check -- --strict`。
//     ④ 会写线上数据，故不进默认流程，只在发布后验收时用 --live 显式开。
//   · 退出码：任一阻断项失败 → 1；全部通过（含探针非阻断） → 0。
//
// 用法：
//   npm run check                  # 跑 ①②③（探针非阻断）
//   npm run check -- --no-probe    # 只跑 ①②（构建门槛里用这个，确定性最强）
//   npm run check -- --strict      # ①②③ 全阻断（发布后全量门禁用）
//   npm run check -- --live        # 追加 ④ 后端端点全量真实巡检（会写线上测试数据并自动清理）
//   npm run check:smoke            # 只跑 ③ 端点探针
//   npm run check:api              # 只跑 ④ 后端端点全量巡检
// ============================================================
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const NODE = process.execPath;

const cliArgs = process.argv.slice(2);
const noProbe = cliArgs.includes('--no-probe');
const strict = cliArgs.includes('--strict');
// ④ 必须显式 --live 才跑：它会写线上数据（见文件头说明）
const live = cliArgs.includes('--live');

const steps = [
  { name: '① 登记表 ↔ 生产库', file: '_verify_registries_vs_db.mjs', blocking: true },
  { name: '② 前端调用 ↔ 后端路由', file: '_verify_routes.mjs', blocking: true },
  { name: '③ 生产端点存在性探针', file: '_probe_route_exist.mjs', blocking: strict },
  { name: '④ 后端端点全量真实巡检', file: '_sweep_api_live.mjs', blocking: true, liveOnly: true },
  // V3.21.0 新增：两处「必须成对出现」的约定，靠人记一定会漏（坑㉛），故机器核对。
  { name: '⑤ LIKE 转义一致性', file: 'check-search-escape.mjs', blocking: true },
  { name: '⑥ 字段权限矩阵一致性', file: 'check-field-policy.mjs', blocking: true },
  // V3.44.0 新增：⑦ 前端白盒单测（FE-001）。纯本地、无副作用、无网络依赖，
  // 因此即使 --no-probe（构建门槛）也跑；任一用例失败即阻断，防回归成"静默放行"。
  { name: '⑦ 前端白盒单测', file: '_audit_unit_tests.mjs', blocking: true },
];

const W = 26;
console.log('═'.repeat(64));
console.log('  SSA ERP · 一致性检查（常规检查）');
console.log('═'.repeat(64));

let failed = 0;
for (const step of steps) {
  if (step.file === '_probe_route_exist.mjs' && noProbe) {
    console.log(`\n── ${step.name.padEnd(W)} ⏭️  跳过（--no-probe）`);
    continue;
  }
  // ④ 会写线上数据，必须显式 --live 才跑（见文件头说明）
  if (step.liveOnly && !live) {
    console.log(`\n── ${step.name.padEnd(W)} ⏭️  跳过（需 --live 显式开启）`);
    continue;
  }
  console.log(`\n── ${step.name.padEnd(W)} ▶ ${step.file}`);
  const r = spawnSync(NODE, [resolve(root, 'scripts', step.file)], {
    stdio: 'inherit', cwd: root, env: process.env,
  });
  const code = r.status ?? (r.error ? -1 : 0);
  if (code === 0) {
    console.log(`   ✅ ${step.name} 通过`);
  } else if (step.blocking) {
    console.log(`   ❌ ${step.name} 失败（exit=${code}）— 阻断`);
    failed++;
  } else {
    console.log(`   ⚠️  ${step.name} 未通过（exit=${code}）— 非阻断（需线上部署；--strict 可升级为阻断）`);
  }
}

console.log('\n' + '═'.repeat(64));
if (failed === 0) {
  console.log('✅ 一致性检查全部通过（阻断项 0 失败）');
  process.exit(0);
} else {
  console.log(`❌ 有 ${failed} 个阻断项未通过，请逐项处理后再继续`);
  process.exit(1);
}
