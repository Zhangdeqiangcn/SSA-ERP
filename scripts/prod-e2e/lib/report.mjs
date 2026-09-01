// SSA ERP · 生产 E2E 常驻套件 — 报告生成（JSON 机器可读 + Markdown 人读）
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const STATUS_ICON = { PASS: '✅', FAIL: '❌', WARN: '⚠️', INFO: 'ℹ️' };

export function writeReports({ outDir, base, runId, startedAt, suites, cleanup, httpStats, bootstrapError }) {
  mkdirSync(outDir, { recursive: true });

  const totals = suites.reduce(
    (a, s) => ({
      pass: a.pass + s.pass, fail: a.fail + s.fail,
      warn: a.warn + s.warn, info: a.info + s.info, total: a.total + s.total,
    }),
    { pass: 0, fail: 0, warn: 0, info: 0, total: 0 },
  );
  const durationMs = Date.now() - startedAt;
  const verdict = bootstrapError ? 'BOOTSTRAP_ERROR' : (totals.fail === 0 ? 'PASS' : 'FAIL');

  const payload = {
    product: 'SSA ERP',
    kind: 'production-e2e',
    verdict,
    base,
    runId,
    startedAt: new Date(startedAt).toISOString(),
    durationMs,
    totals,
    httpStats,
    cleanup,
    bootstrapError: bootstrapError || null,
    suites,
  };

  const jsonPath = join(outDir, 'latest.json');
  writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');

  // ---------- Markdown ----------
  const L = [];
  L.push(`# SSA ERP 生产 E2E 报告`);
  L.push('');
  L.push(`- **结论**：${verdict === 'PASS' ? '✅ 全绿' : verdict === 'FAIL' ? `❌ 存在 ${totals.fail} 条失败` : '❌ 引导失败（未能建立测试组织）'}`);
  L.push(`- **目标环境**：${base}`);
  L.push(`- **运行批次**：\`${runId}\`（隔离组织公司码 \`E2E-${runId}\`）`);
  L.push(`- **开始时间**：${new Date(startedAt).toLocaleString('zh-CN')}`);
  L.push(`- **耗时**：${(durationMs / 1000).toFixed(1)} 秒`);
  L.push(`- **断言汇总**：PASS ${totals.pass} / FAIL ${totals.fail} / WARN ${totals.warn} / INFO ${totals.info}（共 ${totals.total}）`);
  if (httpStats) L.push(`- **HTTP 调用**：${httpStats.calls} 次，平均 ${httpStats.avgMs}ms`);
  if (cleanup) {
    L.push(`- **数据清理**：尝试 ${cleanup.attempted} 项，成功 ${cleanup.removed} 项${cleanup.failed?.length ? `，失败 ${cleanup.failed.length} 项（${cleanup.failed.slice(0, 6).join(', ')}）` : ''}`);
  }
  L.push('');

  if (bootstrapError) {
    L.push('## ❌ 引导失败');
    L.push('');
    L.push('```');
    L.push(String(bootstrapError));
    L.push('```');
    L.push('');
  }

  L.push('## 套件总览');
  L.push('');
  L.push('| 套件 | 说明 | PASS | FAIL | WARN | INFO | 耗时 |');
  L.push('|---|---|---:|---:|---:|---:|---:|');
  for (const s of suites) {
    const flag = s.fail > 0 ? '❌' : (s.warn > 0 ? '⚠️' : '✅');
    L.push(`| ${flag} ${s.id} | ${s.title} | ${s.pass} | ${s.fail} | ${s.warn} | ${s.info} | ${(s.ms / 1000).toFixed(1)}s |`);
  }
  L.push('');

  const failures = [];
  for (const s of suites) {
    for (const r of s.results) if (r.status === 'FAIL') failures.push({ suite: s.id, ...r });
  }
  if (failures.length) {
    L.push('## ❌ 失败明细（需修复）');
    L.push('');
    L.push('| 套件 | 断言 | 详情 |');
    L.push('|---|---|---|');
    for (const f of failures) {
      L.push(`| ${f.suite} | ${f.name} | \`${String(f.detail).replace(/\|/g, '\\|').slice(0, 240)}\` |`);
    }
    L.push('');
  }

  const warnings = [];
  for (const s of suites) {
    for (const r of s.results) if (r.status === 'WARN') warnings.push({ suite: s.id, ...r });
  }
  if (warnings.length) {
    L.push('## ⚠️ 告警（不阻断，但需关注）');
    L.push('');
    for (const w of warnings) L.push(`- **${w.suite}** · ${w.name}${w.detail ? ` — ${w.detail}` : ''}`);
    L.push('');
  }

  L.push('## 全部断言明细');
  L.push('');
  for (const s of suites) {
    L.push(`### ${s.id} · ${s.title}`);
    L.push('');
    for (const r of s.results) {
      L.push(`- ${STATUS_ICON[r.status]} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
    }
    L.push('');
  }

  L.push('---');
  L.push('');
  L.push('> 本报告由 `npm run test:prod-e2e` 生成（`scripts/prod-e2e/`）。套件在生产环境创建时间戳隔离组织，跑完自动清理业务数据；`orgs`/`users` 无删除端点，会残留少量僵尸测试账号，不影响业务数据。');

  const mdPath = join(outDir, 'latest.md');
  writeFileSync(mdPath, L.join('\n'), 'utf8');

  return { jsonPath, mdPath, verdict, totals, durationMs };
}

export function ensureDir(p) {
  mkdirSync(dirname(p), { recursive: true });
}
