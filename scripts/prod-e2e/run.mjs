#!/usr/bin/env node
// SSA ERP · 生产 E2E 常驻套件 — 入口 Runner
// ============================================================
// 用途：对**真实生产环境**（Cloudflare Pages + 远程 D1）跑全域回归，
//       覆盖认证/Blob 通道/关系 10 域/供应商同源/B2 三岛/开放网关/RLS/多币种/审计三单/智能端点。
//
// 用法：
//   npm run test:prod-e2e                        # 打 canonical 生产域
//   npm run test:prod-e2e -- --base=https://xxx.ssa-erp.pages.dev   # 指定预览部署
//   npm run test:prod-e2e -- --only=04-vendor,07-rls                # 只跑指定套件
//   npm run test:prod-e2e -- --no-cleanup                           # 保留测试数据便于排查
//
// 安全设计：
//   · 每轮以时间戳生成隔离组织公司码 E2E-<runId>，所有写操作只落在该组织内。
//   · 跑完自动删除本轮创建的业务行并吊销测试 Key（--no-cleanup 可关闭）。
//   · orgs/users/sessions 无删除端点，会残留少量僵尸测试账号，不影响业务数据。
//
// 退出码：0 = 全绿；1 = 存在失败断言；2 = 引导失败（无法建立测试组织）。

import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from './lib/http.mjs';
import { createContext, Suite } from './lib/harness.mjs';
import { writeReports } from './lib/report.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_BASE = 'https://ssa-erp.pages.dev';

function parseArgs(argv) {
  const out = { base: process.env.PROD_E2E_BASE || DEFAULT_BASE, only: null, cleanup: true };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--base=')) out.base = a.slice('--base='.length).replace(/\/$/, '');
    else if (a.startsWith('--only=')) out.only = a.slice('--only='.length).split(',').map((x) => x.trim()).filter(Boolean);
    else if (a === '--no-cleanup') out.cleanup = false;
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
  }
  return out;
}

function printHelp() {
  console.log(`
SSA ERP 生产 E2E 常驻套件

  npm run test:prod-e2e [-- 选项]

选项：
  --base=<url>      目标环境（默认 ${DEFAULT_BASE}，也可用环境变量 PROD_E2E_BASE）
  --only=<ids>      仅跑指定套件，逗号分隔（如 04-vendor,07-rls）
  --no-cleanup      跑完保留测试数据（默认自动清理）
  -h, --help        显示本帮助

报告输出：test-reports/prod-e2e/latest.md 与 latest.json
`);
}

async function loadSuites(only) {
  const dir = join(__dirname, 'suites');
  const files = readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort();
  const loaded = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    const meta = mod.meta || { id: f.replace(/\.mjs$/, ''), title: f };
    if (only && !only.includes(meta.id)) continue;
    loaded.push({ meta, run: mod.default });
  }
  return loaded;
}

async function main() {
  const args = parseArgs(process.argv);
  const runId = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(2, 14); // yymmddHHMMSS
  const startedAt = Date.now();
  const req = createClient(args.base);

  console.log('');
  console.log('═'.repeat(72));
  console.log('  SSA ERP · 生产 E2E 常驻套件');
  console.log('═'.repeat(72));
  console.log(`  目标环境 : ${args.base}`);
  console.log(`  运行批次 : ${runId}（隔离组织公司码 E2E-${runId}）`);
  console.log(`  自动清理 : ${args.cleanup ? '开启' : '关闭（--no-cleanup）'}`);
  console.log('═'.repeat(72));

  const suiteDefs = await loadSuites(args.only);
  console.log(`  待执行套件 : ${suiteDefs.length} 个${args.only ? '（--only 过滤）' : ''}\n`);

  // ---------- 引导：注册隔离组织 ----------
  let ctx;
  try {
    ctx = await createContext({ req, runId });
    console.log(`✅ 引导完成：隔离组织 org_id=${ctx.org.orgId}\n`);
  } catch (e) {
    const msg = e?.message || String(e);
    console.error(`❌ 引导失败：${msg}\n`);
    const out = writeReports({
      outDir: join(process.cwd(), 'test-reports', 'prod-e2e'),
      base: args.base, runId, startedAt, suites: [], cleanup: null,
      httpStats: req.stats(), bootstrapError: msg,
    });
    console.error(`报告：${out.mdPath}`);
    process.exit(2);
  }

  // ---------- 逐个执行套件 ----------
  const summaries = [];
  for (const def of suiteDefs) {
    console.log(`\n── ${def.meta.id} · ${def.meta.title} ${'─'.repeat(Math.max(0, 40 - def.meta.id.length))}`);
    const suite = new Suite(def.meta.id, def.meta.title);
    try {
      await def.run(ctx, suite);
    } catch (e) {
      suite.fail(`套件执行抛出未捕获异常`, e?.message || String(e));
    }
    summaries.push(suite.summary());
  }

  // ---------- 清理 ----------
  let cleanup = null;
  if (args.cleanup) {
    console.log('\n── 清理本轮测试数据 ' + '─'.repeat(38));
    try {
      cleanup = await ctx.cleanup();
      console.log(`  🧹 清理完成：尝试 ${cleanup.attempted} 项，成功 ${cleanup.removed} 项` +
        (cleanup.failed.length ? `，失败 ${cleanup.failed.length} 项 → ${cleanup.failed.slice(0, 8).join(', ')}` : ''));
    } catch (e) {
      console.log(`  ⚠️  清理异常：${e?.message || e}`);
      cleanup = { attempted: 0, removed: 0, failed: ['清理流程异常: ' + (e?.message || e)] };
    }
  } else {
    console.log(`\n  ℹ️  已跳过清理，测试数据保留在组织 E2E-${runId} 内`);
  }

  // ---------- 报告 ----------
  const out = writeReports({
    outDir: join(process.cwd(), 'test-reports', 'prod-e2e'),
    base: args.base, runId, startedAt, suites: summaries, cleanup,
    httpStats: req.stats(),
  });

  const { pass, fail, warn, info, total } = out.totals;
  console.log('');
  console.log('═'.repeat(72));
  console.log(`  结论：${out.verdict === 'PASS' ? '✅ 全绿' : `❌ ${fail} 条失败`}`);
  console.log(`  断言：PASS ${pass} / FAIL ${fail} / WARN ${warn} / INFO ${info}（共 ${total}）`);
  console.log(`  耗时：${(out.durationMs / 1000).toFixed(1)}s   HTTP ${req.stats().calls} 次（均 ${req.stats().avgMs}ms）`);
  console.log(`  报告：${out.mdPath}`);
  console.log('═'.repeat(72));
  console.log('');

  if (fail > 0) {
    console.log('失败断言速览：');
    for (const s of summaries) {
      for (const r of s.results) {
        if (r.status === 'FAIL') console.log(`  ❌ [${s.id}] ${r.name} — ${r.detail}`);
      }
    }
    console.log('');
  }

  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('\n❌ RUNNER 致命错误：', e);
  process.exit(1);
}); 
