#!/usr/bin/env node
// SSA ERP · 生产必填守卫上线验证探针（V3.86.0）
// ============================================================
// 用途：验证生产环境上「必填字段集中登记表」是否真实生效：
//   ① POST 建物料带 specification/unit     → 期望 201
//   ② POST 建物料缺 specification           → 期望 400 MISSING_REQUIRED_CORE
//   ③ PUT  局部更新仅传单字段（partial）     → 期望 200（不得被必填误拦）
//   ④ PUT  传空 specification（防清空）      → 期望 400
// 安全：复用 harness createContext 建隔离组织，跑完 cleanup，不污染业务数据。
// 用法：node scripts/prod-e2e/probe-required.mjs [--base=https://ssa-erp.pages.dev]

import { createClient } from './lib/http.mjs';
import { createContext } from './lib/harness.mjs';

const args = process.argv.slice(2);
const baseArg = args.find((a) => a.startsWith('--base='));
const base = (baseArg ? baseArg.slice('--base='.length) : 'https://ssa-erp.pages.dev').replace(/\/$/, '');
const runId = `req${Date.now().toString(36)}`;

let pass = 0;
let fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} :: ${detail}`); }
}

async function main() {
  console.log(`=== 生产必填守卫探针 base=${base} runId=${runId} ===`);
  const req = createClient(base);
  const ctx = await createContext({ req, runId });
  const token = ctx.admin.token;
  const stamp = Date.now().toString(36).slice(-6);

  try {
    // ① 完整 payload 建物料 → 201
    const ok = await req('POST', '/api/materials', {
      token,
      body: { code: `PRB-OK-${stamp}`, name: '探针-合格物料', specification: 'Φ20mm', unit: '个' },
    });
    check('① 带规格+单位建物料 → 201', ok.status === 201, `status=${ok.status} body=${JSON.stringify(ok.data).slice(0, 160)}`);
    const matId = ok.data?.id;

    // ② 缺 specification 建物料 → 400 MISSING_REQUIRED_CORE
    const miss = await req('POST', '/api/materials', {
      token,
      body: { code: `PRB-MISS-${stamp}`, name: '探针-缺规格物料', unit: '个' },
    });
    check(
      '② 缺 specification 建物料 → 400 MISSING_REQUIRED_CORE',
      miss.status === 400 && miss.data?.code === 'MISSING_REQUIRED_CORE',
      `status=${miss.status} body=${JSON.stringify(miss.data).slice(0, 160)}`,
    );

    // ②b 缺 unit 建物料 → 400（更严档同步生效）
    const missUnit = await req('POST', '/api/materials', {
      token,
      body: { code: `PRB-MISSU-${stamp}`, name: '探针-缺单位物料', specification: 'Φ30mm' },
    });
    check(
      '②b 缺 unit 建物料 → 400',
      missUnit.status === 400 && missUnit.data?.code === 'MISSING_REQUIRED_CORE',
      `status=${missUnit.status} body=${JSON.stringify(missUnit.data).slice(0, 160)}`,
    );

    // ③ PUT 局部更新仅传单字段 → 200（partial 放行）
    if (matId) {
      const patch = await req('PUT', `/api/materials/${matId}`, {
        token,
        body: { price: 1234 },
      });
      check(
        '③ PUT 仅传 price → 200（partial 语义，不被必填误拦）',
        patch.status === 200,
        `status=${patch.status} body=${JSON.stringify(patch.data).slice(0, 160)}`,
      );

      // ④ PUT 传空 specification → 400（防编辑清空必填项）
      const blank = await req('PUT', `/api/materials/${matId}`, {
        token,
        body: { specification: '' },
      });
      check(
        '④ PUT 传空 specification → 400（防清空）',
        blank.status === 400 && blank.data?.code === 'MISSING_REQUIRED_CORE',
        `status=${blank.status} body=${JSON.stringify(blank.data).slice(0, 160)}`,
      );
    } else {
      check('③/④ PUT 探针（依赖①成功）', false, '① 未拿到物料 id，跳过');
    }
  } finally {
    await ctx.cleanup();
    console.log('  （隔离组织已清理）');
  }

  console.log(`\n=== 探针结论：PASS ${pass} / FAIL ${fail} ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(`探针执行异常：${e?.message || e}`);
  process.exit(2);
});
